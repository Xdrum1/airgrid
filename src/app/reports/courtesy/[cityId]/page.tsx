import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCitiesWithOverrides, MARKET_COUNT } from "@/data/seed";
import {
  calculateReadinessScoreFromFkb,
  getScoreTier,
  getScoreColor,
  SCORE_WEIGHTS,
} from "@/lib/scoring";
import { analyzeGaps } from "@/lib/gap-analysis";
import type { FactorAnalysis } from "@/lib/gap-analysis";
import { prisma } from "@/lib/prisma";
import type { ScoreBreakdown } from "@/types";

// Ordinance audit questions with fix guidance
const ORDINANCE_QUESTIONS = [
  {
    field: "faaTerminology" as const,
    question: "City code uses correct FAA terminology?",
    fix: "Update city code: replace 'helipad' with 'heliport,' add 'vertiport' per FAA AC 150/5390-2D.",
  },
  {
    field: "zoningOrdinance" as const,
    question: "Vertiport addressed in zoning ordinance?",
    fix: "Add vertiport as conditional use in commercial/mixed-use zoning districts.",
  },
  {
    field: "airspaceDetermination" as const,
    question: "FAA airspace determination in permit process?",
    fix: "Require favorable FAA airspace determination letter as permit condition.",
  },
  {
    field: "nfpa418Referenced" as const,
    question: "NFPA 418 referenced in fire/building code?",
    fix: "Adopt NFPA 418 by reference in municipal fire code.",
  },
  {
    field: "stateAdoptedAC" as const,
    question: "State adopted FAA AC 150/5390-2D?",
    fix: "Engage state DOT to adopt FAA advisory circular as state-level standard.",
  },
];

// Factor labels for score trajectory
const FACTOR_LABELS: Record<keyof ScoreBreakdown, string> = {
  stateLegislation: "Enact UAM-enabling state legislation",
  vertiportZoning: "Adopt vertiport zoning ordinance",
  activePilotProgram: "Launch operator pilot program",
  approvedVertiport: "Approve vertiport site(s)",
  activeOperatorPresence: "Attract eVTOL operator",
  regulatoryPosture: "Achieve supportive regulatory posture",
  weatherInfrastructure: "Deploy weather infrastructure",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cityId: string }>;
}): Promise<Metadata> {
  const { cityId } = await params;
  const allCities = await getCitiesWithOverrides();
  const city = allCities.find((c) => c.id === cityId);
  if (!city) return { title: "Not Found" };
  return {
    title: `${city.city} Market Intelligence Snapshot — AirIndex`,
    description: `Complimentary UAM market readiness snapshot for ${city.city}. Score, ordinance audit, and gap roadmap.`,
    robots: "noindex, nofollow",
  };
}

