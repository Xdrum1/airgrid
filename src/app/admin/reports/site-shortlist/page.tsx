/**
 * Site Shortlist Report — admin-gated bulk facility ranking.
 *
 * Accepts up to 10 FAA site IDs via ?ids=ID1,ID2,... and renders a ranked
 * viability matrix scored on RiskIndex + DQS + dimensional + OES. Designed
 * to be printed to PDF and delivered to infrastructure developers
 * evaluating candidate sites.
 *
 * Path: /admin/reports/site-shortlist?ids=...&clientName=...
 * Sample: /admin/reports/site-shortlist?sample=1
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { verifyShareToken } from "@/lib/share-token";
import {
  getSiteRiskAssessment,
  RISK_DEMO_SITE_IDS,
  type SiteRiskAssessment,
} from "@/lib/risk-index";
import { getDataQuality } from "@/lib/data-quality-score";
import PrintButton from "@/app/reports/gap/[cityId]/PrintButton";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "alan@airindex.io";

export const metadata: Metadata = {
  title: "Site Shortlist Report — AirIndex",
  robots: "noindex, nofollow",
};

interface ShortlistRow {
  rank: number;
  assessment: SiteRiskAssessment;
  dqsScore: number | null;
  dqsLabel: string | null;
  compositeScore: number;
  verdict: "GO" | "CAUTION" | "NO-GO";
  verdictColor: string;
  primaryConstraint: string;
  primaryAction: string;
}

const VERDICT_COLOR: Record<ShortlistRow["verdict"], string> = {
  GO: "#16a34a",
  CAUTION: "#d97706",
  "NO-GO": "#dc2626",
};

/**
 * Composite viability score: 0-100, higher = better candidate site.
 *
 * Weights:
 *   - Inverted RiskIndex (60%) — facility-level risk, lower = better
 *   - DQS (25%) — data confidence in our assessment
 *   - Compliance score (15%) — count of passing q1-q5 questions
 */
function computeComposite(
  assessment: SiteRiskAssessment,
  dqsScore: number | null,
): number {
  const inverseRisk = 100 - assessment.riskScore; // 0-100
  const dqs = dqsScore ?? 50; // null DQS = neutral 50
  const compliance = (assessment.complianceScore / 5) * 100; // 0-5 → 0-100
  return Math.round(inverseRisk * 0.6 + dqs * 0.25 + compliance * 0.15);
}

function deriveVerdict(composite: number, riskTier: string): {
  verdict: ShortlistRow["verdict"];
  color: string;
} {
  if (riskTier === "critical" || composite < 40) {
    return { verdict: "NO-GO", color: VERDICT_COLOR["NO-GO"] };
  }
  if (riskTier === "elevated" || composite < 65) {
    return { verdict: "CAUTION", color: VERDICT_COLOR.CAUTION };
  }
  return { verdict: "GO", color: VERDICT_COLOR.GO };
}

function derivePrimaryConstraint(a: SiteRiskAssessment): string {
  if (a.q5EvtolViability === "at_risk") return "Dimensional risk for eVTOL operations";
  if (a.q4Nfpa418 === "none" || a.q4Nfpa418 === "partial") return "NFPA 418 not adopted in jurisdiction";
  if (a.complianceStatus === "objectionable") return "FAA airspace determination flagged";
  if (a.complianceFlags >= 3) return `${a.complianceFlags} compliance gaps require resolution`;
  if (a.gapFlags.length > 0) return a.gapFlags[0].title;
  return "No critical constraints identified";
}

function deriveAction(verdict: ShortlistRow["verdict"], a: SiteRiskAssessment): string {
  if (verdict === "NO-GO") return "Eliminate from active candidate set";
  if (verdict === "CAUTION") {
    if (a.q5EvtolViability === "at_risk") return "Engineering dimensional review before LOI";
    if (a.q4Nfpa418 === "none") return "AHJ engagement on NFPA 418 path";
    return "Resolve flagged compliance gaps before commit";
  }
  return "Advance to engineering feasibility";
}

