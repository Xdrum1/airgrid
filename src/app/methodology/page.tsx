import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Scoring Methodology — AirIndex",
  description:
    "How the AirIndex UAM Market Readiness Score is calculated. A 7-factor, 0–100 scoring model tracking pilot programs, zoning, operators, regulation, and infrastructure across 20 US markets.",
};

// -------------------------------------------------------
// Score factor definitions
// -------------------------------------------------------
const FACTORS = [
  {
    key: "activePilotProgram",
    label: "Active Pilot Program",
    weight: 20,
    description:
      "Has the market launched or hosted an active UAM pilot program? Pilot programs demonstrate real-world operational commitment — not just regulatory intent, but aircraft flying in the airspace under FAA-approved conditions.",
    criteria: "Binary — scored if an FAA-approved pilot program is active or completed within the market area.",
    sources: "FAA UAS Integration Pilot Program (IPP) records, operator announcements, local government press releases.",
  },
  {
    key: "approvedVertiport",
    label: "Approved Vertiport",
    weight: 20,
    description:
      "Does the market have at least one permitted, under-construction, or operational vertiport site? Vertiports are the physical infrastructure that makes commercial UAM possible. A market with approved vertiport sites has cleared the hardest regulatory and zoning hurdles.",
    criteria: "Binary — scored if one or more vertiport sites have received municipal permits or are operational.",
    sources: "Municipal planning records, FAA vertiport engineering briefs, operator filings, local zoning board decisions.",
  },
  {
    key: "activeOperatorPresence",
    label: "Active Operator Presence",
    weight: 15,
    description:
      "Is at least one eVTOL manufacturer or air taxi operator actively engaged in the market? Operator presence signals commercial viability — operators choose markets based on regulatory readiness, infrastructure, and demand potential.",
    criteria: "Binary — scored if one or more operators have announced partnerships, test flights, or commercial intent in the market.",
    sources: "Operator press releases, partnership announcements, SEC filings (for public operators), airline partnership disclosures.",
  },
  {
    key: "vertiportZoning",
    label: "Vertiport Zoning",
    weight: 15,
    description:
      "Has the city or county adopted zoning provisions that accommodate vertiport development? Zoning is the earliest municipal signal of UAM readiness. Markets that have proactively updated land-use codes to permit vertiports are removing barriers before operators arrive.",
    criteria: "Binary — scored if the municipality has enacted or amended zoning ordinances to permit vertiport or heliport-equivalent use.",
    sources: "Municipal code databases, city council meeting minutes, zoning board records, urban planning documents.",
  },
  {
    key: "regulatoryPosture",
    label: "Regulatory Posture",
    weight: 10,
    description:
      "What is the overall regulatory stance toward UAM at the municipal level? This factor captures the qualitative environment — is the city actively facilitating UAM, passively allowing it, or creating barriers? Assessed as Friendly (full weight), Neutral (half weight), or Restrictive (zero).",
    criteria: "Qualitative — assessed based on public statements from city officials, task force formation, participation in federal programs, and regulatory actions.",
    sources: "City government publications, mayor/council public statements, FAA Community Engagement records, USDOT participation records.",
  },
  {
    key: "stateLegislation",
    label: "State Legislation",
    weight: 10,
    description:
      "Has the state enacted legislation specifically enabling or regulating UAM operations? State-level legislation creates the legal framework that allows (or blocks) commercial UAM. States that have passed enabling legislation signal long-term commitment.",
    criteria: "Binary — scored if state-level UAM or advanced air mobility legislation has been signed into law.",
    sources: "State legislature records (LegiScan), governor's office press releases, state DOT publications.",
  },
  {
    key: "laancCoverage",
    label: "LAANC Coverage",
    weight: 10,
    description:
      "Does the market have FAA LAANC (Low Altitude Authorization and Notification Capability) infrastructure in place? LAANC provides automated airspace authorization for UAS operations — a foundational layer for UAM corridor management and real-time flight coordination.",
    criteria: "Binary — scored if LAANC is available at one or more airports within the market area.",
    sources: "FAA LAANC facility map, FAA UAS Data Exchange, airport authority records.",
  },
];

const TIERS = [
  { label: "HIGH", range: "75–100", color: "#00ff88", description: "Market has most or all infrastructure, regulatory, and operator requirements in place. Commercial UAM operations are imminent or active." },
  { label: "MODERATE", range: "50–74", color: "#00d4ff", description: "Significant progress across multiple factors. Key pieces are in place but gaps remain — typically missing infrastructure or operator commitment." },
  { label: "EARLY", range: "30–49", color: "#f59e0b", description: "Some foundational elements present. Regulatory posture may be favorable but physical infrastructure and operator activity are limited." },
  { label: "NASCENT", range: "0–29", color: "#ff4444", description: "Minimal UAM readiness. Market may have LAANC coverage or early regulatory signals but lacks substantive infrastructure or operator engagement." },
];

