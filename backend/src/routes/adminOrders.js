const express = require("express");
const supabase = require("../config/supabase");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();

router.use(requireAdmin);

// GET /api/v1/admin/orders
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("orders")

      .select(
        `
  id,
  user_id,
  status,
  total,
 shipping_address,
created_at,
payment_method,
payment_status,
payment_reference,
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
`,
      )

      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("Admin orders error:", error.message);

    res.status(500).json({
      success: false,
      error: {
        message: "Unable to load customer orders.",
      },
    });
  }
});

// PATCH /api/v1/admin/orders/:id/status
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body || {};

    // COD orders should follow the delivery workflow.
    const allowedTransitions = {
      processing: ["shipped"],
      shipped: ["completed"],
    };

    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", req.params.id)
      .single();

    if (fetchError || !order) {
      return res.status(404).json({
        success: false,
        error: { message: "Order not found." },
      });
    }

    if (!allowedTransitions[order.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Cannot change order from ${order.status} to ${status}.`,
        },
      });
    }

    // Compare current status to avoid overwriting a changed order.
    const { data, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", order.id)
      .eq("status", order.status)
      .select("id, status")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(409).json({
        success: false,
        error: {
          message: "Order status changed. Refresh and try again.",
        },
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Update order status failed:", error.message);

    res.status(500).json({
      success: false,
      error: {
        message: "Unable to update order status.",
      },
    });
  }
});


router.patch("/:id/cancel", async (req, res) => {
  try {
    const orderId = req.params.id;

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(orderId)) {
      return res.status(400).json({
        success: false,
        error: { message: "Invalid order ID." },
      });
    }

    const { data: order, error: lookupError } = await supabase.from("orders")
      .select("payment_method").eq("id", orderId).maybeSingle();

    if (lookupError) throw lookupError;
    if (order?.payment_method === "maya") {
      return res.status(409).json({
        success: false,
        error: { message: "Maya sandbox orders are reconciled through Maya." },
      });
    }

    const { data, error } = await supabase.rpc(
      "cancel_cod_order",
      {
        p_order_id: orderId,
      }
    );

    if (error) {
      console.error("Cancel order failed:", error.message);

      return res.status(400).json({
        success: false,
        error: {
          message: "Order cannot be cancelled. Refresh its status and try again.",
        },
      });
    }

    return res.json({
      success: true,
      data: {
        id: data,
        status: "cancelled",
        message: "Order cancelled and inventory restored.",
      },
    });
  } catch (error) {
    console.error("Cancellation error:", error);

    return res.status(500).json({
      success: false,
      error: {
        message: "Unable to cancel order.",
      },
    });
  }
});

module.exports = router;
