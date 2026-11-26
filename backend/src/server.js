
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { router: ordersRoutes, mayaWebhook } = require("./routes/orders");
const adminOrdersRoutes = require("./routes/adminOrders");
const productsRoutes = require("./routes/products");
const adminProductsRoutes = require("./routes/adminProducts");
const adminReportsRoutes = require("./routes/adminReports");
const aiRoutes = require("./routes/ai");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
}));

app.use(express.json({ limit: "100kb" }));

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "HardwareHub API is running",
  });
});

// PRODUCTS
app.use("/api/v1/products", productsRoutes);

// ADMIN PRODUCTS
app.use("/api/v1/admin/products", adminProductsRoutes);

// CUSTOMER ORDERS
app.use("/api/v1/orders", ordersRoutes);
app.post("/api/v1/webhooks/maya", mayaWebhook);

// ADMIN ORDERS
app.use("/api/v1/admin/orders", adminOrdersRoutes);

// SALES REPORTS
app.use("/api/v1/admin/reports", adminReportsRoutes);

// SHOPPING ASSISTANT
app.use("/api/v1/ai", aiRoutes);

// NOT FOUND
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "API endpoint not found",
    },
  });
});

app.listen(PORT, () => {
  console.log(`HardwareHub API running on port ${PORT}`);
});
