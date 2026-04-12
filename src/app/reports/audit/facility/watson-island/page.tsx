import type { Metadata } from "next";
import Link from "next/link";
import PrintButton from "../../../gap/[cityId]/PrintButton";

export const metadata: Metadata = {
  title: "Facility Audit: Watson Island Heliport — AirIndex",
  description:
    "Five-question compliance audit of Watson Island Heliport (Miami). A pre-development AAM facility invisible to the FAA NASR 5010 registry.",
  robots: "noindex, nofollow",
};

/**
 * Watson Island Heliport — Facility-Level Audit Case Study
 *
 * This is the flagship example of the audit tool applied to a single
 * facility. Watson Island is the most strategically important AAM
 * infrastructure site in Miami, but it fails Q1 and Q2 because it
 * has no FAA registration — it's under development and invisible to
 * the standard data pipeline.
 *
 * This page is a static case study, not database-driven, because the
 * facility doesn't exist in NASR 5010.
 */

const FACILITY = {
  name: "Watson Island Heliport",
  developer: "Linden Airport Services Corp. d/b/a Watson Island Heliport Corporation",
  partner: "Skyports Infrastructure (MOU signed January 2026)",
  address: "980 MacArthur Causeway, Miami, FL 33132",
  coordinates: { lat: 25.7783, lng: -80.1702 },
  parcelSize: "55,807 sq ft",
  siteType: "Ground-level, city-owned land (Watson Island)",
  adjacent: "Adjacent to Miami Seaplane Base (FAA ID: X44)",
  lease: "30-year lease between Miami Sports & Exhibition Authority and Linden Airport Services (approved June 2016)",
  rezoning: "Rezoned from 'Public Parks and Recreation' to 'Major Institutional, Public Facilities, Transportation and Utilities' (2016)",
  status: "Final local occupancy permits in process (as of January 2026)",
  faaRegistration: "None — facility does not have an FAA Location Identifier or NASR 5010 record",
};

interface AuditQuestion {
  id: string;
  label: string;
  status: "pass" | "fail" | "unknown" | "not_applicable";
  statusLabel: string;
  finding: string;
  implication: string;
  source: string;
}

const AUDIT: AuditQuestion[] = [
  {
    id: "q1",
    label: "Q1: FAA Registration",
    status: "fail",
    statusLabel: "FAIL — NOT REGISTERED",
    finding:
      "Watson Island Heliport does not appear in the FAA NASR 5010 database. No FAA Location Identifier (LID) has been assigned. The facility is under development with occupancy permits still in process.",
    implication:
      "Without FAA registration, the facility is invisible to standard compliance screening. Insurance carriers relying on NASR data would not know this facility exists. Any operations from this site prior to FAA registration operate outside the standard regulatory envelope.",
    source: "FAA NASR 28-Day Subscription (April 2026 cycle) — facility absent from APT_BASE dataset",
  },
  {
    id: "q2",
    label: "Q2: Airspace Determination",
    status: "fail",
    statusLabel: "FAIL — NO DETERMINATION ON FILE",
    finding:
      "No FAA OE/AAA airspace determination was found for this facility. The adjacent Miami Seaplane Base (X44) has its own airspace allocation, but Watson Island Heliport would require an independent aeronautical study. The site sits under the Miami International Airport (MIA) Class B airspace shelf.",
    implication:
      "Operating without an airspace determination in Class B airspace creates unquantified liability. The proximity to MIA approach and departure corridors makes this a high-scrutiny airspace environment. An FAA Form 7460-1 (Notice of Proposed Construction or Alteration) would be required before construction of any structure or commencement of helicopter/eVTOL operations.",
    source: "FAA OE/AAA Determined Cases Database — no matching Aeronautical Study Number found for Watson Island coordinates",
  },
  {
    id: "q3",
    label: "Q3: State Enforcement Posture",
    status: "pass",
    statusLabel: "PASS — STRONG ENFORCEMENT",
    finding:
      "Florida has an active state enforcement posture for heliport/vertiport standards. FDOT maintains an AAM Business Plan (November 2025) that analyzed 239,000 parcels for vertiport suitability and published a Land Use Compatibility and Site Approval Guidebook for local governments. The Florida Advanced Air Mobility Act provides a state-level legal framework.",
    implication:
      "Strong state enforcement is favorable for the facility. Florida's regulatory infrastructure means Watson Island will face clear (if demanding) compliance requirements rather than a regulatory vacuum. FDOT engagement also means potential state funding and technical assistance pathways.",
    source: "AirIndex Market Context Store — Florida state profile; FDOT AAM Business Plan (Nov 2025)",
  },
  {
    id: "q4",
    label: "Q4: NFPA 418 Adoption",
    status: "unknown",
    statusLabel: "UNKNOWN — AUDIT PENDING",
    finding:
      "Miami-Dade County fire code adoption of NFPA 418 (Standard for Heliports) has not been audited. The facility's 2016 rezoning from parks to transportation/utilities suggests the permitting pathway exists, but whether local fire code explicitly references NFPA 418 for the Watson Island parcel has not been verified.",
    implication:
      "If NFPA 418 is not referenced in the local fire code, the facility would lack a fire safety standard of care — creating liability exposure in the event of an incident. This is a common gap: many jurisdictions permit heliport construction without explicitly adopting the applicable NFPA standard.",
    source: "AirIndex Municipality Ordinance Audit — Miami-Dade County (audit not yet completed)",
  },
  {
    id: "q5",
    label: "Q5: eVTOL Dimensional Viability",
    status: "pass",
    statusLabel: "PASS — VIABLE",
    finding:
      "At 55,807 sq ft, the Watson Island parcel can easily accommodate eVTOL minimum TLOF/FATO dimensions (50\u00d750 ft). The Skyports Infrastructure MOU (January 2026) explicitly positions this as a \"next-generation AAM hub\" designed for both helicopter and eVTOL operations. The ground-level site type avoids the structural load constraints that limit rooftop conversions.",
    implication:
      "Dimensional viability is not a concern. The parcel size allows for multiple simultaneous TLOF/FATO pads, charging infrastructure, and passenger facilities. This is a greenfield AAM build, not a retrofit — the design can be purpose-built to current and anticipated standards.",
    source: "Miami Commission records (lease area: 55,807 sq ft); Skyports Infrastructure press release (Jan 2026)",
  },
];

