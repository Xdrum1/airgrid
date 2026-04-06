import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PrintButton from "../../gap/[cityId]/PrintButton";

export const metadata: Metadata = {
  title: "Heliport Compliance Intelligence Brief — AirIndex",
  robots: "noindex, nofollow",
};

export default async function InsuranceCourtesyBrief() {
  // Pull live stats from DB
  const [totals, topStates] = await Promise.all([
    prisma.$queryRaw<[{
      total_heliports: number;
      compliant: number;
      conditional: number;
      unknown_status: number;
      q2_on_file: number;
      q2_unknown: number;
      q4_adopted: number;
      q4_partial: number;
      q4_unknown: number;
      hospitals: number;
      hospital_at_risk: number;
      total_determinations: number;
      linked_determinations: number;
      cir_determinations: number;
    }]>`SELECT
      (SELECT COUNT(*)::int FROM "Heliport") as total_heliports,
      (SELECT COUNT(*)::int FROM "HeliportCompliance" WHERE "complianceStatus"='compliant') as compliant,
      (SELECT COUNT(*)::int FROM "HeliportCompliance" WHERE "complianceStatus"='conditional') as conditional,
      (SELECT COUNT(*)::int FROM "HeliportCompliance" WHERE "complianceStatus"='unknown') as unknown_status,
      (SELECT COUNT(*)::int FROM "HeliportCompliance" WHERE "q2AirspaceDetermination"='on_file') as q2_on_file,
      (SELECT COUNT(*)::int FROM "HeliportCompliance" WHERE "q2AirspaceDetermination"='unknown') as q2_unknown,
      (SELECT COUNT(*)::int FROM "HeliportCompliance" WHERE "q4Nfpa418"='adopted') as q4_adopted,
      (SELECT COUNT(*)::int FROM "HeliportCompliance" WHERE "q4Nfpa418"='partial') as q4_partial,
      (SELECT COUNT(*)::int FROM "HeliportCompliance" WHERE "q4Nfpa418"='unknown') as q4_unknown,
      (SELECT COUNT(*)::int FROM "HeliportCompliance" WHERE "siteType"='hospital') as hospitals,
      (SELECT COUNT(*)::int FROM "HeliportCompliance" WHERE "siteType"='hospital' AND "q5EvtolViability"='at_risk') as hospital_at_risk,
      (SELECT COUNT(*)::int FROM "OeaaaDetermination") as total_determinations,
      (SELECT COUNT(*)::int FROM "OeaaaDetermination" WHERE "linkedHeliportId" IS NOT NULL) as linked_determinations,
      (SELECT COUNT(*)::int FROM "OeaaaDetermination" WHERE "statusCode"='CIR') as cir_determinations`,
    prisma.$queryRaw<{ state: string; count: number }[]>`
      SELECT state, COUNT(*)::int as count FROM "Heliport" GROUP BY state ORDER BY count DESC LIMIT 10`,
  ]);

  const t = totals[0];
  const q2Pct = Math.round((t.q2_unknown / t.total_heliports) * 100);
  const hospitalPct = Math.round((t.hospitals / t.total_heliports) * 100);
  const today = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const S = {
    page: { background: "#fff", color: "#111", fontFamily: "'Inter', Arial, sans-serif", fontSize: 13, lineHeight: 1.6, minHeight: "100vh" } as React.CSSProperties,
    main: { maxWidth: 760, margin: "0 auto", padding: "32px 40px 60px" } as React.CSSProperties,
    header: { display: "flex", justifyContent: "space-between", borderBottom: "1px solid #ddd", paddingBottom: 8, marginBottom: 28, fontSize: 10, color: "#999" } as React.CSSProperties,
    h1: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: "#111", margin: "0 0 6px", lineHeight: 1.2 } as React.CSSProperties,
    h2: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, color: "#111", margin: "28px 0 12px" } as React.CSSProperties,
    accent: "#b45309",
    statBox: { textAlign: "center" as const, padding: "16px 8px" },
    statVal: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700, lineHeight: 1 } as React.CSSProperties,
    statLabel: { fontSize: 9, fontWeight: 700, color: "#333", marginTop: 6, letterSpacing: 1 } as React.CSSProperties,
    statSub: { fontSize: 9, color: "#999", marginTop: 2 } as React.CSSProperties,
    callout: { background: "#fef3c7", borderLeft: "4px solid #b45309", padding: "16px 20px", fontSize: 13, lineHeight: 1.7, color: "#78350f", marginBottom: 20, borderRadius: "0 6px 6px 0" } as React.CSSProperties,
    table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 12, marginBottom: 20 } as React.CSSProperties,
    th: { background: "#b45309", color: "#fff", padding: "8px 12px", textAlign: "left" as const, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em" } as React.CSSProperties,
    td: { padding: "8px 12px", borderBottom: "1px solid #eee", verticalAlign: "top" as const } as React.CSSProperties,
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
        {/* Header */}
        <div style={S.header}>
          <span><strong>AIRINDEX</strong> &nbsp; UAM Market Intelligence &middot; airindex.io</span>
          <span>COURTESY BRIEF &middot; {today.toUpperCase()}</span>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 9, letterSpacing: 3, color: S.accent, fontWeight: 700, marginBottom: 12 }}>HELIPORT COMPLIANCE INTELLIGENCE</div>
          <h1 style={S.h1}>National Heliport Infrastructure: The Compliance Gap</h1>
          <p style={{ color: "#777", fontSize: 13, margin: "8px 0 0", lineHeight: 1.6 }}>
            A data-driven overview of FAA heliport compliance status across the United States.
            Prepared for aviation liability carriers and underwriting teams.
          </p>
        </div>

        {/* Key stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "#eee", borderRadius: 8, overflow: "hidden", marginBottom: 24 }}>
          {[
            { value: t.total_heliports.toLocaleString(), label: "Registered Heliports", sub: "FAA NASR 5010 database", color: "#111" },
            { value: `${q2Pct}%`, label: "No Determination on File", sub: `${t.q2_unknown.toLocaleString()} of ${t.total_heliports.toLocaleString()} sites`, color: "#dc2626" },
            { value: String(t.q2_on_file), label: "Sites with FAA Data Verified", sub: `of ${t.total_heliports.toLocaleString()} \u2014 from ${t.total_determinations.toLocaleString()} OE/AAA records`, color: S.accent },
            { value: t.hospitals.toLocaleString(), label: "Hospital Heliports", sub: `${hospitalPct}% of all registered sites`, color: "#111" },
          ].map((s) => (
            <div key={s.label} style={{ ...S.statBox, background: "#fff" }}>
              <div style={{ ...S.statVal, color: s.color }}>{s.value}</div>
              <div style={S.statLabel}>{s.label.toUpperCase()}</div>
              <div style={S.statSub}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* The compliance gap */}
        <div style={S.callout}>
          <strong>{q2Pct}% of FAA-registered heliports have no airspace determination on file.</strong>{" "}
          AirIndex ingested {t.total_determinations.toLocaleString()} FAA OE/AAA airspace determinations across 17 states.
          These {t.linked_determinations} determination records cover just {t.q2_on_file} unique heliport facilities &mdash;
          meaning only {t.q2_on_file} of {t.total_heliports.toLocaleString()} registered sites have any verified FAA airspace data on file.
          For the remaining {t.q2_unknown.toLocaleString()} sites, there is no federal record confirming that airspace
          evaluation conditions were met, modified, or monitored. FAA Advisory Circulars are used as the
          &ldquo;standard of care&rdquo; in civil litigation. Deviation from them has been treated as evidence of negligence.
        </div>

        {/* Five-question audit */}
        <h2 style={S.h2}>Five-Question Compliance Checklist</h2>
        <p style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
          AirIndex scores every registered heliport against five compliance questions. Current national results:
        </p>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Question</th>
              <th style={{ ...S.th, width: 90 }}>Pass</th>
              <th style={{ ...S.th, width: 90 }}>Gap / Unknown</th>
              <th style={{ ...S.th, width: 70 }}>Pass Rate</th>
            </tr>
          </thead>
          <tbody>
            {[
              { q: "Q1: FAA Registration Current", pass: t.compliant + t.conditional, gap: t.unknown_status, note: "NASR 5010 record on file" },
              { q: "Q2: Airspace Determination on File", pass: t.q2_on_file, gap: t.q2_unknown, note: "FAA OE/AAA determination matched" },
              { q: "Q3: State Enforcement Posture", pass: 0, gap: t.total_heliports, note: "Assessment in progress" },
              { q: "Q4: NFPA 418 in Local Fire Code", pass: t.q4_adopted, gap: t.q4_unknown + (t.q4_partial || 0), note: "Jurisdiction adoption verified" },
              { q: "Q5: eVTOL Dimensional Viability", pass: 0, gap: t.hospital_at_risk, note: "50x50 ft TLOF minimum" },
            ].map((row) => {
              const rate = t.total_heliports > 0 ? Math.round((row.pass / t.total_heliports) * 100) : 0;
              return (
                <tr key={row.q}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{row.q}<br /><span style={{ fontWeight: 400, color: "#888", fontSize: 10 }}>{row.note}</span></td>
                  <td style={{ ...S.td, color: "#16a34a", fontWeight: 600 }}>{row.pass.toLocaleString()}</td>
                  <td style={{ ...S.td, color: "#dc2626", fontWeight: 600 }}>{row.gap.toLocaleString()}</td>
                  <td style={{ ...S.td, fontWeight: 700, color: rate > 50 ? "#16a34a" : rate > 0 ? S.accent : "#999" }}>{rate}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Top states */}
        <h2 style={S.h2}>Heliport Inventory by State (Top 10)</h2>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>State</th>
              <th style={{ ...S.th, textAlign: "right" }}>Registered Sites</th>
              <th style={{ ...S.th, textAlign: "right" }}>% of National</th>
            </tr>
          </thead>
          <tbody>
            {topStates.map((s) => (
              <tr key={s.state}>
                <td style={{ ...S.td, fontWeight: 600 }}>{s.state}</td>
                <td style={{ ...S.td, textAlign: "right", fontFamily: "'Space Mono', monospace" }}>{s.count}</td>
                <td style={{ ...S.td, textAlign: "right", fontFamily: "'Space Mono', monospace", color: "#888" }}>{Math.round((s.count / t.total_heliports) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Hospital callout */}
        <h2 style={S.h2}>Hospital Heliports: The eVTOL Dimensional Risk</h2>
        <p style={{ fontSize: 13, color: "#444", lineHeight: 1.7 }}>
          {t.hospitals.toLocaleString()} of {t.total_heliports.toLocaleString()} registered heliports ({hospitalPct}%) are hospital facilities.
          Most were built to 40&times;40 ft TLOF standards for helicopter operations. eVTOL aircraft require a minimum
          50&times;50 ft TLOF. Fewer than 20% of hospital helipads can physically accommodate eVTOL operations without
          structural modification. For carriers covering hospital heliport liability, this creates a dimensional
          compliance gap that will surface when eVTOL operators begin commercial service in ADVANCED-tier markets
          (Los Angeles, Dallas, Miami, Orlando, San Francisco).
        </p>

        {/* What this means for underwriters */}
        <h2 style={S.h2}>What This Means for Underwriters</h2>
        <div style={{ fontSize: 13, color: "#444", lineHeight: 1.8 }}>
          <p style={{ margin: "0 0 12px" }}>
            <strong>1. Portfolio exposure is unquantified.</strong> {q2Pct}% of registered heliports have no FAA airspace
            determination on file. Carriers writing heliport liability policies on these sites are pricing risk
            against self-reported data with no federal verification.
          </p>
          <p style={{ margin: "0 0 12px" }}>
            <strong>2. NFPA 418 adoption is inconsistent.</strong> Only {t.q4_adopted} of {t.total_heliports.toLocaleString()} sites sit in
            jurisdictions that have adopted NFPA 418 in their fire code. {t.q4_unknown.toLocaleString()} have unknown adoption status.
            The standard is routinely cited in litigation as the benchmark for heliport safety compliance.
          </p>
          <p style={{ margin: "0 0 12px" }}>
            <strong>3. eVTOL operations will create new exposure.</strong> When commercial eVTOL service launches in ADVANCED-tier
            markets, existing heliport policies will need to account for dimensional non-compliance, new AC standards
            (expected June 2026), and a mixed-use operational environment the current policy language does not contemplate.
          </p>
          <p style={{ margin: "0" }}>
            <strong>4. No other data product provides this view.</strong> AirIndex is the only platform that cross-references
            FAA NASR registration, OE/AAA airspace determinations, NFPA 418 jurisdiction adoption, and eVTOL dimensional
            viability into a single compliance score per site. This brief is a sample of that capability.
          </p>
        </div>

        {/* CTA */}
        <div style={{ background: "#fef9ee", border: "1px solid #e5d5b0", borderRadius: 8, padding: "20px 24px", marginTop: 28 }}>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: "#78350f", margin: 0 }}>
            <strong>Portfolio Compliance Screening</strong> is available for carriers who want to assess their
            book against AirIndex compliance data. We provide automated pre-screening across your full site list,
            with physical verification by credentialed inspectors on flagged facilities. Contact{" "}
            <strong>sales@airindex.io</strong> to discuss scope and pricing. Full methodology published at{" "}
            <strong>airindex.io/methodology</strong>.
          </p>
        </div>

        {/* Footer */}
        <div style={S.footer}>
          <p style={{ margin: "0 0 4px" }}>
            Vertical Data Group, LLC &middot; sales@airindex.io &middot; airindex.io
          </p>
          <p style={{ margin: 0, fontSize: 9, color: "#bbb" }}>
            Data sources: FAA NASR 5010, FAA OE/AAA RESTful Web Services (NRA + CIRC, 2024&ndash;2026), AirIndex Heliport Compliance Database v1.0.
            Compliance assessments are automated pre-screening based on publicly available data and do not constitute legal or regulatory advice.
          </p>
        </div>
      </main>
    </div>
  );
}
