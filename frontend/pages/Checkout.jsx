import { useState } from "react";

const peso = (value) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    Number(value) || 0,
  );

export default function Checkout({
  cart = [],
  onPlaceOrder,
  submitting = false,
}) {
  const [delivery, setDelivery] = useState({
    fullName: "",
    phone: "",
    address: "",
  });
  const [error, setError] = useState("");
  const [method, setMethod] = useState("cod");
  const subtotal = cart.reduce(
    (sum, p) => sum + Number(p.price) * Number(p.quantity),
    0,
  );

  async function submit(event) {
    event.preventDefault();
    if (submitting) return;
    setError("");
    try {
      await onPlaceOrder(delivery, method);
    } catch (err) {
      setError(err.message || "Unable to place your order. Please try again.");
    }
  }

  return (
    <section
      className="checkout-page"
      style={{ maxWidth: 680, margin: "0 auto" }}
    >
      <div className="page-heading">
        <span className="eyebrow">SECURE CHECKOUT</span>
        <h1>Checkout</h1>
        <p>Review your items and enter your delivery information.</p>
      </div>
      <div className="order-summary" style={{ marginBottom: 24 }}>
        <h2>Order summary</h2>
        {cart.map((p) => (
          <div
            key={p.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 10,
            }}
          >
            <span>
              {p.name} × {p.quantity}
            </span>
            <strong>{peso(Number(p.price) * Number(p.quantity))}</strong>
          </div>
        ))}
        <div className="summary-total">
          <span>Estimated subtotal</span>
          <strong>{peso(subtotal)}</strong>
        </div>
        <p>Final prices and stock are verified by the server when you order.</p>
      </div>
      <form
        onSubmit={submit}
        className="auth-page"
        style={{ display: "grid", gap: 12, padding: 0, margin: 0, maxWidth: "none" }}
      >
        <h2>Delivery details</h2>
        <label htmlFor="cod-fullname">Full name</label>
        <input
          id="cod-fullname"
          required
          minLength={2}
          maxLength={100}
          autoComplete="name"
          value={delivery.fullName}
          onChange={(e) =>
            setDelivery((d) => ({ ...d, fullName: e.target.value }))
          }
        />
        <label htmlFor="cod-phone">Phone number</label>
        <input
          id="cod-phone"
          required
          minLength={7}
          maxLength={25}
          inputMode="tel"
          autoComplete="tel"
          value={delivery.phone}
          onChange={(e) =>
            setDelivery((d) => ({ ...d, phone: e.target.value }))
          }
        />
        <label htmlFor="cod-address">Complete delivery address</label>
        <textarea
          id="cod-address"
          required
          minLength={10}
          maxLength={500}
          rows={4}
          autoComplete="street-address"
          style={{
            width: "100%",
            padding: 14,
            border: "1px solid #d1d8d3",
            borderRadius: 9,
            font: "inherit",
          }}
          value={delivery.address}
          onChange={(e) =>
            setDelivery((d) => ({ ...d, address: e.target.value }))
          }
        />
        <fieldset
          disabled={submitting}
          style={{ border: "1px solid #d1d8d3", borderRadius: 9, padding: 12 }}
        >
          <legend>Payment method</legend>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              style={{ width: "auto" }}
              type="radio"
              name="payment"
              checked={method === "cod"}
              onChange={() => setMethod("cod")}
            />{" "}
            Cash on Delivery
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              style={{ width: "auto" }}
              type="radio"
              name="payment"
              disabled
              checked={false}
            />{" "}
            Maya — unavailable until gateway is configured
          </label>
        </fieldset>
        {error && (
          <p role="alert" style={{ color: "#b42318" }}>
            {error}
          </p>
        )}
        <button
          className="primary-btn"
          type="submit"
          disabled={submitting || cart.length === 0}
        >
          {submitting
            ? "Placing order..."
            : method === "cod"
              ? "Place COD order"
              : "Continue to Payment"}
        </button>
      </form>
    </section>
  );
}
