
import { useEffect, useState } from "react";

import {
  BarChart3,
  ShoppingBag,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  Trophy,
  Wallet,
  Banknote,
  Info,
} from "lucide-react";

import { supabase } from "../lib/supabase";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000/api/v1";

const peso = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value) || 0);

export default function AdminReports() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReports() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Admin login required.");
      }

      const response = await fetch(
        `${API_BASE}/admin/reports`,
        {
          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error?.message ||
            "Unable to load reports."
        );
      }

      setReport(result.data);

    } catch (err) {
      setError(err.message);

    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  if (loading) {
    return <p>Loading sales reports...</p>;
  }

  if (error) {
    return (
      <section style={{ padding: 20 }}>
        <p role="alert">{error}</p>

        <button
          className="hh-admin-secondary"
          onClick={loadReports}
        >
          Retry
        </button>
      </section>
    );
  }

  if (!report) return null;

  const cards = [
    {
      label: "Total Orders",
      value: report.totalOrders,
      icon: ShoppingBag,
    },
    {
      label: "Completed Orders",
      value: report.completedOrders,
      icon: CheckCircle2,
    },
    {
      label: "Completed COD Sales",
      value: peso(report.revenue),
      icon: TrendingUp,
    },
    {
      label: "Average COD Order",
      value: peso(report.averageOrder),
      icon: BarChart3,
    },
    {
      label: "Completed COD Orders",
      value: report.actualOrders,
      icon: Banknote,
    },
    {
      label: "Pay with Maya (test)s",
      value: peso(report.demoRevenue),
      icon: Wallet,
    },
    {
      label: "Total Test Payment Orders",
      value: report.demoOrders,
      icon: ShoppingBag,
    },
    {
      label: "Cancelled Orders",
      value: report.cancelledOrders,
      icon: CheckCircle2,
    },
  ];

  const dailySales = report.dailySales || [];
  const topProducts = report.topProducts || [];

  const maxRevenue = Math.max(
    1,
    ...dailySales.map((day) => Number(day.total))
  );

  const actualRevenue = Number(report.revenue) || 0;

  const demoRevenue = Number(report.demoRevenue) || 0;

  const comparisonTotal = Math.max(
    1,
    actualRevenue + demoRevenue
  );

  return (
    <section style={{ padding: "20px 0" }}>

      {/* PAGE HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <span className="hh-admin-kicker">
            STORE MANAGEMENT
          </span>

          <h1>Sales Reports</h1>

          <p>
            HardwareHub sales performance and
            best-selling products.
          </p>
        </div>

        <button
          className="hh-admin-secondary"
          onClick={loadReports}
          disabled={loading}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      {/* STATISTICS CARDS */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          margin: "24px 0",
        }}
      >
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                padding: 20,
              }}
            >
              <Icon size={23} color="#17613c" />

              <p style={{ color: "#64748b" }}>
                {card.label}
              </p>

              <h2 style={{ color: "#17613c" }}>
                {card.value}
              </h2>
            </div>
          );
        })}
      </div>

      {/* PAYMENT BREAKDOWN */}

      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <h2>Payment Breakdown</h2>

        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <span>Completed COD Sales</span>

            <strong>{peso(actualRevenue)}</strong>
          </div>

          <div
            style={{
              background: "#e5e7eb",
              height: 14,
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: "#17613c",
                height: "100%",
                width: `${
                  (actualRevenue / comparisonTotal) * 100
                }%`,
              }}
            />
          </div>
        </div>

        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <span>Pay with Maya (test)s</span>

            <strong>{peso(demoRevenue)}</strong>
          </div>

          <div
            style={{
              background: "#e5e7eb",
              height: 14,
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: "#94a3b8",
                height: "100%",
                width: `${
                  (demoRevenue / comparisonTotal) * 100
                }%`,
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#f0fdf4",
            color: "#166534",
            borderRadius: 8,
            padding: 12,
            marginTop: 20,
            fontSize: 13,
          }}
        >
          <Info size={20} />

          Online test payments are simulated and
          excluded from completed COD sales.
          No real money is collected through test payments.
        </div>
      </div>

      {/* REPORTS GRID */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
        }}
      >

        {/* BEST-SELLING PRODUCTS */}

        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 20,
          }}
        >
          <h2>
            <Trophy size={20} /> Best-Selling Products
          </h2>

          {topProducts.length === 0 ? (
            <p>No completed COD sales yet.</p>
          ) : (
            topProducts.map((product, index) => (
              <div
                key={product.id}
                style={{
                  padding: "12px 0",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <strong>
                  {index + 1}. {product.name}
                </strong>

                <p>
                  {product.quantity} units sold
                </p>

                <span style={{ color: "#17613c" }}>
                  {peso(product.revenue)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* DAILY SALES */}

        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 20,
          }}
        >
          <h2>Daily COD Sales</h2>

          {dailySales.length === 0 ? (
            <p>No completed COD sales yet.</p>
          ) : (
            dailySales.map((day) => (
              <div
                key={day.date}
                style={{ marginBottom: 18 }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <span>{day.date}</span>

                  <strong>
                    {peso(day.total)}
                  </strong>
                </div>

                <div
                  style={{
                    background: "#e5e7eb",
                    borderRadius: 8,
                    height: 12,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      background: "#17613c",
                      height: "100%",
                      width: `${
                        (Number(day.total) /
                          maxRevenue) * 100
                      }%`,
                      borderRadius: 8,
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* REPORT INFORMATION */}

      <p
        style={{
          color: "#64748b",
          marginTop: 20,
          fontSize: 13,
        }}
      >
        Sales totals include completed COD orders only.
        These totals represent order value, not verified
        cash collections. Test payments and cancelled
        orders are excluded from COD sales.
        Daily totals use order creation dates in
        Philippine time.
      </p>
    </section>
  );
}
