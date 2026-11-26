const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
const AIChat = lazy(() => import("./components/AIChat"));
import {
  Hammer,
  ShoppingCart,
  Search,
  Package,
  LogOut,
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  SlidersHorizontal,
  ShieldCheck,
  Truck,
  Wrench,
  X,
  UserRound,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { getProducts } from "./api/products";
import { supabase } from "./lib/supabase";
import MyOrders from "./pages/MyOrders";
import Checkout from "./pages/Checkout";
import { placeOrder } from "./api/orders";
import Login from "./pages/Login";
import Register from "./pages/Register";
import "./App.css";

const money = (amount) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    Number(amount) || 0,
  );
const cartKey = (id) => `hardwarehub-cart-${id}`;

function getMayaReturnOrderId() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("orderId");
  return params.has("mayaStatus") &&
    /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)
    ? id
    : null;
}

export default function App() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => { const update = () => setOnline(navigator.onLine); window.addEventListener('online',update); window.addEventListener('offline',update); return () => {window.removeEventListener('online',update);window.removeEventListener('offline',update);}; }, []);
  const [role, setRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authPage, setAuthPage] = useState("login");
  const [mayaReturnOrderId] = useState(getMayaReturnOrderId);
  const [page, setPage] = useState(() => mayaReturnOrderId ? "orders" : "shop");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All products");
  const [sort, setSort] = useState("featured");
  const [cart, setCart] = useState({});
  const [cartOwner, setCartOwner] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(
    () => window.location.pathname.match(/^\/products\/(\d+)\/?$/)?.[1] ?? null,
  );
  const selected = products.find((product) => String(product.id) === selectedProductId);

  function setSelected(product) {
    setSelectedProductId(product ? String(product.id) : null);
    if (!product && window.location.pathname.startsWith("/products/")) {
      window.history.replaceState(null, "", "/");
    }
  }
  const [failedImages, setFailedImages] = useState({});
  const [toast, setToast] = useState("");

  const [checkoutKey, setCheckoutKey] = useState(() => crypto.randomUUID());
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);

  const [orderSuccess, setOrderSuccess] = useState(null);

  async function handlePlaceOrder(
  delivery,
  paymentMethod = "cod",
) {
  if (!navigator.onLine) {
    throw new Error(
      "Checkout requires an internet connection.",
    );
  }

  if (checkoutSubmitting) return;

  if (!cartItems.length) {
    throw new Error("Your cart is empty.");
  }

  const items = cartItems.map((product) => ({
    product_id: Number(product.id),
    quantity: Math.min(
      Number(cart[product.id]),
      Number(product.stock),
    ),
  }));

  if (
    items.some(
      (item) =>
        !Number.isInteger(item.quantity) ||
        item.quantity < 1,
    )
  ) {
    throw new Error(
      "Please review product availability before checkout.",
    );
  }

  setCheckoutSubmitting(true);

  try {
    const result = await placeOrder(
      {
        delivery,
        items,
        payment_method: paymentMethod,
      },
      checkoutKey,
    );

    // MAYA SANDBOX
    if (paymentMethod === "maya") {
      if (result.payment_status !== "pending") {
        setCheckoutKey(crypto.randomUUID());
        setPage("orders");
        return result;
      }

      const checkoutUrl = result.redirectUrl;

      if (!checkoutUrl) {
        throw new Error(
          "Maya checkout is not available yet.",
        );
      }

      const url = new URL(checkoutUrl);

      const allowedHosts = [
        "payments-web-sandbox.maya.ph",
        "payments-web-sandbox.paymaya.com",
      ];

      if (
        url.protocol !== "https:" || url.username || url.password || url.port ||
        !allowedHosts.includes(url.hostname)
      ) {
        throw new Error(
          "Invalid sandbox checkout destination.",
        );
      }

      window.location.assign(url.href);
      return result;
    }

    // CASH ON DELIVERY
    setOrderSuccess(result);
    setCart({});
    setCheckoutKey(crypto.randomUUID());
    setPage("order-success");

    getProducts()
      .then(setProducts)
      .catch(() => {});

    return result;
  } finally {
    setCheckoutSubmitting(false);
  }
}

  useEffect(() => {
    let cancelled = false;

    async function loadRole() {
      if (!session?.user?.id) {
        setRole(null);
        setRoleLoading(false);
        return;
      }

      setRoleLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (cancelled) return;

      if (error) {
        console.error("Role lookup failed:", error.message);
        setRole(null);
      } else {
        setRole(data.role);
      }

      setRoleLoading(false);
    }

    loadRole();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, online]);

  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return;
        if (sessionError) console.error("Session:", sessionError.message);
        setSession(data?.session ?? null);
        setAuthLoading(false);
      })
      .catch(() => {
        if (active) setAuthLoading(false);
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setAuthLoading(false);
      if (_event === "SIGNED_OUT") {
        setPage("shop");
        setSelected(null);
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const id = session?.user?.id ?? null;
    if (!id) {
      setCart({});
      setCartOwner(null);
      return;
    }
    try {
      const stored = JSON.parse(localStorage.getItem(cartKey(id)) || "{}");
      setCart(
        stored && typeof stored === "object" && !Array.isArray(stored)
          ? stored
          : {},
      );
    } catch {
      setCart({});
    }
    setCartOwner(id);
  }, [session?.user?.id]);

  useEffect(() => {
    if (cartOwner && cartOwner === session?.user?.id) {
      localStorage.setItem(cartKey(cartOwner), JSON.stringify(cart));
    }
  }, [cart, cartOwner, session?.user?.id]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const data = await getProducts(controller.signal);
        if (!Array.isArray(data))
          throw new Error("Unexpected products response");
        setProducts(data);
        setError("");
      } catch (err) {
        if (err.name !== "AbortError")
          setError(
            "Couldn't load products. Check that the Express server is running.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);

  const categories = useMemo(
    () => [
      "All products",
      ...new Set(products.map((p) => p.category?.name).filter(Boolean)),
    ],
    [products],
  );
  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const items = products.filter(
      (p) =>
        (category === "All products" || p.category?.name === category) &&
        (!q ||
          `${p.name} ${p.description || ""} ${p.category?.name || ""}`
            .toLowerCase()
            .includes(q)),
    );
    if (sort === "price-low")
      items.sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === "price-high")
      items.sort((a, b) => Number(b.price) - Number(a.price));
    if (sort === "name") items.sort((a, b) => a.name.localeCompare(b.name));
    return items;
  }, [products, search, category, sort]);
  const count = Object.values(cart).reduce(
    (total, qty) => total + Number(qty || 0),
    0,
  );
  const cartItems = products.filter((p) => Number(cart[p.id]) > 0);
  const subtotal = cartItems.reduce(
    (total, p) =>
      total + Number(p.price) * Math.min(Number(cart[p.id]), Number(p.stock)),
    0,
  );

  function changeQty(product, delta) {
    const stock = Math.max(0, Number(product.stock));
    const existing = Number(cart[product.id] || 0);
    const next = Math.min(stock, Math.max(0, existing + delta));
    if (delta > 0 && next === existing) {
      setToast("Maximum available stock reached");
      return;
    }
    setCart((current) => {
      const updated = { ...current };
      if (next === 0) delete updated[product.id];
      else updated[product.id] = next;
      return updated;
    });
    if (delta > 0) setToast(`${product.name} added to cart`);
  }

  async function logout() {
    const { error: logoutError } = await supabase.auth.signOut();
    if (logoutError) {
      setToast(logoutError.message);
      return;
    }
    setSession(null);
    setAuthPage("login");
    setPage("shop");
    setSelected(null);
  }

  function productImage(p, cls = "") {
    return (
      <div className={`product-image ${cls}`}>
        {p.image_url && !failedImages[p.id] ? (
          <img
            src={p.image_url}
            alt={p.name}
            loading="lazy"
            onError={() =>
              setFailedImages((prev) => ({ ...prev, [p.id]: true }))
            }
          />
        ) : (
          <div className="no-image">
            <Package size={36} strokeWidth={1.4} />
            <small>Image coming soon</small>
          </div>
        )}
      </div>
    );
  }

  if (authLoading)
    return (
      <div className="boot-screen">
        <div className="brand-symbol">
          <Hammer size={29} />
        </div>
        <h2>HardwareHub</h2>
        <p>Preparing your store...</p>
      </div>
    );

  if (!session)
    return (
      <div className="auth-shell">
        {!online && <p className="offline-banner" role="status">Offline — sign in requires internet.</p>}
        <div className="auth-brand">
          <div className="brand-symbol">
            <Hammer size={28} />
          </div>
          <span>
            HARDWARE<span className="brand-accent">HUB</span>
          </span>
        </div>
        <div className="auth-intro">
          <span className="eyebrow">BUILT FOR EVERY PROJECT</span>
          <h1>
            Everything you need.
            <br />
            <em>All in one place.</em>
          </h1>
          <p>
            Shop quality tools, materials, and everyday hardware essentials.
          </p>
        </div>
        <div className="auth-panel">
          {authPage === "login" ? (
            <Login offline={!online} onRegisterClick={() => setAuthPage("register")} />
          ) : (
            <Register offline={!online} onLoginClick={() => setAuthPage("login")} />
          )}
        </div>
        <div className="auth-foot">
          <ShieldCheck size={15} /> Secure account access · HardwareHub
        </div>
      </div>
    );

  // Separate store management from customer shopping after verifying the role.
  if (roleLoading && online) {
    return (
      <div className="boot-screen">
        <h2>HardwareHub</h2>
        <p>Checking account permissions...</p>
      </div>
    );
  }
  if (role === "admin" && online) {
    return <Suspense fallback={<p>Loading dashboard…</p>}><AdminDashboard session={session} onLogout={logout} /></Suspense>;
  }
  if (role !== "customer" && online) {
    return (
      <div className="boot-screen">
        <h2>Account access unavailable</h2>
        <p>
          Unable to verify your account role. Please sign out and try again.
        </p>
        <button onClick={logout}>Sign out</button>
      </div>
    );
  }

  return (
    <div className="app">
      {!online && <p className="offline-banner" role="status">Offline mode — cached products and cart only.</p>}
      <header className="header">
        <button
          className="brand-button"
          onClick={() => {
            setPage("shop");
            setSelected(null);
          }}
          aria-label="HardwareHub home"
        >
          <span className="brand-mark">
            <Hammer size={21} />
          </span>
          <span>
            Hardware<span className="brand-accent">Hub</span>
          </span>
        </button>
        <div className="header-actions">
          <button
            className="icon-button header-cart"
            onClick={() => setPage("cart")}
            aria-label={`Cart with ${count} items`}
          >
            <ShoppingCart size={20} />
            {count > 0 && <span className="cart-badge">{count}</span>}
          </button>
          <button
            className="avatar-button"
            onClick={() => setPage("account")}
            aria-label="My account"
          >
            <UserRound size={19} />
          </button>
        </div>
      </header>
      {page === "shop" && (
        <main>
          <section className="hero">
            <div className="hero-content">
              <span className="hero-kicker">
                <Wrench size={14} /> YOUR PROJECT STARTS HERE
              </span>
              <h1>
                Tools for every
                <br />
                <span>great idea.</span>
              </h1>
              <p>Reliable hardware essentials, right at your fingertips.</p>
              <button
                className="hero-cta"
                onClick={() =>
                  document
                    .getElementById("catalog")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Explore products <ArrowRight size={16} />
              </button>
            </div>
            <div className="hero-graphic" aria-hidden="true">
              <Hammer size={104} strokeWidth={1.1} />
            </div>
          </section>
          <section className="trust-row">
            <div>
              <ShieldCheck size={18} />
              <span>Quality picks</span>
            </div>
            <div>
              <Truck size={18} />
              <span>Easy ordering</span>
            </div>
            <div>
              <CheckCircle2 size={18} />
              <span>Local hardware</span>
            </div>
          </section>
          <div id="catalog" className="catalog-heading">
            <div>
              <span className="eyebrow">THE HARDWARE EDIT</span>
              <h2>Shop essentials</h2>
            </div>
            <span className="result-count">
              {visibleProducts.length} products
            </span>
          </div>
          <label className="search-box">
            <Search size={19} />
            <input
              type="search"
              placeholder="Search tools, pipes, nails..."
              aria-label="Search products"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button aria-label="Clear search" onClick={() => setSearch("")}>
                <X size={17} />
              </button>
            )}
          </label>
          <div className="filters">
            <div className="category-scroll" aria-label="Product categories">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`chip ${category === cat ? "active" : ""}`}
                  onClick={() => setCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            <label className="sort-wrap">
              <SlidersHorizontal size={15} />
              <select
                aria-label="Sort products"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
                <option value="name">Name: A–Z</option>
              </select>
            </label>
          </div>
          {loading ? (
            <div className="state-panel">Loading products...</div>
          ) : error ? (
            <div className="state-panel">
              <Package size={30} />
              <p>{error}</p>
              <button
                className="outline-btn"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="state-panel">
              <Search size={30} />
              <h3>No matching products</h3>
              <p>Try another search or category.</p>
              <button
                className="outline-btn"
                onClick={() => {
                  setSearch("");
                  setCategory("All products");
                }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <section className="products" aria-label="Products">
              {visibleProducts.map((p) => (
                <article className="product-card" key={p.id}>
                  <button
                    className="product-preview"
                    onClick={() => setSelected(p)}
                    aria-label={`View details for ${p.name}`}
                  >
                    {productImage(p)}
                    <span className="view-hint">View details</span>
                  </button>
                  <div className="product-body">
                    <span className="category">
                      {p.category?.name || "Hardware"}
                    </span>
                    <a className="product-name" href={`/products/${p.id}`}
                      onClick={(event) => {
                        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
                        event.preventDefault();
                        setSelected(p);
                      }}
                    >
                      {p.name}
                    </a>
                    <p className="price">{money(p.price)}</p>
                    <span
                      className={`stock ${Number(p.stock) > 0 ? "" : "sold-out"}`}
                    >
                      {Number(p.stock) > 0
                        ? `${p.stock} available`
                        : "Out of stock"}
                    </span>
                    <button
                      className="add-button"
                      disabled={Number(p.stock) <= 0}
                      onClick={() => changeQty(p, 1)}
                    >
                      <Plus size={16} />
                      {Number(p.stock) > 0 ? "Add to cart" : "Unavailable"}
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )}
          <footer className="store-footer">
            <div>
              <Hammer size={20} />
              <strong>HardwareHub</strong>
            </div>
            <p>Helping you build better, one project at a time.</p>
            <small>© {new Date().getFullYear()} HardwareHub</small>
          </footer>
        </main>
      )}
      {page === "cart" && (
        <main className="inner-page">
          <button className="text-back" onClick={() => setPage("shop")}>
            <ArrowLeft size={17} /> Continue shopping
          </button>
          <div className="page-heading">
            <span className="eyebrow">YOUR SELECTION</span>
            <h1>
              Shopping cart <span>({count})</span>
            </h1>
            <p>Review your items before checkout.</p>
          </div>
          {cartItems.length === 0 ? (
            <div className="state-panel tall">
              <ShoppingCart size={44} />
              <h3>Your cart is empty</h3>
              <p>Discover useful tools and supplies for your next project.</p>
              <button className="primary-btn" onClick={() => setPage("shop")}>
                Browse products <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <>
              <div className="cart-list">
                {cartItems.map((p) => (
                  <div className="cart-item" key={p.id}>
                    {productImage(p, "cart-thumb")}
                    <div className="cart-details">
                      <strong>{p.name}</strong>
                      <span>{money(p.price)}</span>
                      <div className="qty-control">
                        <button
                          aria-label={`Remove one ${p.name}`}
                          onClick={() => changeQty(p, -1)}
                        >
                          <Minus size={15} />
                        </button>
                        <span>
                          {Math.min(Number(cart[p.id]), Number(p.stock))}
                        </span>
                        <button
                          aria-label={`Add one ${p.name}`}
                          disabled={Number(cart[p.id]) >= Number(p.stock)}
                          onClick={() => changeQty(p, 1)}
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                    </div>
                    <button
                      className="remove-item"
                      aria-label={`Remove ${p.name}`}
                      onClick={() =>
                        setCart((current) => {
                          const updated = { ...current };
                          delete updated[p.id];
                          return updated;
                        })
                      }
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="order-summary">
                <h2>Order summary</h2>
                <div>
                  <span>Items ({count})</span>
                  <strong>{money(subtotal)}</strong>
                </div>
                <div className="summary-total">
                  <span>Subtotal</span>
                  <strong>{money(subtotal)}</strong>
                </div>
                <p>Choose your payment method at checkout.</p>
                <button
                  className="primary-btn"
                  type="button"
                  disabled={!online}
                  title={!online ? "Checkout requires an internet connection" : undefined}
                  onClick={() => setPage("checkout")}
                >
                  Proceed to checkout <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}
        </main>
      )}
      {page === "checkout" && (
        <main className="inner-page">
          <button className="text-back" onClick={() => setPage("cart")}>
            <ArrowLeft size={17} /> Back to cart
          </button>
          {!online && <p>Checkout and payment require an internet connection.</p>}
          <Checkout
            cart={cartItems.map((product) => ({
              ...product,
              quantity: Math.min(
                Number(cart[product.id]),
                Number(product.stock),
              ),
            }))}
            onPlaceOrder={handlePlaceOrder}
            submitting={checkoutSubmitting || !online}
          />
        </main>
      )}
      {page === "order-success" && orderSuccess && (
        <main className="inner-page">
          <div className="state-panel tall" role="status">
            <CheckCircle2 size={44} />
            <h1>Order placed successfully!</h1>
            <p>
              {orderSuccess.payment_method === "maya_demo"
                ? "Payment successful (test). No real money was charged."
                : "Your Cash on Delivery order has been received."}
            </p>
            {orderSuccess.payment_method === "maya_demo" && (
              <p>
                Payment reference:{" "}
                <strong>{orderSuccess.payment_reference}</strong>
              </p>
            )}
            <p>
              Order reference: <strong>{orderSuccess.id}</strong>
            </p>
            <button className="primary-btn" onClick={() => setPage("shop")}>
              Continue shopping <ArrowRight size={16} />
            </button>
          </div>
        </main>
      )}
      {page === "orders" && <MyOrders mayaReturnOrderId={mayaReturnOrderId} />}
      {page === "account" && (
        <main className="inner-page">
          <button className="text-back" onClick={() => setPage("shop")}>
            <ArrowLeft size={17} /> Back to shop
          </button>
          <div className="page-heading">
            <span className="eyebrow">YOUR PROFILE</span>
            <h1>My account</h1>
            <p>Manage your HardwareHub session.</p>
          </div>
          <div className="account-card">
            <div className="account-icon">
              <UserRound size={26} />
            </div>
            <div>
              <strong>
                {session.user.user_metadata?.full_name ||
                  "HardwareHub customer"}
              </strong>
              <p>{session.user.email}</p>
            </div>
          </div>
          <div className="account-note">
            <ShieldCheck size={20} />
            <p>
              Your account is secured with Supabase. View your order history and
              track your purchases.
            </p>
          </div>
          <button
            type="button"
            className="primary-btn"
            onClick={() => setPage("orders")}
          >
            <Package size={18} />
            My Orders
          </button>
          <button className="logout-button" onClick={logout}>
            <LogOut size={18} /> Sign out
          </button>
        </main>
      )}
      <nav className="bottom-nav" aria-label="Main navigation">
        <button
          className={page === "shop" ? "active" : ""}
          onClick={() => {
            setPage("shop");
            setSelected(null);
          }}
        >
          <Hammer size={20} />
          <span>Shop</span>
        </button>
        <button
          className={page === "cart" ? "active" : ""}
          onClick={() => {
            setPage("cart");
            setSelected(null);
          }}
        >
          <span className="nav-cart-icon">
            <ShoppingCart size={20} />
            {count > 0 && <i>{count}</i>}
          </span>
          <span>Cart</span>
        </button>
        <button
          className={page === "account" ? "active" : ""}
          onClick={() => {
            setPage("account");
            setSelected(null);
          }}
        >
          <UserRound size={20} />
          <span>Account</span>
        </button>
      </nav>
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <section
            className="detail-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${selected.name} details`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setSelected(null)}
              aria-label="Close details"
            >
              <X size={20} />
            </button>
            {productImage(selected, "detail-image")}
            <div className="detail-content">
              <span className="category">
                {selected.category?.name || "Hardware"}
              </span>
              <h2>{selected.name}</h2>
              <p className="detail-price">{money(selected.price)}</p>
              <p className="detail-description">
                {selected.description ||
                  "A dependable addition to your hardware supplies."}
              </p>
              <p className="detail-stock">
                {Number(selected.stock) > 0
                  ? `${selected.stock} in stock`
                  : "Currently unavailable"}
              </p>
              <button
                className="primary-btn"
                disabled={Number(selected.stock) <= 0}
                onClick={() => changeQty(selected, 1)}
              >
                <Plus size={17} /> Add to cart
              </button>
            </div>
          </section>
        </div>
      )}
      {online && <Suspense fallback={null}><AIChat /></Suspense>}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}
