import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verifyShareToken } from "@/lib/share-token";
import PrintButton from "./PrintButton";

export const metadata: Metadata = {
  robots: "noindex, nofollow",
};

// FL = sample (publicly accessible). All others gated.
const PUBLIC_SAMPLE_JURISDICTIONS = new Set(["sample", "fl"]);

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

interface NfpaPriority {
  facilityId: string;
  facilityName: string;
  city: string;
  siteType: string;
  q4: string;       // adopted | partial | none | unknown
  q5: string;       // viable | at_risk | unknown
  flagCount: number;
  priority: "P1" | "P2" | "P3" | "monitor";
  reason: string;
}

function classifyPriority(c: {
  q4Nfpa418: string;
  q5EvtolViability: string;
  flagCount: number;
}): { priority: NfpaPriority["priority"]; reason: string } {
  const q4 = c.q4Nfpa418;
  const q5 = c.q5EvtolViability;

  // P1: Active code gap + dimensional concern
  if ((q4 === "none" || q4 === "partial") && q5 === "at_risk") {
    return { priority: "P1", reason: "NFPA 418 not adopted AND dimensional risk for eVTOL" };
  }
  // P2: Active code gap, no dimensional data yet
  if (q4 === "none" || q4 === "partial") {
    return { priority: "P2", reason: "NFPA 418 not adopted in jurisdiction code" };
  }
  // P3: Code adopted but dimensional issue
  if (q5 === "at_risk") {
    return { priority: "P3", reason: "Dimensional risk for eVTOL operations" };
  }
  // Monitor: needs assessment
  if (q4 === "unknown" || q5 === "unknown") {
    return { priority: "monitor", reason: "Field assessment recommended to confirm compliance" };
  }
  return { priority: "monitor", reason: "Currently meets baseline requirements" };
}

const PRIORITY_STYLES: Record<NfpaPriority["priority"], { label: string; bg: string; fg: string }> = {
  P1: { label: "P1 — IMMEDIATE", bg: "#dc2626", fg: "#ffffff" },
  P2: { label: "P2 — HIGH", bg: "#d97706", fg: "#ffffff" },
  P3: { label: "P3 — MEDIUM", bg: "#ca8a04", fg: "#ffffff" },
  monitor: { label: "MONITOR", bg: "#e5e7eb", fg: "#475569" },
};

const Q4_LABEL: Record<string, string> = {
  adopted: "Adopted",
  partial: "Partial",
  none: "Not Adopted",
  unknown: "Needs Assessment",
};

const Q5_LABEL: Record<string, string> = {
  viable: "Viable",
  at_risk: "At Risk",
  unknown: "Needs Assessment",
};

