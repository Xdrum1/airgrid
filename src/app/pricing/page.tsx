import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — AirIndex",
  description: "Free access during beta. Paid plans launching soon.",
};

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "",
    note: "Free access during beta.",
    accent: "#00d4ff",
    highlight: false,
    features: [
      "Interactive map & market rankings",
      "Readiness scores & 7-factor breakdown",
      "City detail pages",
      "Methodology & scoring sources",
    ],
    cta: { label: "Get started", href: "/login" },
  },
  {
    name: "Pro",
    price: "$99",
    period: "/month",
    note: "$899/year (save 25%)",
    accent: "#00ff88",
    highlight: true,
    badge: "COMING SOON",
    features: [
      "Everything in Free, plus:",
      "Corridor intelligence & detail pages",
      "Federal Register filing access",
      "Score history & factor trends",
      "Operator tracker",
      "Market & corridor alert subscriptions",
    ],
    cta: { label: "Join the waitlist", href: "/contact?tier=pro" },
  },
  {
    name: "Institutional",
    price: "Custom",
    period: "",
    note: "For teams and organizations",
    accent: "#7c3aed",
    highlight: false,
    features: [
      "Everything in Pro, plus:",
      "Monthly market report PDF delivered",
      "API access (rate limited)",
      "Data export (CSV/JSON)",
      "Multi-seat team access",
      "Priority support",
    ],
    cta: { label: "Learn more", href: "/contact?tier=institutional" },
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    note: "For organizations embedding UAM data",
    accent: "#f59e0b",
    highlight: false,
    features: [
      "Everything in Institutional, plus:",
      "Unlimited API access",
      "White-label data feeds",
      "Custom market coverage",
      "SLA & dedicated account manager",
      "Data licensing",
    ],
    cta: { label: "Learn more", href: "/contact?tier=enterprise" },
  },
];

