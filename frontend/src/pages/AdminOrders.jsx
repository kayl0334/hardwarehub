import { useEffect, useMemo, useState } from "react";
import {
  Package,
  RefreshCw,
  Truck,
  CheckCircle2,
  Search,
  XCircle,
} from "lucide-react";

import {
  getAdminOrders,
  updateOrderStatus,
  cancelAdminOrder,
} from "../api/adminOrders";

const money = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value) || 0);

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  async function loadOrders() {
    setLoading(true);
    setError("");

    try {
      const data = await getAdminOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Unable to load orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const stats = useMemo(
    () => ({
      total: orders.length,
      processing: orders.filter(
        (o) => o.status === "processing"
      ).length,
      shipped: orders.filter(
        (o) => o.status === "shipped"
      ).length,
      completed: orders.filter(
        (o) => o.status === "completed"
      ).length,
      cancelled: orders.filter(
        (o) => o.status === "cancelled"
      ).length,
    }),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "all" ||
        order.status === statusFilter;

      const searchable = [
        order.id,
        order.user_id,
        order.shipping_address,
        order.payment_method,
        order.payment_status,
        order.payment_reference,
        order.payment_method === "maya" ? "Maya Sandbox" : order.payment_method === "maya_demo" ? "Maya (test)" : "Cash on Delivery",
        ...(order.order_items || []).map(
          (item) => item.products?.name || ""
        ),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        matchesStatus &&
        (!keyword || searchable.includes(keyword))
      );
    });
  }, [orders, search, statusFilter]);

  async function changeStatus(order, status) {
    if (savingId) return;

    setSavingId(order.id);
    setMessage("");
    setError("");

    try {
      await updateOrderStatus(order.id, status);
      await loadOrders();
      setMessage("Order status updated successfully.");
    } catch (err) {
      setError(err.message || "Unable to update order.");
    } finally {
      setSavingId(null);
    }
  }

  async function cancelOrder(order) {
    if (savingId) return;

    const confirmed = window.confirm(
      `Cancel order #${order.id.slice(0, 8)}?\n\n` +
      "Purchased items will be returned to inventory."
    );

    if (!confirmed) return;

    setSavingId(order.id);
    setMessage("");
    setError("");

    try {
      await cancelAdminOrder(order.id);
      await loadOrders();
      setMessage(
        "Order cancelled successfully. Inventory restored."
      );
    } catch (err) {
      setError(err.message || "Unable to cancel order.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section style={{ padding: "20px 0" }}>
      <div className="page-heading">
        <span className="eyebrow">STORE MANAGEMENT</span>
        <h1>Customer Orders</h1>
        <p>View and manage HardwareHub orders.</p>
      </div>

      {/* STATISTICS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(145px, 1fr))",
          gap: 14,
          margin: "20px 0",
        }}
      >
        {[
          ["Total Orders", stats.total],
          ["Processing", stats.processing],
          ["Shipped", stats.shipped],
          ["Completed", stats.completed],
          ["Cancelled", stats.cancelled],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              padding: 18,
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
            }}
          >
            <p
              style={{
                fontSize: 13,
                color: "#64748b",
                margin: 0,
              }}
            >
              {label}
            </p>
            <h2 style={{ margin: "8px 0 0" }}>
              {value}
            </h2>
          </div>
        ))}
      </div>

      {/* SEARCH AND FILTER */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flex: "1 1 240px",
            padding: "0 12px",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            background: "#fff",
          }}
        >
          <Search size={18} color="#64748b" />
          <input
            type="search"
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 0",
              border: "none",
              outline: "none",
              background: "transparent",
            }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value)
          }
          style={{
            padding: 12,
            border: "1px solid #d1d5db",
            borderRadius: 8,
            background: "#fff",
          }}
        >
          <option value="all">All Orders</option>
          <option value="pending_payment">
            Pending Payment
          </option>
          <option value="paid">Paid</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <button
          type="button"
          className="hh-admin-secondary"
          onClick={loadOrders}
          disabled={loading || savingId !== null}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {message && (
        <p role="status" style={{ color: "#15803d" }}>
          {message}
        </p>
      )}

      {error && (
        <p role="alert" style={{ color: "#b42318" }}>
          {error}
        </p>
      )}

      {loading && <p>Loading orders...</p>}

      {!loading && !error && orders.length === 0 && (
        <div className="state-panel">
          <Package size={32} />
          <h3>No customer orders yet</h3>
        </div>
      )}

      {!loading &&
        !error &&
        orders.length > 0 &&
        filteredOrders.length === 0 && (
          <p>No orders match your search or filter.</p>
        )}

      {/* ORDER CARDS */}
      {!loading &&
        filteredOrders.map((order) => (
          <article
            key={order.id}
            className="order-history-card"
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <div className="order-history-header">
              <div>
                <strong>
                  <Package size={17} />
                  {" "}Order #{order.id.slice(0, 8)}
                </strong>
                <small style={{ display: "block" }}>
                  {new Date(
                    order.created_at
                  ).toLocaleString()}
                </small>
              </div>

              <span className="order-status">
                {order.status.replaceAll("_", " ")}
              </span>
            </div>

            <p>
              <strong>Customer ID:</strong>{" "}
              {order.user_id}
            </p>

            <p style={{ whiteSpace: "pre-line" }}>
              <strong>Delivery details:</strong>
              {"\n"}
              {order.shipping_address || "Not provided"}
            </p>

            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: 14, margin: "16px 0", color: "#166534", overflowWrap: "anywhere" }}>
              <h3 style={{ marginTop: 0 }}>Payment details</h3>
              <p><strong>Payment method:</strong>{" "}
                {order.payment_method === "maya" ? "Maya Sandbox" : order.payment_method === "maya_demo" ? "Pay with Maya (test)" : order.payment_method === "cod" ? "Cash on Delivery" : order.payment_method || "Not recorded"}
              </p>
              <p><strong>Payment status:</strong>{" "}
                {({ unpaid: "Unpaid", paid: "Paid", simulated_paid: "Paid (test)", simulated_voided: "Voided (test)" })[order.payment_status] || order.payment_status || "Not recorded"}
              </p>
              {order.payment_reference && <p><strong>Reference:</strong> {order.payment_reference}</p>}
              {order.payment_method === "maya_demo" && <small>Test payment only. No real money was charged.</small>}
              {order.payment_method === "maya_demo" && order.status === "cancelled" && order.payment_status !== "simulated_voided" && <p>Cancelled order — test payment status requires reconciliation.</p>}
            </div>

            <div className="order-history-items">
              {(order.order_items || []).map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 8,
                  }}
                >
                  <span>
                    {item.products?.name ||
                      `Product #${item.product_id}`}
                    {" "}× {item.quantity}
                  </span>

                  <strong>
                    {money(
                      item.quantity * item.unit_price
                    )}
                  </strong>
                </div>
              ))}
            </div>

            <div className="order-history-total">
              <span>Total</span>
              <strong>{money(order.total)}</strong>
            </div>

            {/* ORDER ACTIONS */}
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 16,
                flexWrap: "wrap",
              }}
            >
              {order.status === "processing" && (
                <>
                  <button
                    type="button"
                    className="hh-admin-primary"
                    disabled={savingId !== null}
                    onClick={() =>
                      changeStatus(order, "shipped")
                    }
                  >
                    <Truck size={17} />
                    Mark as Shipped
                  </button>

                  <button
                    type="button"
                    className="hh-admin-secondary"
                    disabled={savingId !== null}
                    onClick={() => cancelOrder(order)}
                    style={{
                      color: "#b42318",
                      borderColor: "#f1b5b0",
                    }}
                  >
                    <XCircle size={17} />
                    Cancel Order
                  </button>
                </>
              )}

              {order.status === "shipped" && (
                <button
                  type="button"
                  className="hh-admin-primary"
                  disabled={savingId !== null}
                  onClick={() =>
                    changeStatus(order, "completed")
                  }
                >
                  <CheckCircle2 size={17} />
                  Mark as Completed
                </button>
              )}
            </div>
          </article>
        ))}
    </section>
  );
}
