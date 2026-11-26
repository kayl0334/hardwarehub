const express = require("express");
const maya = require("../services/maya");
const supabase = require("../config/supabase");

const router = express.Router();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ORDER_FIELDS = `
  id,
  status,
  total,
  payment_method,
  payment_status,
  payment_reference,
  checkout_url,
  paid_at
`;

function fail(res, status, code, message) {
  return res.status(status).json({
    success: false,
    error: { code, message },
  });
}

// CUSTOMER AUTHENTICATION
async function requireCustomer(req, res, next) {
  try {
    const token = req.headers.authorization
      ?.match(/^Bearer (.+)$/)?.[1];

    if (!token) {
      return fail(
        res,
        401,
        "UNAUTHORIZED",
        "Please log in first."
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return fail(
        res,
        401,
        "INVALID_TOKEN",
        "Your session has expired."
      );
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error) throw error;

    if (profile?.role !== "customer") {
      return fail(
        res,
        403,
        "FORBIDDEN",
        "Only customers can place orders."
      );
    }

    req.user = user;
    next();

  } catch (error) {
    console.error("Authentication error:", error.message);

    return fail(
      res,
      500,
      "AUTH_ERROR",
      "Unable to verify your account."
    );
  }
}

async function syncMayaOrder(order) {
  if (order.payment_method !== "maya" || order.payment_status !== "pending" || !order.payment_reference) {
    return order;
  }

  const payment = await maya.getCheckout(order.payment_reference);
  const amount = payment.totalAmount ?? payment.amount?.total ?? {
    value: payment.amount,
    currency: payment.currency,
  };
  if (
    payment.id !== order.payment_reference ||
    payment.requestReferenceNumber !== order.id ||
    amount.currency !== "PHP" ||
    Number(amount.value ?? amount.amount) !== Number(order.total)
  ) {
    throw new Error("Maya payment details do not match the order.");
  }

  const result = {
    PAYMENT_SUCCESS: "paid",
    PAYMENT_FAILED: "failed",
    AUTH_FAILED: "failed",
    PAYMENT_CANCELLED: "cancelled",
    PAYMENT_EXPIRED: "cancelled",
  }[payment.paymentStatus ?? payment.status];
  if (!result) return order;

  const { error } = await supabase.rpc("settle_maya_sandbox_order", {
    p_order_id: order.id,
    p_payment_reference: order.payment_reference,
    p_result: result,
  });
  if (error) throw error;

  const { data, error: lookupError } = await supabase.from("orders")
    .select(ORDER_FIELDS).eq("id", order.id).single();
  if (lookupError) throw lookupError;
  return data;
}

// Maya redirects the browser here. Only a server-to-server lookup can settle an order.
router.get("/maya-return/:id", async (req, res) => {
  res.set("Cache-Control", "no-store");
  let result = "pending";
  try {
    if (!UUID_PATTERN.test(req.params.id)) {
      return fail(res, 400, "INVALID_ORDER_ID", "Invalid order ID.");
    }
    const { data: order, error } = await supabase.from("orders").select(ORDER_FIELDS)
      .eq("id", req.params.id).eq("payment_method", "maya").maybeSingle();
    if (error) throw error;
    if (order) result = (await syncMayaOrder(order)).payment_status;
  } catch (error) {
    console.error("Maya return verification:", error.message);
  }

  const frontend = process.env.FRONTEND_URL || "http://localhost:5173";
  const target = new URL({
    paid: process.env.MAYA_SUCCESS_URL,
    failed: process.env.MAYA_FAILURE_URL,
    cancelled: process.env.MAYA_CANCEL_URL,
  }[result] || frontend, frontend);
  target.searchParams.set("orderId", req.params.id);
  target.searchParams.set("mayaStatus", result);
  return res.redirect(303, target.href);
});

router.use(requireCustomer);

// CREATE ORDER
router.post("/", async (req, res) => {
  try {
    const {
      delivery,
      items,
      payment_method = "cod",
    } = req.body || {};

    const key = req.get("Idempotency-Key");

    // VALIDATE REQUEST ID
    if (
      !key ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)
    ) {
      return fail(
        res,
        400,
        "INVALID_KEY",
        "A valid checkout request ID is required."
      );
    }

    // VALIDATE PAYMENT METHOD
    if (!["cod", "maya"].includes(payment_method)) {
      return fail(
        res,
        400,
        "INVALID_PAYMENT_METHOD",
        "Invalid payment method."
      );
    }

    // SANDBOX CONFIGURATION CHECK
    if (payment_method === "maya") {
      try {
        maya.validateConfiguration();
      } catch (error) {
        console.error("Maya configuration:", error.message);
        return fail(res, 503, "SANDBOX_UNAVAILABLE", error.message);
      }
    }

    // VALIDATE DELIVERY
    if (
      !delivery ||
      typeof delivery.fullName !== "string" ||
      typeof delivery.phone !== "string" ||
      typeof delivery.address !== "string" ||
      delivery.fullName.trim().length < 2 ||
      delivery.fullName.length > 100 ||
      delivery.phone.trim().length < 7 ||
      delivery.phone.length > 25 ||
      delivery.address.trim().length < 10 ||
      delivery.address.length > 500
    ) {
      return fail(
        res,
        400,
        "INVALID_DELIVERY",
        "Please complete your delivery information."
      );
    }

    // VALIDATE CART
    if (
      !Array.isArray(items) ||
      items.length < 1 ||
      items.length > 50 ||
      items.some(
        (item) =>
          !item ||
          !Number.isSafeInteger(item.product_id) ||
          item.product_id < 1 ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          item.quantity > 100
      ) ||
      new Set(items.map((item) => item.product_id))
        .size !== items.length
    ) {
      return fail(
        res,
        400,
        "INVALID_ITEMS",
        "Your cart contains invalid items."
      );
    }

    const shippingAddress = [
      delivery.fullName.trim(),
      delivery.phone.trim(),
      delivery.address.trim(),
    ].join("\n");

    // CHECK EXISTING ORDER
    const {
      data: existing,
      error: existingError,
    } = await supabase
      .from("orders")
      .select(ORDER_FIELDS)
      .eq("user_id", req.user.id)
      .eq("idempotency_key", key)
      .maybeSingle();

    if (existingError) throw existingError;

    if (
      existing &&
      existing.payment_method !== payment_method
    ) {
      return fail(
        res,
        409,
        "CHECKOUT_CONFLICT",
        "This checkout ID was used for another payment method."
      );
    }

    const {
      data: orderId,
      error: orderError,
    } = await supabase.rpc(
      payment_method === "maya" ? "place_maya_sandbox_order" : "place_cod_order",
      {
        p_user_id: req.user.id,
        p_idempotency_key: key,
        p_shipping_address: shippingAddress,
        p_items: items,
      }
    );

    if (orderError) {
      if (payment_method === "maya" && ["PGRST202", "42883", "42703", "42501"].includes(orderError.code)) {
        console.error("Maya order database setup:", orderError.message);
        return fail(res, 503, "MAYA_DATABASE_SETUP", "Maya order setup is missing. Run backend/supabase/maya-sandbox.sql in Supabase.");
      }
      console.error(
        "Checkout failed:",
        orderError.message
      );

      return fail(
        res,
        400,
        "CHECKOUT_FAILED",
        "Unable to place order. Please check stock and try again."
      );
    }

    // RETRIEVE SAVED ORDER
    const {
      data: order,
      error: fetchError,
    } = await supabase
      .from("orders")
      .select(ORDER_FIELDS)
      .eq("id", orderId)
      .eq("user_id", req.user.id)
      .single();

    if (fetchError) throw fetchError;

    if (order.payment_method !== payment_method) {
      return fail(
        res,
        409,
        "CHECKOUT_CONFLICT",
        "Payment method does not match the saved order."
      );
    }

    if (payment_method === "maya") {
      let checkoutOrder = order;
      if (!order.checkout_url && order.payment_status === "pending") {
        try {
          const checkout = await maya.createCheckout({ orderId: order.id, amount: Number(order.total) });
          const { data: saved, error: saveError } = await supabase.from("orders")
            .update({ payment_reference: checkout.checkoutId, checkout_url: checkout.redirectUrl })
            .eq("id", order.id).eq("user_id", req.user.id).eq("payment_status", "pending")
            .is("payment_reference", null).select(ORDER_FIELDS).maybeSingle();
          if (saveError) throw saveError;

          if (saved) {
            checkoutOrder = saved;
          } else {
            const { data: current, error: lookupError } = await supabase.from("orders")
              .select(ORDER_FIELDS).eq("id", order.id).eq("user_id", req.user.id).single();
            if (lookupError) throw lookupError;
            checkoutOrder = current;
          }
        } catch (error) {
          console.error("Maya checkout creation:", error.message);
          const message = [401, 403].includes(error.status)
            ? "Maya rejected the checkout key. Check that MAYA_PUBLIC_KEY is from a Maya Checkout sandbox application."
            : "Unable to open Maya Sandbox. Check the backend logs and retry checkout.";
          return fail(res, 502, "MAYA_CHECKOUT_FAILED", message);
        }
      }
      return res.status(existing ? 200 : 201).json({
        success: true,
        data: {
          ...checkoutOrder,
          redirectUrl: checkoutOrder.payment_status === "pending" ? checkoutOrder.checkout_url : null,
        },
      });
    }

    return res.status(existing ? 200 : 201).json({
      success: true,
      data: {
        ...order,
        message:
          "Your Cash on Delivery order was placed successfully.",
      },
    });

  } catch (error) {
    console.error("Order error:", error.message);

    return fail(
      res,
      500,
      "ORDER_ERROR",
      "An unexpected checkout error occurred."
    );
  }
});

