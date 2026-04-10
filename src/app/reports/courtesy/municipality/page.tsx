import type { Metadata } from "next";
import Link from "next/link";
import { CITIES } from "@/data/seed";
import { calculateReadinessScore, getScoreTier, SCORE_WEIGHTS } from "@/lib/scoring";
import PrintButton from "../../gap/[cityId]/PrintButton";

export const metadata: Metadata = {
  title: "UAM Market Readiness: How Does Your City Compare? — AirIndex",
  robots: "noindex, nofollow",
};

const FACTOR_LABELS: Record<keyof typeof SCORE_WEIGHTS, string> = {
  stateLegislation: "State Legislation",
  activePilotProgram: "Active Pilot Program",
  approvedVertiport: "Approved Vertiport",
  activeOperatorPresence: "Active Operators",
  vertiportZoning: "Vertiport Zoning",
  regulatoryPosture: "Regulatory Posture",
  weatherInfrastructure: "Weather Infrastructure",
};

const FACTOR_ORDER: (keyof typeof SCORE_WEIGHTS)[] = [
  "stateLegislation",
  "activePilotProgram",
  "activeOperatorPresence",
  "approvedVertiport",
  "vertiportZoning",
  "regulatoryPosture",
  "weatherInfrastructure",
];

export default async function MunicipalityCourtesyBrief() {
  const marketData = CITIES.map((c) => {
    const { score, breakdown } = calculateReadinessScore(c);
    return { ...c, score, breakdown, tier: getScoreTier(score) };
  }).sort((a, b) => b.score - a.score);

  const totalMarkets = marketData.length;
  const avgScore = Math.round(marketData.reduce((sum, c) => sum + c.score, 0) / totalMarkets);
  const advanced = marketData.filter((c) => c.score >= 75);
  const nascent = marketData.filter((c) => c.score < 30);
  const enactedStates = [...new Set(marketData.filter((c) => c.stateLegislationStatus === "enacted").map((c) => c.state))];

  const today = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const accent = "#16a34a";

  const S = {
    page: { background: "#fff", color: "#111", fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", fontSize: 13, lineHeight: 1.6, minHeight: "100vh" } as React.CSSProperties,
    main: { maxWidth: 760, margin: "0 auto", padding: "32px 40px 60px" } as React.CSSProperties,
    header: { display: "flex", justifyContent: "space-between", borderBottom: "1px solid #ddd", paddingBottom: 8, marginBottom: 28, fontSize: 10, color: "#999" } as React.CSSProperties,
    h2: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, color: "#111", margin: "28px 0 12px" } as React.CSSProperties,
    p: { margin: "0 0 14px", color: "#333" } as React.CSSProperties,
    table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 12, marginBottom: 20 } as React.CSSProperties,
    th: { background: accent, color: "#fff", padding: "8px 12px", textAlign: "left" as const, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em" } as React.CSSProperties,
    td: { padding: "8px 12px", borderBottom: "1px solid #eee", verticalAlign: "top" as const } as React.CSSProperties,
    callout: { background: "#ecfdf5", borderLeft: `4px solid ${accent}`, padding: "16px 20px", fontSize: 13, lineHeight: 1.7, color: "#065f46", marginBottom: 20, borderRadius: "0 6px 6px 0" } as React.CSSProperties,
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
          <div style={{ fontSize: 9, letterSpacing: 3, color: accent, fontWeight: 700, marginBottom: 12 }}>MUNICIPAL READINESS INTELLIGENCE</div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: "#111", margin: "0 0 6px", lineHeight: 1.2 }}>
            How Does Your City Compare on AAM Readiness?
          </h1>
          <p style={{ color: "#777", fontSize: 13, margin: "8px 0 0", lineHeight: 1.6 }}>
            A data-driven readiness comparison for city planners, airport authorities, and state economic development agencies
            evaluating their position in the Advanced Air Mobility landscape.
          </p>
        </div>

        {/* Key stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "#eee", borderRadius: 8, overflow: "hidden", marginBottom: 24 }}>
          {[
            { value: String(totalMarkets), label: "Cities Scored", sub: "Continuously updated", color: "#111" },
            { value: `${avgScore}`, label: "National Average", sub: `EARLY tier — most cities not ready`, color: accent },
            { value: String(enactedStates.length), label: "States with Enacted AAM Law", sub: enactedStates.join(", "), color: "#111" },
            { value: String(nascent.length), label: "Cities in NASCENT Tier", sub: `${Math.round((nascent.length / totalMarkets) * 100)}% of tracked markets`, color: "#dc2626" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#fff", textAlign: "center", padding: "16px 8px" }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700, lineHeight: 1, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#333", marginTop: 6, letterSpacing: 1 }}>{s.label.toUpperCase()}</div>
              <div style={{ fontSize: 9, color: "#999", marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* The municipal problem */}
        <div style={S.callout}>
          <strong>Cities are being asked to prepare for eVTOL operations without a standardized way to measure
          their readiness.</strong> AirIndex scores each city across 7 factors — legislation, pilot programs,
          vertiports, operators, zoning, regulatory posture, and weather infrastructure — using primary source
          data from FAA filings, state legislatures, and federal program records. The result is a specific,
          actionable gap analysis that tells planners exactly which decisions move the score.
        </div>

        {/* Full rankings */}
        <h2 style={S.h2}>Complete Market Rankings</h2>
        <p style={S.p}>
          All {totalMarkets} tracked U.S. metros, ranked by AirIndex Readiness Score. Every score is traceable
          to primary source evidence. Every change is timestamped and auditable.
        </p>

        <table style={S.table}>
          <thead>
            <tr>
              <th style={{ ...S.th, width: 30 }}>#</th>
              <th style={S.th}>City</th>
              <th style={{ ...S.th, textAlign: "right" }}>Score</th>
              <th style={{ ...S.th, textAlign: "center" }}>Tier</th>
              {FACTOR_ORDER.map((f) => (
                <th key={f} style={{ ...S.th, textAlign: "center", fontSize: 8, padding: "8px 4px", lineHeight: 1.2 }}>
                  {FACTOR_LABELS[f].split(" ").slice(0, 2).join(" ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {marketData.map((c, i) => {
              const tierColor = c.score >= 75 ? "#16a34a" : c.score >= 50 ? "#5B8DB8" : c.score >= 30 ? "#f59e0b" : "#dc2626";
              return (
                <tr key={c.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                  <td style={{ ...S.td, color: "#888", fontSize: 11 }}>{i + 1}</td>
                  <td style={{ ...S.td, fontWeight: 600 }}>{c.city}, {c.state}</td>
                  <td style={{ ...S.td, textAlign: "right", fontFamily: "'Space Mono', monospace", fontWeight: 700, color: tierColor }}>{c.score}</td>
                  <td style={{ ...S.td, textAlign: "center", fontSize: 9, fontWeight: 700, color: tierColor, letterSpacing: 0.5 }}>{c.tier}</td>
                  {FACTOR_ORDER.map((f) => {
                    const val = c.breakdown[f];
                    const max = SCORE_WEIGHTS[f];
                    return (
                      <td key={f} style={{ ...S.td, textAlign: "center", fontFamily: "'Space Mono', monospace", fontSize: 10, color: val === max ? "#16a34a" : val > 0 ? "#f59e0b" : "#ddd" }}>
                        {val === max ? "✓" : val > 0 ? "◐" : "—"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        <p style={{ fontSize: 9, color: "#999", marginBottom: 4 }}>
          ✓ = full points &nbsp; ◐ = partial &nbsp; — = zero
        </p>
        <p style={{ fontSize: 9, color: "#999" }}>
          Factors: State Legislation (20%), Active Pilot (15%), Operators (15%), Vertiport (15%),
          Zoning (15%), Posture (10%), Weather (10%). Full methodology at airindex.io/methodology.
        </p>

        {/* What moves the score */}
        <h2 style={S.h2}>Five Actions That Move the Score</h2>
        <p style={S.p}>
          Most of the scoring gap between ADVANCED and NASCENT tier cities comes down to specific,
          city-level decisions that do not require federal approval or private capital:
        </p>
        <div style={{ fontSize: 13, color: "#444", lineHeight: 1.8 }}>
          {[
            { action: "Enact state AAM enabling legislation", impact: "+10 to +20 points", who: "State legislature", note: `Only ${enactedStates.length} states have done this` },
            { action: "Adopt vertiport as a permitted use in zoning code", impact: "+15 points", who: "City council", note: "Zoning amendment, typically 6-month process" },
            { action: "Replace 'helipad' with FAA-defined terminology in city code", impact: "+5 to +8 points", who: "City attorney / council", note: "Terminology alignment with AC 150/5390-2D" },
            { action: "Reference NFPA 418 in municipal fire code", impact: "Improves regulatory posture", who: "Fire marshal / building dept", note: "Standard of care alignment" },
            { action: "Require FAA airspace determination in permit process", impact: "Improves regulatory posture", who: "Planning department", note: "Federal compliance integration" },
          ].map((item, i) => (
            <p key={i} style={{ margin: "0 0 12px" }}>
              <strong>{i + 1}. {item.action}</strong> &mdash; {item.impact}.<br />
              <span style={{ color: "#888", fontSize: 12 }}>Owner: {item.who}. {item.note}.</span>
            </p>
          ))}
        </div>

        {/* Real example */}
        <h2 style={S.h2}>Real Example: From NASCENT to MODERATE in Four City-Level Actions</h2>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Starting Score</th>
              <th style={S.th}>Action</th>
              <th style={{ ...S.th, textAlign: "right" }}>Score After</th>
            </tr>
          </thead>
          <tbody>
            {[
              { start: "25 / NASCENT", action: "City Council enacts vertiport as permitted use", after: "40 / EARLY" },
              { start: "40 / EARLY", action: "Replace 'helipad' with FAA terminology in code", after: "+8 pts" },
              { start: "", action: "Reference NFPA 418 in fire code", after: "Posture improvement" },
              { start: "", action: "All four ordinance gaps closed", after: "52 / MODERATE" },
            ].map((row, i) => (
              <tr key={i}>
                <td style={{ ...S.td, fontWeight: row.start ? 600 : 400, color: row.start ? accent : "#888" }}>{row.start}</td>
                <td style={S.td}>{row.action}</td>
                <td style={{ ...S.td, textAlign: "right", fontWeight: 600, color: accent }}>{row.after}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: 11, color: "#888" }}>
          Four city-level actions. No state legislation required. No private capital required. Score moves from
          NASCENT to MODERATE &mdash; crossing the threshold where operators begin evaluating the market.
        </p>

        {/* CTA */}
        <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 8, padding: "20px 24px", marginTop: 28 }}>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: "#065f46", margin: 0 }}>
            <strong>Complimentary Market Snapshot</strong> — AirIndex will prepare a one-page readiness snapshot
            for your city at no cost. Current score, factor breakdown, ordinance audit results, and the three
            highest-impact actions your city council can take. Contact <strong>sales@airindex.io</strong> or
            visit <strong>airindex.io/contact</strong> to request yours.
          </p>
        </div>

        <div style={S.footer}>
          <p style={{ margin: "0 0 4px" }}>Vertical Data Group, LLC &middot; sales@airindex.io &middot; airindex.io</p>
          <p style={{ margin: 0, fontSize: 9, color: "#bbb" }}>
            Data sources: FAA NASR 5010, LegiScan, Federal Register, Congress.gov, AirIndex Readiness Score v1.3.
            Scores reflect current verified conditions. Full methodology published at airindex.io/methodology.
          </p>
        </div>
      </main>
    </div>
  );
}
