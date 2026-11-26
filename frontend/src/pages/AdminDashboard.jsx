import { useCallback, useEffect, useMemo, useState } from "react";
import AdminOrders from "./AdminOrders";
import AdminReports from "./AdminReports";
import {
  Archive,
  ArrowLeft,
  Boxes,
  CircleAlert,
  LogOut,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import "./AdminDashboard.css";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";
const peso = (n) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    Number(n) || 0,
  );
const blank = {
  name: "",
  description: "",
  price: "",
  stock: "",
  category_id: "",
  image_url: "",
};

export default function AdminDashboard({ session, onLogout }) {
  const [products, setProducts] = useState([]);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [activeTab, setActiveTab] = useState("inventory");

  const loadProducts = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/admin/products`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await response.json();
      if (!response.ok || !result.success || !Array.isArray(result.data)) {
        throw new Error(result.error?.message || "Unable to load inventory.");
      }
      setProducts(result.data);
    } catch (err) {
      setError(err.message || "Unable to load inventory.");
    } finally {
      setBusy(false);
    }
  }, [session.access_token]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const active = products.filter((p) => p.is_active !== false);
  const lowStock = active.filter((p) => Number(p.stock) <= 5);
  const categories = [
    ...new Map(
      products
        .filter((p) => p.category_id != null)
        .map((p) => [
          String(p.category_id),
          {
            id: String(p.category_id),
            name: p.category?.name || `Category ${p.category_id}`,
          },
        ]),
    ).values(),
  ];
  const shown = useMemo(
    () =>
      products.filter(
        (p) =>
          (showArchived || p.is_active !== false) &&
          `${p.name} ${p.description || ""}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [products, query, showArchived],
  );

  function startAdd() {
    setEditing("new");
    setForm({ ...blank, category_id: categories[0]?.id || "" });
    setError("");
  }
  function startEdit(p) {
    setEditing(p.id);
    setForm({
      name: p.name || "",
      description: p.description || "",
      price: String(p.price ?? ""),
      stock: String(p.stock ?? ""),
      category_id: String(p.category_id ?? ""),
      image_url: p.image_url || "",
    });
    setError("");
  }

  async function saveProduct(event) {
    event.preventDefault();
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      stock: Number(form.stock),
      category_id: Number(form.category_id),
      image_url: form.image_url.trim() || null,
    };
    if (
      !payload.name ||
      form.price === "" ||
      !Number.isFinite(payload.price) ||
      payload.price < 0 ||
      form.stock === "" ||
      !Number.isSafeInteger(payload.stock) ||
      payload.stock < 0 ||
      !Number.isSafeInteger(payload.category_id) ||
      payload.category_id < 1
    ) {
      setError(
        "Enter a name, valid price, whole-number stock, and category ID.",
      );
      return;
    }
    setSaving(true);
    setError("");
    try {
      const isNew = editing === "new";
      const response = await fetch(
        `${API_BASE}/admin/products${isNew ? "" : `/${editing}`}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.error?.message || "Unable to save product.");
      setEditing(null);
      setNotice(
        isNew ? "Product added successfully." : "Product updated successfully.",
      );
      await loadProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function archiveProduct(p) {
    if (
      !window.confirm(
        `Archive ${p.name}? It will disappear from the customer store.`,
      )
    )
      return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/admin/products/${p.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.error?.message || "Unable to archive product.");
      setNotice(`${p.name} archived.`);
      await loadProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="hh-admin">
      <header className="hh-admin-header">
        <div className="hh-admin-brand">
          <span className="hh-admin-brand-icon">
            <ShieldCheck size={22} />
          </span>
          <div>
            <strong>HardwareHub</strong>
            <small>Store administration</small>
          </div>
        </div>
        <button type="button" className="hh-admin-signout" onClick={onLogout}>
          <LogOut size={17} /> Sign out
        </button>
      </header>
      <main className="hh-admin-main">
        <nav aria-label="Admin sections" style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <button type="button" className={activeTab === "inventory" ? "hh-admin-primary" : "hh-admin-secondary"} onClick={() => setActiveTab("inventory")}>
            <Boxes size={17} /> Inventory
          </button>
          <button type="button" className={activeTab === "orders" ? "hh-admin-primary" : "hh-admin-secondary"} onClick={() => setActiveTab("orders")}>
            <Package size={17} /> Orders
          </button>
          <button type="button" className={activeTab === "reports" ? "hh-admin-primary" : "hh-admin-secondary"} onClick={() => setActiveTab("reports")}>
            Sales Reports
          </button>
        </nav>
        {activeTab === "inventory" && (
          <>
        <div className="hh-admin-heading">
          <div>
            <span className="hh-admin-kicker">STORE MANAGEMENT</span>
            <h1>Inventory dashboard</h1>
            <p>Manage products, prices and stock in one place.</p>
          </div>
          <button className="hh-admin-primary" onClick={startAdd}>
            <Plus size={18} /> Add product
          </button>
        </div>
        <section className="hh-admin-stats" aria-label="Inventory statistics">
          <div>
            <Package size={21} />
            <span>Active products</span>
            <strong>{active.length}</strong>
          </div>
          <div>
            <Boxes size={21} />
            <span>Total units in stock</span>
            <strong>
              {active.reduce((n, p) => n + Number(p.stock || 0), 0)}
            </strong>
          </div>
          <div>
            <CircleAlert size={21} />
            <span>Low stock (5 or less)</span>
            <strong>{lowStock.length}</strong>
          </div>
        </section>
        <section className="hh-admin-panel">
          <div className="hh-admin-panel-head">
            <div>
              <h2>Product inventory</h2>
              <p>Changes are saved through your protected Express API.</p>
            </div>
            <button
              className="hh-admin-secondary"
              onClick={loadProducts}
              disabled={busy}
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
          <div className="hh-admin-tools">
            <label className="hh-admin-search">
              <Search size={18} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search inventory..."
                aria-label="Search inventory"
              />
            </label>
            <label className="hh-admin-toggle">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
              />{" "}
              Show archived
            </label>
          </div>
          {notice && (
            <p className="hh-admin-notice" role="status">
              {notice}
            </p>
          )}
          {error && (
            <p className="hh-admin-error" role="alert">
              {error}
            </p>
          )}
          {busy ? (
            <p className="hh-admin-empty">Loading inventory...</p>
          ) : shown.length === 0 ? (
            <p className="hh-admin-empty">No products match your filters.</p>
          ) : (
            <div className="hh-admin-table-wrap">
              <table className="hh-admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="hh-admin-product">
                          {p.image_url ? (
                            <img src={p.image_url} alt="" loading="lazy" />
                          ) : (
                            <span className="hh-admin-thumb">
                              <Package size={22} />
                            </span>
                          )}
                          <div>
                            <strong>{p.name}</strong>
                            <small>
                              #{p.id} · Category {p.category_id}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>{peso(p.price)}</td>
                      <td>
                        <span
                          className={Number(p.stock) <= 5 ? "hh-admin-low" : ""}
                        >
                          {p.stock}
                        </span>
                      </td>
                      <td>
                        <span
                          className={
                            p.is_active === false
                              ? "hh-admin-pill archived"
                              : "hh-admin-pill"
                          }
                        >
                          {p.is_active === false ? "Archived" : "Active"}
                        </span>
                      </td>
                      <td>
                        <div className="hh-admin-actions">
                          <button
                            onClick={() => startEdit(p)}
                            disabled={saving || p.is_active === false}
                          >
                            <Pencil size={15} /> Edit
                          </button>
                          <button
                            onClick={() => archiveProduct(p)}
                            disabled={saving || p.is_active === false}
                          >
                            <Archive size={15} /> Archive
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <p className="hh-admin-footnote">
          Product image URLs can be pasted into the form. Image uploads and
          payments will be added separately.
        </p>
          </>
        )}
        {activeTab === "orders" && <AdminOrders />}
        {activeTab === "reports" && <AdminReports />}
      </main>
      {editing !== null && (
        <div
          className="hh-admin-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving) setEditing(null);
          }}
        >
          <section
            className="hh-admin-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={editing === "new" ? "Add product" : "Edit product"}
          >
            <div className="hh-admin-dialog-title">
              <h2>{editing === "new" ? "Add new product" : "Edit product"}</h2>
              <button
                aria-label="Close"
                onClick={() => setEditing(null)}
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={saveProduct}>
              <label>
                Product name
                <input
                  required
                  maxLength={150}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label>
                Description
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </label>
              <div className="hh-admin-form-grid">
                <label>
                  Price (₱)
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                  />
                </label>
                <label>
                  Stock
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={form.stock}
                    onChange={(e) =>
                      setForm({ ...form, stock: e.target.value })
                    }
                  />
                </label>
              </div>
              <label>
                Category ID
                <select
                  required
                  value={form.category_id}
                  onChange={(e) =>
                    setForm({ ...form, category_id: e.target.value })
                  }
                >
                  <option value="">Choose a category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Product image URL (optional)
                <input
                  type="url"
                  placeholder="https://..."
                  value={form.image_url}
                  onChange={(e) =>
                    setForm({ ...form, image_url: e.target.value })
                  }
                />
              </label>
              {error && (
                <p className="hh-admin-error" role="alert">
                  {error}
                </p>
              )}
              <div className="hh-admin-dialog-actions">
                <button
                  type="button"
                  className="hh-admin-secondary"
                  onClick={() => setEditing(null)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  className="hh-admin-primary"
                  disabled={saving}
                  type="submit"
                >
                  {saving
                    ? "Saving..."
                    : editing === "new"
                      ? "Add product"
                      : "Save changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