// GET ALL CUSTOMER ORDERS
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        total,
        shipping_address,
        created_at,
        payment_method,
        payment_status,
        payment_reference,
        paid_at,
        order_items (
          id,
          product_id,
          quantity,
          unit_price,
          products (
            id,
            name,
            image_url
          )
        )
      `)
      .eq("user_id", req.user.id)
      .order("created_at", {
        ascending: false,
      });

    if (error) throw error;

    return res.json({
      success: true,
      data,
    });

  } catch (error) {
    console.error(
      "Load orders error:",
      error.message
    );

    return fail(
      res,
      500,
      "ORDERS_ERROR",
      "Unable to load your orders."
    );
  }
});

// GET SINGLE CUSTOMER ORDER
router.get("/:id", async (req, res) => {
  try {
    const orderId = req.params.id;

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)
    ) {
      return fail(
        res,
        400,
        "INVALID_ORDER_ID",
        "Invalid order ID."
      );
    }

    const { data: order, error } = await supabase
      .from("orders")
      .select(ORDER_FIELDS)
      .eq("id", orderId)
      .eq("user_id", req.user.id)
      .maybeSingle();

    if (error) throw error;

    if (!order) {
      return fail(
        res,
        404,
        "ORDER_NOT_FOUND",
        "Order not found."
      );
    }

    let current = order;
    try {
      current = await syncMayaOrder(order);
    } catch (error) {
      console.error("Maya order verification:", error.message);
    }
    return res.json({
      success: true,
      data: current,
    });

  } catch (error) {
    console.error(
      "Order lookup error:",
      error.message
    );

    return fail(
      res,
      500,
      "ORDER_ERROR",
      "Unable to retrieve your order."
    );
  }
});

async function mayaWebhook(req, res) {
  const paymentId = req.body?.id;
  if (typeof paymentId !== "string" || !UUID_PATTERN.test(paymentId)) {
    return fail(res, 400, "INVALID_PAYMENT_ID", "A valid Maya payment ID is required.");
  }

  try {
    const { data: order, error } = await supabase.from("orders")
      .select(ORDER_FIELDS).eq("payment_reference", paymentId)
      .eq("payment_method", "maya").maybeSingle();
    if (error) throw error;
    if (order) await syncMayaOrder(order);
    return res.sendStatus(200);
  } catch (error) {
    console.error("Maya webhook verification:", error.message);
    return fail(res, 502, "MAYA_VERIFICATION_FAILED", "Unable to verify Maya payment.");
  }
}

module.exports = { router, mayaWebhook };
