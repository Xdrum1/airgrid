import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStateContext } from "@/lib/mcs";
import PrintButton from "../../gap/[cityId]/PrintButton";

export const metadata: Metadata = {
  robots: "noindex, nofollow",
};

// SC is the public sample report linked from /heliport-audit
const PUBLIC_SAMPLE_STATES = new Set(["SC"]);

// ── State name lookup ──
const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

// ── Compliance status config ──
const STATUS_CONFIG: Record<string, { label: string; color: string; printColor: string }> = {
  compliant: { label: "COMPLIANT", color: "#00ff88", printColor: "#16a34a" },
  conditional: { label: "CONDITIONAL", color: "#f59e0b", printColor: "#d97706" },
  objectionable: { label: "OBJECTIONABLE", color: "#ff4444", printColor: "#dc2626" },
  unknown: { label: "UNKNOWN", color: "#555", printColor: "#9ca3af" },
};

const Q_LABELS = [
  { key: "q1", label: "Q1: FAA Registration", field: "q1FaaRegistration", noteField: "q1Note", pass: "pass", desc: "Facility has current FAA NASR 5010 registration" },
  { key: "q2", label: "Q2: Airspace Determination", field: "q2AirspaceDetermination", noteField: "q2Note", pass: "on_file", desc: "FAA OE/AAA airspace determination on file" },
  { key: "q3", label: "Q3: State Enforcement", field: "q3StateEnforcement", noteField: "q3Note", pass: "strong", desc: "State has active heliport/vertiport enforcement posture" },
  { key: "q4", label: "Q4: NFPA 418 Adoption", field: "q4Nfpa418", noteField: "q4Note", pass: "adopted", desc: "NFPA 418 (Heliport) referenced in local fire/building code" },
  { key: "q5", label: "Q5: eVTOL Viability", field: "q5EvtolViability", noteField: "q5Note", pass: "viable", desc: "TLOF/FATO dimensions accommodate eVTOL minimum (50×50 ft)" },
];

function qStatusColor(value: string, passValue: string): string {
  if (value === passValue) return "#00ff88";
  if (value === "unknown" || value === "pending") return "#555";
  return "#ff4444";
}

function qStatusLabel(value: string): string {
  return value.replace(/_/g, " ").toUpperCase();
}

