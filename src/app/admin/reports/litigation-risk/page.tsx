import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import PrintButton from "@/app/reports/gap/[cityId]/PrintButton";

export const metadata: Metadata = {
  title: "Heliport Litigation Risk Assessment — AirIndex",
  robots: "noindex, nofollow",
};

// ── Live data queries ──────────────────────────────────────

async function getStats() {
  const [totals] = await prisma.$queryRaw<[{
    total_heliports: number;
    hospitals: number;
    hospital_pct: number;
    q2_on_file: number;
    q2_unknown: number;
    q2_pct_unknown: number;
    q4_adopted: number;
    q4_partial: number;
    q4_unknown: number;
    total_determinations: number;
    linked_determinations: number;
    cir_determinations: number;
    compliant: number;
    conditional: number;
    objectionable: number;
    unknown_status: number;
  }]>`SELECT
    (SELECT COUNT(*)::int FROM "Heliport") as total_heliports,
    (SELECT COUNT(*)::int FROM "HeliportCompliance" WHERE "siteType"='hospital') as hospitals,
    (SELECT ROUND(COUNT(*)::numeric * 100 / NULLIF((SELECT COUNT(*) FROM "Heliport"), 0))::int FROM "HeliportCompliance" WHERE "siteType"='hospital') as hospital_pct,
    (SELECT COUNT(*)::int FROM "HeliportCompliance" WHERE "q2AirspaceDetermination"='on_file') as q2_on_file,
    (SELECT COUNT(*)::int FROM "HeliportCompliance" WHERE "q2AirspaceDetermination"='unknown') as q2_unknown,
    (SELECT ROUND(COUNT(*)::numeric * 100 / NULLIF((SELECT COUNT(*) FROM "Heliport"), 0))::int FROM "HeliportCompliance" WHERE "q2AirspaceDetermination"='unknown') as q2_pct_unknown,
    (SELECT COUNT(*)::int FROM "HeliportCompliance" WHERE "q4Nfpa418"='adopted') as q4_adopted,
    (SELECT COUNT(*)::int FROM "HeliportCompliance" WHERE "q4Nfpa418"='partial') as q4_partial,
    (SELECT COUNT(*)::int FROM "HeliportCompliance" WHERE "q4Nfpa418"='unknown') as q4_unknown,
    (SELECT COUNT(*)::int FROM "OeaaaDetermination") as total_determinations,
    (SELECT COUNT(*)::int FROM "OeaaaDetermination" WHERE "linkedHeliportId" IS NOT NULL) as linked_determinations,
    (SELECT COUNT(*)::int FROM "OeaaaDetermination" WHERE "statusCode"='CIR') as cir_determinations,
    (SELECT COUNT(*)::int FROM "HeliportCompliance" WHERE "complianceStatus"='compliant') as compliant,
    (SELECT COUNT(*)::int FROM "HeliportCompliance" WHERE "complianceStatus"='conditional') as conditional,
    (SELECT COUNT(*)::int FROM "HeliportCompliance" WHERE "complianceStatus"='objectionable') as objectionable,
    (SELECT COUNT(*)::int FROM "HeliportCompliance" WHERE "complianceStatus"='unknown') as unknown_status`;
  return totals;
}

// ── Styles ─────────────────────────────────────────────────

const accent = "#991b1b";

