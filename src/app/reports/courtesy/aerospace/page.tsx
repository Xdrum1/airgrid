import type { Metadata } from "next";
import Link from "next/link";
import { CITIES } from "@/data/seed";
import { calculateReadinessScore, getScoreTier } from "@/lib/scoring";
import { prisma } from "@/lib/prisma";
import PrintButton from "../../gap/[cityId]/PrintButton";

export const metadata: Metadata = {
  title: "AAM Market Formation Intelligence Brief — AirIndex",
  robots: "noindex, nofollow",
};

export default async function AerospaceCourtesyBrief() {
  const marketData = CITIES.map((c) => {
    const { score, breakdown } = calculateReadinessScore(c);
    return { ...c, score, breakdown, tier: getScoreTier(score) };
  }).sort((a, b) => b.score - a.score);

  const totalMarkets = marketData.length;
  const advanced = marketData.filter((c) => c.score >= 75);
  const withOperators = marketData.filter((c) => c.activeOperators.length > 0);
  const uniqueOperators = [...new Set(marketData.flatMap((c) => c.activeOperators))];
  const enactedCities = marketData.filter((c) => c.stateLegislationStatus === "enacted");

  const [ingestStats] = await prisma.$queryRaw<[{
    total_records: number;
    total_classifications: number;
    sources: number;
  }]>`SELECT
    (SELECT COUNT(*)::int FROM "IngestedRecord") as total_records,
    (SELECT COUNT(*)::int FROM "ClassificationResult") as total_classifications,
    (SELECT COUNT(DISTINCT source)::int FROM "IngestedRecord") as sources`;

  const today = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const accent = "#4338ca";

  const S = {
    page: { background: "#fff", color: "#111", fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", fontSize: 13, lineHeight: 1.6, minHeight: "100vh" } as React.CSSProperties,
    main: { maxWidth: 760, margin: "0 auto", padding: "32px 40px 60px" } as React.CSSProperties,
    header: { display: "flex", justifyContent: "space-between", borderBottom: "1px solid #ddd", paddingBottom: 8, marginBottom: 28, fontSize: 10, color: "#999" } as React.CSSProperties,
    h2: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, color: "#111", margin: "28px 0 12px" } as React.CSSProperties,
    p: { margin: "0 0 14px", color: "#333" } as React.CSSProperties,
    table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 12, marginBottom: 20 } as React.CSSProperties,
    th: { background: accent, color: "#fff", padding: "8px 12px", textAlign: "left" as const, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em" } as React.CSSProperties,
    td: { padding: "8px 12px", borderBottom: "1px solid #eee", verticalAlign: "top" as const } as React.CSSProperties,
    callout: { background: "#eef2ff", borderLeft: `4px solid ${accent}`, padding: "16px 20px", fontSize: 13, lineHeight: 1.7, color: "#312e81", marginBottom: 20, borderRadius: "0 6px 6px 0" } as React.CSSProperties,
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
          <div style={{ fontSize: 9, letterSpacing: 3, color: accent, fontWeight: 700, marginBottom: 12 }}>AAM MARKET FORMATION INTELLIGENCE</div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: "#111", margin: "0 0 6px", lineHeight: 1.2 }}>
            Where AAM Infrastructure Is Concentrating &mdash; and Where It Isn&rsquo;t
          </h1>
          <p style={{ color: "#777", fontSize: 13, margin: "8px 0 0", lineHeight: 1.6 }}>
            A data-driven view of U.S. AAM market formation for defense and aerospace organizations
            tracking where commercial infrastructure will develop in the next 18 months.
          </p>
        </div>

        {/* Key stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "#eee", borderRadius: 8, overflow: "hidden", marginBottom: 24 }}>
          {[
            { value: String(totalMarkets), label: "Markets Tracked", sub: "Daily signal ingestion", color: "#111" },
            { value: ingestStats.total_records.toLocaleString(), label: "Regulatory Documents", sub: `Classified from ${ingestStats.sources} sources`, color: accent },
            { value: String(uniqueOperators.length), label: "Active US Operators", sub: "Post Joby-Blade consolidation", color: "#111" },
            { value: String(withOperators.length), label: "Markets with Operators", sub: `${totalMarkets - withOperators.length} markets unserved`, color: "#dc2626" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#fff", textAlign: "center", padding: "16px 8px" }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700, lineHeight: 1, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#333", marginTop: 6, letterSpacing: 1 }}>{s.label.toUpperCase()}</div>
              <div style={{ fontSize: 9, color: "#999", marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* The A&D problem */}
        <div style={S.callout}>
          <strong>Aerospace and defense organizations need to know where AAM infrastructure will concentrate
          before consensus forms.</strong> Trade press covers operator announcements. AirIndex covers the
          underlying regulatory, legislative, and infrastructure signals that determine which markets can
          actually support commercial operations &mdash; and which are years away despite press coverage.
        </div>

        {/* Market concentration */}
        <h2 style={S.h2}>Market Concentration: {advanced.length} ADVANCED Markets, All in 3 States</h2>
        <p style={S.p}>
          All {advanced.length} ADVANCED-tier markets sit in California, Texas, and Florida. Zero representation from
          the other 47 states. This concentration is not random &mdash; it maps directly to enacted legislation,
          active operator presence, and favorable regulatory posture.
        </p>

        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Market</th>
              <th style={{ ...S.th, textAlign: "right" }}>Score</th>
              <th style={S.th}>Operators</th>
              <th style={S.th}>Legislation</th>
            </tr>
          </thead>
          <tbody>
            {advanced.map((c) => (
              <tr key={c.id}>
                <td style={{ ...S.td, fontWeight: 600 }}>{c.city}, {c.state}</td>
                <td style={{ ...S.td, textAlign: "right", fontFamily: "'Space Mono', monospace", fontWeight: 700, color: "#16a34a" }}>{c.score}</td>
                <td style={{ ...S.td, fontSize: 11, color: "#888" }}>{c.activeOperators.length > 0 ? c.activeOperators.map((o) => o.replace("op_", "")).join(", ") : "—"}</td>
                <td style={{ ...S.td, fontSize: 11, color: "#16a34a" }}>Enacted</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Operator coverage */}
        <h2 style={S.h2}>Operator Deployment Map</h2>
        <p style={S.p}>
          {withOperators.length} of {totalMarkets} markets have any eVTOL operator presence. The remaining {totalMarkets - withOperators.length} are
          unserved. The operator landscape is thinner than trade press suggests.
        </p>

        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Operator</th>
              <th style={{ ...S.th, textAlign: "right" }}>Markets</th>
              <th style={S.th}>Active In</th>
            </tr>
          </thead>
          <tbody>
            {["op_joby", "op_archer", "op_wisk"].map((opId) => {
              const markets = marketData.filter((c) => c.activeOperators.includes(opId));
              return (
                <tr key={opId}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{opId.replace("op_", "").charAt(0).toUpperCase() + opId.replace("op_", "").slice(1)}</td>
                  <td style={{ ...S.td, textAlign: "right", fontFamily: "'Space Mono', monospace", fontWeight: 600 }}>{markets.length}</td>
                  <td style={{ ...S.td, fontSize: 11, color: "#888" }}>{markets.map((c) => c.city).join(", ") || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Regulatory pipeline */}
        <h2 style={S.h2}>Regulatory Signal Pipeline</h2>
        <p style={S.p}>
          AirIndex continuously ingests and classifies regulatory documents from {ingestStats.sources} primary sources:
          FAA Federal Register filings, state legislation via LegiScan, SEC EDGAR operator disclosures, operator
          news, Congress.gov federal bills, and regulations.gov FAA dockets. {ingestStats.total_classifications.toLocaleString()} documents
          have been classified against our 7-factor scoring model.
        </p>

        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Intelligence Layer</th>
              <th style={S.th}>What It Tracks</th>
              <th style={S.th}>Defense Relevance</th>
            </tr>
          </thead>
          <tbody>
            {[
              { layer: "Market Readiness Scores", tracks: `7-factor composite across ${totalMarkets} markets, updated daily`, defense: "Where commercial eVTOL operations will launch first — same corridors where C-UAS systems face mixed traffic" },
              { layer: "Regulatory Pipeline", tracks: `${ingestStats.total_records.toLocaleString()} classified documents from ${ingestStats.sources} sources`, defense: "Detects regulatory momentum 6-18 months before mainstream awareness" },
              { layer: "Operator Deployment", tracks: `${uniqueOperators.length} operators tracked across all markets`, defense: "Operator commitment = strongest leading indicator of near-term infrastructure demand" },
              { layer: "Legislative Activity", tracks: "State-level AAM bills with real-time status tracking", defense: "Enacted legislation creates the regulatory floor for both commercial and defense operations" },
            ].map((row) => (
              <tr key={row.layer}>
                <td style={{ ...S.td, fontWeight: 600, width: "22%" }}>{row.layer}</td>
                <td style={{ ...S.td, fontSize: 11, width: "38%" }}>{row.tracks}</td>
                <td style={{ ...S.td, fontSize: 11, color: "#555", width: "40%" }}>{row.defense}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* What this means */}
        <h2 style={S.h2}>What This Means for Aerospace &amp; Defense Organizations</h2>
        <div style={{ fontSize: 13, color: "#444", lineHeight: 1.8 }}>
          <p style={{ margin: "0 0 12px" }}>
            <strong>1. Low-altitude airspace is about to get crowded in {advanced.length} specific metros.</strong> Counter-UAS
            systems, sensor networks, and force protection planning at installations near ADVANCED-tier
            markets need to account for commercial eVTOL traffic. AirIndex tells you exactly which markets
            and when.
          </p>
          <p style={{ margin: "0 0 12px" }}>
            <strong>2. Federal program investment is concentrating, not distributing.</strong> eIPP, RAISE, SBIR,
            and other federal programs are selecting markets that already have regulatory infrastructure.
            AirIndex tracks market-level eligibility and participation status across 10 active federal programs.
          </p>
          <p style={{ margin: "0 0 12px" }}>
            <strong>3. The dual-use case is the strategic opportunity.</strong> Commercial AAM infrastructure
            (vertiports, charging, weather sensing, communications) has direct defense applications.
            Organizations that understand where commercial infrastructure is building can align product
            development, BD, and government affairs resources accordingly.
          </p>
          <p style={{ margin: "0" }}>
            <strong>4. {totalMarkets - withOperators.length} unserved markets are the whitespace.</strong> Operators are concentrated in {withOperators.length} cities.
            The remaining {totalMarkets - withOperators.length} have regulatory potential but no operator commitment. For defense organizations
            evaluating where to position capabilities, the unserved markets are where the next wave of
            infrastructure investment will flow.
          </p>
        </div>

        {/* CTA */}
        <div style={{ background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 8, padding: "20px 24px", marginTop: 28 }}>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: "#312e81", margin: 0 }}>
            <strong>Enterprise Intelligence Engagement</strong> — AirIndex provides market formation intelligence
            scoped to your organization&rsquo;s strategic focus: specific market sets, federal program alignment,
            corridor analysis, or competitive positioning. Contact <strong>sales@airindex.io</strong> to discuss
            scope. Full methodology published at <strong>airindex.io/methodology</strong>.
          </p>
        </div>

        <div style={S.footer}>
          <p style={{ margin: "0 0 4px" }}>Vertical Data Group, LLC &middot; sales@airindex.io &middot; airindex.io</p>
          <p style={{ margin: 0, fontSize: 9, color: "#bbb" }}>
            Data sources: FAA Federal Register, LegiScan, SEC EDGAR, Congress.gov, regulations.gov,
            AirIndex Readiness Score v1.3. All data from public sources. Scores reflect current verified conditions.
          </p>
        </div>
      </main>
    </div>
  );
}
