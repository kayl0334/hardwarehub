
import { useEffect, useState, useCallback } from "react";
import {
  Package,
  ShoppingBag,
  Truck,
  CheckCircle2,
  RefreshCw,
  XCircle,
  Clock,
} from "lucide-react";

import { getMyOrders } from "../api/orders";

const money = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value) || 0);

const steps = [
  { label: "Placed", icon: ShoppingBag },
  { label: "Processing", icon: Package },
  { label: "Shipped", icon: Truck },
  { label: "Completed", icon: CheckCircle2 },
];

const progress = {
  pending_payment: 0,
  paid: 0,
  processing: 1,
  shipped: 2,
  completed: 3,
};

const statusMessages = {
  pending_payment: "Waiting for your payment.",
  paid: "Your payment has been received.",
  processing: "Your order is being prepared.",
  shipped: "Your order is on its way!",
  completed: "Your order has been completed.",
  cancelled: "This order has been cancelled.",
};

function OrderTracker({ status }) {
  if (status === "cancelled") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: 16,
          background: "#fef2f2",
          color: "#b91c1c",
          borderRadius: 10,
          margin: "18px 0",
        }}
      >
        <XCircle size={22} />
        This order has been cancelled.
      </div>
    );
  }

  const current = progress[status] ?? 0;

  return (
    <div style={{ margin: "24px 0" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
        }}
      >
        {steps.map((step, index) => {
          const Icon = step.icon;
          const reached = index <= current;

          return (
            <div
              key={step.label}
              style={{
                flex: 1,
                textAlign: "center",
                position: "relative",
                minWidth: 0,
              }}
            >
              {index < steps.length - 1 && (
                <div
                  style={{
                    position: "absolute",
                    top: 21,
                    left: "50%",
                    width: "100%",
                    height: 3,
                    background:
                      index < current
                        ? "#166534"
                        : "#e5e7eb",
                  }}
                />
              )}

              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: reached
                    ? "#166534"
                    : "#f3f4f6",
                  color: reached
                    ? "#ffffff"
                    : "#9ca3af",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 8px",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <Icon size={21} />
              </div>

              <span
                style={{
                  fontSize: 11,
                  fontWeight: reached ? 600 : 400,
                  color: reached
                    ? "#166534"
                    : "#9ca3af",
                  overflowWrap: "anywhere",
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <p
        style={{
          background: "#f0fdf4",
          color: "#166534",
          padding: 12,
          borderRadius: 8,
          marginTop: 20,
          fontSize: 14,
        }}
      >
        {statusMessages[status] || status}
      </p>
    </div>
  );
}

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    setRefreshing(true);

    try {
      const data = await getMyOrders();

      setOrders(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      setError(
        err.message || "Unable to load your orders."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadOrders();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [loadOrders]);

  return (
    <section
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        padding: "24px 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <div>
          <span className="eyebrow">
            YOUR ACCOUNT
          </span>

          <h1>My Orders</h1>

          <p>
            Track your HardwareHub purchases.
          </p>
        </div>

        <button
          type="button"
          className="outline-btn"
          onClick={loadOrders}
          disabled={refreshing}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <RefreshCw size={17} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}

      {loading && <p>Loading your orders...</p>}

      {!loading && !error && orders.length === 0 && (
        <div
          className="state-panel"
          style={{
            textAlign: "center",
            padding: 40,
          }}
        >
          <ShoppingBag size={40} />
          <h2>No orders yet</h2>
          <p>Your purchases will appear here.</p>
        </div>
      )}

      {!loading &&
        orders.map((order) => (
          <article
            key={order.id}
            className="order-history-card"
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div
              className="order-history-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <strong>
                  Order #{order.id.slice(0, 8)}
                </strong>

                <p
                  style={{
                    color: "#64748b",
                    fontSize: 13,
                  }}
                >
                  {new Date(
                    order.created_at
                  ).toLocaleString("en-PH")}
                </p>
              </div>

              <span
                style={{
                  padding: "6px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: "capitalize",
                  background:
                    order.status === "cancelled"
                      ? "#fee2e2"
                      : "#dcfce7",
                  color:
                    order.status === "cancelled"
                      ? "#b91c1c"
                      : "#166534",
                }}
              >
                {order.status.replaceAll("_", " ")}
              </span>
            </div>

            <OrderTracker status={order.status} />

            <div style={{ background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 10, padding: 14, marginBottom: 20, overflowWrap: "anywhere" }}>
              <h3 style={{ marginTop: 0 }}>Payment details</h3>
              <p>Payment method: <strong>{order.payment_method === "maya_demo" ? "Maya (test)" : order.payment_method === "cod" ? "Cash on Delivery" : "Not available"}</strong></p>
              <p>Payment status: <strong>{order.status === "cancelled" ? "Order cancelled" : order.payment_status === "simulated_paid" ? "Paid (test)" : order.payment_status === "unpaid" ? "Unpaid / not verified" : order.payment_status === "simulated_cancelled" ? "Cancelled (test)" : order.payment_status || "Not available"}</strong></p>
              {order.payment_reference && <p>Payment reference: <strong>{order.payment_reference}</strong></p>}
              {order.payment_method === "maya_demo" && (
                <small style={{ color: "#166534" }}>Test payment only. No real money was charged.</small>
              )}
            </div>

            <h3>Order Items</h3>

            {(order.order_items || []).map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 0",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                {item.products?.image_url ? (
                  <img
                    src={item.products.image_url}
                    alt={item.products.name || "Product"}
                    loading="lazy"
                    style={{
                      width: 60,
                      height: 60,
                      objectFit: "contain",
                      borderRadius: 8,
                      background: "#f8fafc",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      display: "grid",
                      placeItems: "center",
                      background: "#f3f4f6",
                      borderRadius: 8,
                    }}
                  >
                    <Package size={24} />
                  </div>
                )}

                <div style={{ flex: 1 }}>
                  <strong>
                    {item.products?.name ||
                      `Product #${item.product_id}`}
                  </strong>

                  <p
                    style={{
                      color: "#64748b",
                      fontSize: 13,
                    }}
                  >
                    Quantity: {item.quantity}
                  </p>

                  <small>
                    {money(item.unit_price)} each
                  </small>
                </div>

                <strong>
                  {money(
                    item.quantity * item.unit_price
                  )}
                </strong>
              </div>
            ))}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                paddingTop: 18,
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              <span>Order Total</span>
              <span style={{ color: "#166534" }}>
                {money(order.total)}
              </span>
            </div>
          </article>
        ))}

      <p
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          color: "#64748b",
          marginTop: 20,
        }}
      >
        <Clock size={14} />
        Order status refreshes every 30 seconds
        while this page is open.
      </p>
    </section>
  );
}
