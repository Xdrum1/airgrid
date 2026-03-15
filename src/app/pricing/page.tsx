import Link from "next/link";
import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import PricingTiers from "@/components/PricingTiers";

export const metadata: Metadata = {
  title: "Pricing — AirIndex",
  description: "Self-serve plans for individuals. Custom pricing for teams and organizations. The score is free — the intelligence behind the score is paid.",
};

export default function PricingPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050508",
        fontFamily: "'Inter', sans-serif",
        color: "#fff",
      }}
    >
      <SiteNav />

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
          Plans that scale with your needs
        </h1>
        <p style={{ color: "#999", fontSize: 14, margin: "0 0 4px", lineHeight: 1.6 }}>
          The score is free. The intelligence behind the score is paid.
        </p>
        <p style={{ color: "#666", fontSize: 12, margin: 0, lineHeight: 1.6 }}>
          Self-serve for individuals. Custom pricing for teams and organizations.
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
            q: "What's the difference between Pro and Institutional?",
            a: "Pro is designed for individual professionals — analysts, consultants, city planners. Institutional adds API access, data export, multi-seat support, and priority onboarding for teams making capital allocation or market entry decisions.",
          },
          {
            q: "What's included in the API?",
            a: "RESTful access to readiness scores, factor breakdowns, corridor data, and historical snapshots. Rate limits vary by tier. Available on Institutional and Enterprise plans.",
          },
          {
            q: "Can I cancel anytime?",
            a: "Yes. All self-serve subscriptions are month-to-month with no lock-in. Annual plans offer a discount and can be cancelled at any time — you retain access through the end of your billing period.",
          },
          {
            q: "What happens to early signups?",
            a: "Free accounts retain full dashboard access through launch. When paid plans activate, free users keep the map, scores, and rankings. Pro features require an upgrade.",
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