export default async function AhjBriefingPage({
  params,
  searchParams,
}: {
  params: Promise<{ jurisdiction: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { jurisdiction } = await params;
  const search = await searchParams;
  const slug = jurisdiction.toLowerCase();

  // Resolve to state code
  let stateCode = slug.toUpperCase();
  let scopeLabel = "";
  if (slug === "sample") {
    stateCode = "FL";
    scopeLabel = "Sample — Florida AHJ briefing";
  } else if (STATE_NAMES[stateCode]) {
    scopeLabel = `${STATE_NAMES[stateCode]} AHJs`;
  } else {
    notFound();
  }

  // Check for valid share token first
  let hasShareToken = false;
  if (search.token) {
    const payload = verifyShareToken(search.token);
    if (
      payload &&
      payload.type === "ahj-briefing" &&
      (payload.params.jurisdiction || "").toLowerCase() === slug
    ) {
      hasShareToken = true;
    }
  }

  // Auth gate (sample + FL public, share token, or login)
  if (!PUBLIC_SAMPLE_JURISDICTIONS.has(slug) && !hasShareToken) {
    const session = await auth();
    if (!session?.user) {
      redirect(`/contact?product=ahj-fire-marshal&ref=ahj-${slug}`);
    }
  }

  // Pull facilities + compliance for the jurisdiction
  const [heliports, compliance] = await Promise.all([
    prisma.heliport.findMany({
      where: { state: stateCode, statusCode: "O" },
      orderBy: [{ city: "asc" }, { facilityName: "asc" }],
      select: {
        id: true,
        facilityName: true,
        city: true,
        county: true,
        ownershipType: true,
        useType: true,
        padLengthFt: true,
        padWidthFt: true,
      },
    }),
    prisma.heliportCompliance.findMany({
      where: { state: stateCode },
      select: {
        facilityId: true,
        siteType: true,
        q4Nfpa418: true,
        q5EvtolViability: true,
        complianceStatus: true,
        complianceScore: true,
        flagCount: true,
      },
    }),
  ]);

  const complianceMap = new Map(compliance.map((c) => [c.facilityId, c]));

  // Build priority-classified list
  const facilities: NfpaPriority[] = heliports.map((h) => {
    const c = complianceMap.get(h.id);
    const q4 = c?.q4Nfpa418 ?? "unknown";
    const q5 = c?.q5EvtolViability ?? "unknown";
    const { priority, reason } = classifyPriority({
      q4Nfpa418: q4,
      q5EvtolViability: q5,
      flagCount: c?.flagCount ?? 0,
    });
    return {
      facilityId: h.id,
      facilityName: h.facilityName,
      city: h.city,
      siteType: c?.siteType ?? (h.useType === "PU" ? "public" : "private"),
      q4,
      q5,
      flagCount: c?.flagCount ?? 0,
      priority,
      reason,
    };
  });

  // Stats
  const total = facilities.length;
  const p1 = facilities.filter((f) => f.priority === "P1").length;
  const p2 = facilities.filter((f) => f.priority === "P2").length;
  const p3 = facilities.filter((f) => f.priority === "P3").length;
  const monitor = facilities.filter((f) => f.priority === "monitor").length;
  const totalAction = p1 + p2 + p3;
  const hospitalCount = facilities.filter((f) => f.siteType === "hospital").length;

  // Priority inspection list — top 20
  const priorityOrder: NfpaPriority["priority"][] = ["P1", "P2", "P3", "monitor"];
  const priorityList = facilities
    .slice()
    .sort((a, b) => {
      const ai = priorityOrder.indexOf(a.priority);
      const bi = priorityOrder.indexOf(b.priority);
      if (ai !== bi) return ai - bi;
      return b.flagCount - a.flagCount;
    })
    .slice(0, 20);

  // Group by city for the master facility table
  const byCity = new Map<string, NfpaPriority[]>();
  for (const f of facilities) {
    if (!byCity.has(f.city)) byCity.set(f.city, []);
    byCity.get(f.city)!.push(f);
  }
  const cityGroups = Array.from(byCity.entries()).sort((a, b) => b[1].length - a[1].length);

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        color: "#0a0a1a",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Print styles + header chrome */}
      <style>{`
        @page { size: Letter; margin: 0.5in; }
        @media print {
          .no-print { display: none !important; }
          .page-break { page-break-after: always; break-after: page; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .priority-pill {
          display: inline-block;
          padding: 2px 8px;
          font-family: 'Space Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1px;
          border-radius: 3px;
        }
      `}</style>

      <div className="no-print" style={{ padding: "16px 24px", borderBottom: "1px solid #e3e8ee", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/briefings" style={{ color: "#5B8DB8", fontSize: 12, textDecoration: "none" }}>
          ← Briefings
        </Link>
        <PrintButton />
      </div>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "48px 32px" }}>
        {/* COVER PAGE */}
        <section style={{ marginBottom: 48 }}>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              letterSpacing: 2,
              color: "#5B8DB8",
              textTransform: "uppercase",
              marginBottom: 24,
            }}
          >
            AirIndex AHJ Briefing Kit · {today}
          </div>
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 36,
              fontWeight: 700,
              lineHeight: 1.15,
              margin: "0 0 16px",
              color: "#0a2540",
            }}
          >
            NFPA 418 Compliance Briefing
          </h1>
          <div style={{ fontSize: 18, color: "#425466", marginBottom: 8 }}>
            {STATE_NAMES[stateCode]} — Authority Having Jurisdiction Reference
          </div>
          <div style={{ fontSize: 13, color: "#697386", fontStyle: "italic", marginBottom: 32 }}>
            {scopeLabel}
          </div>

          <div
            style={{
              padding: "24px 28px",
              background: "#f9fbfd",
              border: "1px solid #e3e8ee",
              borderRadius: 8,
              marginBottom: 32,
            }}
          >
            <div style={{ fontSize: 11, color: "#5B8DB8", fontFamily: "'Space Mono', monospace", marginBottom: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>
              Executive Summary
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: "#0a2540", marginBottom: 16 }}>
              {totalAction > 0 ? (
                <>
                  Of <strong>{total} operational helicopter facilities</strong> in {STATE_NAMES[stateCode]},{" "}
                  <strong style={{ color: "#dc2626" }}>{totalAction}</strong> require AHJ review under NFPA 418
                  before commercial eVTOL operations begin. {hospitalCount > 0 && `${hospitalCount} are hospital helipads — operationally critical.`}
                </>
              ) : (
                <>
                  This jurisdiction has <strong>{total} operational helicopter facilities</strong>. None currently
                  flag P1/P2/P3 priorities, though {monitor} facilities require field assessment to confirm
                  NFPA 418 readiness for eVTOL operations.
                </>
              )}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 16,
                marginTop: 20,
              }}
            >
              {[
                { label: "P1 — Immediate", value: p1, color: "#dc2626" },
                { label: "P2 — High", value: p2, color: "#d97706" },
                { label: "P3 — Medium", value: p3, color: "#ca8a04" },
                { label: "Monitor", value: monitor, color: "#697386" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: stat.color, lineHeight: 1 }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: 10, color: "#697386", fontFamily: "'Space Mono', monospace", letterSpacing: 1, marginTop: 4, textTransform: "uppercase" }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ fontSize: 12, color: "#697386", lineHeight: 1.7 }}>
            Prepared for: <strong style={{ color: "#0a2540" }}>{STATE_NAMES[stateCode]} fire marshals, code officials, and AHJ reviewers</strong>
            <br />
            Methodology aligned with NFPA 418, FAA AC 150/5390-2C, and FAA Tech Center / Rowan University heliport research
            <br />
            Source data: FAA NASR 5010 (operational helicopter facilities), AirIndex 5-question compliance audit
          </div>
        </section>

        <div className="page-break" />

        {/* METHODOLOGY */}
        <section style={{ marginBottom: 48 }}>
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 22,
              fontWeight: 700,
              color: "#0a2540",
              borderBottom: "2px solid #5B8DB8",
              paddingBottom: 8,
              marginBottom: 20,
            }}
          >
            How AirIndex Classifies Facilities
          </h2>
          <p style={{ fontSize: 13, color: "#425466", lineHeight: 1.8, marginBottom: 16 }}>
            Every facility in this briefing is scored against five compliance questions developed in collaboration
            with FAA Tech Center / Rowan University. Two of those questions — Q4 (NFPA 418 jurisdictional adoption)
            and Q5 (eVTOL dimensional viability) — drive the priority classification below.
          </p>

          <div style={{ background: "#f9fbfd", border: "1px solid #e3e8ee", borderRadius: 8, padding: "20px 24px", marginBottom: 24 }}>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e3e8ee" }}>
                  <th style={{ textAlign: "left", padding: "8px 0", color: "#697386", fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>
                    Priority
                  </th>
                  <th style={{ textAlign: "left", padding: "8px 0", color: "#697386", fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>
                    Trigger
                  </th>
                  <th style={{ textAlign: "left", padding: "8px 0", color: "#697386", fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>
                    Recommended Action
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 0" }}>
                    <span className="priority-pill" style={{ background: PRIORITY_STYLES.P1.bg, color: PRIORITY_STYLES.P1.fg }}>P1</span>
                  </td>
                  <td style={{ padding: "12px 0", color: "#0a2540" }}>NFPA 418 not adopted AND dimensional risk for eVTOL</td>
                  <td style={{ padding: "12px 0", color: "#425466" }}>On-site inspection within 60 days</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 0" }}>
                    <span className="priority-pill" style={{ background: PRIORITY_STYLES.P2.bg, color: PRIORITY_STYLES.P2.fg }}>P2</span>
                  </td>
                  <td style={{ padding: "12px 0", color: "#0a2540" }}>NFPA 418 not adopted in jurisdiction code</td>
                  <td style={{ padding: "12px 0", color: "#425466" }}>Code review within 90 days</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 0" }}>
                    <span className="priority-pill" style={{ background: PRIORITY_STYLES.P3.bg, color: PRIORITY_STYLES.P3.fg }}>P3</span>
                  </td>
                  <td style={{ padding: "12px 0", color: "#0a2540" }}>Dimensional risk only (code adopted)</td>
                  <td style={{ padding: "12px 0", color: "#425466" }}>Engineering review on operator entry</td>
                </tr>
                <tr>
                  <td style={{ padding: "12px 0" }}>
                    <span className="priority-pill" style={{ background: PRIORITY_STYLES.monitor.bg, color: PRIORITY_STYLES.monitor.fg }}>MONITOR</span>
                  </td>
                  <td style={{ padding: "12px 0", color: "#0a2540" }}>Insufficient data — needs field assessment</td>
                  <td style={{ padding: "12px 0", color: "#425466" }}>Annual review cycle</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: 12, color: "#697386", lineHeight: 1.7, fontStyle: "italic" }}>
            NFPA 418 is the National Fire Protection Association standard for heliports. It establishes
            requirements for fire suppression, fuel storage, and crash/rescue at heliport facilities. Battery-powered
            eVTOL operations introduce new fire-suppression considerations that legacy heliport codes don&rsquo;t address.
          </p>
        </section>

        <div className="page-break" />

        {/* PRIORITY INSPECTION LIST */}
        <section style={{ marginBottom: 48 }}>
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 22,
              fontWeight: 700,
              color: "#0a2540",
              borderBottom: "2px solid #5B8DB8",
              paddingBottom: 8,
              marginBottom: 20,
            }}
          >
            Priority Inspection Order — Top {Math.min(20, priorityList.length)}
          </h2>
          <p style={{ fontSize: 12, color: "#697386", lineHeight: 1.7, marginBottom: 20 }}>
            Facilities ranked by NFPA 418 review urgency. P1 first, then P2, P3, and Monitor — with flag count as tiebreaker.
          </p>

          <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #0a2540", background: "#f9fbfd" }}>
                <th style={{ textAlign: "left", padding: "8px 6px", fontSize: 9, fontFamily: "'Space Mono', monospace", letterSpacing: 1, color: "#697386", textTransform: "uppercase" }}>#</th>
                <th style={{ textAlign: "left", padding: "8px 6px", fontSize: 9, fontFamily: "'Space Mono', monospace", letterSpacing: 1, color: "#697386", textTransform: "uppercase" }}>Priority</th>
                <th style={{ textAlign: "left", padding: "8px 6px", fontSize: 9, fontFamily: "'Space Mono', monospace", letterSpacing: 1, color: "#697386", textTransform: "uppercase" }}>Facility</th>
                <th style={{ textAlign: "left", padding: "8px 6px", fontSize: 9, fontFamily: "'Space Mono', monospace", letterSpacing: 1, color: "#697386", textTransform: "uppercase" }}>City</th>
                <th style={{ textAlign: "left", padding: "8px 6px", fontSize: 9, fontFamily: "'Space Mono', monospace", letterSpacing: 1, color: "#697386", textTransform: "uppercase" }}>NFPA 418</th>
                <th style={{ textAlign: "left", padding: "8px 6px", fontSize: 9, fontFamily: "'Space Mono', monospace", letterSpacing: 1, color: "#697386", textTransform: "uppercase" }}>eVTOL</th>
                <th style={{ textAlign: "left", padding: "8px 6px", fontSize: 9, fontFamily: "'Space Mono', monospace", letterSpacing: 1, color: "#697386", textTransform: "uppercase" }}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {priorityList.map((f, i) => {
                const ps = PRIORITY_STYLES[f.priority];
                return (
                  <tr key={f.facilityId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 6px", color: "#697386", fontFamily: "'Space Mono', monospace" }}>{i + 1}</td>
                    <td style={{ padding: "8px 6px" }}>
                      <span className="priority-pill" style={{ background: ps.bg, color: ps.fg }}>{f.priority.toUpperCase()}</span>
                    </td>
                    <td style={{ padding: "8px 6px", color: "#0a2540", fontWeight: 600 }}>{f.facilityName}</td>
                    <td style={{ padding: "8px 6px", color: "#425466" }}>{f.city}</td>
                    <td style={{ padding: "8px 6px", color: "#425466" }}>{Q4_LABEL[f.q4] ?? f.q4}</td>
                    <td style={{ padding: "8px 6px", color: "#425466" }}>{Q5_LABEL[f.q5] ?? f.q5}</td>
                    <td style={{ padding: "8px 6px", color: "#697386", fontSize: 10 }}>{f.reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <div className="page-break" />

        {/* MASTER FACILITY TABLE BY CITY */}
        <section style={{ marginBottom: 48 }}>
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 22,
              fontWeight: 700,
              color: "#0a2540",
              borderBottom: "2px solid #5B8DB8",
              paddingBottom: 8,
              marginBottom: 20,
            }}
          >
            Full Facility Inventory by Jurisdiction
          </h2>
          <p style={{ fontSize: 12, color: "#697386", lineHeight: 1.7, marginBottom: 20 }}>
            Every operational helicopter facility in {STATE_NAMES[stateCode]}, grouped by city and ranked
            within each city by NFPA 418 priority.
          </p>

          {cityGroups.map(([city, list]) => (
            <div key={city} style={{ marginBottom: 24 }}>
              <h3
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#0a2540",
                  marginBottom: 8,
                  paddingBottom: 4,
                  borderBottom: "1px solid #e3e8ee",
                }}
              >
                {city} <span style={{ fontSize: 11, color: "#697386", fontWeight: 400, marginLeft: 8 }}>{list.length} facilities</span>
              </h3>
              <table style={{ width: "100%", fontSize: 10.5, borderCollapse: "collapse" }}>
                <tbody>
                  {list
                    .slice()
                    .sort((a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority))
                    .map((f) => {
                      const ps = PRIORITY_STYLES[f.priority];
                      return (
                        <tr key={f.facilityId} style={{ borderBottom: "1px solid #f8fafc" }}>
                          <td style={{ padding: "5px 6px", width: 80 }}>
                            <span
                              className="priority-pill"
                              style={{ background: ps.bg, color: ps.fg, fontSize: 8 }}
                            >
                              {f.priority.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: "5px 6px", color: "#0a2540" }}>{f.facilityName}</td>
                          <td style={{ padding: "5px 6px", color: "#697386", textAlign: "right", fontFamily: "'Space Mono', monospace", fontSize: 9 }}>
                            {f.facilityId}
                          </td>
                          <td style={{ padding: "5px 6px", color: "#425466", width: 110 }}>NFPA: {Q4_LABEL[f.q4] ?? f.q4}</td>
                          <td style={{ padding: "5px 6px", color: "#425466", width: 110 }}>eVTOL: {Q5_LABEL[f.q5] ?? f.q5}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ))}
        </section>

        <div className="page-break" />

        {/* NFPA 418 READINESS CHECKLIST */}
        <section style={{ marginBottom: 48 }}>
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 22,
              fontWeight: 700,
              color: "#0a2540",
              borderBottom: "2px solid #5B8DB8",
              paddingBottom: 8,
              marginBottom: 20,
            }}
          >
            AHJ Pre-Arrival Readiness Checklist
          </h2>
          <p style={{ fontSize: 12, color: "#697386", lineHeight: 1.7, marginBottom: 20 }}>
            Use this checklist when an eVTOL operator (Joby, Archer, Wisk, Beta, Eve) signals deployment intent
            in your jurisdiction. Most items can be addressed in 30-60 days; combined cost is typically modest
            relative to the economic activity an operator deployment generates.
          </p>

          {[
            {
              section: "Code & Authority",
              items: [
                "NFPA 418 (current edition) referenced in adopted fire/building code",
                "AHJ designated for heliport/vertiport plan review and inspection",
                "Operator notification process documented (FAA Form 7480-1 forwarding)",
                "Coordination MOU with state DOT aviation division",
              ],
            },
            {
              section: "Battery Suppression",
              items: [
                "Battery thermal-runaway suppression standard adopted (NFPA 855 reference)",
                "Class D fire suppression equipment available within response area",
                "First-responder training updated for lithium-ion battery fires",
                "Water supply / hydrant access within 250 ft of TLOF",
              ],
            },
            {
              section: "Site Inspection",
              items: [
                "TLOF (Touchdown and Liftoff Area) dimensional verification documented",
                "FATO (Final Approach and Takeoff Area) clearance confirmed",
                "Approach/departure surface obstruction survey current",
                "Rooftop airflow / HVAC exposure assessment for elevated heliports",
              ],
            },
            {
              section: "Operational Posture",
              items: [
                "After-hours emergency response procedures aligned with operator schedule",
                "Hot-fueling vs cold-charging procedures defined",
                "Public-information messaging prepared for community engagement",
                "Mutual-aid agreement with adjacent jurisdictions (cross-jurisdiction flights)",
              ],
            },
          ].map((group) => (
            <div key={group.section} style={{ marginBottom: 24 }}>
              <h3
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#5B8DB8",
                  marginBottom: 10,
                }}
              >
                {group.section}
              </h3>
              {group.items.map((item) => (
                <div
                  key={item}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    fontSize: 12,
                    color: "#0a2540",
                    marginBottom: 8,
                    lineHeight: 1.6,
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      border: "1.5px solid #5B8DB8",
                      borderRadius: 2,
                      flexShrink: 0,
                      marginTop: 3,
                    }}
                  />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          ))}
        </section>

        {/* SOURCES */}
        <section
          style={{
            marginTop: 48,
            paddingTop: 24,
            borderTop: "1px solid #e3e8ee",
            fontSize: 10,
            color: "#697386",
            lineHeight: 1.7,
          }}
        >
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#5B8DB8", letterSpacing: 1.5, marginBottom: 12, textTransform: "uppercase" }}>
            Sources & Limitations
          </div>
          <p style={{ marginBottom: 8 }}>
            <strong>Primary sources:</strong> FAA NASR 5010 (heliport facility registry), state fire-code adoptions,
            AirIndex 5-question compliance audit aligned with NFPA 418 and FAA AC 150/5390-2C.
          </p>
          <p style={{ marginBottom: 8 }}>
            <strong>Coverage:</strong> Operational facilities only (FAA status code &ldquo;O&rdquo;). Closed and indefinitely
            closed facilities are excluded. Private-use heliports not in NASR are not represented.
          </p>
          <p style={{ marginBottom: 8 }}>
            <strong>Limitations:</strong> Q4 (NFPA 418 adoption) reflects state-level code adoption status; local
            jurisdictions may amend or supplement. Q5 (eVTOL viability) is dimensional-only and does not include
            obstruction or rooftop airflow analysis. Field verification recommended before regulatory action.
          </p>
          <p>
            <strong>Methodology:</strong> Full methodology at{" "}
            <a href="https://www.airindex.io/methodology" style={{ color: "#5B8DB8", textDecoration: "none" }}>
              airindex.io/methodology
            </a>
            . Briefing prepared {today}.
          </p>
        </section>
      </main>
    </div>
  );
}
