import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { getUserTier } from "@/lib/billing";
import { hasProAccess } from "@/lib/billing-shared";
import { getCitiesWithOverrides } from "@/data/seed";
import { OPERATORS_MAP } from "@/data/seed";
import { getEnhancedGapAnalysis } from "@/lib/gap-analysis";
import { getScoreHistoryFull } from "@/lib/score-history";
import { getCorridorsForCity } from "@/lib/corridors";
import { SUB_INDICATOR_DEFS } from "@/lib/sub-indicators";
import PrintButton from "./PrintButton";
import type { SubIndicator } from "@/types";

export const metadata: Metadata = {
  robots: "noindex, nofollow",
};

const STATUS_ICONS: Record<string, { icon: string; color: string; printColor: string }> = {
  achieved: { icon: "\u2713", color: "#00ff88", printColor: "#16a34a" },
  partial: { icon: "\u25CF", color: "#f59e0b", printColor: "#d97706" },
  missing: { icon: "\u2717", color: "#ff4444", printColor: "#dc2626" },
  unknown: { icon: "?", color: "#555", printColor: "#9ca3af" },
};

function SubIndicatorBadge({ si, forPrint = false }: { si: SubIndicator; forPrint?: boolean }) {
  const { icon, color, printColor } = STATUS_ICONS[si.status] ?? STATUS_ICONS.unknown;
  const c = forPrint ? printColor : color;
  return (
    <span style={{ color: c, fontSize: 12, fontWeight: 700 }} title={`${si.label}: ${si.status}`}>
      {icon}
    </span>
  );
}

