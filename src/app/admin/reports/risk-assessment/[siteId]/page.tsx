/**
 * RiskIndex Site Assessment — per-facility risk report.
 *
 * Admin-gated demo surface. Generates a single-page risk report for any
 * FAA 5010 heliport in the demo set. Designed to be rendered in-browser,
 * printed to PDF, and delivered to underwriters / facility owners as the
 * first outbound demo asset (Larry Mattiello call).
 *
 * Path: /admin/reports/risk-assessment/[siteId]
 * Gate: signed-in admin only (ADMIN_EMAIL)
 * Scope: 15 demo facilities in RISK_DEMO_SITE_IDS for now
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import {
  getSiteRiskAssessment,
  RISK_DEMO_SITE_IDS,
  type SiteGapFlag,
} from "@/lib/risk-index";
import { buildSatelliteTileUrl, buildContextTileUrl } from "@/lib/satellite-tile";
import PrintButton from "@/app/reports/gap/[cityId]/PrintButton";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "alan@airindex.io";

export const metadata: Metadata = {
  title: "RiskIndex Assessment (AIS-backed) — AirIndex",
  robots: "noindex, nofollow",
};

// ─────────────────────────────────────────────────────────
// Styles — light/print-first. Mirrors litigation-risk page.
// ─────────────────────────────────────────────────────────

const accent = "#991b1b";
const S = {
  page: {
    background: "#fff",
    color: "#111",
    fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
    fontSize: 13,
    lineHeight: 1.6,
    minHeight: "100vh",
  } as React.CSSProperties,
  main: { maxWidth: 760, margin: "0 auto", padding: "32px 44px 60px" } as React.CSSProperties,
  header: {
    display: "flex",
    justifyContent: "space-between",
    borderBottom: "1px solid #ddd",
    paddingBottom: 8,
    fontSize: 10,
    color: "#999",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
  title: { fontSize: 26, fontWeight: 700, margin: "18px 0 4px", color: "#111" } as React.CSSProperties,
  subtitle: { fontSize: 13, color: "#666", marginBottom: 24 } as React.CSSProperties,
  sectionTag: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: accent,
    marginBottom: 8,
    marginTop: 32,
    textTransform: "uppercase" as const,
  } as React.CSSProperties,
  h2: { fontSize: 18, fontWeight: 700, margin: "0 0 12px", color: "#111" } as React.CSSProperties,
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "16px 18px",
    marginBottom: 12,
  } as React.CSSProperties,
  kv: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "6px 16px",
    fontSize: 12,
  } as React.CSSProperties,
  kvLabel: { color: "#666", fontSize: 11 } as React.CSSProperties,
  kvVal: { color: "#111", fontWeight: 600 } as React.CSSProperties,
  footerNote: {
    marginTop: 36,
    paddingTop: 14,
    borderTop: "1px solid #eee",
    fontSize: 10,
    color: "#888",
    lineHeight: 1.6,
  } as React.CSSProperties,
};

function SeverityPill({ severity }: { severity: SiteGapFlag["severity"] }) {
  const map: Record<SiteGapFlag["severity"], { bg: string; fg: string; label: string }> = {
    critical: { bg: "#fee2e2", fg: "#991b1b", label: "Critical" },
    high: { bg: "#fef3c7", fg: "#b45309", label: "High" },
    moderate: { bg: "#dbeafe", fg: "#1e40af", label: "Moderate" },
    low: { bg: "#f3f4f6", fg: "#4b5563", label: "Low" },
  };
  const v = map[severity];
  return (
    <span
      style={{
        display: "inline-block",
        background: v.bg,
        color: v.fg,
        fontSize: 9,
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 4,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {v.label}
    </span>
  );
}

function QRow({ label, value, note }: { label: string; value: string; note?: string | null }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
      <span style={{ color: "#374151" }}>{label}</span>
      <span style={{ color: "#111", fontWeight: 600 }}>
        {value}
        {note && <span style={{ color: "#6b7280", fontWeight: 400, marginLeft: 6, fontSize: 11 }}>({note})</span>}
      </span>
    </div>
  );
}

export default async function RiskAssessmentPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  if (process.env.NODE_ENV !== "development") {
    const session = await auth();
    if (!session?.user) redirect("/login?callbackUrl=/admin");
    if (session.user.email !== ADMIN_EMAIL) redirect("/");
  }

  const { siteId } = await params;
  const upper = siteId.toUpperCase();
  if (!RISK_DEMO_SITE_IDS.includes(upper)) {
    // Demo-set allowlist. Expand by editing RISK_DEMO_SITE_IDS.
    notFound();
  }

  const r = await getSiteRiskAssessment(upper);
  if (!r) notFound();

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div style={S.page}>
      <style>{`@media print {
        @page { margin: 0.55in; size: letter; }
        .screen-only { display: none !important; }
        body, div { background: #fff !important; }
        .print-together { page-break-inside: avoid; break-inside: avoid; }
        .print-together img { max-height: 160px !important; }
      }`}</style>

      <div style={S.main}>
        <div className="screen-only" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <PrintButton />
        </div>

        {/* Header */}
        <div style={S.header}>
          <span>
            <strong style={{ color: accent }}>AIRINDEX</strong> · RiskIndex Assessment (AIS-backed)
          </span>
          <span>{today}</span>
        </div>

        {/* About AirIndex — fixes cold-reader + forwarding gap */}
        <div
          style={{
            background: "#f6f9fc",
            border: "1px solid #e3e8ee",
            borderRadius: 6,
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 11,
            color: "#697386",
            lineHeight: 1.55,
          }}
        >
          <strong style={{ color: "#0a2540" }}>About AirIndex (AIS).</strong>{" "}
          AirIndex Score (AIS) is a real-time market-readiness rating for vertical flight,
          built on an auditable 7-factor methodology using primary regulatory and infrastructure
          data. Methodology:{" "}
          <a href="https://www.airindex.io/methodology" style={{ color: accent, textDecoration: "none" }}>
            airindex.io/methodology
          </a>
        </div>

        <h1 style={S.title}>{r.facilityName}</h1>
        <div style={S.subtitle}>
          {r.city}, {r.state}
          {r.county ? ` · ${r.county} County` : ""} · FAA Site {r.facilityId}
          {r.marketCity ? ` · AirIndex Market: ${r.marketCity.city}` : ""}
        </div>

        {/* Risk tier headline */}
        <div
          style={{
            background: r.riskColor + "14",
            border: `1px solid ${r.riskColor}40`,
            borderLeft: `4px solid ${r.riskColor}`,
            padding: "18px 20px",
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: r.riskColor, letterSpacing: "0.12em" }}>
            RISK TIER
          </div>
          <div
            style={{
              fontSize: 34,
              fontWeight: 800,
              color: r.riskColor,
              letterSpacing: "-0.01em",
              marginTop: 4,
              marginBottom: 4,
            }}
          >
            {r.riskTier}
            <span style={{ fontSize: 16, fontWeight: 500, color: "#6b7280", marginLeft: 12 }}>
              score {r.riskScore}/100
            </span>
          </div>
          <div style={{ fontSize: 13, color: "#374151", marginTop: 6 }}>{r.exposureNote}</div>
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8, fontStyle: "italic" }}>
            Tier reflects combined factor exposure including data gaps and forward viability constraints.
          </div>
        </div>

        {/* Underwriting recommendation */}
        <div
          style={{
            background: "#fefce8",
            border: "1px solid #eab308",
            borderLeft: "4px solid #ca8a04",
            padding: "14px 18px",
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: "#a16207", letterSpacing: "0.12em", textTransform: "uppercase" as const }}>
            Underwriting Recommendation (AIS-Based)
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#78350f", marginTop: 4, marginBottom: 4 }}>
            {r.underwriting.stance === "standard" && "Standard coverage terms"}
            {r.underwriting.stance === "standard-with-conditions" && "Standard terms with documentation conditions"}
            {r.underwriting.stance === "conditional" && "Conditional coverage — renewal-contingent endorsements"}
            {r.underwriting.stance === "decline-pending-remediation" && "Decline pending remediation"}
          </div>
          <div style={{ fontSize: 12, color: "#78350f", marginBottom: r.underwriting.conditions.length ? 8 : 0 }}>
            {r.underwriting.summary}
          </div>
          {r.underwriting.conditions.length > 0 && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #fde68a" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#a16207", marginBottom: 4, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
                Suggested Conditions
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#78350f" }}>
                {r.underwriting.conditions.map((c, i) => (
                  <li key={i} style={{ marginBottom: 2 }}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Peer benchmark */}
        {r.peerBenchmark.peerCount > 0 && (
          <div
            style={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              padding: "12px 16px",
              borderRadius: 8,
              marginBottom: 20,
              fontSize: 12,
              color: "#374151",
            }}
          >
            <strong style={{ color: "#111" }}>Peer benchmark.</strong>{" "}
            Among {r.peerBenchmark.peerCount} {r.peerBenchmark.cohortLabel}, this facility ranks in the{" "}
            <strong style={{
              color: r.peerBenchmark.quartile === "bottom" ? "#991b1b"
                : r.peerBenchmark.quartile === "lower-mid" ? "#b45309"
                : r.peerBenchmark.quartile === "upper-mid" ? "#1e40af"
                : "#047857",
            }}>
              {r.peerBenchmark.quartile === "top" && "top quartile"}
              {r.peerBenchmark.quartile === "upper-mid" && "upper-middle quartile"}
              {r.peerBenchmark.quartile === "lower-mid" && "lower-middle quartile"}
              {r.peerBenchmark.quartile === "bottom" && "bottom quartile"}
            </strong>{" "}
            {" "}({r.peerBenchmark.betterThanPct === 0 ? "0th" : `${r.peerBenchmark.betterThanPct}th`} percentile among in-state peers).
          </div>
        )}

        {/* Satellite visualization */}
        {(() => {
          const closeUrl = buildSatelliteTileUrl({ lat: r.lat, lng: r.lng, zoom: 18, width: 380, height: 260 });
          const contextUrl = buildContextTileUrl({ lat: r.lat, lng: r.lng, zoom: 14, width: 380, height: 260 });
          if (!closeUrl || !contextUrl) return null;
          return (
            <div className="print-together">
              <div style={S.sectionTag}>Facility Visualization</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={closeUrl}
                    alt={`Satellite view of ${r.facilityName}`}
                    style={{ width: "100%", height: "auto", borderRadius: 8, border: "1px solid #e5e7eb", display: "block" }}
                  />
                  <div style={{ fontSize: 10, color: "#6b7280", marginTop: 6, textAlign: "center", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
                    Facility — {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                  </div>
                </div>
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={contextUrl}
                    alt={`Area context around ${r.facilityName}`}
                    style={{ width: "100%", height: "auto", borderRadius: 8, border: "1px solid #e5e7eb", display: "block" }}
                  />
                  <div style={{ fontSize: 10, color: "#6b7280", marginTop: 6, textAlign: "center", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
                    Surrounding airspace context
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 6 }}>
                Imagery-based validation: facility appears present at registered coordinates. Dimensional values not independently verified.
              </div>
              <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 18, fontStyle: "italic" }}>
                Imagery © Mapbox © Maxar. Marker indicates registered facility coordinates from FAA NASR 5010.
              </div>
            </div>
          );
        })()}

        {/* Site metadata */}
        <div style={S.sectionTag}>Site Profile</div>
        <div style={S.card}>
          <div style={S.kv}>
            <div><div style={S.kvLabel}>Site Type</div><div style={S.kvVal}>{r.siteType ?? "—"}</div></div>
            <div><div style={S.kvLabel}>Ownership</div><div style={S.kvVal}>{r.ownershipType} / {r.useType}</div></div>
            <div><div style={S.kvLabel}>Coordinates</div><div style={S.kvVal}>{r.lat.toFixed(4)}, {r.lng.toFixed(4)}</div></div>
            <div><div style={S.kvLabel}>Linked OE Determinations</div><div style={S.kvVal}>{r.oeDeterminationCount}</div></div>
          </div>
        </div>

        {/* Compliance */}
        <div style={S.sectionTag}>Compliance Profile</div>
        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8, fontStyle: "italic" }}>
          This assessment reflects verifiable regulatory and compliance records. Where documentation
          is not publicly accessible or current, absence of record is treated as a potential exposure.
          Derived from FAA NASR 5010, OE/AAA records, and state regulatory sources.
        </div>
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid #e5e7eb" }}>
            <span style={{ fontWeight: 700, color: "#111" }}>Status: {r.complianceStatus.replace(/_/g, " ")}</span>
            <span style={{ color: "#6b7280", fontSize: 12 }}>
              {r.complianceScore}/5 questions passing · {r.complianceFlags} flag{r.complianceFlags === 1 ? "" : "s"}
            </span>
          </div>
          <QRow label="Q1 — FAA registration current" value={r.q1FaaRegistration} />
          <QRow
            label="Q2 — FAA airspace determination on file"
            value={r.q2AirspaceDetermination}
            note={r.q2DeterminationType}
          />
          <QRow label="Q3 — State enforcement posture" value={r.q3StateEnforcement} />
          <QRow label="Q4 — NFPA 418 jurisdiction adoption" value={r.q4Nfpa418} />
          <QRow
            label="Q5 — eVTOL structural viability"
            value={r.q5EvtolViability}
            note={r.dimensional.controllingDimension != null
              ? "fails EB-105A 2D; 1.5D not verified"
              : null}
          />
        </div>

        {/* Dimensional constraint (eVTOL readiness) */}
        {r.dimensional.controllingDimension != null && (
          <>
            <div style={S.sectionTag}>Dimensional Constraint (eVTOL Readiness)</div>
            <div style={S.card}>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 12 }}>
                Computational pre-screen based on FAA NASR pad dimensions and AC 150/5390-2C formula chain.
                Site-level validation (obstruction analysis, imagery confirmation) required before viability determination.
              </div>
              <div style={S.kv}>
                <div>
                  <div style={S.kvLabel}>Recorded Pad (TLOF)</div>
                  <div style={S.kvVal}>{r.dimensional.padLengthFt} × {r.dimensional.padWidthFt} ft{r.dimensional.surfaceType ? ` (${r.dimensional.surfaceType})` : ""}</div>
                </div>
                <div>
                  <div style={S.kvLabel}>Controlling Dimension</div>
                  <div style={S.kvVal}>{r.dimensional.controllingDimension} ft</div>
                </div>
                <div>
                  <div style={S.kvLabel}>Design Helicopter RD</div>
                  <div style={S.kvVal}>{r.dimensional.maxDesignRD} ft</div>
                </div>
                <div>
                  <div style={S.kvLabel}>Estimated Aircraft OL</div>
                  <div style={S.kvVal}>{r.dimensional.estimatedOL} ft</div>
                </div>
              </div>

              <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
                <div style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: 6,
                  background: r.dimensional.fatoGap15D! <= 0 ? "#ecfdf5" : "#fef2f2",
                  border: `1px solid ${r.dimensional.fatoGap15D! <= 0 ? "#a7f3d0" : "#fecaca"}`,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "#374151", textTransform: "uppercase" as const, marginBottom: 4 }}>
                    Heliport Standard (1.5D)
                  </div>
                  <div style={{ fontSize: 13, color: "#111", fontWeight: 600, marginBottom: 2 }}>
                    Required FATO: {r.dimensional.requiredFato15D} ft
                  </div>
                  <div style={{ fontSize: 11, color: r.dimensional.fatoGap15D! <= 0 ? "#047857" : "#b91c1c" }}>
                    {r.dimensional.fatoGap15D! <= 0
                      ? "Within recorded pad dimensions — current heliport compliance not independently verified"
                      : `${r.dimensional.fatoGap15D} ft beyond recorded pad — current heliport compliance not independently verified`}
                  </div>
                </div>
                <div style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: 6,
                  background: r.dimensional.fatoGap2D! <= 0 ? "#ecfdf5" : "#fef2f2",
                  border: `1px solid ${r.dimensional.fatoGap2D! <= 0 ? "#a7f3d0" : "#fecaca"}`,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "#374151", textTransform: "uppercase" as const, marginBottom: 4 }}>
                    eVTOL Requirement (2D — EB-105A)
                  </div>
                  <div style={{ fontSize: 13, color: "#111", fontWeight: 600, marginBottom: 2 }}>
                    Required FATO: {r.dimensional.requiredFato2D} ft
                  </div>
                  <div style={{ fontSize: 11, color: r.dimensional.fatoGap2D! <= 0 ? "#047857" : "#b91c1c" }}>
                    {r.dimensional.fatoGap2D! <= 0
                      ? "Within recorded pad dimensions"
                      : `${r.dimensional.fatoGap2D} ft beyond recorded pad — structural expansion required`}
                  </div>
                </div>
              </div>

              {/* Structural finding callout */}
              <div style={{ marginTop: 12, padding: "12px 16px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "#92400e", textTransform: "uppercase" as const, marginBottom: 4 }}>Structural Finding</div>
                <div style={{ fontSize: 12, color: "#78350f", fontWeight: 500 }}>
                  Based on available FAA data, existing pad dimensions suggest current helicopter operations may be supported, but eVTOL operations would require significant structural expansion ({r.dimensional.fatoGap2D} ft beyond recorded pad for EB-105A 2D FATO).
                </div>
              </div>

              <div style={{ marginTop: 10, fontSize: 11, color: "#6b7280", padding: "8px 10px", background: "#f9fafb", borderRadius: 4 }}>
                Safety area perimeter: {r.dimensional.requiredSafetyArea} ft (OL × 0.28).
                Whether the surrounding site can accommodate the required FATO and safety area depends on
                available expansion area and obstruction environment — site-level validation required.
              </div>

              <div style={{ marginTop: 6, fontSize: 10, color: "#9ca3af", padding: "6px 10px", background: "#f9fafb", borderRadius: 4 }}>
                FAA registry data may be outdated or inaccurate; dimensional estimates are derived from recorded values and should be validated against current site conditions.
              </div>

              <div style={{ marginTop: 12, fontSize: 10, color: "#9ca3af" }}>
                Data source: FAA NASR APT_RWY (pad dimensions). Formula: OL = 1.2 × RD; FATO = OL × D-factor; SA = OL × 0.28.
                Pre/post AC 150/5390-2C (2012) pad notation differences may apply.
              </div>
            </div>
          </>
        )}

        {r.dimensional.controllingDimension == null && (
          <>
            <div style={S.sectionTag}>Dimensional Constraint (eVTOL Readiness)</div>
            <div style={S.card}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                No pad dimension data available in FAA NASR records for this facility.
                Dimensional viability assessment requires physical survey or satellite imagery analysis.
              </div>
            </div>
          </>
        )}

        {/* Risk factors */}
        {r.gapFlags.length > 0 && (
          <>
            <div style={S.sectionTag}>Risk Factors</div>
            {r.gapFlags.slice(0, 5).map((flag) => (
              <div key={flag.code} style={S.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, color: "#111", fontSize: 14 }}>{flag.title}</div>
                  <SeverityPill severity={flag.severity} />
                </div>
                <div style={{ color: "#374151", fontSize: 12, marginBottom: flag.remediation ? 10 : 0 }}>
                  {flag.detail}
                </div>
                {(flag.remediation || flag.tierImpact) && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #f3f4f6", fontSize: 11, color: "#4b5563" }}>
                    {flag.remediation && (
                      <div style={{ marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, color: "#111", textTransform: "uppercase" as const, letterSpacing: "0.06em", fontSize: 10 }}>Remediation. </span>
                        {flag.remediation}
                      </div>
                    )}
                    {flag.tierImpact && (
                      <div>
                        <span style={{ fontWeight: 700, color: "#111", textTransform: "uppercase" as const, letterSpacing: "0.06em", fontSize: 10 }}>Tier impact. </span>
                        {flag.tierImpact}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* State context */}
        {r.stateContext && (
          <>
            <div style={S.sectionTag}>State Context — {r.stateContext.stateName}</div>
            <div style={S.card}>
              <div style={S.kv}>
                <div><div style={S.kvLabel}>Legislation</div><div style={S.kvVal}>{r.stateContext.legislationStatus}</div></div>
                <div><div style={S.kvLabel}>Enforcement Posture</div><div style={S.kvVal}>{r.stateContext.enforcementPosture}</div></div>
                <div><div style={S.kvLabel}>DOT AAM Engagement</div><div style={S.kvVal}>{r.stateContext.dotAamEngagement}</div></div>
                <div>
                  <div style={S.kvLabel}>Regulatory Burden</div>
                  <div style={{
                    ...S.kvVal,
                    color: r.stateContext.regulatoryBurdenLevel === "severe" ? "#991b1b"
                      : r.stateContext.regulatoryBurdenLevel === "high" ? "#b45309"
                      : r.stateContext.regulatoryBurdenLevel === "moderate" ? "#1e40af"
                      : "#111",
                  }}>
                    {r.stateContext.regulatoryBurdenLevel ?? "—"}
                  </div>
                </div>
              </div>
              {r.stateContext.regulatoryBurdenNote && (
                <div style={{ fontSize: 11, color: "#4b5563", marginTop: 10, paddingTop: 10, borderTop: "1px solid #f3f4f6" }}>
                  {r.stateContext.regulatoryBurdenNote}
                </div>
              )}
              {r.stateContext.keyLegislation && (
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6, fontStyle: "italic" }}>
                  Key: {r.stateContext.keyLegislation}
                </div>
              )}
            </div>
          </>
        )}

        {/* Airflow assessment link */}
        <div style={{ ...S.card, textAlign: "center", marginBottom: 20 }}>
          <Link
            href={`/admin/reports/airflow/${r.facilityId}`}
            style={{ color: "#5B8DB8", textDecoration: "none", fontSize: 13, fontWeight: 600 }}
          >
            View Airflow & Obstruction Assessment →
          </Link>
          <div style={{ fontSize: 10, color: "#999", marginTop: 4 }}>
            Building environment, 8:1 approach surface analysis, OES scoring
          </div>
        </div>

        {/* Footer */}
        <div style={S.footerNote}>
          This assessment is intended for inclusion in underwriting documentation and audit review. Auditable
          against primary regulatory and compliance sources. This output is intended to
          support defensible underwriting decisions and reduce exposure to incomplete or
          fragmented data sources.
          <br />
          <br />
          AirIndex Score (AIS) reflects current regulatory, infrastructure, and operational
          signals. All score changes are timestamped and traceable to source events.
          Methodology published at airindex.io/methodology.
          <br />
          <br />
          This assessment is part of a portfolio-level view of facility risk
          across a carrier&apos;s coverage footprint. Additional facilities can be
          assessed within 24 hours upon request.
          <br />
          <br />
          <span style={{ color: "#aaa" }}>
            AIS Snapshot: {new Date().toISOString().slice(0, 10)} · {new Date().toISOString().slice(11, 16)} UTC · AIS-backed
            <br />
            AirIndex · Vertical Data Group · airindex.io · {today}
          </span>
        </div>
      </div>
    </div>
  );
}