export default async function SiteShortlistPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string; sample?: string; clientName?: string; token?: string }>;
}) {
  const params = await searchParams;
  const isSample = params.sample === "1";

  // Parse and validate site IDs
  let siteIds: string[];
  if (isSample) {
    siteIds = RISK_DEMO_SITE_IDS.slice(0, 8);
  } else {
    siteIds = (params.ids ?? "")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 10);
  }

  // Auth: admin OR valid share token whose ids exactly match this request
  let isShareView = false;
  let tokenClientName: string | undefined;
  if (params.token) {
    const payload = verifyShareToken(params.token);
    if (payload && payload.type === "site-shortlist") {
      const tokenIds = (payload.params.ids || "")
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      // Match: same set of IDs (order-independent)
      const sameSet =
        tokenIds.length === siteIds.length &&
        tokenIds.every((id) => siteIds.includes(id));
      if (sameSet) {
        isShareView = true;
        tokenClientName = payload.clientName;
      }
    }
  }

  if (!isShareView) {
    const session = await auth();
    if (!session?.user) redirect("/login");
    if (session.user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) redirect("/dashboard");
  }

  const clientName =
    tokenClientName?.trim().slice(0, 100) ||
    params.clientName?.trim().slice(0, 100) ||
    (isSample ? "Sample Client" : "Client");

  // Fetch assessments + DQS in parallel
  const rows: ShortlistRow[] = [];
  if (siteIds.length > 0) {
    const results = await Promise.all(
      siteIds.map(async (id) => {
        const [assessment, dqs] = await Promise.all([
          getSiteRiskAssessment(id),
          getDataQuality(id),
        ]);
        return { id, assessment, dqs };
      }),
    );

    for (const { assessment, dqs } of results) {
      if (!assessment) continue;
      const dqsScore = dqs?.dqsScore ?? null;
      const composite = computeComposite(assessment, dqsScore);
      const { verdict, color } = deriveVerdict(composite, assessment.riskTier);
      rows.push({
        rank: 0, // assigned after sort
        assessment,
        dqsScore,
        dqsLabel: dqs?.reliabilityLabel ?? null,
        compositeScore: composite,
        verdict,
        verdictColor: color,
        primaryConstraint: derivePrimaryConstraint(assessment),
        primaryAction: deriveAction(verdict, assessment),
      });
    }
    rows.sort((a, b) => b.compositeScore - a.compositeScore);
    rows.forEach((r, i) => (r.rank = i + 1));
  }

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const goCount = rows.filter((r) => r.verdict === "GO").length;
  const cautionCount = rows.filter((r) => r.verdict === "CAUTION").length;
  const noGoCount = rows.filter((r) => r.verdict === "NO-GO").length;

  // No-input state — show usage instructions
  if (rows.length === 0 && !isSample) {
    return (
      <div style={{ minHeight: "100vh", background: "#fff", color: "#111", fontFamily: "Inter, sans-serif", padding: "48px 32px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, marginBottom: 8 }}>Site Shortlist Report</h1>
          <p style={{ color: "#697386", fontSize: 13, lineHeight: 1.7, marginBottom: 24 }}>
            Generate a ranked viability matrix for up to 10 candidate sites. Pass FAA site IDs comma-separated:
          </p>
          <pre style={{ background: "#f9fbfd", border: "1px solid #e3e8ee", borderRadius: 6, padding: "12px 16px", fontSize: 12, color: "#0a2540", marginBottom: 16 }}>
            /admin/reports/site-shortlist?ids=25FA,1FD5,CA46&clientName=Acme%20Aviation
          </pre>
          <p style={{ color: "#697386", fontSize: 13, marginBottom: 24 }}>
            Or view the sample with 8 demo sites:{" "}
            <Link href="/admin/reports/site-shortlist?sample=1" style={{ color: "#5B8DB8" }}>
              /admin/reports/site-shortlist?sample=1
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fff", color: "#0a0a1a", fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @page { size: Letter; margin: 0.5in; }
        @media print {
          .no-print { display: none !important; }
          .page-break { page-break-after: always; break-after: page; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .verdict-pill {
          display: inline-block;
          padding: 3px 10px;
          font-family: 'Space Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1.5px;
          color: #ffffff;
          border-radius: 3px;
        }
      `}</style>

      <div className="no-print" style={{ padding: "16px 24px", borderBottom: "1px solid #e3e8ee", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/admin" style={{ color: "#5B8DB8", fontSize: 12, textDecoration: "none" }}>
          ← Admin
        </Link>
        <PrintButton />
      </div>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "48px 32px" }}>
        {/* COVER */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 2, color: "#00d4ff", textTransform: "uppercase", marginBottom: 24 }}>
            AirIndex Site Shortlist · {today}
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 36, fontWeight: 700, lineHeight: 1.15, margin: "0 0 16px", color: "#0a2540" }}>
            Candidate Site Viability Matrix
          </h1>
          <div style={{ fontSize: 16, color: "#425466", marginBottom: 8 }}>
            Prepared for: <strong style={{ color: "#0a2540" }}>{clientName}</strong>
          </div>
          <div style={{ fontSize: 12, color: "#697386", fontStyle: "italic", marginBottom: 32 }}>
            {rows.length} {rows.length === 1 ? "site" : "sites"} ranked by composite readiness score
            {isSample && " · Sample report"}
          </div>

          <div style={{ padding: "24px 28px", background: "#f9fbfd", border: "1px solid #e3e8ee", borderRadius: 8, marginBottom: 32 }}>
            <div style={{ fontSize: 11, color: "#00d4ff", fontFamily: "'Space Mono', monospace", marginBottom: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>
              Verdict Summary
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {[
                { label: "GO", value: goCount, color: VERDICT_COLOR.GO },
                { label: "CAUTION", value: cautionCount, color: VERDICT_COLOR.CAUTION },
                { label: "NO-GO", value: noGoCount, color: VERDICT_COLOR["NO-GO"] },
              ].map((stat) => (
                <div key={stat.label}>
                  <div style={{ fontSize: 36, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: stat.color, lineHeight: 1 }}>
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
            Composite score blends inverted RiskIndex (60%), Data Quality Score (25%), and compliance score (15%).
            Sites are ranked highest to lowest viability. Verdict thresholds: GO ≥ 65, CAUTION 40–64, NO-GO &lt; 40
            or critical RiskIndex tier.
          </div>
        </section>

        {/* RANKED MATRIX */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: "#0a2540", borderBottom: "2px solid #00d4ff", paddingBottom: 8, marginBottom: 20 }}>
            Ranked Viability Matrix
          </h2>

          <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #0a2540", background: "#f9fbfd" }}>
                <th style={{ textAlign: "left", padding: "8px 6px", fontSize: 9, fontFamily: "'Space Mono', monospace", letterSpacing: 1, color: "#697386", textTransform: "uppercase" }}>#</th>
                <th style={{ textAlign: "left", padding: "8px 6px", fontSize: 9, fontFamily: "'Space Mono', monospace", letterSpacing: 1, color: "#697386", textTransform: "uppercase" }}>Verdict</th>
                <th style={{ textAlign: "left", padding: "8px 6px", fontSize: 9, fontFamily: "'Space Mono', monospace", letterSpacing: 1, color: "#697386", textTransform: "uppercase" }}>Score</th>
                <th style={{ textAlign: "left", padding: "8px 6px", fontSize: 9, fontFamily: "'Space Mono', monospace", letterSpacing: 1, color: "#697386", textTransform: "uppercase" }}>Facility</th>
                <th style={{ textAlign: "left", padding: "8px 6px", fontSize: 9, fontFamily: "'Space Mono', monospace", letterSpacing: 1, color: "#697386", textTransform: "uppercase" }}>Location</th>
                <th style={{ textAlign: "left", padding: "8px 6px", fontSize: 9, fontFamily: "'Space Mono', monospace", letterSpacing: 1, color: "#697386", textTransform: "uppercase" }}>Risk</th>
                <th style={{ textAlign: "left", padding: "8px 6px", fontSize: 9, fontFamily: "'Space Mono', monospace", letterSpacing: 1, color: "#697386", textTransform: "uppercase" }}>DQS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.assessment.facilityId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 6px", color: "#0a2540", fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", fontSize: 13 }}>{r.rank}</td>
                  <td style={{ padding: "10px 6px" }}>
                    <span className="verdict-pill" style={{ background: r.verdictColor }}>{r.verdict}</span>
                  </td>
                  <td style={{ padding: "10px 6px", color: "#0a2540", fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>{r.compositeScore}</td>
                  <td style={{ padding: "10px 6px", color: "#0a2540", fontWeight: 600 }}>
                    {r.assessment.facilityName}
                    <div style={{ fontSize: 9, color: "#8792a2", fontFamily: "'Space Mono', monospace", marginTop: 2 }}>
                      {r.assessment.facilityId}
                    </div>
                  </td>
                  <td style={{ padding: "10px 6px", color: "#425466" }}>
                    {r.assessment.city}, {r.assessment.state}
                  </td>
                  <td style={{ padding: "10px 6px" }}>
                    <span style={{ color: r.assessment.riskColor, fontWeight: 700, textTransform: "uppercase", fontSize: 10, fontFamily: "'Space Mono', monospace" }}>
                      {r.assessment.riskTier}
                    </span>
                    <div style={{ fontSize: 9, color: "#8792a2" }}>{r.assessment.riskScore}/100</div>
                  </td>
                  <td style={{ padding: "10px 6px", color: "#425466", fontSize: 10 }}>
                    {r.dqsScore !== null ? `${r.dqsScore}` : "—"}
                    {r.dqsLabel && <div style={{ fontSize: 9, color: "#8792a2" }}>{r.dqsLabel}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="page-break" />

        {/* PER-SITE PROFILES */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: "#0a2540", borderBottom: "2px solid #00d4ff", paddingBottom: 8, marginBottom: 20 }}>
            Per-Site Profiles
          </h2>

          {rows.map((r) => (
            <div
              key={r.assessment.facilityId}
              style={{
                border: "1px solid #e3e8ee",
                borderLeft: `4px solid ${r.verdictColor}`,
                borderRadius: 6,
                padding: "16px 20px",
                marginBottom: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8, gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: "#8792a2", fontFamily: "'Space Mono', monospace", letterSpacing: 1, marginBottom: 2, textTransform: "uppercase" }}>
                    Rank {r.rank} · Composite {r.compositeScore}
                  </div>
                  <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, color: "#0a2540", margin: 0 }}>
                    {r.assessment.facilityName}
                  </h3>
                  <div style={{ fontSize: 11, color: "#697386", marginTop: 2 }}>
                    {r.assessment.city}, {r.assessment.state} · {r.assessment.facilityId}
                  </div>
                </div>
                <span className="verdict-pill" style={{ background: r.verdictColor, fontSize: 10 }}>{r.verdict}</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                <div>
                  <div style={{ fontSize: 9, color: "#8792a2", fontFamily: "'Space Mono', monospace", letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" }}>
                    Primary Constraint
                  </div>
                  <div style={{ fontSize: 12, color: "#0a2540", lineHeight: 1.5 }}>
                    {r.primaryConstraint}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: "#8792a2", fontFamily: "'Space Mono', monospace", letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" }}>
                    Recommended Action
                  </div>
                  <div style={{ fontSize: 12, color: "#0a2540", lineHeight: 1.5 }}>
                    {r.primaryAction}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                  marginTop: 12,
                  paddingTop: 10,
                  borderTop: "1px solid #f1f5f9",
                  fontSize: 10,
                  color: "#697386",
                  fontFamily: "'Space Mono', monospace",
                }}
              >
                <span>Risk: <strong style={{ color: r.assessment.riskColor }}>{r.assessment.riskTier.toUpperCase()}</strong> ({r.assessment.riskScore}/100)</span>
                <span>DQS: <strong style={{ color: "#0a2540" }}>{r.dqsScore !== null ? r.dqsScore : "—"}</strong></span>
                <span>Compliance: <strong style={{ color: "#0a2540" }}>{r.assessment.complianceScore}/5</strong></span>
                <span>NFPA 418: <strong style={{ color: "#0a2540" }}>{r.assessment.q4Nfpa418}</strong></span>
                <span>eVTOL: <strong style={{ color: "#0a2540" }}>{r.assessment.q5EvtolViability}</strong></span>
              </div>
            </div>
          ))}
        </section>

        {/* SOURCES */}
        <section style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #e3e8ee", fontSize: 10, color: "#697386", lineHeight: 1.7 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#00d4ff", letterSpacing: 1.5, marginBottom: 12, textTransform: "uppercase" }}>
            Sources & Limitations
          </div>
          <p style={{ marginBottom: 8 }}>
            <strong>Primary sources:</strong> FAA NASR 5010 (heliport facility registry), AirIndex 5-question
            compliance audit, AirIndex Risk Index (composite of dimensional, regulatory, and exposure factors).
          </p>
          <p style={{ marginBottom: 8 }}>
            <strong>Composite formula:</strong> 0.6 × (100 − RiskIndex) + 0.25 × DQS + 0.15 × (compliance / 5 × 100).
            DQS substituted at 50 when no row exists.
          </p>
          <p style={{ marginBottom: 8 }}>
            <strong>Verdict thresholds:</strong> GO ≥ 65, CAUTION 40-64, NO-GO &lt; 40 or critical risk tier override.
          </p>
          <p>
            <strong>Limitations:</strong> Pre-engineering screening only — does not replace site survey, environmental review,
            or zoning/entitlement work. DQS and OES module coverage varies by site age and source freshness. Field
            verification recommended before LOI or capital commitment.
          </p>
        </section>
      </main>
    </div>
  );
}
