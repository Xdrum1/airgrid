import Link from "next/link";
import type { Metadata } from "next";
import PricingTiers from "@/components/PricingTiers";

export const metadata: Metadata = {
  title: "Pricing — AirIndex",
  description: "Choose the plan that fits your workflow. Free, Alert, Pro, Institutional, and Enterprise tiers.",
};

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
              href="/login?mode=signup"
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
          Full dashboard access is free through launch. Paid plans activate April 2026.
        </p>
      </section>

      {/* Tiers */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 20px clamp(60px, 8vw, 100px)" }}>
        <PricingTiers />
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
            q: "What do I get for free?",
            a: "Free accounts include the dashboard map, current readiness scores, city rankings, and basic market overviews. The score is free — the intelligence behind the score is paid.",
          },
          {
            q: "What happens to early signups?",
            a: "Free accounts retain full dashboard access through launch. When paid plans activate, free users keep the map, scores, and rankings. Pro features require an upgrade.",
          },
          {
            q: "What's included in the API?",
            a: "RESTful access to readiness scores, factor breakdowns, corridor data, and historical snapshots. Rate limits vary by tier. See the full documentation at airindex.io/api/docs.",
          },
          {
            q: "Can I cancel anytime?",
            a: "Yes. All subscriptions are month-to-month with no lock-in. Annual plans offer a discount.",
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
          © 2026 AIRINDEX · <Link href="/" style={{ color: "#777", textDecoration: "none" }}>HOME</Link> · <Link href="/about" style={{ color: "#777", textDecoration: "none" }}>ABOUT</Link> · <Link href="/methodology" style={{ color: "#777", textDecoration: "none" }}>METHODOLOGY</Link> · <Link href="/api" style={{ color: "#777", textDecoration: "none" }}>API</Link> · <Link href="/terms" style={{ color: "#777", textDecoration: "none" }}>TERMS</Link> · <Link href="/privacy" style={{ color: "#777", textDecoration: "none" }}>PRIVACY</Link>
        </span>
      </footer>
    </div>
  );
}