function statusColor(status: string): string {
  switch (status) {
    case "pass": return "#00ff88";
    case "fail": return "#ff4444";
    default: return "#f59e0b";
  }
}

export default function WatsonIslandAuditPage() {
  const passCount = AUDIT.filter(q => q.status === "pass").length;
  const failCount = AUDIT.filter(q => q.status === "fail").length;
  const unknownCount = AUDIT.filter(q => q.status === "unknown").length;

  // Compliance tier
  let complianceStatus: string;
  let complianceColor: string;
  let complianceImplication: string;
  if (failCount >= 2) {
    complianceStatus = "OBJECTIONABLE";
    complianceColor = "#ff4444";
    complianceImplication =
      "Fails multiple compliance questions including critical FAA registration and airspace determination. Coverage not recommended without remediation plan addressing both federal registration requirements.";
  } else if (failCount >= 1 || unknownCount >= 2) {
    complianceStatus = "CONDITIONAL";
    complianceColor = "#f59e0b";
    complianceImplication = "Coverage conditional on remediation of identified gaps.";
  } else {
    complianceStatus = "COMPLIANT";
    complianceColor = "#00ff88";
    complianceImplication = "Standard renewal recommended.";
  }

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

      {/* Header */}
      <div className="no-print" style={{ padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/heliport-audit" style={{ color: "#555", fontSize: 12, textDecoration: "none" }}>
            &larr; Heliport Audit
          </Link>
          <PrintButton />
        </div>
      </div>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* Title */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 9, letterSpacing: 3, color: "#5B8DB8", fontFamily: "'Space Mono', monospace" }}>
              FACILITY-LEVEL AUDIT
            </span>
            <span style={{
              fontSize: 9,
              fontWeight: 700,
              fontFamily: "'Space Mono', monospace",
              color: "#ff6b35",
              background: "rgba(255,107,53,0.1)",
              border: "1px solid rgba(255,107,53,0.25)",
              borderRadius: 3,
              padding: "3px 8px",
              letterSpacing: 1,
            }}>
              CASE STUDY
            </span>
          </div>
          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 32,
            fontWeight: 700,
            color: "#fff",
            margin: "0 0 8px",
          }}>
            Watson Island Heliport
          </h1>
          <div style={{ color: "#666", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>
            Miami, FL &middot; Generated {today} &middot; AirIndex Heliport Compliance Audit v1.0
          </div>
        </div>

        {/* Compliance Verdict */}
        <div style={{
          ...cardStyle,
          borderLeft: `4px solid ${complianceColor}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#666", fontFamily: "'Space Mono', monospace", marginBottom: 8 }}>
                COMPLIANCE DETERMINATION
              </div>
              <div style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 28,
                fontWeight: 700,
                color: complianceColor,
                letterSpacing: 2,
              }}>
                {complianceStatus}
              </div>
              <p style={{ fontSize: 13, color: "#999", lineHeight: 1.7, marginTop: 12, maxWidth: 500 }}>
                {complianceImplication}
              </p>
            </div>
            <div style={{ display: "flex", gap: 20, paddingTop: 8 }}>
              {[
                { label: "PASS", count: passCount, color: "#00ff88" },
                { label: "FAIL", count: failCount, color: "#ff4444" },
                { label: "UNKNOWN", count: unknownCount, color: "#f59e0b" },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 28, fontWeight: 700, color: s.color }}>
                    {s.count}
                  </div>
                  <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#555", marginTop: 2 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Facility Profile */}
        <div style={cardStyle}>
          <h2 style={sectionHeadStyle}>Facility Profile</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "Developer", value: FACILITY.developer },
              { label: "Infrastructure Partner", value: FACILITY.partner },
              { label: "Address", value: FACILITY.address },
              { label: "Parcel Size", value: FACILITY.parcelSize },
              { label: "Site Type", value: FACILITY.siteType },
              { label: "Adjacent Facility", value: FACILITY.adjacent },
              { label: "FAA Registration", value: FACILITY.faaRegistration },
              { label: "Development Status", value: FACILITY.status },
            ].map(item => (
              <div key={item.label} style={{
                padding: "12px 14px",
                background: "rgba(255,255,255,0.02)",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#555", marginBottom: 4 }}>
                  {item.label.toUpperCase()}
                </div>
                <div style={{ fontSize: 12, color: "#ccc", lineHeight: 1.5 }}>{item.value}</div>
              </div>
            ))}
            <div style={{
              gridColumn: "1 / -1",
              padding: "12px 14px",
              background: "rgba(255,255,255,0.02)",
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#555", marginBottom: 4 }}>LEASE STRUCTURE</div>
              <div style={{ fontSize: 12, color: "#ccc", lineHeight: 1.5 }}>{FACILITY.lease}</div>
            </div>
            <div style={{
              gridColumn: "1 / -1",
              padding: "12px 14px",
              background: "rgba(255,255,255,0.02)",
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#555", marginBottom: 4 }}>ZONING HISTORY</div>
              <div style={{ fontSize: 12, color: "#ccc", lineHeight: 1.5 }}>{FACILITY.rezoning}</div>
            </div>
          </div>
        </div>

        {/* Why This Facility Matters */}
        <div style={{
          padding: "24px",
          background: "rgba(91,141,184,0.04)",
          border: "1px solid rgba(91,141,184,0.12)",
          borderRadius: 10,
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#5B8DB8", fontFamily: "'Space Mono', monospace", marginBottom: 12 }}>
            WHY THIS FACILITY MATTERS
          </div>
          <p style={{ color: "#ccc", fontSize: 13, lineHeight: 1.8, margin: 0 }}>
            Watson Island Heliport is the most strategically important AAM infrastructure site in Miami.
            It has a 30-year city lease, a development partnership with Skyports Infrastructure (a global
            vertiport operator), purpose-built zoning, and a ground-level parcel large enough for multi-pad
            eVTOL operations. But it is completely invisible to standard compliance screening because it
            has no FAA registration. Any insurer, state DOT, or infrastructure investor relying solely on
            FAA NASR data would not know this facility exists &mdash; and would miss the compliance gaps
            that need resolution before it becomes operational.
          </p>
        </div>

        {/* 5-Question Audit */}
        <div style={cardStyle}>
          <h2 style={sectionHeadStyle}>Five-Question Compliance Audit</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {AUDIT.map(q => (
              <div key={q.id} style={{
                padding: "20px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderLeft: `3px solid ${statusColor(q.status)}`,
                borderRadius: 8,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 14, color: "#ccc", fontWeight: 600 }}>{q.label}</span>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    fontFamily: "'Space Mono', monospace",
                    color: statusColor(q.status),
                    letterSpacing: 1,
                    padding: "3px 10px",
                    border: `1px solid ${statusColor(q.status)}33`,
                    borderRadius: 4,
                  }}>
                    {q.statusLabel}
                  </span>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#555", marginBottom: 4 }}>FINDING</div>
                  <p style={{ fontSize: 13, color: "#bbb", lineHeight: 1.7, margin: 0 }}>{q.finding}</p>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#555", marginBottom: 4 }}>IMPLICATION</div>
                  <p style={{ fontSize: 13, color: "#999", lineHeight: 1.7, margin: 0 }}>{q.implication}</p>
                </div>

                <div>
                  <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#555", marginBottom: 4 }}>SOURCE</div>
                  <p style={{ fontSize: 11, color: "#666", lineHeight: 1.5, margin: 0 }}>{q.source}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Remediation Pathway */}
        <div style={cardStyle}>
          <h2 style={sectionHeadStyle}>Remediation Pathway</h2>
          <p style={{ fontSize: 12, color: "#666", lineHeight: 1.6, marginBottom: 20 }}>
            To move from OBJECTIONABLE to COMPLIANT, Watson Island Heliport requires resolution of two
            critical gaps and one data gap. Estimated timeline assumes no regulatory delays.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              {
                priority: "CRITICAL",
                color: "#ff4444",
                action: "File FAA Form 7460-1 (Notice of Proposed Construction)",
                detail: "Required before construction or operations. Initiates the aeronautical study process for airspace determination. Addresses both Q1 (registration pathway) and Q2 (airspace determination). Typical processing time: 45-60 days for standard study, longer if circularized.",
              },
              {
                priority: "CRITICAL",
                color: "#ff4444",
                action: "Complete FAA NASR 5010 registration",
                detail: "Submit Airport Master Record (FAA Form 5010-1) to the FAA Airports Division. This enters the facility into the national database and makes it visible to standard compliance screening. Requires completed construction and operational readiness.",
              },
              {
                priority: "HIGH",
                color: "#f59e0b",
                action: "Verify NFPA 418 adoption in Miami-Dade fire code",
                detail: "Confirm whether NFPA 418 (Standard for Heliports) is referenced in the applicable fire/building code for the Watson Island parcel. If not adopted, recommend the developer include NFPA 418 compliance in construction specifications regardless of local code requirements.",
              },
            ].map((item, i) => (
              <div key={i} style={{
                padding: "16px 20px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderLeft: `3px solid ${item.color}`,
                borderRadius: 8,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    fontFamily: "'Space Mono', monospace",
                    color: item.color,
                    letterSpacing: 1,
                  }}>
                    {item.priority}
                  </span>
                  <span style={{ fontSize: 13, color: "#ccc", fontWeight: 600 }}>{item.action}</span>
                </div>
                <p style={{ fontSize: 12, color: "#888", lineHeight: 1.7, margin: 0 }}>{item.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Context: Adjacent Facility */}
        <div style={cardStyle}>
          <h2 style={sectionHeadStyle}>Adjacent Facility: Miami Seaplane Base (X44)</h2>
          <p style={{ fontSize: 13, color: "#999", lineHeight: 1.7, marginBottom: 16 }}>
            Watson Island Heliport sits adjacent to the Miami Seaplane Base (FAA ID: X44), a publicly
            owned facility operated by the City of Miami at 1000 MacArthur Causeway. X44 is registered
            in the FAA NASR database as a seaplane base with water runway 12W/30W (14,000 x 200 ft).
            Blade (now a Joby Aviation subsidiary) operates seaplane departures to the Bahamas and Keys
            from this facility.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              { label: "FAA ID", value: "X44" },
              { label: "Type", value: "Seaplane Base" },
              { label: "Elevation", value: "6 ft MSL" },
              { label: "CTAF", value: "123.025" },
              { label: "Ownership", value: "City of Miami (public)" },
              { label: "Status", value: "Operational" },
            ].map(item => (
              <div key={item.label} style={{
                padding: "10px 12px",
                background: "rgba(255,255,255,0.02)",
                borderRadius: 4,
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{ fontSize: 9, letterSpacing: 1, color: "#555", marginBottom: 2 }}>{item.label.toUpperCase()}</div>
                <div style={{ fontSize: 12, color: "#ccc", fontFamily: "'Space Mono', monospace" }}>{item.value}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "#666", lineHeight: 1.7, marginTop: 16 }}>
            The adjacency matters: X44&apos;s existing airspace allocation and operational history may
            simplify the FAA aeronautical study for Watson Island, but do not substitute for an independent
            determination. The two facilities would need coordinated approach/departure procedures.
          </p>
        </div>

        {/* Methodology */}
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
            This facility-level audit applies the same five-question compliance checklist used in AirIndex
            state-level heliport audits, adapted for a pre-development facility not yet in the FAA NASR 5010
            database. Data sources include FAA NASR 28-day subscription, FAA OE/AAA determined cases database,
            AirIndex Market Context Store (Florida state profile), Miami-Dade County Commission records,
            and publicly available press releases. Field verification by a qualified heliport inspector is
            recommended before regulatory action. See{" "}
            <a href="https://airindex.io/heliport-audit" style={{ color: "#5B8DB8", textDecoration: "none" }}>
              airindex.io/heliport-audit
            </a>{" "}
            for the full audit methodology.
          </p>
        </div>

        {/* Footer */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingTop: 20,
          fontSize: 10,
          color: "#444",
          lineHeight: 1.6,
        }}>
          <p>AirIndex Facility-Level Heliport Audit &middot; Watson Island Heliport &middot; Miami, FL &middot; {today}</p>
          <p>Vertical Data Group, LLC &middot; PO Box 31172 &middot; Myrtle Beach, SC 29588</p>
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
