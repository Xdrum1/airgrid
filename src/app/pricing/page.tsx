import Link from "next/link";
import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Access — AirIndex",
  description: "Intelligence access for organizations shaping where eVTOL operates. Market readiness data, gap analysis, corridor intelligence, and API access.",
};

const CAPABILITIES = [
  {
    title: "Market Readiness Intelligence",
    description: "Readiness scores across 20+ U.S. markets with full factor-level breakdowns, source citations, and audit trails. Updated daily from primary sources.",
    items: ["7-factor composite scoring", "Factor-level breakdowns with citations", "Score history and trajectory analysis", "Gap analysis with actionable recommendations"],
  },
  {
    title: "Regulatory & Legislative Monitoring",
    description: "Automated pipeline tracking federal filings, state legislation, operator disclosures, and FAA regulatory actions across every tracked market.",
    items: ["Federal regulatory monitoring", "Congressional bill tracking", "State legislation tracking", "Operator disclosure monitoring"],
  },
  {
    title: "Infrastructure Intelligence",
    description: "Corridor tracking, vertiport data, heliport infrastructure mapping, and operator presence monitoring with facility-level detail.",
    items: ["5,647 FAA heliport facilities mapped", "Flight corridor tracking with status", "Vertiport and operator data", "Infrastructure density visualization"],
  },
  {
    title: "Reports & Deliverables",
    description: "Downloadable market snapshots, pre-feasibility assessments, and the weekly UAM Market Pulse intelligence briefing.",
    items: ["Per-city market snapshot PDFs", "Gap analysis reports", "Weekly Market Pulse briefing", "Custom deliverables on request"],
  },
  {
    title: "API & Data Access",
    description: "RESTful API with market data, score history, and export capabilities for organizations embedding UAM intelligence into their workflows.",
    items: ["Bearer token authentication", "Market, detail, history, export endpoints", "JSON responses with rate limiting", "Bulk data export"],
  },
] as const;

const FAQS = [
  {
    q: "How does pricing work?",
    a: "Access is negotiated based on your organization's needs. We work with individual analysts, consulting teams, government agencies, and enterprise data partners — each with different requirements. Request access and we'll scope what makes sense for you.",
  },
  {
    q: "What's publicly available?",
    a: "The UAM Market Pulse weekly briefing, our published methodology, and research insights are freely available. The full intelligence platform — scoring data, gap analysis, corridors, filings, API — is available through access agreements.",
  },
  {
    q: "How often is the data updated?",
    a: "The AirIndex scoring pipeline runs daily. Score changes, regulatory signals, and legislative updates are detected and reflected within 24 hours. Score snapshots are archived weekly for trend analysis.",
  },
  {
    q: "What data sources does AirIndex use?",
    a: "AirIndex draws exclusively from primary government and regulatory databases — federal agencies, state legislatures, FAA registries, and regulatory filings. Every score is auditable and traceable to its origin records.",
  },
  {
    q: "Can we integrate AirIndex data into our own systems?",
    a: "Yes. The API provides programmatic access to all market data with structured JSON responses. Custom integrations, webhooks, and data feeds are available for enterprise agreements.",
  },
] as const;

export default function PricingPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        fontFamily: "'Inter', sans-serif",
        color: "#0a2540",
      }}
    >
      <SiteNav theme="light" />

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
          Intelligence access for your organization
        </h1>
        <p style={{ color: "#697386", fontSize: 15, margin: "0 auto 40px", lineHeight: 1.7, maxWidth: 580 }}>
          Market readiness data, gap analysis, regulatory monitoring, and infrastructure intelligence — scoped to what your organization needs.
        </p>
        <Link
          href="/contact"
          style={{
            display: "inline-block",
            padding: "14px 36px",
            background: "#5B8DB8",
            color: "#ffffff",
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "'Inter', sans-serif",
            letterSpacing: "0.06em",
            textDecoration: "none",
            borderRadius: 6,
          }}
        >
          Talk to Us
        </Link>
      </section>

      {/* Capabilities */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "clamp(48px, 6vw, 80px) 20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {CAPABILITIES.map((cap) => (
            <div
              key={cap.title}
              style={{
                background: "#f9fbfd",
                border: "1px solid #e3e8ee",
                borderRadius: 12,
                padding: "28px 32px",
              }}
            >
              <h3
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: 16,
                  color: "#0a2540",
                  margin: "0 0 8px",
                }}
              >
                {cap.title}
              </h3>
              <p style={{ color: "#697386", fontSize: 13, lineHeight: 1.7, margin: "0 0 16px", maxWidth: 600 }}>
                {cap.description}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px" }}>
                {cap.items.map((item) => (
                  <span
                    key={item}
                    style={{
                      fontSize: 11,
                      color: "#8792a2",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span style={{ color: "#5B8DB8", fontSize: 8 }}>&#10003;</span>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Who uses */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px 64px" }}>
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #e3e8ee 20%, #e3e8ee 80%, transparent)", marginBottom: 64 }} />
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, margin: "0 0 12px" }}>
            Who uses AirIndex
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))", gap: "12px 24px", maxWidth: 700, margin: "0 auto" }}>
          {[
            "eVTOL Operators",
            "Infrastructure Developers",
            "City Planners & Airport Authorities",
            "Aerospace & Defense",
            "Insurance & Risk",
            "Investment & Finance",
            "Policy & Government",
            "Economic Development Alliances",
          ].map((role) => (
            <div key={role} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#5B8DB8", fontSize: 8, flexShrink: 0 }}>&#9646;</span>
              <span style={{ color: "#425466", fontSize: 12 }}>{role}</span>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <Link
            href="/contact"
            style={{
              display: "inline-block",
              padding: "12px 32px",
              border: "1px solid rgba(91,141,184,0.4)",
              borderRadius: 6,
              color: "#5B8DB8",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textDecoration: "none",
            }}
          >
            Talk to Us
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: 640, margin: "0 auto", padding: "0 20px 80px" }}>
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #e3e8ee 20%, #e3e8ee 80%, transparent)", marginBottom: 48 }} />
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
        {FAQS.map((faq) => (
          <div
            key={faq.q}
            style={{
              borderBottom: "1px solid #e3e8ee",
              padding: "20px 0",
            }}
          >
            <div style={{ color: "#0a2540", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              {faq.q}
            </div>
            <div style={{ color: "#697386", fontSize: 12, lineHeight: 1.7 }}>
              {faq.a}
            </div>
          </div>
        ))}
      </section>

      <SiteFooter theme="light" />
    </div>
  );
}