export default async function GapReportPage({
  params,
}: {
  params: Promise<{ cityId: string }>;
}) {
  const { cityId } = await params;

  // Admin-only gate (enterprise deliverable)
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const tier = await getUserTier(session.user.id);
  if (!hasProAccess(tier)) {
    redirect("/pricing");
  }

  // Data fetching
  const allCities = await getCitiesWithOverrides();
  const city = allCities.find((c) => c.id === cityId);
  if (!city) notFound();

  const enhanced = await getEnhancedGapAnalysis(city, allCities);
  const { peers } = enhanced;

  let rawHistory: Awaited<ReturnType<typeof getScoreHistoryFull>> = [];
  try {
    rawHistory = await getScoreHistoryFull(cityId);
  } catch {
    // Graceful — history may be sparse or DB unavailable
  }

  // Deduplicate: keep first entry, entries with score changes, and entries with triggering events
  const history = rawHistory.filter((h, i) => {
    if (i === 0) return true;
    if (h.triggeringEvent) return true;
    if (h.score !== rawHistory[i - 1].score) return true;
    return false;
  });

  let corridors: Awaited<ReturnType<typeof getCorridorsForCity>> = [];
  try {
    corridors = await getCorridorsForCity(cityId);
  } catch {
    // Graceful fallback
  }

  const operatorNames = city.activeOperators
    .map((id) => OPERATORS_MAP[id]?.name)
    .filter(Boolean);

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const tierThresholds: Record<string, string> = {
    ADVANCED: "75\u2013100",
    MODERATE: "50\u201374",
    EARLY: "30\u201349",
    NASCENT: "0\u201329",
  };

  // Group sub-indicator defs by factor for maturity matrix
  const factorGroups = enhanced.factors.map((f) => ({
    label: f.label,
    key: f.key,
    subIndicators: f.subIndicators,
  }));

  return (
    <>
      <style>{`
        @media print {
          body { background: #ffffff !important; color: #1a1a1a !important; }
          .report-container { background: #ffffff !important; color: #1a1a1a !important; }
          .screen-only { display: none !important; }
          .section-card {
            background: #ffffff !important;
            border: 1px solid #e5e7eb !important;
            color: #1a1a1a !important;
            page-break-inside: avoid;
          }
          .section-card h2, .section-card h3 { color: #1a1a1a !important; }
          .section-card p, .section-card td, .section-card li { color: #374151 !important; }
          .cover-section {
            background: #ffffff !important;
            border: 2px solid #1a1a1a !important;
          }
          .cover-section * { color: #1a1a1a !important; }
          .score-circle {
            border-color: #1a1a1a !important;
            color: #1a1a1a !important;
          }
          .tier-badge { background: #e5e7eb !important; color: #1a1a1a !important; }
          a { color: #1a1a1a !important; text-decoration: none !important; }
          .neon-accent { color: #1a1a1a !important; }
        }
        @page { size: letter; margin: 0.75in; }
      `}</style>

      <div
        className="report-container"
        style={{
          background: "#050508",
          color: "#e0e0e0",
          fontFamily: "'Inter', sans-serif",
          minHeight: "100vh",
          padding: "40px 24px",
        }}
      >
        <div style={{ maxWidth: 800, margin: "0 auto" }}>

          {/* ======== TOOLBAR (screen only) ======== */}
          <div
            className="screen-only"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 24,
              padding: "12px 0",
            }}
          >
            <Link
              href="/dashboard"
              style={{
                color: "#888",
                fontSize: 12,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "color 0.15s",
              }}
            >
              &larr; Back to Dashboard
            </Link>
            <PrintButton />
          </div>

          {/* ======== SECTION 1: COVER ======== */}
          <div
            className="cover-section section-card"
            style={{
              background: "#0a0a12",
              border: "1px solid #1a1a2e",
              borderRadius: 12,
              padding: "60px 40px",
              textAlign: "center",
              marginBottom: 32,
            }}
          >
            <div style={{ marginBottom: 32 }}>
              <span
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontWeight: 800,
                  fontSize: 28,
                  color: "#e0e0e0",
                  letterSpacing: "0.12em",
                }}
              >
                AIR
              </span>
              <span
                className="neon-accent"
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontWeight: 400,
                  fontSize: 28,
                  color: "#5B8DB8",
                  letterSpacing: "0.12em",
                }}
              >
                INDEX
              </span>
            </div>

            <h1
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 36,
                fontWeight: 700,
                margin: "0 0 8px",
                color: "#ffffff",
              }}
            >
              {city.city}, {city.state}
            </h1>
            <p style={{ color: "#888", fontSize: 14, margin: "0 0 32px" }}>
              {city.metro}
            </p>

            <div
              className="score-circle"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 120,
                height: 120,
                borderRadius: "50%",
                border: `3px solid ${enhanced.tierColor}`,
                margin: "0 0 16px",
              }}
            >
              <span style={{ fontSize: 40, fontWeight: 700, color: enhanced.tierColor }}>
                {enhanced.score}
              </span>
            </div>

            <div>
              <span
                className="tier-badge"
                style={{
                  display: "inline-block",
                  background: enhanced.tierColor,
                  color: "#050508",
                  padding: "6px 20px",
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                }}
              >
                {enhanced.tier}
              </span>
            </div>

            <p style={{ color: "#666", fontSize: 12, marginTop: 40, marginBottom: 0 }}>
              UAM Readiness Gap Report
            </p>
            <p style={{ color: "#666", fontSize: 12, margin: "4px 0 0" }}>
              Prepared by Vertical Data Group LLC &middot; {today}
            </p>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontStyle: "italic",
                color: "#555",
                fontSize: 13,
                letterSpacing: "0.08em",
                marginTop: 20,
                marginBottom: 0,
              }}
            >
              Rate the sky.
            </p>
          </div>

          {/* ======== SECTION 2: EXECUTIVE SUMMARY ======== */}
          <div
            className="section-card"
            style={{
              background: "#0a0a12",
              border: "1px solid #1a1a2e",
              borderRadius: 12,
              padding: "32px 28px",
              marginBottom: 24,
            }}
          >
            <h2
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 20,
                fontWeight: 700,
                color: "#ffffff",
                margin: "0 0 16px",
              }}
            >
              Executive Summary
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.8, margin: "0 0 12px" }}>
              {city.city}, {city.state} is classified as <strong style={{ color: enhanced.tierColor }}>{enhanced.tier}</strong> ({tierThresholds[enhanced.tier]}) on the AirIndex UAM Readiness Index with a score of <strong>{enhanced.score}/100</strong>.
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.8, margin: "0 0 12px" }}>
              <strong>{enhanced.achievedCount} of {enhanced.totalFactors}</strong> readiness factors are fully achieved.
              {" "}<strong>{enhanced.subIndicatorSummary.achieved} of {enhanced.subIndicatorSummary.total}</strong> diagnostic sub-indicators are met.
              {enhanced.gaps.length > 0 && (
                <> Closing the top gap &mdash; <strong>{enhanced.gaps[0].label}</strong> &mdash; alone would add <strong>{enhanced.gaps[0].max - enhanced.gaps[0].earned} points</strong> to the score.</>
              )}
            </p>
            {operatorNames.length > 0 && (
              <p style={{ fontSize: 14, lineHeight: 1.8, margin: "0 0 0" }}>
                Active operators: {operatorNames.join(", ")}.
              </p>
            )}
            {corridors.length > 0 && (
              <p style={{ fontSize: 14, lineHeight: 1.8, margin: "8px 0 0" }}>
                {corridors.length} corridor{corridors.length !== 1 ? "s" : ""} tracked: {corridors.map((c) => c.name).join(", ")}.
              </p>
            )}
          </div>

          {/* ======== SECTION 3: FACTOR BREAKDOWN (with sub-indicators) ======== */}
          <div
            className="section-card"
            style={{
              background: "#0a0a12",
              border: "1px solid #1a1a2e",
              borderRadius: 12,
              padding: "32px 28px",
              marginBottom: 24,
            }}
          >
            <h2
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 20,
                fontWeight: 700,
                color: "#ffffff",
                margin: "0 0 16px",
              }}
            >
              Factor Breakdown
            </h2>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid #1a1a2e" }}>
                  <th style={{ textAlign: "left", padding: "8px 4px", color: "#888", fontWeight: 600 }}>Factor</th>
                  <th style={{ textAlign: "center", padding: "8px 4px", color: "#888", fontWeight: 600 }}>Weight</th>
                  <th style={{ textAlign: "center", padding: "8px 4px", color: "#888", fontWeight: 600 }}>Earned</th>
                  <th style={{ textAlign: "center", padding: "8px 4px", color: "#888", fontWeight: 600 }}>Status</th>
                  <th style={{ textAlign: "left", padding: "8px 4px", color: "#888", fontWeight: 600 }}>Source</th>
                </tr>
              </thead>
              <tbody>
                {enhanced.factors.map((f) => (
                  <>
                    <tr key={f.key} style={{ borderBottom: "1px solid #0f0f1a" }}>
                      <td style={{ padding: "10px 4px", fontWeight: 600 }}>{f.label}</td>
                      <td style={{ textAlign: "center", padding: "10px 4px", color: "#888" }}>{f.max}</td>
                      <td style={{ textAlign: "center", padding: "10px 4px" }}>
                        <span style={{ color: f.achieved ? "#00ff88" : f.partial ? "#f59e0b" : "#ff4444" }}>
                          {f.earned}
                        </span>
                      </td>
                      <td style={{ textAlign: "center", padding: "10px 4px" }}>
                        {f.achieved ? (
                          <span style={{ color: "#00ff88" }}>&#10003;</span>
                        ) : f.partial ? (
                          <span style={{ color: "#f59e0b" }}>&#9679;</span>
                        ) : (
                          <span style={{ color: "#ff4444" }}>&#10007;</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 4px", color: "#888", fontSize: 12 }}>
                        {f.citation
                          ? `${f.citation}${f.citationDate ? ` (${f.citationDate})` : ""}`
                          : "\u2014"}
                      </td>
                    </tr>
                    {/* Nested sub-indicator rows */}
                    {f.subIndicators.map((si) => (
                      <tr key={si.id} style={{ borderBottom: "1px solid #0a0a14" }}>
                        <td style={{ padding: "6px 4px 6px 24px", color: "#999", fontSize: 11 }}>
                          {si.label}
                        </td>
                        <td />
                        <td />
                        <td style={{ textAlign: "center", padding: "6px 4px" }}>
                          <SubIndicatorBadge si={si} />
                        </td>
                        <td style={{ padding: "6px 4px", color: "#666", fontSize: 11 }}>
                          {si.citation || "\u2014"}
                          {si.peerNote && (
                            <span style={{ color: "#5B8DB8", marginLeft: 6, fontStyle: "italic" }}>
                              ({si.peerNote})
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* ======== SECTION 4: GAP ANALYSIS & RECOMMENDATIONS (with sub-indicators) ======== */}
          {enhanced.gaps.length > 0 && (
            <div
              className="section-card"
              style={{
                background: "#0a0a12",
                border: "1px solid #1a1a2e",
                borderRadius: 12,
                padding: "32px 28px",
                marginBottom: 24,
              }}
            >
              <h2
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#ffffff",
                  margin: "0 0 20px",
                }}
              >
                Gap Analysis &amp; Recommendations
              </h2>
              {enhanced.gaps.map((g) => (
                <div
                  key={g.key}
                  style={{
                    borderLeft: `3px solid ${g.max >= 15 ? "#ff4444" : "#f59e0b"}`,
                    paddingLeft: 16,
                    marginBottom: 20,
                  }}
                >
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#ffffff", margin: "0 0 4px" }}>
                    {g.label}
                    <span style={{ color: "#888", fontWeight: 400, fontSize: 12, marginLeft: 8 }}>
                      {g.earned}/{g.max} pts &middot; {g.max - g.earned} pts available
                    </span>
                  </h3>
                  <p style={{ fontSize: 13, lineHeight: 1.7, color: "#aaa", margin: "0 0 8px" }}>
                    {g.recommendation}
                  </p>
                  {/* Sub-indicators for this gap */}
                  {g.subIndicators.filter((si) => si.status !== "achieved").length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <div style={{ color: "#666", fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>MISSING INDICATORS</div>
                      {g.subIndicators
                        .filter((si) => si.status !== "achieved")
                        .map((si) => {
                          const { icon, color } = STATUS_ICONS[si.status] ?? STATUS_ICONS.unknown;
                          return (
                            <div key={si.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0" }}>
                              <span style={{ color, fontSize: 10, fontWeight: 700 }}>{icon}</span>
                              <span style={{ color: "#999", fontSize: 11 }}>{si.label}</span>
                              {si.peerNote && (
                                <span style={{ color: "#5B8DB8", fontSize: 10, fontStyle: "italic" }}>
                                  &mdash; {si.peerNote}
                                </span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ======== SECTION 5: SUB-INDICATOR MATURITY MATRIX ======== */}
          <div
            className="section-card"
            style={{
              background: "#0a0a12",
              border: "1px solid #1a1a2e",
              borderRadius: 12,
              padding: "32px 28px",
              marginBottom: 24,
            }}
          >
            <h2
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 20,
                fontWeight: 700,
                color: "#ffffff",
                margin: "0 0 8px",
              }}
            >
              Sub-Indicator Maturity Matrix
            </h2>
            <p style={{ fontSize: 12, color: "#888", margin: "0 0 16px" }}>
              {enhanced.subIndicatorSummary.achieved} achieved &middot; {enhanced.subIndicatorSummary.partial} partial &middot; {enhanced.subIndicatorSummary.missing} missing &middot; {enhanced.subIndicatorSummary.unknown} unknown &mdash; {enhanced.subIndicatorSummary.total} total
            </p>

            {factorGroups.map((group) => (
              <div key={group.key} style={{ marginBottom: 16 }}>
                <div style={{ color: "#aaa", fontSize: 11, fontWeight: 600, marginBottom: 6 }}>
                  {group.label}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {group.subIndicators.map((si) => {
                    const { color } = STATUS_ICONS[si.status] ?? STATUS_ICONS.unknown;
                    return (
                      <div
                        key={si.id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "4px 8px",
                          borderRadius: 4,
                          background: "rgba(255,255,255,0.03)",
                          border: `1px solid ${color}33`,
                          fontSize: 10,
                          color: "#ccc",
                        }}
                        title={`${si.label}: ${si.status}${si.citation ? ` — ${si.citation}` : ""}`}
                      >
                        <span style={{ color, fontWeight: 700 }}>
                          {STATUS_ICONS[si.status]?.icon ?? "?"}
                        </span>
                        {si.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* ======== SECTION 6: COMPETITIVE CONTEXT ======== */}
          <div
            className="section-card"
            style={{
              background: "#0a0a12",
              border: "1px solid #1a1a2e",
              borderRadius: 12,
              padding: "32px 28px",
              marginBottom: 24,
            }}
          >
            <h2
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 20,
                fontWeight: 700,
                color: "#ffffff",
                margin: "0 0 16px",
              }}
            >
              Competitive Context
            </h2>

            {peers.sameTier.length > 0 ? (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#888", margin: "0 0 8px" }}>
                  Same Tier ({enhanced.tier})
                </h3>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.8 }}>
                  {peers.sameTier.map((p) => (
                    <li key={p.id}>
                      {p.city}, {p.state} &mdash; {p.score}/100
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "#888", margin: "0 0 16px" }}>
                No other cities currently share the {enhanced.tier} tier.
              </p>
            )}

            {peers.nextTier && (
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#888", margin: "0 0 8px" }}>
                  Next Tier: {peers.nextTier} ({peers.pointsToNextTier} pts needed)
                </h3>
                {peers.nextTierCities.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.8 }}>
                    {peers.nextTierCities.map((p) => (
                      <li key={p.id}>
                        {p.city}, {p.state} &mdash; {p.score}/100
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: 13, color: "#888", margin: 0 }}>
                    No cities currently in the {peers.nextTier} tier.
                  </p>
                )}
              </div>
            )}

            {!peers.nextTier && (
              <p style={{ fontSize: 13, color: "#00ff88", margin: 0 }}>
                {city.city} is in the highest tier (ADVANCED). No further tier progression available.
              </p>
            )}
          </div>

          {/* ======== SECTION 7: SCORE TRAJECTORY ======== */}
          <div
            className="section-card"
            style={{
              background: "#0a0a12",
              border: "1px solid #1a1a2e",
              borderRadius: 12,
              padding: "32px 28px",
              marginBottom: 24,
            }}
          >
            <h2
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 20,
                fontWeight: 700,
                color: "#ffffff",
                margin: "0 0 16px",
              }}
            >
              Score Trajectory
            </h2>
            {history.length > 1 ? (
              <>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1a1a2e" }}>
                      <th style={{ textAlign: "left", padding: "8px 4px", color: "#888", fontWeight: 600 }}>Date</th>
                      <th style={{ textAlign: "center", padding: "8px 4px", color: "#888", fontWeight: 600 }}>Score</th>
                      <th style={{ textAlign: "center", padding: "8px 4px", color: "#888", fontWeight: 600 }}>Tier</th>
                      <th style={{ textAlign: "left", padding: "8px 4px", color: "#888", fontWeight: 600 }}>Event</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(-10).map((h, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #0f0f1a" }}>
                        <td style={{ padding: "8px 4px" }}>
                          {new Date(h.capturedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td style={{ textAlign: "center", padding: "8px 4px" }}>{h.score}</td>
                        <td style={{ textAlign: "center", padding: "8px 4px", color: "#888" }}>{h.tier || "\u2014"}</td>
                        <td style={{ padding: "8px 4px", color: "#888", fontSize: 12 }}>
                          {h.triggeringEvent?.summary || "Scheduled snapshot"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <p style={{ fontSize: 13, color: "#888", lineHeight: 1.7, margin: 0 }}>
                Score tracking began {history.length === 1
                  ? new Date(history[0].capturedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
                  : "recently"}.
                Future reports will include score trajectory and trend analysis as more data points are captured.
              </p>
            )}
          </div>

          {/* ======== SECTION 8: PRIORITY MATRIX ======== */}
          {enhanced.gaps.length > 0 && (
            <div
              className="section-card"
              style={{
                background: "#0a0a12",
                border: "1px solid #1a1a2e",
                borderRadius: 12,
                padding: "32px 28px",
                marginBottom: 24,
              }}
            >
              <h2
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#ffffff",
                  margin: "0 0 20px",
                }}
              >
                Priority Matrix
              </h2>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                {/* Quick Wins */}
                <div style={{ flex: "1 1 240px" }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b", margin: "0 0 12px" }}>
                    Quick Wins (1&ndash;3 months)
                  </h3>
                  {enhanced.quickWins.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.8 }}>
                      {enhanced.quickWins.map((g) => (
                        <li key={g.key}>
                          {g.label} &mdash; {g.max - g.earned} pts
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontSize: 13, color: "#888", margin: 0 }}>
                      All quick-win factors achieved.
                    </p>
                  )}
                </div>

                {/* Strategic */}
                <div style={{ flex: "1 1 240px" }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#ff4444", margin: "0 0 12px" }}>
                    Strategic Investments (6&ndash;18 months)
                  </h3>
                  {enhanced.highImpact.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.8 }}>
                      {enhanced.highImpact.map((g) => (
                        <li key={g.key}>
                          {g.label} &mdash; {g.max - g.earned} pts
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontSize: 13, color: "#888", margin: 0 }}>
                      All high-impact factors achieved.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ======== SECTION 9: FEDERAL GRANT LANGUAGE ======== */}
          <div
            className="section-card"
            style={{
              background: "#0a0a12",
              border: "1px solid #1a1a2e",
              borderRadius: 12,
              padding: "32px 28px",
              marginBottom: 24,
            }}
          >
            <h2
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 20,
                fontWeight: 700,
                color: "#ffffff",
                margin: "0 0 16px",
              }}
            >
              Federal Grant Language
            </h2>
            <p style={{ fontSize: 13, lineHeight: 1.8, color: "#aaa", margin: "0 0 12px" }}>
              The following language may be adapted for federal grant applications, RFPs, or budget justifications:
            </p>
            <div
              style={{
                background: "#0f0f1a",
                border: "1px solid #1a1a2e",
                borderRadius: 8,
                padding: "20px 24px",
                fontSize: 13,
                lineHeight: 1.8,
                fontStyle: "italic",
                color: "#ccc",
              }}
            >
              &ldquo;{city.city} has been assessed at Readiness Tier {enhanced.tier} ({enhanced.score}/100) by AirIndex, an independent UAM market intelligence platform tracking 20+ US metropolitan areas across seven standardized readiness factors and 20 diagnostic sub-indicators including pilot programs, vertiport infrastructure, operator presence, zoning frameworks, regulatory posture, state legislation, and weather infrastructure. {city.city} currently meets {enhanced.achievedCount} of 7 factors and {enhanced.subIndicatorSummary.achieved} of {enhanced.subIndicatorSummary.total} sub-indicators.{peers.pointsToNextTier ? ` An investment of ${peers.pointsToNextTier} additional readiness points would advance the market to ${peers.nextTier} tier, positioning it among markets such as ${peers.nextTierCities.slice(0, 2).map((c) => c.city).join(" and ") || "leading UAM-ready cities"}.` : ""}&rdquo;
            </div>
          </div>

          {/* Footer */}
          <div
            style={{ textAlign: "center", padding: "24px 0 40px", color: "#555", fontSize: 11 }}
          >
            <p style={{ margin: 0 }}>
              Prepared for {city.city}, {city.state} &middot; {today}
            </p>
            <p style={{ margin: "6px 0 0" }}>
              <span style={{ fontFamily: "'Courier New', monospace", fontWeight: 800, letterSpacing: "0.1em" }}>AIR</span>
              <span className="neon-accent" style={{ fontFamily: "'Courier New', monospace", fontWeight: 400, color: "#5B8DB8", letterSpacing: "0.1em" }}>INDEX</span>
              {" "}&middot; Rate the sky.
            </p>
            <p className="screen-only" style={{ margin: "8px 0 0", color: "#777" }}>
              Print this page (Ctrl+P / Cmd+P) to generate a PDF.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
