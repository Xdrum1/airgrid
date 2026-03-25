import Link from "next/link";
import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import PricingTiers from "@/components/PricingTiers";

export const metadata: Metadata = {
  title: "Pricing — AirIndex",
  description: "Intelligence access for every stage of the market. From individual analysts to institutional data partners — structured access to the industry's authoritative UAM readiness index.",
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
      <section style={{ maxWidth: 800, margin: "0 auto", padding: "clamp(48px, 6vw, 80px) 20px 0", textAlign: "center" }}>
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(28px, 4vw, 40px)",
            margin: "0 0 16px",
            lineHeight: 1.3,
          }}
        >
          Intelligence access for every stage of the market
        </h1>
        <p style={{ color: "#999", fontSize: 15, margin: "0 auto", lineHeight: 1.7, maxWidth: 620 }}>
          From individual analysts to institutional data partners — structured access to
          the industry&apos;s authoritative UAM readiness index.
        </p>
      </section>

      {/* Audience context */}
      <section style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px 0" }}>
        <div style={{
          borderLeft: "2px solid rgba(0,212,255,0.2)",
          paddingLeft: 24,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}>
          {[
            { role: "Analysts and consultants", action: "use Pro to track market trajectories and produce client deliverables." },
            { role: "City planners", action: "use Pro to benchmark against peer markets and identify gap closure pathways." },
            { role: "Infrastructure developers", action: "use Institutional to integrate readiness data into site selection workflows." },
            { role: "Operators", action: "use Institutional API to monitor market conditions before making entry decisions." },
            { role: "Data partnerships", action: "are negotiated directly —", link: true },
          ].map((item) => (
            <p key={item.role} style={{ color: "#7a8a9e", fontSize: 13, lineHeight: 1.7, margin: 0 }}>
              <span style={{ color: "#c0c8d8", fontWeight: 500 }}>{item.role}</span>{" "}
              {item.link ? (
                <>
                  {item.action}{" "}
                  <Link href="/contact?tier=enterprise" style={{ color: "#00d4ff", textDecoration: "none", borderBottom: "1px solid rgba(0,212,255,0.3)" }}>
                    contact us
                  </Link>.
                </>
              ) : (
                item.action
              )}
            </p>
          ))}
        </div>
      </section>

      {/* Tiers */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "56px 20px clamp(60px, 8vw, 100px)" }}>
        <PricingTiers />
      </section>

      {/* Who uses AirIndex */}
      <section style={{ maxWidth: 800, margin: "0 auto", padding: "0 20px 64px" }}>
        <div style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12,
          padding: "32px 36px",
        }}>
          <h3
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 16,
              color: "#ccc",
              margin: "0 0 20px",
            }}
          >
            Who uses AirIndex
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "14px 32px" }}>
            {[
              { type: "eVTOL operators", desc: "Market entry timing and corridor readiness" },
              { type: "City planners & airport authorities", desc: "Benchmarking against peer markets" },
              { type: "Infrastructure developers", desc: "Site selection and gap analysis" },
              { type: "Defense & aerospace", desc: "AAM landscape intelligence for strategic planning" },
              { type: "Investment & finance", desc: "Due diligence on market-level readiness" },
              { type: "Policy & government", desc: "Federal program alignment and legislative tracking" },
              { type: "Economic development alliances", desc: "Regional readiness benchmarking and investment attraction" },
              { type: "Weather & sensor companies", desc: "Market coverage mapping and infrastructure gap identification" },
            ].map((item) => (
              <div key={item.type} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ color: "#00d4ff", fontSize: 8, marginTop: 5, flexShrink: 0 }}>&#9646;</span>
                <div>
                  <div style={{ color: "#c0c8d8", fontSize: 12, fontWeight: 600 }}>{item.type}</div>
                  <div style={{ color: "#666", fontSize: 11, lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: "1px solid rgba(255,255,255,0.04)",
              textAlign: "center",
            }}
          >
            <p style={{ color: "#555", fontSize: 11, margin: "0 0 16px", letterSpacing: 0.3 }}>
              Trusted by professionals from organizations including the Vertical Flight Society,
              TruWeather Solutions, and Leonardo.
            </p>
          </div>
          <div style={{ textAlign: "center", marginTop: 8 }}>
            <Link
              href="/contact?tier=pro"
              style={{
                color: "#00d4ff",
                fontSize: 12,
                fontWeight: 600,
                textDecoration: "none",
                borderBottom: "1px solid rgba(0,212,255,0.3)",
              }}
            >
              Schedule a walkthrough to see how it fits your workflow
            </Link>
          </div>
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
            q: "What do I get for free?",
            a: "Free accounts include the dashboard map, current readiness scores, city rankings, and basic market overviews. The score is free — the intelligence behind the score is paid.",
          },
          {
            q: "How often is the data updated?",
            a: "The AirIndex scoring pipeline runs daily. Score changes, factor-level updates, and regulatory signals are timestamped and reflected in the dashboard and API within 24 hours of detection.",
          },
          {
            q: "How is AirIndex data licensed?",
            a: "Self-serve tiers are month-to-month subscriptions. Institutional and API access is available under annual data license agreements. Enterprise and custom arrangements are negotiated directly.",
          },
          {
            q: "What's included in the API?",
            a: "RESTful access to readiness scores, factor breakdowns, corridor data, and historical snapshots. Rate limits and export capabilities vary by tier. Available on Institutional and Enterprise plans.",
          },
          {
            q: "What data sources does AirIndex use?",
            a: "AirIndex aggregates verified primary sources — federal agencies, regulatory databases, legislative records, and operator disclosures. Every score is auditable and traceable to its origin records.",
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