export default function PricingPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050508",
        fontFamily: "'Space Mono', monospace",
        color: "#fff",
      }}
    >
      {/* Nav */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(5,5,8,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "0 20px",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
            <img
              src="/images/logo/airindex-wordmark.svg"
              alt="AirIndex"
              style={{ height: 28 }}
            />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link
              href="/api"
              style={{
                color: "#888",
                fontSize: 11,
                letterSpacing: "0.06em",
                textDecoration: "none",
                padding: "8px 16px",
              }}
            >
              API
            </Link>
            <Link
              href="/dashboard"
              style={{
                color: "#888",
                fontSize: 11,
                letterSpacing: "0.06em",
                textDecoration: "none",
                padding: "8px 16px",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 6,
              }}
            >
              Dashboard
            </Link>
            <Link
              href="/login"
              style={{
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "'Syne', sans-serif",
                letterSpacing: "0.06em",
                textDecoration: "none",
                padding: "8px 20px",
                background: "#00d4ff",
                color: "#050508",
                borderRadius: 6,
              }}
            >
              Sign up free
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "clamp(48px, 6vw, 80px) 20px 0", textAlign: "center" }}>
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(28px, 4vw, 44px)",
            margin: "0 0 16px",
          }}
        >
          Simple, transparent pricing
        </h1>
        <p style={{ fontFamily: "'Inter', sans-serif", color: "#999", fontSize: 14, margin: "0 0 8px", lineHeight: 1.6 }}>
          Free access during beta. Paid plans launching soon.
        </p>
        <div
          style={{
            display: "inline-block",
            background: "rgba(0,255,136,0.06)",
            border: "1px solid rgba(0,255,136,0.2)",
            borderRadius: 6,
            padding: "8px 16px",
            marginTop: 16,
          }}
        >
          <span style={{ color: "#00ff88", fontSize: 11, letterSpacing: 1 }}>
            ALL FEATURES FREE DURING BETA
          </span>
        </div>
      </section>

      {/* Tiers */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 20px clamp(60px, 8vw, 100px)" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))",
            gap: 20,
            alignItems: "stretch",
          }}
        >
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                background: tier.highlight ? "rgba(0,255,136,0.03)" : "rgba(255,255,255,0.02)",
                border: tier.highlight
                  ? `1px solid ${tier.accent}44`
                  : "1px solid rgba(255,255,255,0.06)",
                borderRadius: 12,
                padding: "36px 24px 28px",
              }}
            >
              {/* Top accent line */}
              <div
                style={{
                  position: "absolute",
                  top: -1,
                  left: 28,
                  right: 28,
                  height: 2,
                  background: tier.accent,
                  borderRadius: "2px 2px 0 0",
                }}
              />

              {/* Badge */}
              {"badge" in tier && tier.badge && (
                <div
                  style={{
                    position: "absolute",
                    top: -11,
                    right: 16,
                    background: tier.accent,
                    color: "#000",
                    fontSize: 8,
                    fontWeight: 700,
                    fontFamily: "'Syne', sans-serif",
                    letterSpacing: "0.1em",
                    padding: "4px 10px",
                    borderRadius: 4,
                  }}
                >
                  {tier.badge}
                </div>
              )}

              {/* Tier name */}
              <div
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  fontSize: 16,
                  color: "#ccc",
                  marginBottom: 10,
                }}
              >
                {tier.name}
              </div>

              {/* Price */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                <span
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700,
                    fontSize: 36,
                    color: "#fff",
                  }}
                >
                  {tier.price}
                </span>
                <span style={{ color: "#888", fontSize: 13 }}>{tier.period}</span>
              </div>
              <div style={{ color: "#777", fontSize: 10, marginBottom: 24 }}>
                {tier.note}
              </div>

              {/* Features */}
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", flex: 1 }}>
                {tier.features.map((f) => (
                  <li
                    key={f}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      color: "#999",
                      fontSize: 12,
                      lineHeight: 1.6,
                      marginBottom: 8,
                    }}
                  >
                    {f.endsWith(":") ? null : (
                      <span style={{ color: tier.accent, fontSize: 10, marginTop: 3, flexShrink: 0 }}>
                        ✓
                      </span>
                    )}
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href={tier.cta.href}
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "12px 0",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: "'Syne', sans-serif",
                  letterSpacing: "0.06em",
                  textDecoration: "none",
                  transition: "opacity 0.15s",
                  ...(tier.highlight
                    ? { background: tier.accent, color: "#050508" }
                    : { background: `${tier.accent}15`, border: `1px solid ${tier.accent}44`, color: tier.accent }
                  ),
                }}
              >
                {tier.cta.label}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: 640, margin: "0 auto", padding: "0 20px 80px" }}>
        <h3
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 20,
            textAlign: "center",
            marginBottom: 32,
          }}
        >
          Questions
        </h3>
        {[
          {
            q: "Is the beta really free?",
            a: "Yes. All platform features are available free during beta while we validate with early users. When paid plans launch, existing users will get advance notice and early pricing.",
          },
          {
            q: "When will paid plans launch?",
            a: "We're targeting Q2 2026 for Pro and Institutional tiers. Enterprise conversations are open now.",
          },
          {
            q: "What's included in the API?",
            a: "RESTful access to readiness scores, factor breakdowns, corridor data, and historical snapshots. Rate limits vary by tier. Full documentation will be available at launch.",
          },
          {
            q: "Can I cancel anytime?",
            a: "Yes. All subscriptions will be month-to-month with no lock-in. Annual plans offer a discount.",
          },
        ].map((faq) => (
          <div
            key={faq.q}
            style={{
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              padding: "20px 0",
            }}
          >
            <div style={{ color: "#ccc", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              {faq.q}
            </div>
            <div style={{ color: "#888", fontSize: 12, lineHeight: 1.7 }}>
              {faq.a}
            </div>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "24px 20px",
          textAlign: "center",
        }}
      >
        <span style={{ color: "#777", fontSize: 9, letterSpacing: 1 }}>
          © 2026 AIRINDEX · <Link href="/" style={{ color: "#777", textDecoration: "none" }}>HOME</Link> · <Link href="/about" style={{ color: "#777", textDecoration: "none" }}>ABOUT</Link> · <Link href="/dashboard" style={{ color: "#777", textDecoration: "none" }}>DASHBOARD</Link> · <Link href="/methodology" style={{ color: "#777", textDecoration: "none" }}>METHODOLOGY</Link> · <Link href="/api" style={{ color: "#777", textDecoration: "none" }}>API</Link>
        </span>
      </footer>
    </div>
  );
}
