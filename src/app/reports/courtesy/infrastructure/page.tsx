import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CITIES } from "@/data/seed";
import { calculateReadinessScore, getScoreTier, SCORE_WEIGHTS } from "@/lib/scoring";
import PrintButton from "../../gap/[cityId]/PrintButton";

export const metadata: Metadata = {
  title: "Vertiport Market Readiness Intelligence Brief — AirIndex",
  robots: "noindex, nofollow",
};

const FACTOR_LABELS: Record<string, string> = {
  stateLegislation: "State Legislation",
  activePilotProgram: "Active Pilot Program",
  approvedVertiport: "Approved Vertiport",
  activeOperatorPresence: "Active Operators",
  vertiportZoning: "Vertiport Zoning",
  regulatoryPosture: "Regulatory Posture",
  weatherInfrastructure: "Weather Infrastructure",
};

export default async function InfrastructureCourtesyBrief() {
  // Live stats
  const [totals] = await prisma.$queryRaw<[{
    total_heliports: number;
    hospitals: number;
    q4_adopted: number;
    q4_unknown: number;
    total_determinations: number;
  }]>`SELECT
    (SELECT COUNT(*)::int FROM "Heliport") as total_heliports,
    (SELECT COUNT(*)::int FROM "HeliportCompliance" WHERE "siteType"='hospital') as hospitals,
    (SELECT COUNT(*)::int FROM "HeliportCompliance" WHERE "q4Nfpa418"='adopted') as q4_adopted,
    (SELECT COUNT(*)::int FROM "HeliportCompliance" WHERE "q4Nfpa418"='unknown') as q4_unknown,
    (SELECT COUNT(*)::int FROM "OeaaaDetermination") as total_determinations`;

  // Compute market data
  const marketData = CITIES.map((c) => {
    const { score, breakdown } = calculateReadinessScore(c);
    return { ...c, score, breakdown, tier: getScoreTier(score) };
  }).sort((a, b) => b.score - a.score);

  const advanced = marketData.filter((c) => c.score >= 75);
  const moderate = marketData.filter((c) => c.score >= 50 && c.score < 75);
  const early = marketData.filter((c) => c.score >= 30 && c.score < 50);
  const totalMarkets = marketData.length;
  const avgScore = Math.round(marketData.reduce((sum, c) => sum + c.score, 0) / totalMarkets);
  const enactedCount = marketData.filter((c) => c.stateLegislationStatus === "enacted").length;

  const today = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const accent = "#b45309";

  const S = {
    page: { background: "#fff", color: "#111", fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", fontSize: 13, lineHeight: 1.6, minHeight: "100vh" } as React.CSSProperties,
    main: { maxWidth: 760, margin: "0 auto", padding: "32px 40px 60px" } as React.CSSProperties,
    header: { display: "flex", justifyContent: "space-between", borderBottom: "1px solid #ddd", paddingBottom: 8, marginBottom: 28, fontSize: 10, color: "#999" } as React.CSSProperties,
    h2: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, color: "#111", margin: "28px 0 12px" } as React.CSSProperties,
    p: { margin: "0 0 14px", color: "#333" } as React.CSSProperties,
    table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 12, marginBottom: 20 } as React.CSSProperties,
    th: { background: accent, color: "#fff", padding: "8px 12px", textAlign: "left" as const, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em" } as React.CSSProperties,
    td: { padding: "8px 12px", borderBottom: "1px solid #eee", verticalAlign: "top" as const } as React.CSSProperties,
    callout: { background: "#fef3c7", borderLeft: `4px solid ${accent}`, padding: "16px 20px", fontSize: 13, lineHeight: 1.7, color: "#78350f", marginBottom: 20, borderRadius: "0 6px 6px 0" } as React.CSSProperties,
    footnote: { fontSize: 10, color: "#999", lineHeight: 1.6, marginTop: 8, fontStyle: "italic" } as React.CSSProperties,
    footer: { fontSize: 10, color: "#999", textAlign: "center" as const, borderTop: "1px solid #ddd", paddingTop: 16, marginTop: 32 } as React.CSSProperties,
  };

  return (
    <div style={S.page}>
      <style>{`@media print { .no-print { display: none !important; } @page { margin: 0.6in; size: letter; } }`}</style>

      <div className="no-print" style={{ padding: "12px 24px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", maxWidth: 760, margin: "0 auto" }}>
        <Link href="/" style={{ color: "#999", fontSize: 12, textDecoration: "none" }}>← Home</Link>
        <PrintButton />
      </div>

      <main style={S.main}>
        <div style={S.header}>
          <span><strong>AIRINDEX</strong> &nbsp; UAM Market Intelligence &middot; airindex.io</span>
          <span>COURTESY BRIEF &middot; {today.toUpperCase()}</span>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 9, letterSpacing: 3, color: accent, fontWeight: 700, marginBottom: 12 }}>VERTIPORT MARKET READINESS</div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: "#111", margin: "0 0 6px", lineHeight: 1.2 }}>
            Where the Regulatory Infrastructure Supports Vertiport Investment
          </h1>
          <p style={{ color: "#777", fontSize: 13, margin: "8px 0 0", lineHeight: 1.6 }}>
            A data-driven market comparison for infrastructure developers and A&amp;E firms evaluating vertiport project opportunities.
          </p>
        </div>

        {/* Key stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "#eee", borderRadius: 8, overflow: "hidden", marginBottom: 24 }}>
          {[
            { value: String(totalMarkets), label: "Markets Scored", sub: "Updated continuously", color: "#111" },
            { value: String(advanced.length), label: "ADVANCED Tier", sub: "Score ≥75 — investment ready", color: "#16a34a" },
            { value: `${avgScore}/100`, label: "National Average", sub: "Most markets not ready yet", color: accent },
            { value: totals.total_heliports.toLocaleString(), label: "Heliport Sites Mapped", sub: "FAA NASR with coordinates", color: "#111" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#fff", textAlign: "center", padding: "16px 8px" }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700, lineHeight: 1, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#333", marginTop: 6, letterSpacing: 1 }}>{s.label.toUpperCase()}</div>
              <div style={{ fontSize: 9, color: "#999", marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* The A&E problem */}
        <div style={S.callout}>
          <strong>The core challenge for infrastructure developers:</strong> Population density and airport proximity
          suggest demand in dozens of U.S. metros. But vertiport investment requires more than demand &mdash;
          it requires enacted legislation, vertiport zoning in city code, FAA airspace framework, and regulatory
          posture that supports construction permitting. Only {advanced.length} of {totalMarkets} tracked markets
          currently have that full stack. AirIndex scores exactly which factors are present and which are missing,
          so capital allocation decisions are grounded in regulatory reality.
        </div>

        {/* ADVANCED markets */}
        <h2 style={S.h2}>Markets Ready for Infrastructure Investment (ADVANCED Tier)</h2>
        <p style={S.p}>
          These {advanced.length} markets score 75 or above on the AirIndex Readiness Score. They have enacted state
          legislation, active operator presence, and the regulatory framework to support vertiport permitting.
        </p>

        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Market</th>
              <th style={{ ...S.th, textAlign: "right" }}>Score</th>
              <th style={{ ...S.th, textAlign: "right" }}>Heliports</th>
              <th style={S.th}>Key Strength</th>
            </tr>
          </thead>
          <tbody>
            {advanced.map((c) => {
              const topFactor = Object.entries(c.breakdown)
                .filter(([, v]) => v === SCORE_WEIGHTS[Object.keys(SCORE_WEIGHTS).find((k) => c.breakdown[k as keyof typeof c.breakdown] === v) as keyof typeof SCORE_WEIGHTS])
                .sort((a, b) => (b[1] as number) - (a[1] as number))[0];
              return (
                <tr key={c.id}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{c.city}, {c.state}</td>
                  <td style={{ ...S.td, textAlign: "right", fontFamily: "'Space Mono', monospace", color: "#16a34a", fontWeight: 700 }}>{c.score}</td>
                  <td style={{ ...S.td, textAlign: "right", fontFamily: "'Space Mono', monospace" }}>{c.heliportCount ?? 0}</td>
                  <td style={{ ...S.td, color: "#888", fontSize: 11 }}>
                    {c.activeOperators.length > 0 ? `${c.activeOperators.length} active operator(s)` : "Enacted legislation + favorable posture"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* MODERATE — the opportunity tier */}
        <h2 style={S.h2}>Markets Approaching Readiness (MODERATE Tier)</h2>
        <p style={S.p}>
          These {moderate.length} markets score 50&ndash;74. They have some regulatory infrastructure but are missing
          one or two factors that block vertiport permitting. For A&amp;E firms, these are the markets to monitor &mdash;
          a single legislative action or zoning amendment could move them into the investment-ready tier.
        </p>

        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Market</th>
              <th style={{ ...S.th, textAlign: "right" }}>Score</th>
              <th style={S.th}>Primary Gap</th>
            </tr>
          </thead>
          <tbody>
            {moderate.map((c) => {
              const gaps = Object.entries(c.breakdown)
                .filter(([, v]) => v === 0)
                .map(([k]) => FACTOR_LABELS[k] || k);
              return (
                <tr key={c.id}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{c.city}, {c.state}</td>
                  <td style={{ ...S.td, textAlign: "right", fontFamily: "'Space Mono', monospace", color: accent, fontWeight: 600 }}>{c.score}</td>
                  <td style={{ ...S.td, color: "#888", fontSize: 11 }}>{gaps.slice(0, 2).join(", ") || "Partial across multiple factors"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Heliport infrastructure */}
        <h2 style={S.h2}>Existing Heliport Infrastructure by State</h2>
        <p style={S.p}>
          Existing heliport density is a leading indicator of infrastructure readiness. Markets with dense heliport
          networks have established community acceptance, airspace integration, and permitting precedent.
          Most existing heliports cannot dimensionally accommodate eVTOL operations &mdash; vertiport
          development is primarily a greenfield conversation.
        </p>

        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>State</th>
              <th style={{ ...S.th, textAlign: "right" }}>Registered Heliports</th>
              <th style={S.th}>Legislation Status</th>
              <th style={{ ...S.th, textAlign: "right" }}>NFPA 418 Adopted</th>
            </tr>
          </thead>
          <tbody>
            {[
              { state: "TX", count: 464, leg: "Enacted", nfpa: "Yes" },
              { state: "CA", count: 388, leg: "Enacted", nfpa: "Yes" },
              { state: "FL", count: 381, leg: "Enacted", nfpa: "Yes" },
              { state: "PA", count: 282, leg: "None", nfpa: "Partial" },
              { state: "IL", count: 230, leg: "Active", nfpa: "Unknown" },
              { state: "OH", count: 192, leg: "Active", nfpa: "Unknown" },
              { state: "NJ", count: 173, leg: "None", nfpa: "Partial" },
              { state: "CO", count: 169, leg: "None", nfpa: "Unknown" },
              { state: "NY", count: 154, leg: "None", nfpa: "Partial" },
              { state: "UT", count: 18, leg: "Enacted", nfpa: "Unknown" },
            ].map((row) => (
              <tr key={row.state}>
                <td style={{ ...S.td, fontWeight: 600 }}>{row.state}</td>
                <td style={{ ...S.td, textAlign: "right", fontFamily: "'Space Mono', monospace" }}>{row.count}</td>
                <td style={{ ...S.td, color: row.leg === "Enacted" ? "#16a34a" : row.leg === "Active" ? accent : "#888" }}>{row.leg}</td>
                <td style={{ ...S.td, textAlign: "right", color: row.nfpa === "Yes" ? "#16a34a" : "#888" }}>{row.nfpa}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={S.footnote}>
          Source: FAA NASR 5010 heliport registration database ({totals.total_heliports.toLocaleString()} total sites),
          AirIndex state legislation tracking (LegiScan), NFPA 418 jurisdiction adoption research.
        </p>

        {/* What this means for A&E */}
        <h2 style={S.h2}>What This Means for Infrastructure Developers</h2>
        <div style={{ fontSize: 13, color: "#444", lineHeight: 1.8 }}>
          <p style={{ margin: "0 0 12px" }}>
            <strong>1. Market selection should be score-driven, not demand-driven.</strong> Population density and
            airport proximity correlate weakly with regulatory readiness. {enactedCount} of {totalMarkets} tracked
            cities sit in states with enacted AAM legislation. The rest face an uncertain permitting timeline
            regardless of demand signals.
          </p>
          <p style={{ margin: "0 0 12px" }}>
            <strong>2. The gap analysis identifies specific actions, not vague risk.</strong> A market scoring 50
            with zero on vertiport zoning and zero on approved vertiports has a specific, addressable gap: city
            council needs to adopt vertiport as a permitted use in the zoning ordinance. That&rsquo;s a 6-month
            municipal process, not a multi-year federal dependency.
          </p>
          <p style={{ margin: "0 0 12px" }}>
            <strong>3. NFPA 418 adoption varies dramatically by jurisdiction.</strong> Only {totals.q4_adopted} of {totals.total_heliports.toLocaleString()} heliport
            sites sit in jurisdictions with confirmed NFPA 418 adoption. For vertiport design work, knowing
            whether the local fire code references the heliport safety standard before starting engineering
            changes the scope, timeline, and compliance requirements of every project.
          </p>
          <p style={{ margin: "0" }}>
            <strong>4. AirIndex regulatory data can be embedded directly in feasibility studies.</strong> Every
            factor in the scoring model &mdash; legislation status, zoning framework, NFPA 418 adoption, FAA
            airspace determination status &mdash; is the same data A&amp;E firms manually assemble for the
            regulatory landscape section of vertiport feasibility deliverables. AirIndex provides it as a
            structured, continuously updated data layer.
          </p>
        </div>

        {/* CTA */}
        <div style={{ background: "#fef9ee", border: "1px solid #e5d5b0", borderRadius: 8, padding: "20px 24px", marginTop: 28 }}>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: "#78350f", margin: 0 }}>
            <strong>Pre-Feasibility Market Snapshot</strong> is available as a complimentary one-page analysis
            for any of the {totalMarkets} tracked markets. Score, tier, ordinance audit, and top three
            score-moving actions &mdash; available before formal engagement. Contact{" "}
            <strong>sales@airindex.io</strong> to request a snapshot for your target market.
            Full methodology published at <strong>airindex.io/methodology</strong>.
          </p>
        </div>

        <div style={S.footer}>
          <p style={{ margin: "0 0 4px" }}>Vertical Data Group, LLC &middot; sales@airindex.io &middot; airindex.io</p>
          <p style={{ margin: 0, fontSize: 9, color: "#bbb" }}>
            Data sources: FAA NASR 5010, LegiScan state legislation tracking, AirIndex Readiness Score v1.3 ({totalMarkets} U.S. markets).
            Scores reflect current verified conditions. This brief is a courtesy data sample and does not constitute investment advice.
          </p>
        </div>
      </main>
    </div>
  );
}
