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
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import {
  getSiteRiskAssessment,
  RISK_DEMO_SITE_IDS,
  type SiteGapFlag,
} from "@/lib/risk-index";
import PrintButton from "@/app/reports/gap/[cityId]/PrintButton";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "alan@airindex.io";

export const metadata: Metadata = {
  title: "RiskIndex Site Assessment — AirIndex",
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
      }`}</style>

      <div style={S.main}>
        <div className="screen-only" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <PrintButton />
        </div>

        {/* Header */}
        <div style={S.header}>
          <span>
            <strong style={{ color: accent }}>AIRINDEX</strong> · RiskIndex Site Assessment
          </span>
          <span>{today}</span>
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
            marginBottom: 20,
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
        </div>

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
          <QRow label="Q5 — eVTOL dimensional viability" value={r.q5EvtolViability} />
        </div>

        {/* Gap flags */}
        {r.gapFlags.length > 0 && (
          <>
            <div style={S.sectionTag}>Top Compliance Gaps</div>
            {r.gapFlags.slice(0, 5).map((flag) => (
              <div key={flag.code} style={S.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, color: "#111", fontSize: 14 }}>{flag.title}</div>
                  <SeverityPill severity={flag.severity} />
                </div>
                <div style={{ color: "#374151", fontSize: 12 }}>{flag.detail}</div>
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

        {/* Footer */}
        <div style={S.footerNote}>
          <strong>Scope.</strong> This site assessment composes FAA NASR 5010 registry data, RiskIndex 5-question
          compliance framework, FAA OE/AAA airspace determination linkages, and AirIndex MCS state-context signals
          into a single-facility risk view. Prepared for underwriter and infrastructure-owner evaluation.
          <br />
          <br />
          <strong>Delivery.</strong> Draft assessment. Not for distribution without AirIndex review. Source citations
          and underlying data available on request.
          <br />
          <br />
          <span style={{ color: "#aaa" }}>
            AirIndex · Vertical Data Group · airindex.io · {today}
          </span>
        </div>
      </div>
    </div>
  );
}