// ── Page ──
export default async function AuditReportPage({
  params,
}: {
  params: Promise<{ stateCode: string }>;
}) {
  const { stateCode } = await params;
  const code = stateCode.toUpperCase();
  const stateName = STATE_NAMES[code];
  if (!stateName) notFound();

  // Gate: only SC is publicly accessible as a sample. All others require auth.
  if (!PUBLIC_SAMPLE_STATES.has(code)) {
    const session = await auth();
    if (!session?.user) redirect(`/contact?inquiry=heliport-audit&ref=audit-${code.toLowerCase()}`);
  }

  // Fetch all data in parallel
  const [heliports, compliance, stateCtx, ordinanceAudits, oeaaaDeterminations] = await Promise.all([
    prisma.heliport.findMany({
      where: { state: code },
      orderBy: { facilityName: "asc" },
    }),
    prisma.heliportCompliance.findMany({
      where: { state: code },
      orderBy: { facilityName: "asc" },
    }),
    getStateContext(code),
    prisma.ordinanceAudit.findMany({
      where: { market: { state: code } },
      include: { market: { select: { id: true, city: true } } },
    }),
    prisma.oeaaaDetermination.groupBy({
      by: ["statusCode"],
      where: { nearestState: code },
      _count: { _all: true },
    }),
  ]);

  if (heliports.length === 0) notFound();

  // ── Aggregate stats ──
  const totalHeliports = heliports.length;
  const publicUse = heliports.filter(h => h.useType === "PU").length;
  const privateUse = heliports.filter(h => h.useType === "PR").length;
  const military = heliports.filter(h => ["MA", "MN", "MR"].includes(h.ownershipType)).length;
  const operational = heliports.filter(h => h.statusCode === "O").length;

  // OE/AAA determination stats
  const totalDeterminations = oeaaaDeterminations.reduce((sum, g) => sum + g._count._all, 0);
  const circulatedCount = oeaaaDeterminations.find(g => g.statusCode === "CIR")?._count._all ?? 0;
  const linkedToHeliports = await prisma.oeaaaDetermination.count({
    where: { nearestState: code, linkedHeliportId: { not: null } },
  });

  // Compliance distribution
  const compByStatus: Record<string, number> = { compliant: 0, conditional: 0, objectionable: 0, unknown: 0 };
  for (const c of compliance) compByStatus[c.complianceStatus] = (compByStatus[c.complianceStatus] ?? 0) + 1;

  // Q-level pass rates
  const qStats = Q_LABELS.map(q => {
    const total = compliance.length;
    const pass = compliance.filter(c => (c as Record<string, unknown>)[q.field] === q.pass).length;
    const unknown = compliance.filter(c => (c as Record<string, unknown>)[q.field] === "unknown").length;
    const fail = total - pass - unknown;
    return { ...q, total, pass, fail, unknown, rate: total > 0 ? Math.round((pass / total) * 100) : 0 };
  });

  // Hospital sites
  const hospitalSites = compliance.filter(c => c.siteType === "hospital");
  const hospitalAtRisk = hospitalSites.filter(c => c.q5EvtolViability === "at_risk");

  // Top facilities by compliance issues (most flags first)
  const flagged = compliance
    .filter(c => c.flagCount > 0)
    .sort((a, b) => b.flagCount - a.flagCount)
    .slice(0, 20);

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const cardStyle: React.CSSProperties = {
    background: "#0a0a12",
    border: "1px solid #1a1a2e",
    borderRadius: 12,
    padding: "28px 24px",
    marginBottom: 20,
  };

  const sectionHeadStyle: React.CSSProperties = {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 18,
    fontWeight: 700,
    color: "#fff",
    marginBottom: 16,
  };

  return (
    <div style={{
      background: "#050508",
      color: "#e0e0e0",
      minHeight: "100vh",
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* ── Print styles ── */}
      <style>{`
        @media print {
          body { background: #fff !important; color: #111 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          div[style*="background: #050508"] { background: #fff !important; }
          div[style*="background: #0a0a12"] { background: #f8f9fa !important; border-color: #ddd !important; }
          h1, h2, h3, h4 { color: #111 !important; }
          p, span, div { color: #333 !important; }
          a { color: #0066cc !important; }
        }
        @page { margin: 0.6in; size: letter; }
      `}</style>

      {/* ── Header ── */}
      <div className="no-print" style={{ padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/" style={{ color: "#555", fontSize: 12, textDecoration: "none" }}>
            &larr; Home
          </Link>
          <PrintButton />
        </div>
      </div>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* ── Title ── */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 9, letterSpacing: 3, color: "#5B8DB8", fontFamily: "'Space Mono', monospace", marginBottom: 12 }}>
            HELIPORT INFRASTRUCTURE AUDIT
          </div>
          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 32,
            fontWeight: 700,
            color: "#fff",
            margin: "0 0 8px",
          }}>
            {stateName}
          </h1>
          <div style={{ color: "#666", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>
            Generated {today} &middot; AirIndex Heliport Compliance Database v1.0
          </div>
        </div>

        {/* ── Executive Summary ── */}
        <div style={cardStyle}>
          <h2 style={sectionHeadStyle}>Executive Summary</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
            {[
              { value: totalHeliports.toLocaleString(), label: "Total Heliports", color: "#5B8DB8" },
              { value: `${publicUse}`, label: "Public Use", color: "#00ff88" },
              { value: `${privateUse}`, label: "Private Use", color: "#f59e0b" },
              { value: `${operational}`, label: "Operational", color: "#5B8DB8" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 24, fontWeight: 700, color: s.color }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#666", marginTop: 4 }}>
                  {s.label.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
          {military > 0 && (
            <div style={{ fontSize: 11, color: "#666", marginBottom: 12 }}>
              {military} military-owned facilit{military === 1 ? "y" : "ies"} included in total.
            </div>
          )}
          <p style={{ fontSize: 13, color: "#999", lineHeight: 1.7 }}>
            {stateName} has {totalHeliports.toLocaleString()} FAA-registered heliports in the NASR 5010 database.
            Of {compliance.length > 0 ? compliance.length.toLocaleString() : "these"} facilities assessed,{" "}
            <span style={{ color: STATUS_CONFIG.compliant.color }}>{compByStatus.compliant}</span> are fully compliant,{" "}
            <span style={{ color: STATUS_CONFIG.conditional.color }}>{compByStatus.conditional}</span> are conditional,{" "}
            <span style={{ color: STATUS_CONFIG.objectionable.color }}>{compByStatus.objectionable}</span> are objectionable, and{" "}
            <span style={{ color: "#555" }}>{compByStatus.unknown}</span> have insufficient data.
            {hospitalSites.length > 0 && ` ${hospitalSites.length} hospital helipad${hospitalSites.length === 1 ? "" : "s"} identified, ${hospitalAtRisk.length} flagged for eVTOL dimensional viability concerns.`}
          </p>
        </div>

        {/* ── FAA Airspace Determinations ── */}
        {totalDeterminations > 0 && (
          <div style={cardStyle}>
            <h2 style={sectionHeadStyle}>FAA Airspace Determinations (OE/AAA)</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
              {[
                { value: totalDeterminations.toLocaleString(), label: "Total Determinations", color: "#5B8DB8" },
                { value: linkedToHeliports.toLocaleString(), label: "Linked to Heliports", color: "#00ff88" },
                { value: circulatedCount.toLocaleString(), label: "Circularized (CIR)", color: "#ff6b35" },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 24, fontWeight: 700, color: s.color }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#666", marginTop: 4 }}>
                    {s.label.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {oeaaaDeterminations.map(g => (
                <span key={g.statusCode} style={{
                  fontSize: 10, padding: "4px 10px", borderRadius: 4,
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                  color: "#888", fontFamily: "'Space Mono', monospace",
                }}>
                  {g.statusCode}: {g._count._all}
                </span>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "#777", lineHeight: 1.7 }}>
              FAA OE/AAA airspace determinations for {stateName} (NRA + CIRC cases, 2024&ndash;2026).
              {linkedToHeliports > 0 && ` ${linkedToHeliports} determinations matched to registered heliport facilities within 0.5 NM proximity.`}
              {circulatedCount > 0 && ` ${circulatedCount} case${circulatedCount === 1 ? "" : "s"} circularized for public comment — typically indicating airspace safety concerns.`}
              {" "}Source: FAA OE/AAA RESTful Web Services API.
            </p>
          </div>
        )}

        {/* ── Compliance Distribution ── */}
        <div style={cardStyle}>
          <h2 style={sectionHeadStyle}>Compliance Distribution</h2>
          <div style={{ display: "flex", gap: 2, height: 32, borderRadius: 6, overflow: "hidden", marginBottom: 16 }}>
            {Object.entries(compByStatus).filter(([, v]) => v > 0).map(([status, count]) => (
              <div
                key={status}
                style={{
                  flex: count,
                  background: STATUS_CONFIG[status]?.color ?? "#333",
                  opacity: 0.8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#050508",
                  letterSpacing: 1,
                  minWidth: count > 0 ? 40 : 0,
                }}
              >
                {count > 0 ? count : ""}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {Object.entries(compByStatus).map(([status, count]) => (
              <div key={status} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: STATUS_CONFIG[status]?.color ?? "#333" }} />
                <span style={{ fontSize: 11, color: "#888" }}>
                  {STATUS_CONFIG[status]?.label ?? status} ({count} &middot; {compliance.length > 0 ? Math.round((count / compliance.length) * 100) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 5-Question Compliance Checklist ── */}
        <div style={cardStyle}>
          <h2 style={sectionHeadStyle}>5-Question Compliance Checklist</h2>
          <p style={{ fontSize: 12, color: "#666", marginBottom: 20, lineHeight: 1.6 }}>
            Each heliport is assessed against five compliance questions. Pass rates show the percentage
            of facilities that meet each criterion statewide.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {qStats.map(q => (
              <div key={q.key} style={{
                padding: "14px 16px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: "#ccc", fontWeight: 600 }}>{q.label}</span>
                  <span style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 14,
                    fontWeight: 700,
                    color: q.rate >= 80 ? "#00ff88" : q.rate >= 50 ? "#f59e0b" : q.rate > 0 ? "#ff4444" : "#555",
                  }}>
                    {q.key === "q2" ? "PENDING" : `${q.rate}%`}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "#666", marginBottom: 8 }}>{q.desc}</div>
                {q.key !== "q2" ? (
                  <div style={{ display: "flex", gap: 2, height: 6, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ flex: q.pass, background: "#00ff88", opacity: 0.7 }} />
                    <div style={{ flex: q.fail, background: "#ff4444", opacity: 0.7 }} />
                    <div style={{ flex: q.unknown, background: "#333" }} />
                  </div>
                ) : (
                  <div style={{ fontSize: 10, color: "#f59e0b", fontFamily: "'Space Mono', monospace" }}>
                    FAA OE/AAA data integration pending &mdash; system currently offline
                  </div>
                )}
                <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 10, color: "#555" }}>
                  <span>Pass: {q.pass}</span>
                  <span>Fail: {q.fail}</span>
                  <span>Unknown: {q.unknown}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── State Regulatory Context ── */}
        <div style={cardStyle}>
          <h2 style={sectionHeadStyle}>State Regulatory Context</h2>
          {stateCtx ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { label: "Legislation Status", value: stateCtx.legislationStatus.replace(/_/g, " ").toUpperCase() },
                { label: "Enforcement Posture", value: stateCtx.enforcementPosture.toUpperCase() },
                { label: "DOT AAM Engagement", value: stateCtx.dotAamEngagement.toUpperCase() },
                { label: "AAM Office Established", value: stateCtx.aamOfficeEstablished ? "YES" : "NO" },
              ].map(item => (
                <div key={item.label} style={{ padding: "12px 16px", background: "rgba(255,255,255,0.02)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#555", marginBottom: 4 }}>{item.label.toUpperCase()}</div>
                  <div style={{ fontSize: 13, color: "#ccc", fontWeight: 500 }}>{item.value}</div>
                </div>
              ))}
              {stateCtx.keyLegislation && (
                <div style={{ gridColumn: "1 / -1", padding: "12px 16px", background: "rgba(255,255,255,0.02)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#555", marginBottom: 4 }}>KEY LEGISLATION</div>
                  <div style={{ fontSize: 13, color: "#ccc" }}>{stateCtx.keyLegislation}</div>
                </div>
              )}
              {stateCtx.enforcementNote && (
                <div style={{ gridColumn: "1 / -1", padding: "12px 16px", background: "rgba(255,255,255,0.02)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#555", marginBottom: 4 }}>ENFORCEMENT NOTE</div>
                  <div style={{ fontSize: 12, color: "#888", lineHeight: 1.6 }}>{stateCtx.enforcementNote}</div>
                </div>
              )}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "#666" }}>
              No state-level AAM context available for {stateName}. Contact us for a full regulatory assessment.
            </p>
          )}
        </div>

        {/* ── Ordinance Audit (if available) ── */}
        {ordinanceAudits.length > 0 && (
          <div style={cardStyle}>
            <h2 style={sectionHeadStyle}>Municipality Ordinance Audit</h2>
            <p style={{ fontSize: 12, color: "#666", marginBottom: 16, lineHeight: 1.6 }}>
              Detailed ordinance-level review of heliport/vertiport regulatory treatment in {stateName} municipalities.
            </p>
            {ordinanceAudits.map(audit => (
              <div key={audit.id} style={{
                padding: "16px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8,
                marginBottom: 12,
              }}>
                <div style={{ fontSize: 14, color: "#fff", fontWeight: 600, marginBottom: 12 }}>
                  {(audit as unknown as { market: { city: string } }).market?.city ?? audit.marketId}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { label: "FAA Terminology in Code", status: audit.faaTerminology, note: audit.faaTerminologyNote },
                    { label: "Zoning Ordinance", status: audit.zoningOrdinance, note: audit.zoningOrdinanceNote },
                    { label: "Airspace Determination Required", status: audit.airspaceDetermination, note: audit.airspaceDeterminationNote },
                    { label: "NFPA 418 Referenced", status: audit.nfpa418Referenced, note: audit.nfpa418ReferencedNote },
                    { label: "State AC 150/5390-2D Adopted", status: audit.stateAdoptedAC, note: audit.stateAdoptedACNote },
                  ].map(item => {
                    const statusColor = item.status === "yes" ? "#00ff88" : item.status === "partial" ? "#f59e0b" : "#ff4444";
                    return (
                      <div key={item.label} style={{ padding: "8px 10px", borderRadius: 4, background: "rgba(255,255,255,0.01)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: "#888" }}>{item.label}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: statusColor, fontFamily: "'Space Mono', monospace" }}>
                            {(item.status ?? "unknown").toUpperCase()}
                          </span>
                        </div>
                        {item.note && (
                          <div style={{ fontSize: 10, color: "#555", lineHeight: 1.5 }}>{item.note}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Hospital Helipad Risk Assessment ── */}
        {hospitalSites.length > 0 && (
          <div style={cardStyle}>
            <h2 style={sectionHeadStyle}>Hospital Helipad Risk Assessment</h2>
            <p style={{ fontSize: 12, color: "#666", marginBottom: 16, lineHeight: 1.6 }}>
              Hospital helipads built to legacy 40×40 ft TLOF standards may not accommodate eVTOL aircraft
              requiring 50×50 ft minimum. {hospitalAtRisk.length} of {hospitalSites.length} hospital sites
              in {stateName} are flagged for dimensional viability review.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {hospitalSites.slice(0, 15).map(h => (
                <div key={h.id} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: 4,
                  fontSize: 12,
                }}>
                  <div>
                    <span style={{ color: "#ccc" }}>{h.facilityName}</span>
                    <span style={{ color: "#555", marginLeft: 8 }}>{h.city}</span>
                  </div>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    fontFamily: "'Space Mono', monospace",
                    color: h.q5EvtolViability === "at_risk" ? "#ff4444" : "#00ff88",
                    letterSpacing: 1,
                  }}>
                    {h.q5EvtolViability === "at_risk" ? "AT RISK" : "VIABLE"}
                  </span>
                </div>
              ))}
              {hospitalSites.length > 15 && (
                <div style={{ fontSize: 11, color: "#555", padding: "8px 12px" }}>
                  + {hospitalSites.length - 15} additional hospital sites
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Flagged Facilities ── */}
        {flagged.length > 0 && (
          <div style={cardStyle}>
            <h2 style={sectionHeadStyle}>Facilities with Compliance Flags</h2>
            <p style={{ fontSize: 12, color: "#666", marginBottom: 16, lineHeight: 1.6 }}>
              Top {flagged.length} facilities by number of compliance flags. These sites
              represent the highest-priority targets for remediation or further review.
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    <th style={{ textAlign: "left", padding: "8px 6px", color: "#555", fontWeight: 500, fontSize: 9, letterSpacing: 1 }}>FAA ID</th>
                    <th style={{ textAlign: "left", padding: "8px 6px", color: "#555", fontWeight: 500, fontSize: 9, letterSpacing: 1 }}>FACILITY</th>
                    <th style={{ textAlign: "left", padding: "8px 6px", color: "#555", fontWeight: 500, fontSize: 9, letterSpacing: 1 }}>CITY</th>
                    <th style={{ textAlign: "center", padding: "8px 6px", color: "#555", fontWeight: 500, fontSize: 9, letterSpacing: 1 }}>FLAGS</th>
                    <th style={{ textAlign: "center", padding: "8px 6px", color: "#555", fontWeight: 500, fontSize: 9, letterSpacing: 1 }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {flagged.map(f => {
                    const sc = STATUS_CONFIG[f.complianceStatus] ?? STATUS_CONFIG.unknown;
                    return (
                      <tr key={f.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding: "6px", fontFamily: "'Space Mono', monospace", color: "#888" }}>{f.facilityId}</td>
                        <td style={{ padding: "6px", color: "#ccc" }}>{f.facilityName}</td>
                        <td style={{ padding: "6px", color: "#888" }}>{f.city}</td>
                        <td style={{ padding: "6px", textAlign: "center", fontFamily: "'Space Mono', monospace", color: "#ff4444", fontWeight: 700 }}>{f.flagCount}</td>
                        <td style={{ padding: "6px", textAlign: "center" }}>
                          <span style={{
                            fontSize: 9,
                            fontWeight: 700,
                            fontFamily: "'Space Mono', monospace",
                            color: sc.color,
                            padding: "2px 8px",
                            border: `1px solid ${sc.color}33`,
                            borderRadius: 3,
                            letterSpacing: 1,
                          }}>
                            {sc.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Methodology Note ── */}
        <div style={{
          padding: "20px 24px",
          background: "rgba(91,141,184,0.03)",
          border: "1px solid rgba(91,141,184,0.1)",
          borderRadius: 8,
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#5B8DB8", marginBottom: 8, fontFamily: "'Space Mono', monospace" }}>
            METHODOLOGY NOTE
          </div>
          <p style={{ fontSize: 12, color: "#888", lineHeight: 1.7, margin: 0 }}>
            This audit is generated from the AirIndex Heliport Compliance Database v1.0, which scores
            facilities against five questions derived from FAA NASR 5010 records, MCS state enforcement
            data, municipality ordinance audits, and site classification analysis. Q2 (Airspace Determination)
            is pending integration of FAA OE/AAA determined cases data. Compliance status is algorithmically
            assessed &mdash; field verification by a qualified inspector is recommended
            before regulatory action. See{" "}
            <a href="https://airindex.io/methodology" style={{ color: "#5B8DB8", textDecoration: "none" }}>
              airindex.io/methodology
            </a>{" "}
            and{" "}
            <a href="https://airindex.io/terminology" style={{ color: "#5B8DB8", textDecoration: "none" }}>
              airindex.io/terminology
            </a>{" "}
            for scoring definitions and standardized terms.
          </p>
        </div>

        {/* ── Footer ── */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingTop: 20,
          fontSize: 10,
          color: "#444",
          lineHeight: 1.6,
        }}>
          <p>
            AirIndex Heliport Infrastructure Audit &middot; {stateName} &middot; {today}
          </p>
          <p>
            Vertical Data Group, LLC &middot; PO Box 31172 &middot; Myrtle Beach, SC 29588
          </p>
          <p style={{ marginTop: 4 }}>
            <a href="https://airindex.io" style={{ color: "#444", textDecoration: "none" }}>airindex.io</a>
            {" "}&middot;{" "}
            <a href="mailto:info@airindex.io" style={{ color: "#444", textDecoration: "none" }}>info@airindex.io</a>
          </p>
        </div>
      </main>
    </div>
  );
}
