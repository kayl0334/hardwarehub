
const express = require("express");
const supabase = require("../config/supabase");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();

router.use(requireAdmin);

// GET /api/v1/admin/reports
router.get("/", async (req, res) => {
  try {
    const { data: orders, error: ordersError } =
      await supabase
        .from("orders")
        .select(`
          id,
          status,
          total,
          created_at,
          payment_method,
          payment_status,
          order_items (
            product_id,
            quantity,
            unit_price,
            products (
              name
            )
          )
        `)
        .order("created_at", { ascending: false });

    if (ordersError) throw ordersError;

    const allOrders = orders || [];

    // All completed orders
    const completedOrders = allOrders.filter(
      (order) => order.status === "completed"
    );

    // Completed COD sales only
    const actualOrders = completedOrders.filter(
      (order) => order.payment_method === "cod"
    );

    // Maya sandbox and legacy demo orders
    const demoOrders = allOrders.filter(
      (order) => ["maya", "maya_demo"].includes(order.payment_method)
    );

    // Successful, non-cancelled demo payments
    const successfulDemoOrders = demoOrders.filter(
      (order) =>
        (order.payment_method === "maya"
          ? order.payment_status === "paid"
          : order.payment_status === "simulated_paid") &&
        order.status !== "cancelled"
    );

    // Completed COD order value
    const revenue = actualOrders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );

    // Simulated payments
    const demoRevenue = successfulDemoOrders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );

    const averageOrder =
      actualOrders.length > 0
        ? revenue / actualOrders.length
        : 0;

    // BEST-SELLING PRODUCTS
    // Excludes demo orders
    const productSales = new Map();

    for (const order of actualOrders) {
      for (const item of order.order_items || []) {
        const id = item.product_id;

        const existing = productSales.get(id) || {
          id,
          name:
            item.products?.name || `Product #${id}`,
          quantity: 0,
          revenue: 0,
        };

        existing.quantity += Number(item.quantity);

        existing.revenue +=
          Number(item.quantity) *
          Number(item.unit_price);

        productSales.set(id, existing);
      }
    }

    const topProducts = [...productSales.values()]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // DAILY SALES
    const dailySales = new Map();

    for (const order of actualOrders) {
      const date = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(order.created_at));

      dailySales.set(
        date,
        (dailySales.get(date) || 0) +
          Number(order.total || 0)
      );
    }

    res.json({
      success: true,
      data: {
        totalOrders: allOrders.length,

        completedOrders: completedOrders.length,

        actualOrders: actualOrders.length,

        demoOrders: demoOrders.length,

        successfulDemoOrders:
          successfulDemoOrders.length,

        processingOrders: allOrders.filter(
          (o) => o.status === "processing"
        ).length,

        shippedOrders: allOrders.filter(
          (o) => o.status === "shipped"
        ).length,

        cancelledOrders: allOrders.filter(
          (o) => o.status === "cancelled"
        ).length,

        revenue,

        demoRevenue,

        averageOrder,

        topProducts,

        dailySales: [...dailySales.entries()]
          .map(([date, total]) => ({
            date,
            total,
          }))
          .sort((a, b) =>
            a.date.localeCompare(b.date)
          ),
      },
    });

  } catch (error) {
    console.error(
      "Admin reports error:",
      error.message
    );

    res.status(500).json({
      success: false,
      error: {
        message: "Unable to load sales reports.",
      },
    });
  }
});

module.exports = router;
