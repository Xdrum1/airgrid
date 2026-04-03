import type { Metadata } from "next";
import Link from "next/link";
import TrackPageView from "@/components/TrackPageView";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Use Cases — AirIndex",
  description:
    "How operators, infrastructure developers, city planners, defense organizations, and insurance carriers use AirIndex market intelligence to make decisions in advanced air mobility.",
};

const USE_CASES = [
  {
    number: "01",
    title: "Municipality & State Agency",
    subtitle: "City planners and state DOTs",
    description:
      "Identify regulatory gaps, prioritize city council actions, and track readiness for commercial eVTOL operations. Includes five-question ordinance audit with specific score-moving actions.",
    href: "/docs/AirIndex_UseCase_Municipality_StateAgency_2.pdf",
    color: "#00ff88",
    buyers: ["City Planners", "State DOTs", "Airport Authorities", "Economic Development Alliances"],
  },
  {
    number: "02",
    title: "Infrastructure Developer & A&E Firm",
    subtitle: "Developers and engineering firms",
    description:
      "Qualify markets, de-risk capital allocation, and align project timelines with regulatory readiness. Heliport compliance data across 5,647 FAA-registered sites.",
    href: "/docs/AirIndex_UseCase_Infrastructure_Developer_2.pdf",
    color: "#f59e0b",
    buyers: ["Vertiport Developers", "A&E Firms", "Real Estate Investors", "Airport Authorities"],
  },
  {
    number: "03",
    title: "Aerospace & Defense",
    subtitle: "Defense and aerospace organizations",
    description:
      "Track AAM market formation, align product development with infrastructure readiness, and monitor federal program activity across 10 active programs.",
    href: "/docs/AirIndex_UseCase_Aerospace_Defense_2.pdf",
    color: "#5B8DB8",
    buyers: ["Systems Integrators", "Defense Primes", "Government Affairs", "Strategy Teams"],
  },
  {
    number: "04",
    title: "Insurance Carriers & Underwriters",
    subtitle: "Aviation liability carriers",
    description:
      "Verify heliport compliance, screen portfolios, and build defensible underwriting baselines for AAM. Delivered in partnership with Rex Alexander / Five-Alpha LLC.",
    href: "/docs/AirIndex_UseCase_Insurance_2.pdf",
    color: "#ff6b35",
    buyers: ["Aviation Liability Carriers", "Underwriters", "Insurance Brokers", "Risk Managers"],
  },
];

export default function UseCasesPage() {
  return (
    <div
      style={{
        background: "#050508",
        color: "#e0e0e0",
        minHeight: "100vh",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <TrackPageView page="use-cases" />
      <SiteNav />

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 48, textAlign: "center" }}>
          <div style={{
            fontSize: 9,
            letterSpacing: 3,
            color: "#5B8DB8",
            fontFamily: "'Space Mono', monospace",
            marginBottom: 16,
          }}>
            WHO USES AIRINDEX
          </div>
          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "clamp(28px, 4vw, 38px)",
            fontWeight: 700,
            color: "#fff",
            margin: "0 0 16px",
            letterSpacing: "-0.02em",
          }}>
            Use Cases
          </h1>
          <p style={{ color: "#888", fontSize: 14, lineHeight: 1.7, maxWidth: 560, margin: "0 auto" }}>
            Every party to a UAM market decision needs independent data.
            Here is how different buyers use AirIndex to make theirs.
          </p>
        </div>

        {/* Use Case Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {USE_CASES.map((uc) => (
            <div
              key={uc.number}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderLeft: `3px solid ${uc.color}`,
                borderRadius: 10,
                padding: "28px 28px 24px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 10,
                    color: uc.color,
                    letterSpacing: 2,
                    marginBottom: 8,
                  }}>
                    USE CASE {uc.number}
                  </div>
                  <h2 style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#fff",
                    margin: "0 0 4px",
                  }}>
                    {uc.title}
                  </h2>
                  <div style={{ color: "#666", fontSize: 12 }}>
                    {uc.subtitle}
                  </div>
                </div>
                <a
                  href={uc.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    background: `${uc.color}15`,
                    border: `1px solid ${uc.color}33`,
                    borderRadius: 6,
                    color: uc.color,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  DOWNLOAD PDF
                </a>
              </div>
              <p style={{ color: "#999", fontSize: 13, lineHeight: 1.7, margin: "0 0 16px" }}>
                {uc.description}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {uc.buyers.map((b) => (
                  <span
                    key={b}
                    style={{
                      fontSize: 9,
                      letterSpacing: 1,
                      color: "#666",
                      padding: "3px 10px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 4,
                    }}
                  >
                    {b.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center", marginTop: 48, padding: "32px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ color: "#666", fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
            Don&apos;t see your use case? We scope engagements around the decision you need to make.
          </p>
          <Link
            href="/contact"
            style={{
              display: "inline-block",
              padding: "12px 28px",
              background: "#5B8DB8",
              color: "#050508",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textDecoration: "none",
              borderRadius: 6,
            }}
          >
            Talk to Us
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