// -------------------------------------------------------
// Section wrapper
// -------------------------------------------------------
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: 56 }}>
      <h2
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 20,
          color: "#fff",
          marginBottom: 20,
          paddingBottom: 12,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

// -------------------------------------------------------
// Page
// -------------------------------------------------------
export default function MethodologyPage() {
  const totalWeight = FACTORS.reduce((s, f) => s + f.weight, 0);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050508",
        color: "#ccc",
        fontFamily: "'Inter', sans-serif",
        fontSize: 14,
        lineHeight: 1.7,
        overflow: "auto",
      }}
    >
      {/* Nav */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px clamp(20px, 5vw, 64px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
          <img src="/images/logo/airindex-wordmark.svg" alt="AirIndex" style={{ height: 26 }} />
        </Link>
        <Link
          href="/dashboard"
          style={{
            color: "#888",
            fontSize: 11,
            letterSpacing: "0.06em",
            textDecoration: "none",
            fontFamily: "'Space Mono', monospace",
          }}
        >
          VIEW DASHBOARD
        </Link>
      </nav>

      {/* Content */}
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px clamp(20px, 5vw, 32px) 80px" }}>
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              letterSpacing: 2,
              color: "#555",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            Scoring Methodology
          </div>
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(28px, 5vw, 36px)",
              color: "#fff",
              lineHeight: 1.2,
              marginBottom: 16,
            }}
          >
            UAM Market Readiness Index
          </h1>
          <p style={{ color: "#777", fontSize: 15, lineHeight: 1.7, maxWidth: 600 }}>
            The AirIndex Readiness Score is a 7-factor, 0&ndash;100 composite index that measures
            how prepared a US metropolitan area is for commercial urban air mobility operations.
            This document describes how each factor is defined, weighted, and sourced.
          </p>
        </div>

        {/* Overview */}
        <Section id="overview" title="How the Score Works">
          <p style={{ marginBottom: 16 }}>
            Each market is evaluated against seven binary or qualitative factors. Every factor
            carries a fixed weight. The total score is the sum of earned weights — a market that
            satisfies all seven factors scores {totalWeight}.
          </p>
          <p style={{ marginBottom: 16 }}>
            The model is intentionally binary at this stage. A factor is either present or it
            isn&apos;t. This eliminates subjective grading and makes scores reproducible — anyone
            with access to the same public sources should arrive at the same number.
          </p>
          <p>
            As the industry matures and more granular data becomes available, individual factors
            may transition from binary to gradient scoring (e.g., number of vertiports, not just
            presence/absence). Any changes to the methodology will be versioned and documented here.
          </p>
        </Section>

        {/* Factor Breakdown */}
        <Section id="factors" title="The Seven Factors">
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {FACTORS.map((f, i) => (
              <div
                key={f.key}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8,
                  padding: "24px 24px 20px",
                }}
              >
                {/* Factor header */}
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                    <span
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 10,
                        color: "#555",
                        letterSpacing: 1,
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontWeight: 600,
                        fontSize: 16,
                        color: "#fff",
                      }}
                    >
                      {f.label}
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#00d4ff",
                    }}
                  >
                    {f.weight} pts
                  </div>
                </div>

                {/* Weight bar */}
                <div
                  style={{
                    height: 3,
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: 2,
                    marginBottom: 16,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${(f.weight / totalWeight) * 100}%`,
                      height: "100%",
                      background: "#00d4ff",
                      borderRadius: 2,
                    }}
                  />
                </div>

                {/* Description */}
                <p style={{ marginBottom: 12 }}>{f.description}</p>

                {/* Criteria */}
                <div style={{ marginBottom: 8 }}>
                  <span
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 9,
                      letterSpacing: 1.5,
                      color: "#555",
                      textTransform: "uppercase",
                    }}
                  >
                    Scoring Criteria
                  </span>
                  <p style={{ color: "#999", fontSize: 13, marginTop: 4 }}>{f.criteria}</p>
                </div>

                {/* Sources */}
                <div>
                  <span
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 9,
                      letterSpacing: 1.5,
                      color: "#555",
                      textTransform: "uppercase",
                    }}
                  >
                    Data Sources
                  </span>
                  <p style={{ color: "#999", fontSize: 13, marginTop: 4 }}>{f.sources}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Weight distribution */}
        <Section id="weights" title="Weight Distribution">
          <p style={{ marginBottom: 20 }}>
            Weights reflect the relative importance of each factor to commercial UAM readiness.
            Infrastructure and operational factors (pilot programs, vertiports) carry the highest
            weight. Regulatory enablers (legislation, LAANC) carry lower weight because they are
            necessary but not sufficient conditions.
          </p>
          <div
            style={{
              display: "flex",
              height: 8,
              borderRadius: 4,
              overflow: "hidden",
              marginBottom: 16,
            }}
          >
            {FACTORS.map((f, i) => {
              const colors = ["#00d4ff", "#00ff88", "#7c3aed", "#f59e0b", "#ff6b35", "#14b8a6", "#ff4444"];
              return (
                <div
                  key={f.key}
                  style={{
                    width: `${(f.weight / totalWeight) * 100}%`,
                    background: colors[i % colors.length],
                    opacity: 0.8,
                  }}
                />
              );
            })}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
            {FACTORS.map((f, i) => {
              const colors = ["#00d4ff", "#00ff88", "#7c3aed", "#f59e0b", "#ff6b35", "#14b8a6", "#ff4444"];
              return (
                <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#888" }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: colors[i % colors.length], opacity: 0.8 }} />
                  {f.label} ({f.weight}%)
                </div>
              );
            })}
          </div>
        </Section>

        {/* Tier definitions */}
        <Section id="tiers" title="Readiness Tiers">
          <p style={{ marginBottom: 20 }}>
            Scores map to four readiness tiers. These labels provide at-a-glance context for
            where a market stands in its UAM journey.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {TIERS.map((t) => (
              <div
                key={t.label}
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "flex-start",
                  padding: "16px 20px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8,
                }}
              >
                <div style={{ minWidth: 90, flexShrink: 0 }}>
                  <div
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontWeight: 700,
                      fontSize: 13,
                      color: t.color,
                      letterSpacing: 1,
                    }}
                  >
                    {t.label}
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#555", marginTop: 2 }}>
                    {t.range}
                  </div>
                </div>
                <p style={{ color: "#999", fontSize: 13, lineHeight: 1.6 }}>{t.description}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Update cadence */}
        <Section id="updates" title="Update Cadence & Versioning">
          <p style={{ marginBottom: 12 }}>
            Scores are reviewed and updated monthly. When underlying data changes — a new
            vertiport permit is approved, legislation is signed, an operator announces market
            entry — the affected market&apos;s score is recalculated and the change is logged in the
            AirIndex activity feed.
          </p>
          <p style={{ marginBottom: 12 }}>
            This is <strong style={{ color: "#fff" }}>Methodology v1.0</strong> (February 2026).
            Any material changes to factor definitions, weights, or scoring criteria will be
            published as a new version with a changelog explaining what changed and why.
          </p>
          <p>
            Source citations for each scored factor are displayed on individual market pages.
            Every citation includes a verification date indicating when the underlying source
            was last confirmed.
          </p>
        </Section>

        {/* Citation guidance */}
        <Section id="citation" title="Citing AirIndex Data">
          <p style={{ marginBottom: 12 }}>
            AirIndex data and readiness scores are free to cite in publications, reports, and
            analysis. When referencing AirIndex data, please use the following format:
          </p>
          <div
            style={{
              background: "rgba(0, 212, 255, 0.04)",
              border: "1px solid rgba(0, 212, 255, 0.12)",
              borderRadius: 8,
              padding: "20px 24px",
              fontFamily: "'Space Mono', monospace",
              fontSize: 13,
              color: "#00d4ff",
              lineHeight: 1.8,
              marginBottom: 16,
            }}
          >
            Source: AirIndex UAM Market Readiness Index (airindex.io)
          </div>
          <p style={{ color: "#999", fontSize: 13 }}>
            For press inquiries, data partnerships, or API access, contact{" "}
            <a href="mailto:alan@airindex.io" style={{ color: "#00d4ff", textDecoration: "none" }}>
              alan@airindex.io
            </a>
          </p>
        </Section>

        {/* Back to dashboard */}
        <div
          style={{
            paddingTop: 32,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            gap: 24,
            fontSize: 12,
          }}
        >
          <Link href="/dashboard" style={{ color: "#00d4ff", textDecoration: "none" }}>
            View Dashboard
          </Link>
          <Link href="/" style={{ color: "#555", textDecoration: "none" }}>
            Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