export default async function CourtesyReportPage({
  params,
}: {
  params: Promise<{ cityId: string }>;
}) {
  const { cityId } = await params;

  const allCities = await getCitiesWithOverrides();
  const city = allCities.find((c) => c.id === cityId);
  if (!city) notFound();

  const { score, breakdown } = await calculateReadinessScoreFromFkb(city);
  const tier = getScoreTier(score);
  const tierColor = getScoreColor(score);
  const gaps = await analyzeGaps(city);

  // Rank
  const scoredCities = await Promise.all(
    allCities.map(async (c) => ({ id: c.id, score: (await calculateReadinessScoreFromFkb(c)).score }))
  );
  const sorted = scoredCities.sort((a, b) => b.score - a.score);
  const rank = sorted.findIndex((c) => c.id === cityId) + 1;

  // Ordinance audit (optional)
  let ordinanceAudit: Record<string, string> | null = null;
  try {
    const market = await prisma.market.findUnique({ where: { id: cityId } });
    if (market) {
      const audit = await prisma.ordinanceAudit.findUnique({
        where: { marketId: market.id },
      });
      if (audit) {
        ordinanceAudit = {
          faaTerminology: audit.faaTerminology,
          zoningOrdinance: audit.zoningOrdinance,
          airspaceDetermination: audit.airspaceDetermination,
          nfpa418Referenced: audit.nfpa418Referenced,
          stateAdoptedAC: audit.stateAdoptedAC,
        };
      }
    }
  } catch {
    /* DB unavailable — skip ordinance section */
  }

  // Score trajectory: what happens if each missing factor is toggled on
  const trajectoryRows: {
    action: string;
    current: number;
    projected: number;
    delta: number;
  }[] = [];

  for (const factor of gaps.gaps) {
    const delta = factor.max - factor.earned;
    if (delta > 0) {
      trajectoryRows.push({
        action: FACTOR_LABELS[factor.key] || factor.label,
        current: score,
        projected: score + delta,
        delta,
      });
    }
  }

  // Sort by delta descending, take top 4
  trajectoryRows.sort((a, b) => b.delta - a.delta);
  const topTrajectory = trajectoryRows.slice(0, 4);

  // Combined projection
  const totalDelta = trajectoryRows.reduce((s, r) => s + r.delta, 0);
  const projectedTotal = Math.min(score + totalDelta, 100);
  const projectedTier = getScoreTier(projectedTotal);

  // Tier scale segments
  const tierSegments = [
    { label: "NASCENT", min: 0, max: 24, color: "#ff4444", printColor: "#cc2222" },
    { label: "EARLY", min: 25, max: 49, color: "#f59e0b", printColor: "#b87a00" },
    { label: "MODERATE", min: 50, max: 74, color: "#00d4ff", printColor: "#0077b6" },
    { label: "ADVANCED", min: 75, max: 100, color: "#00ff88", printColor: "#00884d" },
  ];

  const statusColor = (status: string) => {
    if (status === "yes") return { icon: "\u25CF", color: "#00ff88", printColor: "#00884d" };
    if (status === "partial") return { icon: "\u25CF", color: "#f59e0b", printColor: "#b87a00" };
    if (status === "no") return { icon: "\u25CF", color: "#ff4444", printColor: "#cc2222" };
    return { icon: "\u25CF", color: "#555", printColor: "#9ca3af" };
  };

  return (
    <>
      <style>{`
        @media print {
          body { background: #ffffff !important; color: #1a1a1a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .courtesy-container { background: #ffffff !important; color: #1a1a1a !important; padding: 0 !important; min-height: auto !important; }
          .courtesy-inner { max-width: none !important; }
          .screen-only { display: none !important; }
          h1, h2, h3, .courtesy-title { color: #1a1a1a !important; }
          .section-head { color: #1a1a1a !important; border-color: #d1d5db !important; }
          .score-num { color: #1a1a1a !important; }
          .tier-badge-print { background: #e5e7eb !important; color: #1a1a1a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .accent { color: #0077b6 !important; }
          .accent-green { color: #00884d !important; }
          .accent-amber { color: #b87a00 !important; }
          .accent-red { color: #cc2222 !important; }
          .gradient-line { background: linear-gradient(90deg, #0077b6, #00884d) !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .tier-seg { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .tier-marker { border-color: #1a1a1a !important; }
          .ord-table td, .ord-table th { color: #374151 !important; border-color: #e5e7eb !important; }
          .traj-table td { color: #374151 !important; border-color: #e5e7eb !important; }
          .traj-highlight td { background: #f3f4f6 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .footer-text { color: #9ca3af !important; }
          .footer-line { border-color: #d1d5db !important; }
          a { color: #1a1a1a !important; text-decoration: none !important; }
        }
        @page { size: letter; margin: 0.5in; }
      `}</style>

      <div
        className="courtesy-container"
        style={{
          background: "#050508",
          color: "#e0e0e0",
          fontFamily: "'Inter', sans-serif",
          minHeight: "100vh",
          padding: "24px 16px",
          fontSize: 11,
          lineHeight: 1.4,
        }}
      >
        <div className="courtesy-inner" style={{ maxWidth: 700, margin: "0 auto" }}>

          {/* ===== HEADER ===== */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div>
                <span style={{ fontFamily: "'Space Mono', 'Courier New', monospace", fontWeight: 700, fontSize: 14, color: "#e0e0e0", letterSpacing: "0.14em" }}>
                  AIR
                </span>
                <span className="accent" style={{ fontFamily: "'Space Mono', 'Courier New', monospace", fontWeight: 700, fontSize: 14, color: "#00d4ff", letterSpacing: "0.14em" }}>
                  INDEX
                </span>
              </div>
              <span className="screen-only" style={{ fontSize: 9, color: "#555" }}>Cmd+P to save as PDF</span>
            </div>
            <h1
              className="courtesy-title"
              style={{
                fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                fontSize: 18,
                fontWeight: 700,
                color: "#ffffff",
                margin: "6px 0 2px",
              }}
            >
              {city.city} Market Intelligence Snapshot
            </h1>
            <p style={{ margin: 0, fontSize: 10, color: "#888" }}>
              Complimentary — April 2026
            </p>
            <div
              className="gradient-line"
              style={{
                height: 2,
                marginTop: 8,
                background: "linear-gradient(90deg, #00d4ff, #00ff88)",
                borderRadius: 1,
              }}
            />
          </div>

          {/* ===== SCORE BLOCK ===== */}
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12, padding: "10px 0" }}>
            {/* Score number */}
            <div style={{ textAlign: "center", minWidth: 56 }}>
              <div
                className="score-num"
                style={{
                  fontFamily: "'Space Mono', 'Courier New', monospace",
                  fontSize: 40,
                  fontWeight: 700,
                  color: tierColor,
                  lineHeight: 1,
                }}
              >
                {score}
              </div>
              <div
                className="tier-badge-print"
                style={{
                  display: "inline-block",
                  marginTop: 4,
                  padding: "2px 10px",
                  borderRadius: 3,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  background: tierColor,
                  color: "#050508",
                }}
              >
                {tier}
              </div>
            </div>

            {/* Rank + tier scale */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "#aaa", marginBottom: 6 }}>
                National rank: <strong style={{ color: "#e0e0e0" }}>#{rank} of {MARKET_COUNT}+ markets</strong>
              </div>

              {/* Tier scale bar */}
              <div style={{ display: "flex", height: 10, borderRadius: 3, overflow: "hidden", position: "relative" as const }}>
                {tierSegments.map((seg) => (
                  <div
                    key={seg.label}
                    className="tier-seg"
                    style={{
                      flex: seg.max - seg.min + 1,
                      background: seg.color,
                      opacity: 0.3,
                    }}
                  />
                ))}
                {/* Marker */}
                <div
                  className="tier-marker"
                  style={{
                    position: "absolute" as const,
                    left: `${score}%`,
                    top: -2,
                    width: 3,
                    height: 14,
                    background: "#ffffff",
                    borderRadius: 1,
                    border: "1px solid #ffffff",
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                {tierSegments.map((seg) => (
                  <span key={seg.label} style={{ fontSize: 7, color: "#666", letterSpacing: "0.05em" }}>
                    {seg.label}
                  </span>
                ))}
              </div>

              <div style={{ fontSize: 8, color: "#666", marginTop: 4 }}>
                AirIndex UAM Readiness Index v1.3 — 7 factors, 0-100 scale
              </div>
            </div>
          </div>

          {/* ===== ORDINANCE AUDIT TABLE (conditional) ===== */}
          {ordinanceAudit && (
            <div style={{ marginBottom: 12 }}>
              <div
                className="section-head"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                  color: "#e0e0e0",
                  letterSpacing: "0.06em",
                  paddingBottom: 4,
                  borderBottom: "1px solid #1a1a2e",
                  marginBottom: 6,
                }}
              >
                ORDINANCE & COMPLIANCE AUDIT
              </div>
              <table
                className="ord-table"
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 9,
                }}
              >
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "3px 6px 3px 0", fontWeight: 600, color: "#888", borderBottom: "1px solid #1a1a2e", width: "42%" }}>
                      Question
                    </th>
                    <th style={{ textAlign: "center", padding: "3px 6px", fontWeight: 600, color: "#888", borderBottom: "1px solid #1a1a2e", width: "8%" }}>
                      Status
                    </th>
                    <th style={{ textAlign: "left", padding: "3px 0 3px 6px", fontWeight: 600, color: "#888", borderBottom: "1px solid #1a1a2e", width: "50%" }}>
                      Recommended Fix
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ORDINANCE_QUESTIONS.map((q) => {
                    const status = ordinanceAudit[q.field] || "unknown";
                    const sc = statusColor(status);
                    const showFix = status === "no" || status === "partial";
                    return (
                      <tr key={q.field}>
                        <td style={{ padding: "3px 6px 3px 0", borderBottom: "1px solid #0f0f1a", color: "#ccc", verticalAlign: "top" }}>
                          {q.question}
                        </td>
                        <td style={{ padding: "3px 6px", borderBottom: "1px solid #0f0f1a", textAlign: "center", verticalAlign: "top" }}>
                          <span style={{ color: sc.color, fontSize: 10 }}>{sc.icon}</span>
                          <span style={{ marginLeft: 3, fontSize: 8, color: "#888", textTransform: "uppercase" as const }}>{status}</span>
                        </td>
                        <td style={{ padding: "3px 0 3px 6px", borderBottom: "1px solid #0f0f1a", color: "#999", verticalAlign: "top", fontSize: 8 }}>
                          {showFix ? q.fix : "\u2014"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ===== SCORE TRAJECTORY ===== */}
          {topTrajectory.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div
                className="section-head"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                  color: "#e0e0e0",
                  letterSpacing: "0.06em",
                  paddingBottom: 4,
                  borderBottom: "1px solid #1a1a2e",
                  marginBottom: 6,
                }}
              >
                WHAT MOVES THE SCORE
              </div>
              <table
                className="traj-table"
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 9,
                }}
              >
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "3px 6px 3px 0", fontWeight: 600, color: "#888", borderBottom: "1px solid #1a1a2e" }}>
                      Action
                    </th>
                    <th style={{ textAlign: "center", padding: "3px 6px", fontWeight: 600, color: "#888", borderBottom: "1px solid #1a1a2e", width: 50 }}>
                      Now
                    </th>
                    <th style={{ textAlign: "center", padding: "3px 6px", fontWeight: 600, color: "#888", borderBottom: "1px solid #1a1a2e", width: 10 }}>
                    </th>
                    <th style={{ textAlign: "center", padding: "3px 6px", fontWeight: 600, color: "#888", borderBottom: "1px solid #1a1a2e", width: 50 }}>
                      Projected
                    </th>
                    <th style={{ textAlign: "center", padding: "3px 6px", fontWeight: 600, color: "#888", borderBottom: "1px solid #1a1a2e", width: 50 }}>
                      Impact
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topTrajectory.map((row) => (
                    <tr key={row.action}>
                      <td style={{ padding: "3px 6px 3px 0", borderBottom: "1px solid #0f0f1a", color: "#ccc" }}>
                        {row.action}
                      </td>
                      <td style={{ padding: "3px 6px", borderBottom: "1px solid #0f0f1a", textAlign: "center", color: "#888" }}>
                        {row.current}
                      </td>
                      <td style={{ padding: "3px 6px", borderBottom: "1px solid #0f0f1a", textAlign: "center", color: "#555" }}>
                        →
                      </td>
                      <td style={{ padding: "3px 6px", borderBottom: "1px solid #0f0f1a", textAlign: "center", color: "#e0e0e0", fontWeight: 600 }}>
                        {row.projected}
                      </td>
                      <td className="accent-green" style={{ padding: "3px 6px", borderBottom: "1px solid #0f0f1a", textAlign: "center", color: "#00ff88", fontWeight: 700 }}>
                        +{row.delta}
                      </td>
                    </tr>
                  ))}
                  {/* Combined row */}
                  <tr className="traj-highlight">
                    <td style={{ padding: "4px 6px 4px 0", borderBottom: "none", color: "#e0e0e0", fontWeight: 700, fontSize: 10 }}>
                      All fixes combined
                    </td>
                    <td style={{ padding: "4px 6px", borderBottom: "none", textAlign: "center", color: "#888", fontWeight: 600 }}>
                      {score}
                    </td>
                    <td style={{ padding: "4px 6px", borderBottom: "none", textAlign: "center", color: "#555" }}>
                      →
                    </td>
                    <td className="accent" style={{ padding: "4px 6px", borderBottom: "none", textAlign: "center", color: "#00d4ff", fontWeight: 700, fontSize: 10 }}>
                      {projectedTotal}
                    </td>
                    <td style={{ padding: "4px 6px", borderBottom: "none", textAlign: "center", fontSize: 8, color: "#aaa" }}>
                      {projectedTier}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* ===== FOOTER ===== */}
          <div
            className="footer-line"
            style={{
              borderTop: "1px solid #1a1a2e",
              paddingTop: 8,
              marginTop: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8 }}>
              <span className="footer-text" style={{ color: "#666" }}>
                Source: AirIndex UAM Market Readiness Index, v1.3 (airindex.io/methodology)
              </span>
              <span className="footer-text" style={{ color: "#666" }}>
                Full Market Readiness & Gap Report available. Contact alan@airindex.io
              </span>
            </div>
            <div style={{ textAlign: "center", marginTop: 4, fontSize: 7, color: "#444" }}>
              Vertical Data Group, LLC · airindex.io · Complimentary — not for redistribution
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