const S = {
  page: { background: "#fff", color: "#111", fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", fontSize: 13, lineHeight: 1.65, minHeight: "100vh" } as React.CSSProperties,
  main: { maxWidth: 760, margin: "0 auto", padding: "32px 44px 60px" } as React.CSSProperties,
  header: { display: "flex", justifyContent: "space-between", borderBottom: "1px solid #ddd", paddingBottom: 8, marginBottom: 0, fontSize: 10, color: "#999" } as React.CSSProperties,
  sectionTag: { fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: accent, marginBottom: 8, marginTop: 48 } as React.CSSProperties,
  h1: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700, color: "#111", margin: "0 0 4px", lineHeight: 1.15, letterSpacing: "-0.02em" } as React.CSSProperties,
  h2: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: "#111", margin: "0 0 12px", borderBottom: `2px solid ${accent}`, paddingBottom: 8 } as React.CSSProperties,
  h3: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700, color: "#111", margin: "24px 0 8px" } as React.CSSProperties,
  p: { margin: "0 0 14px", color: "#333" } as React.CSSProperties,
  quote: { borderLeft: `3px solid ${accent}`, padding: "12px 20px", margin: "20px 0", background: "#fef2f2", fontStyle: "italic", color: "#333", fontSize: 13 } as React.CSSProperties,
  quoteSrc: { fontSize: 10, color: "#999", fontStyle: "italic", marginTop: 6 } as React.CSSProperties,
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 12, marginBottom: 20 } as React.CSSProperties,
  th: { background: accent, color: "#fff", padding: "8px 12px", textAlign: "left" as const, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em" } as React.CSSProperties,
  td: { padding: "8px 12px", borderBottom: "1px solid #eee", verticalAlign: "top" as const } as React.CSSProperties,
  footnote: { fontSize: 10, color: "#999", lineHeight: 1.6, marginTop: 8, fontStyle: "italic" } as React.CSSProperties,
  footer: { fontSize: 10, color: "#999", textAlign: "center" as const, borderTop: "1px solid #ddd", paddingTop: 16, marginTop: 40 } as React.CSSProperties,
  pageFooter: { fontSize: 9, color: "#bbb", borderTop: "1px solid #eee", marginTop: 40, paddingTop: 8, display: "flex", justifyContent: "space-between" } as React.CSSProperties,
  confidential: { position: "absolute" as const, top: 12, right: 24, background: accent, color: "#fff", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", padding: "6px 16px" } as React.CSSProperties,
};

// ── Page ───────────────────────────────────────────────────

export default async function LitigationRiskAssessment() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getStats();
  const today = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div style={S.page}>
      <style>{`
        @media print { .no-print { display: none !important; } @page { margin: 0.6in 0.7in; size: letter; } }
      `}</style>

      {/* Screen nav */}
      <div className="no-print" style={{ padding: "12px 24px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", maxWidth: 760, margin: "0 auto" }}>
        <span style={{ color: "#999", fontSize: 12 }}>Admin &rarr; Reports &rarr; Litigation Risk Assessment</span>
        <PrintButton />
      </div>

      <main style={S.main}>

        {/* ═══════ COVER PAGE ═══════ */}
        <div style={{ position: "relative" }}>
          <div style={S.header}>
            <span><strong>AIRINDEX</strong> &nbsp; MARKET READINESS INTELLIGENCE FOR ADVANCED AIR MOBILITY</span>
            <span style={{ background: accent, color: "#fff", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", padding: "2px 12px" }}>CONFIDENTIAL &mdash; DISCOVERY DELIVERABLE</span>
          </div>
        </div>

        <div style={{ padding: "80px 0 60px" }}>
          <h1 style={{ ...S.h1, fontSize: 36 }}>Heliport Liability<br />Risk Assessment</h1>
          <p style={{ fontSize: 15, color: "#666", margin: "12px 0 40px", lineHeight: 1.5 }}>
            Quantifying Standard-of-Care Exposure Across the U.S. Heliport Network
          </p>
          <div style={{ borderTop: `3px solid ${accent}`, width: 200, marginBottom: 40 }} />
          <div style={{ fontSize: 11, color: "#999" }}>
            <div style={{ marginBottom: 4 }}><strong style={{ color: "#666" }}>PREPARED FOR</strong></div>
            <div style={{ color: "#333", marginBottom: 16 }}>Aviation Insurance Underwriting Teams</div>
            <div style={{ marginBottom: 4 }}><strong style={{ color: "#666" }}>DELIVERABLE TYPE</strong></div>
            <div style={{ color: "#333", marginBottom: 16 }}>Discovery Briefing &nbsp;&#9632;&nbsp; Methodology Walkthrough</div>
            <div style={{ marginBottom: 4 }}><strong style={{ color: "#666" }}>DATE</strong></div>
            <div style={{ color: "#333" }}>{today}</div>
          </div>
        </div>

        {/* ═══════ SECTION 1: EXECUTIVE SUMMARY ═══════ */}
        <div style={S.sectionTag}>SECTION 1</div>
        <h2 style={S.h2}>Executive Summary</h2>

        <p style={S.p}>
          Aviation insurance carriers writing heliport-related liability are exposed to a quantified, federally-documented
          standard-of-care argument that is currently invisible in standard underwriting workflows. This assessment outlines
          the legal mechanism by which non-mandatory FAA Advisory Circulars become enforceable standards in civil litigation,
          presents the national exposure data, and identifies six recurring liability patterns substantiated by public NTSB,
          OSHA, and FAA records.
        </p>

        <h3 style={S.h3}>Three findings define the exposure</h3>

        <p style={S.p}>
          <strong>One.</strong> The FAA&rsquo;s own determination database documents 3,868 heliports operating under
          &ldquo;conditional&rdquo; airspace status with no federal mechanism to verify whether the conditions have been met,
          plus 42 heliports formally classified as objectionable due to operational safety concerns. Of those,
          1,841 conditional and 31 objectionable sites are medical-use facilities &mdash; the highest-concentration
          risk category in the national heliport population.
        </p>
        <p style={S.p}>
          <strong>Two.</strong> Approximately {t.q2_pct_unknown}% of the {t.total_heliports.toLocaleString()} FAA-registered
          heliports in the United States have no airspace determination on file. For carriers writing portfolios that touch
          heliport operators, owners, designers, or hospital facility owners, this represents a federal verification gap on
          the overwhelming majority of insured sites.
        </p>
        <p style={S.p}>
          <strong>Three.</strong> The legal mechanism converting these federal records into civil liability is well-established.
          FAA Advisory Circular 150/5390-2D explicitly states it is &ldquo;not mandatory and is not legally binding in its own
          right,&rdquo; yet it is routinely adopted as the standard of care in civil aviation litigation. State and local
          jurisdictions further convert the AC into enforceable code through the International Building Code, International
          Fire Code, and NFPA 418 &mdash; each of which incorporates AC 150/5390-2D by reference.
        </p>
        <p style={S.p}>
          The bottom line: a quantified exposure profile exists in federal data that no underwriting carrier currently has
          visibility into. AirIndex provides the first productized cross-reference of this data into per-site compliance
          scores, deliverable as portfolio screening, underwriting intelligence reports, and direct API access.
        </p>

        {/* ═══════ SECTION 2: THE LEGAL MECHANISM ═══════ */}
        <div style={S.sectionTag}>SECTION 2</div>
        <h2 style={S.h2}>The Legal Mechanism</h2>

        <h3 style={S.h3}>How a non-mandatory Advisory Circular becomes the standard of care</h3>
        <p style={S.p}>
          The chain begins with 14 CFR Part 135.229, which prohibits any Part 135 certificate holder from using an airport
          unless it is &ldquo;adequate&rdquo; for the proposed operation, considering size, surface, obstructions, and lighting.
          14 CFR Part 157.2 defines &ldquo;airport&rdquo; to include heliports, helistops, and vertiports. The Federal Aviation
          Administration does not, however, define the term &ldquo;adequate.&rdquo; This omission is the entire foundation of
          the liability framework.
        </p>
        <p style={S.p}>
          In civil litigation arising from heliport-related incidents, plaintiffs routinely fill the definitional gap by
          referencing FAA Advisory Circular 150/5390-2D (Heliport Design) as the operative standard of care. Deviation from
          the dimensional, performance, and safety criteria specified in the Advisory Circular is then introduced as evidence
          of negligence. This pattern is consistent across published case law and is widely understood within the aviation
          defense bar.
        </p>

        <div style={S.quote}>
          &ldquo;The FAA does not directly define the term Adequate. In civil lawsuits, plaintiffs frequently use FAA
          Advisory Circulars as the standard of care. Deviation from recognized industry standards may constitute negligence.&rdquo;
          <div style={S.quoteSrc}>&mdash; Industry analysis presented at Verticon 2026</div>
        </div>

        <h3 style={S.h3}>The non-mandatory disclaimer does not provide protection</h3>
        <p style={S.p}>
          AC 150/5390-2D, Section 1, Applicability, explicitly states: &ldquo;This AC does not constitute a regulation, is not
          mandatory and is not legally binding in its own right. This AC will not be relied upon as a separate basis by the FAA
          for affirmative enforcement action or other administrative penalty.&rdquo; This language protects the FAA from being
          required to enforce the AC as a regulation. It does not protect operators, owners, designers, or facility owners from
          civil tort claims that incorporate the AC as the prevailing standard of care.
        </p>

        <h3 style={S.h3}>State and local adoption converts the AC into enforceable code</h3>
        <p style={S.p}>
          The civil-litigation argument is reinforced by a regulatory adoption chain that operates independently of the FAA. The
          International Fire Code requires that helistops and heliports on buildings be constructed in accordance with the
          International Building Code. The International Building Code requires that rooftop heliports and helistops comply with
          NFPA 418. NFPA 418 in turn requires that the design of the heliport, including all aeronautical components, &ldquo;shall
          be in accordance with FAA AC 150/5390-2D, Heliport Design Advisory Circular, or equivalent criteria.&rdquo; The chain
          converts a non-mandatory federal recommendation into enforceable building and fire code in every jurisdiction that adopts
          these reference standards.
        </p>

        <h3 style={S.h3}>&ldquo;Certified heliport&rdquo; is a regulatory myth</h3>
        <p style={S.p}>
          14 CFR Part 139 (Certification of Airports) explicitly excludes heliports from its scope. There is no FAA certification
          regime for heliports comparable to the Part 139 certification applied to commercial service airports. Operators, owners,
          and risk managers who believe their facility is &ldquo;FAA-certified&rdquo; are operating under a misapprehension that
          has direct implications for both compliance posture and litigation defense. The absence of certification is not a safety
          harbor; it is the absence of a regulatory floor.
        </p>

        {/* ═══════ SECTION 3: QUANTIFIED EXPOSURE ═══════ */}
        <div style={S.sectionTag}>SECTION 3</div>
        <h2 style={S.h2}>Quantified Exposure</h2>

        <h3 style={S.h3}>National heliport population</h3>
        <p style={S.p}>
          The FAA National Airspace System Resource (NASR) database identifies {t.total_heliports.toLocaleString()} active
          registered heliports in the United States. Of these, {t.hospitals.toLocaleString()} ({t.hospital_pct}%) are hospital
          or medical-use facilities. This concentration is significant because hospital heliports represent both the
          highest-volume operational segment and the highest-stakes liability category, given the population served, the urgency
          of operations, and the building-integrated infrastructure.
        </p>

        <h3 style={S.h3}>Airspace determination breakdown</h3>
        <p style={S.p}>
          FAA airspace determination records (Obstruction Evaluation / Airport Airspace Analysis, OE/AAA) document the federal
          review status of heliports that have been formally evaluated. The breakdown of determinations across the heliport
          population is as follows:
        </p>

        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>DETERMINATION</th>
              <th style={{ ...S.th, textAlign: "right" }}>ALL HELIPORTS</th>
              <th style={{ ...S.th, textAlign: "right" }}>MEDICAL-USE</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: "No Objection", all: "1,941", med: "822" },
              { label: "Conditional", all: "3,868", med: "1,841" },
              { label: "Objectionable", all: "42", med: "31" },
              { label: "Not Analyzed", all: "150", med: "34" },
              { label: "Unknown / Blank", all: "109", med: "20" },
            ].map((row) => (
              <tr key={row.label}>
                <td style={{ ...S.td, fontWeight: 600 }}>{row.label}</td>
                <td style={{ ...S.td, textAlign: "right", fontFamily: "'Space Mono', monospace" }}>{row.all}</td>
                <td style={{ ...S.td, textAlign: "right", fontFamily: "'Space Mono', monospace" }}>{row.med}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={S.footnote}>
          Source: FAA OE/AAA airspace determination records. Note: AirIndex is independently re-verifying these counts pending
          full restoration of OE/AAA endpoint access. Numbers will be updated and republished as direct AirIndex-verified data
          when reconciliation completes.
        </p>

        <h3 style={S.h3}>The conditional category is the buried risk</h3>
        <p style={S.p}>
          The 3,868 conditional determinations are the most consequential finding. Under 14 CFR &sect; 157.7, a conditional
          determination identifies objectionable aspects of a project and specifies the conditions that must be met and sustained
          to preclude an objectionable determination. However, no current federal mechanism exists to verify whether those
          conditions are actually met or maintained over time, particularly for private-use facilities. A heliport that received
          a conditional determination years or decades ago may or may not still be operating in compliance with the conditions
          that were imposed at the time. From an underwriting perspective, the entire conditional population represents
          documented federal concern with unverified resolution status.
        </p>

        <h3 style={S.h3}>The unverified majority</h3>
        <p style={S.p}>
          The arithmetic is unforgiving. The FAA OE/AAA determination records cover approximately {t.q2_on_file} unique heliport
          facilities at the time of this assessment. Against the registered population of {t.total_heliports.toLocaleString()} heliports,
          this means roughly {t.q2_pct_unknown}% of FAA-registered sites have no airspace determination on file at all. They have
          not been formally evaluated; their compliance status with respect to surrounding airspace, obstructions, and approach
          paths is undocumented at the federal level. Carriers writing liability policies on the operators, owners, designers, or
          facility owners of these sites are exposed to a standard-of-care argument supported by no verifying federal record
          either way.
        </p>

        {/* ═══════ SECTION 4: SIX LIABILITY PATTERNS ═══════ */}
        <div style={S.sectionTag}>SECTION 4</div>
        <h2 style={S.h2}>Six Liability Patterns</h2>

        <p style={S.p}>
          The following six patterns are the recurring failure modes documented across publicly available NTSB, OSHA, FAA, and
          litigation records. Each represents a distinct standard-of-care argument that has been or could be deployed in civil
          tort claims against the defendants identified in Section 5.
        </p>

        {[
          {
            title: "Pattern 1 \u2014 Dimensional Mismatch (Size)",
            body: "AC 150/5390-2D specifies minimum Touchdown and Liftoff Area (TLOF), Final Approach and Takeoff Area (FATO), and Safety Area dimensions based on the design helicopter. A facility built to accommodate a smaller aircraft and subsequently used by a larger aircraft is operating outside its design envelope. Anchor case: a Grand Rapids, Michigan rooftop heliport incident in 2008 in which the original facility, built for BO-105 helicopters, was destroyed in an accident involving operations the heliport was not dimensionally configured to support. The litigation pattern targets the facility owner and designer for a known dimensional gap.",
          },
          {
            title: "Pattern 2 \u2014 Inadequate Clearance (Airspace and Approach)",
            body: "AC 150/5390-2D specifies 8:1 approach and departure surfaces extending from the FATO, free of obstructions. A heliport surrounded by buildings, structures, or trees that penetrate the 8:1 surface is operating in a constrained environment that compounds the risk of any deviation from the published approach path. Anchor case: NTSB Accident MIA02FA161 \u2014 Miami, Florida, August 31, 2002, in which a Sikorsky S-76 LifeFlight helicopter departing a hospital heliport experienced a hard landing after the rotor encountered building obstructions. The S-76's 44-foot rotor diameter operated in a corridor with approximately 7 feet of clearance per side, with witness testimony suggesting closer to 6 feet. The litigation pattern targets the operator, the facility owner, and the heliport designer for a documented clearance failure visible in FAA Heliport Dimensions Tool analysis.",
          },
          {
            title: "Pattern 3 \u2014 Surface Deterioration (Documented Hazard)",
            body: "AC 150/5390-2D requires a roughened broomed pavement finish to provide skid resistance for helicopters and non-slippery footing for ground personnel. Surface deterioration \u2014 peeling paint, potholes, loss of skid resistance \u2014 creates a documented hazard. The defining liability question in such cases is well-established in litigation discovery: What did you know and when did you know it? Internal communications, maintenance logs, and inspection records that document the hazard before an incident occurred convert ordinary negligence into a foreseeable-risk argument. The litigation pattern targets the heliport owner and operator for failure to remediate a known and documented deficiency.",
          },
          {
            title: "Pattern 4 \u2014 HVAC Fume Infiltration",
            body: "Rooftop heliports adjacent to building HVAC intakes can introduce helicopter exhaust fumes into the ventilation system, creating both an immediate operational hazard and a long-tail occupational health exposure. Anchor case: Los Angeles County-USC Medical Center, 2009. The $1.02 billion facility shut down its rooftop helicopter pad after months of exhaust fumes leaking into the new hospital's ventilation system. The Los Angeles Times reported the closure on February 7, 2009, following inquiries about chronic ventilation problems. State health inspectors fined the hospital for violating workplace rules; that fine was reported on April 7, 2009. Workers complained of inhaling exhaust odors whenever a helicopter landed. The litigation pattern in such cases targets the facility owner, the heliport designer, and the building engineer of record for a foreseeable design failure with multi-year occupational health exposure.",
          },
          {
            title: "Pattern 5 \u2014 Downwash and Outwash Injury",
            body: "Helicopter downwash and outwash extend significant distances from the rotor, often beyond the perimeter that operators and event organizers anticipate. A landing zone that appears safely isolated from spectators or property may still subject distant areas to rotor wash sufficient to cause injury or property damage. Geometric analysis of representative incidents shows that a Black Hawk-class helicopter operating at a 50-foot hover can produce downwash effects extending more than 200 feet from the landing zone. The litigation pattern targets the operator, the pilot, and any event organizer or property owner who authorized the landing without adequate spectator separation.",
          },
          {
            title: "Pattern 6 \u2014 Temporary Site Non-Compliance",
            body: "Many states require licensing or registration for temporary heliports, even for one-time event landings. New Jersey, for example, requires an Application for Temporary Aeronautical Facility License (Form DA-5) addressing prior facility use, public safeguarding provisions, and night operation lighting. Florida requires an Airport Site Approval Order and license under section 330.30 of the Florida Statutes; aircraft activity prior to licensing may be cause for denial and enforcement action under sections 330.33 and 330.325. The litigation pattern targets the operator and the property owner for unlicensed operations in jurisdictions with active state aeronautics enforcement.",
          },
        ].map((pattern) => (
          <div key={pattern.title}>
            <h3 style={S.h3}>{pattern.title}</h3>
            <p style={S.p}>{pattern.body}</p>
          </div>
        ))}

        {/* ═══════ SECTION 5: DEFENDANT EXPOSURE MAP ═══════ */}
        <div style={S.sectionTag}>SECTION 5</div>
        <h2 style={S.h2}>Defendant Exposure Map</h2>

        <p style={S.p}>
          When an Advisory Circular standard-of-care argument is deployed in civil litigation arising from a heliport incident,
          the named defendants typically include all parties with operational, ownership, design, or oversight responsibility for
          the facility and the operation. The following defendant categories are recurring across the case law:
        </p>

        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>DEFENDANT</th>
              <th style={S.th}>TYPICAL EXPOSURE BASIS</th>
            </tr>
          </thead>
          <tbody>
            {[
              { who: "Helicopter Operator (Part 135 Certificate Holder)", basis: 'Use of an "inadequate" airport under \u00a7 135.229; pilot training and procedural compliance.' },
              { who: "Heliport Owner", basis: "Failure to maintain compliance with adopted state and local code; documented hazard exposure." },
              { who: "Heliport Operator", basis: "Operational control failures; failure to remediate known deficiencies." },
              { who: "Heliport Designer / Engineer of Record", basis: "Deviation from AC 150/5390-2D dimensional, surface, or approach criteria at design time." },
              { who: "Hospital or Facility Owner", basis: "Building-integrated heliport responsibility; HVAC and structural design exposure." },
              { who: "Helicopter Pilot in Command", basis: "Part 91.3 and 91.13 responsibility for safe operation; deviation from published approach." },
              { who: "Aircraft Manufacturer", basis: "Limited exposure in cases where aircraft performance characteristics are at issue." },
            ].map((row) => (
              <tr key={row.who}>
                <td style={{ ...S.td, fontWeight: 600, width: "35%" }}>{row.who}</td>
                <td style={S.td}>{row.basis}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p style={S.p}>
          The underwriting implication is direct. Carriers writing aviation liability policies typically have exposure across
          multiple defendant categories within a single book of business. A standard aviation portfolio may insure the operator
          on one policy, the heliport owner on another, the designer on a professional liability policy, and the hospital facility
          on a separate institutional policy. A single incident at a single site can trigger claims against four or more insured
          parties. Pre-incident screening of the underlying heliport population &mdash; for compliance status, airspace
          determination, and dimensional viability &mdash; allows carriers to identify concentration risk that is not visible
          in claims-based analysis.
        </p>

        {/* ═══════ SECTION 6: WHAT AIRINDEX PROVIDES ═══════ */}
        <div style={S.sectionTag}>SECTION 6</div>
        <h2 style={S.h2}>What AirIndex Provides</h2>

        <p style={S.p}>
          AirIndex is the first productized cross-reference of the data sources required to evaluate heliport compliance and
          litigation exposure at portfolio scale. Our database integrates FAA National Airspace System Resource (NASR) registration
          records, FAA OE/AAA airspace determinations, NFPA 418 jurisdiction adoption status, dimensional viability for current
          and next-generation aircraft including eVTOL configurations, and state and local zoning and licensing data. Each
          registered heliport receives a per-site compliance score based on a transparent, published methodology.
        </p>

        <h3 style={S.h3}>Three deliverable formats</h3>

        <p style={S.p}>
          <strong>Portfolio Screening.</strong> Carriers provide a list of insured operators, owners, or facility addresses;
          AirIndex returns per-site compliance scores, airspace determination status, documented exposure flags, and a ranked
          list of high-risk concentration sites within the book. Engagement is structured as a one-time delivery or recurring
          quarterly refresh. Output is a structured data file plus an executive summary. Typical engagement length is two to
          four weeks.
        </p>
        <p style={S.p}>
          <strong>Underwriting Intelligence Reports.</strong> Per-site or per-region briefings that consolidate compliance status,
          regulatory posture, recent litigation precedent, and any documented incidents into a single underwriting reference
          document. Used for new business intake, renewal review, or specific account underwriting. Delivered as branded PDF
          reports with supporting data appendix.
        </p>
        <p style={S.p}>
          <strong>API Access.</strong> Direct database integration for carriers operating automated risk pricing or quote-bind
          workflows. Endpoints return compliance score, determination history, and exposure flags by heliport identifier or
          geographic coordinate. Suitable for integration with existing underwriting systems or actuarial models.
        </p>

        <h3 style={S.h3}>Methodology transparency</h3>
        <p style={S.p}>
          AirIndex publishes its scoring methodology, source data inventory, and calculation logic at airindex.io/methodology.
          We do not operate as a black-box scoring service. Underwriting and actuarial teams have full visibility into how scores
          are constructed, which data sources drive each component, and how the methodology handles edge cases. Methodology
          transparency is a deliberate design choice that we consider non-negotiable for institutional buyers.
        </p>

        <h3 style={S.h3}>Engagement next steps</h3>
        <p style={S.p}>
          The natural next step from this assessment is a methodology walkthrough &mdash; a 30 to 45 minute discussion in which
          AirIndex walks through the data sources, scoring logic, and a sample portfolio screening output against an anonymized
          book of business. The walkthrough is offered without cost or obligation, and is intended to give your underwriting team
          enough information to evaluate whether AirIndex data warrants further integration into your workflow.
        </p>

        {/* ═══════ SECTION 7: ABOUT ═══════ */}
        <div style={S.sectionTag}>SECTION 7</div>
        <h2 style={S.h2}>About AirIndex</h2>

        <p style={S.p}>
          AirIndex is the market readiness intelligence platform for Advanced Air Mobility, operated by Vertical Data Group, LLC,
          a South Carolina limited liability company. AirIndex scores U.S. metropolitan areas and individual heliport and vertiport
          sites on operational readiness, regulatory posture, infrastructure compliance, and litigation exposure using a
          proprietary, fully-published scoring methodology.
        </p>
        <p style={S.p}>
          Vertical Data Group is registered with the U.S. System for Award Management (SAM.gov), Unique Entity Identifier
          RB63W8RYCHY3, CAGE Code 1AUW7, and is approved for federal contracting and financial assistance awards. The company
          maintains active membership in the Vertical Flight Society and is engaged with federal agencies including the
          Department of Transportation, the Federal Aviation Administration, and the Air Force Research Laboratory through the
          AFWERX program.
        </p>

        <h3 style={S.h3}>Distribution</h3>
        <p style={S.p}>
          This document is a confidential discovery deliverable prepared for the named recipient organization. It is intended
          for internal distribution within your underwriting and risk management teams. Please do not redistribute beyond your
          organization without permission. AirIndex is happy to provide additional copies, customized analyses, or
          recipient-specific briefings upon request.
        </p>

        <h3 style={S.h3}>Contact</h3>
        <p style={S.p}>
          Alan Holmes<br />
          Founder &amp; CEO, Vertical Data Group<br />
          alan@airindex.io &nbsp;&#9632;&nbsp; (202) 949-2709<br />
          airindex.io &nbsp;&#9632;&nbsp; verticaldatagroup.com
        </p>

        <h3 style={S.h3}>Sources and citations</h3>
        <p style={{ ...S.footnote, fontSize: 10, lineHeight: 1.7 }}>
          All data and case study references in this assessment are drawn from public sources. Federal regulatory citations are
          taken directly from the Code of Federal Regulations. Airspace determination data is sourced from the FAA Obstruction
          Evaluation / Airport Airspace Analysis (OE/AAA) database and the FAA National Airspace System Resource (NASR) database.
          NTSB accident references cite published NTSB accident numbers. News references cite the Los Angeles Times (February 7,
          2009 and April 7, 2009). Industry analysis references draw from materials presented at Verticon 2026. Advisory Circular
          and NFPA standard references cite published current versions of AC 150/5390-2D and NFPA 418. Full source documentation
          is available on request.
        </p>

        {/* Footer */}
        <div style={S.footer}>
          <p style={{ margin: "0 0 4px" }}>Vertical Data Group, LLC &middot; alan@airindex.io &middot; airindex.io</p>
          <p style={{ margin: 0, fontSize: 9, color: "#bbb" }}>
            This document is a confidential discovery deliverable prepared for the named recipient organization.
            Please do not distribute beyond your underwriting team without permission.
          </p>
        </div>
      </main>
    </div>
  );
}
