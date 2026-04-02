import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { getUserTier } from "@/lib/billing";
import { hasProAccess } from "@/lib/billing-shared";
import { getCitiesWithOverrides } from "@/data/seed";
import { OPERATORS_MAP, VERTIPORTS, CORRIDORS } from "@/data/seed";
import { getEnhancedGapAnalysis } from "@/lib/gap-analysis";
import { getScoreHistoryFull } from "@/lib/score-history";
import { getPostureConfig, getLegislationConfig, getWeatherConfig } from "@/lib/scoring";
import PrintButton from "../../gap/[cityId]/PrintButton";
import ScoreTrend from "@/components/ScoreTrend";
import FactorSparklines from "@/components/FactorSparklines";
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

export default async function SnapshotPage({
  params,
}: {
  params: Promise<{ cityId: string }>;
}) {
  const { cityId } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const tier = await getUserTier(session.user.id);
  if (!hasProAccess(tier)) redirect("/pricing");

  const allCities = await getCitiesWithOverrides();
  const city = allCities.find((c) => c.id === cityId);
  if (!city) notFound();

  const enhanced = await getEnhancedGapAnalysis(city, allCities);
  const { peers } = enhanced;

  let rawHistory: Awaited<ReturnType<typeof getScoreHistoryFull>> = [];
  try { rawHistory = await getScoreHistoryFull(cityId); } catch { /* graceful */ }
  const history = rawHistory.filter((h, i) => {
    if (i === 0) return true;
    if (h.triggeringEvent) return true;
    if (h.score !== rawHistory[i - 1].score) return true;
    return false;
  });

  const operatorNames = city.activeOperators
    .map((id) => OPERATORS_MAP[id]?.name)
    .filter(Boolean);
  const cityVertiports = VERTIPORTS.filter((v) => v.cityId === cityId);
  const cityCorridors = CORRIDORS.filter((c) => c.cityId === cityId);

  const postureConfig = getPostureConfig(city.regulatoryPosture);
  const legConfig = getLegislationConfig(city.stateLegislationStatus);
  const wxConfig = getWeatherConfig(city.weatherInfraLevel);

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const cardStyle = {
    background: "#0a0a12",
    border: "1px solid #1a1a2e",
    borderRadius: 12,
    padding: "28px 24px",
    marginBottom: 20,
  };

  const headingStyle = {
    fontFamily: "'Inter', sans-serif" as const,
    fontSize: 16,
    fontWeight: 700 as const,
    color: "#ffffff",
    margin: "0 0 14px",
    letterSpacing: "0.02em",
  };

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
          .section-card p, .section-card td, .section-card li, .section-card span { color: #374151 !important; }
          .cover-section {
            background: #ffffff !important;
            border: 2px solid #1a1a1a !important;
          }
          .cover-section * { color: #1a1a1a !important; }
          .score-circle { border-color: #1a1a1a !important; }
          .tier-badge { background: #e5e7eb !important; color: #1a1a1a !important; }
          a { color: #1a1a1a !important; text-decoration: none !important; }
          .neon-accent { color: #1a1a1a !important; }
          .stat-value { color: #1a1a1a !important; }
          .stat-label { color: #6b7280 !important; }
          .factor-bar-fill { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
        @page { size: letter; margin: 0.6in; }
      `}</style>

      <div
        className="report-container"
        style={{
          background: "#050508",
          color: "#e0e0e0",
          fontFamily: "'Inter', sans-serif",
          minHeight: "100vh",
          padding: "32px 24px",
        }}
      >
        <div style={{ maxWidth: 780, margin: "0 auto" }}>

          {/* TOOLBAR */}
          <div
            className="screen-only"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
              padding: "8px 0",
            }}
          >
            <Link
              href="/dashboard"
              style={{ color: "#888", fontSize: 12, textDecoration: "none" }}
            >
              &larr; Back to Dashboard
            </Link>
            <div style={{ display: "flex", gap: 12 }}>
              <Link
                href={`/reports/gap/${cityId}`}
                style={{ color: "#00d4ff", fontSize: 11, textDecoration: "none", fontWeight: 600 }}
              >
                Full Gap Report &rarr;
              </Link>
              <PrintButton />
            </div>
          </div>

          {/* ======== COVER ======== */}
          <div
            className="cover-section section-card"
            style={{
              background: "#0a0a12",
              border: "1px solid #1a1a2e",
              borderRadius: 12,
              padding: "48px 36px",
              textAlign: "center",
              marginBottom: 20,
            }}
          >
            <div style={{ marginBottom: 24 }}>
              <span style={{ fontFamily: "'Courier New', monospace", fontWeight: 800, fontSize: 22, color: "#e0e0e0", letterSpacing: "0.12em" }}>
                AIR
              </span>
              <span className="neon-accent" style={{ fontFamily: "'Courier New', monospace", fontWeight: 400, fontSize: 22, color: "#00d4ff", letterSpacing: "0.12em" }}>
                INDEX
              </span>
              <span style={{ color: "#555", fontSize: 12, marginLeft: 12, letterSpacing: "0.1em" }}>
                MARKET SNAPSHOT
              </span>
            </div>

            <h1 style={{ fontSize: 32, fontWeight: 700, margin: "0 0 4px", color: "#ffffff" }}>
              {city.city}, {city.state}
            </h1>
            <p style={{ color: "#888", fontSize: 13, margin: "0 0 28px" }}>
              {city.metro}
            </p>

            {/* Score + Tier inline */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
              <div
                className="score-circle"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 96,
                  height: 96,
                  borderRadius: "50%",
                  border: `3px solid ${enhanced.tierColor}`,
                }}
              >
                <span style={{ fontSize: 36, fontWeight: 700, color: enhanced.tierColor }}>
                  {enhanced.score}
                </span>
              </div>
              <div style={{ textAlign: "left" }}>
                <span
                  className="tier-badge"
                  style={{
                    display: "inline-block",
                    background: enhanced.tierColor,
                    color: "#050508",
                    padding: "4px 16px",
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                  }}
                >
                  {enhanced.tier}
                </span>
                <div style={{ color: "#666", fontSize: 11, marginTop: 6 }}>
                  Rank {allCities.findIndex((c) => c.id === cityId) + 1} of {allCities.length} tracked markets
                </div>
                <div style={{ color: "#666", fontSize: 11, marginTop: 2 }}>
                  {today}
                </div>
              </div>
            </div>
          </div>

          {/* ======== MARKET PROFILE (key stats grid) ======== */}
          <div className="section-card" style={cardStyle}>
            <h2 style={headingStyle}>Market Profile</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
              {[
                { label: "Operators", value: operatorNames.length, detail: operatorNames.join(", ") || "None" },
                { label: "Vertiports", value: cityVertiports.length, detail: cityVertiports.length > 0 ? cityVertiports.map((v) => v.name).slice(0, 2).join(", ") + (cityVertiports.length > 2 ? ` +${cityVertiports.length - 2}` : "") : "None planned" },
                { label: "Corridors", value: cityCorridors.length, detail: cityCorridors.length > 0 ? cityCorridors.map((c) => c.name).slice(0, 2).join(", ") + (cityCorridors.length > 2 ? ` +${cityCorridors.length - 2}` : "") : "None tracked" },
                { label: "FAA Heliports", value: city.heliportCount ?? 0, detail: `${city.heliportPublicCount ?? 0} public-use` },
              ].map((stat) => (
                <div key={stat.label} style={{ textAlign: "center" }}>
                  <div className="stat-value" style={{ fontSize: 28, fontWeight: 700, color: "#00d4ff" }}>{stat.value}</div>
                  <div className="stat-label" style={{ fontSize: 10, color: "#888", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 2 }}>{stat.label.toUpperCase()}</div>
                  <div style={{ fontSize: 10, color: "#666", lineHeight: 1.3 }}>{stat.detail}</div>
                </div>
              ))}
            </div>

            {/* Regulatory status row */}
            <div style={{ display: "flex", gap: 24, marginTop: 20, paddingTop: 16, borderTop: "1px solid #1a1a2e" }}>
              <div>
                <span style={{ fontSize: 10, color: "#888", letterSpacing: "0.08em", fontWeight: 600 }}>POSTURE </span>
                <span style={{ fontSize: 12, color: postureConfig.color, fontWeight: 700 }}>{postureConfig.label}</span>
              </div>
              <div>
                <span style={{ fontSize: 10, color: "#888", letterSpacing: "0.08em", fontWeight: 600 }}>LEGISLATION </span>
                <span style={{ fontSize: 12, color: legConfig.color, fontWeight: 700 }}>{legConfig.label}</span>
              </div>
              <div>
                <span style={{ fontSize: 10, color: "#888", letterSpacing: "0.08em", fontWeight: 600 }}>WEATHER </span>
                <span style={{ fontSize: 12, color: wxConfig.color, fontWeight: 700 }}>{wxConfig.label}</span>
              </div>
            </div>
          </div>

          {/* ======== FACTOR SCORECARD (visual bars) ======== */}
          <div className="section-card" style={cardStyle}>
            <h2 style={headingStyle}>Factor Scorecard</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {enhanced.factors.map((f) => {
                const pct = f.max > 0 ? (f.earned / f.max) * 100 : 0;
                const barColor = f.achieved ? "#00ff88" : f.partial ? "#f59e0b" : "#ff4444";
                return (
                  <div key={f.key}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{f.label}</span>
                      <span style={{ fontSize: 11, color: "#888" }}>
                        {f.earned}/{f.max}
                      </span>
                    </div>
                    <div style={{ background: "#1a1a2e", borderRadius: 4, height: 8, overflow: "hidden" }}>
                      <div
                        className="factor-bar-fill"
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: barColor,
                          borderRadius: 4,
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: "#666", textAlign: "right" }}>
              Total: {enhanced.score}/100
            </div>
          </div>

          {/* ======== READINESS DIAGNOSTICS (sub-indicators compact) ======== */}
          <div className="section-card" style={cardStyle}>
            <h2 style={headingStyle}>
              Readiness Diagnostics
              <span style={{ fontSize: 11, fontWeight: 400, color: "#888", marginLeft: 8 }}>
                {enhanced.subIndicatorSummary.achieved}/{enhanced.subIndicatorSummary.total} indicators met
              </span>
            </h2>

            {/* Summary bar */}
            <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 16 }}>
              {enhanced.subIndicatorSummary.achieved > 0 && (
                <div style={{ flex: enhanced.subIndicatorSummary.achieved, background: "#00ff88" }} />
              )}
              {enhanced.subIndicatorSummary.partial > 0 && (
                <div style={{ flex: enhanced.subIndicatorSummary.partial, background: "#f59e0b" }} />
              )}
              {enhanced.subIndicatorSummary.missing > 0 && (
                <div style={{ flex: enhanced.subIndicatorSummary.missing, background: "#ff4444" }} />
              )}
              {enhanced.subIndicatorSummary.unknown > 0 && (
                <div style={{ flex: enhanced.subIndicatorSummary.unknown, background: "#333" }} />
              )}
            </div>

            {/* Compact grid by factor */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {enhanced.factors.map((f) => (
                <div key={f.key}>
                  <div style={{ fontSize: 10, color: "#888", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 4 }}>
                    {f.label}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {f.subIndicators.map((si) => {
                      const cfg = STATUS_ICONS[si.status] ?? STATUS_ICONS.unknown;
                      return (
                        <span
                          key={si.id}
                          title={`${si.label}: ${si.status}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                            fontSize: 9,
                            color: "#aaa",
                            padding: "2px 6px",
                            borderRadius: 3,
                            background: "rgba(255,255,255,0.03)",
                            border: `1px solid ${cfg.color}22`,
                          }}
                        >
                          <span style={{ color: cfg.color, fontWeight: 700, fontSize: 9 }}>{cfg.icon}</span>
                          {si.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ======== GAP PRIORITIES (compact) ======== */}
          {enhanced.gaps.length > 0 && (
            <div className="section-card" style={cardStyle}>
              <h2 style={headingStyle}>Gap Priorities</h2>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 300px" }}>
                  <h3 style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", letterSpacing: "0.08em", margin: "0 0 8px" }}>
                    QUICK WINS (1-3 MONTHS)
                  </h3>
                  {enhanced.quickWins.length > 0 ? (
                    enhanced.quickWins.map((g) => (
                      <div key={g.key} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #0f0f1a", fontSize: 12 }}>
                        <span>{g.label}</span>
                        <span style={{ color: "#f59e0b", fontWeight: 600 }}>+{g.max - g.earned} pts</span>
                      </div>
                    ))
                  ) : (
                    <p style={{ fontSize: 12, color: "#666", margin: 0 }}>All quick-win factors achieved.</p>
                  )}
                </div>
                <div style={{ flex: "1 1 300px" }}>
                  <h3 style={{ fontSize: 11, fontWeight: 700, color: "#ff4444", letterSpacing: "0.08em", margin: "0 0 8px" }}>
                    STRATEGIC (6-18 MONTHS)
                  </h3>
                  {enhanced.highImpact.length > 0 ? (
                    enhanced.highImpact.map((g) => (
                      <div key={g.key} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #0f0f1a", fontSize: 12 }}>
                        <span>{g.label}</span>
                        <span style={{ color: "#ff4444", fontWeight: 600 }}>+{g.max - g.earned} pts</span>
                      </div>
                    ))
                  ) : (
                    <p style={{ fontSize: 12, color: "#666", margin: 0 }}>All high-impact factors achieved.</p>
                  )}
                </div>
              </div>
              {peers.pointsToNextTier && (
                <div style={{ marginTop: 14, padding: "10px 14px", background: "#0f0f1a", borderRadius: 6, fontSize: 12 }}>
                  <strong style={{ color: "#00d4ff" }}>{peers.pointsToNextTier} points</strong>
                  <span style={{ color: "#888" }}> to reach {peers.nextTier} tier</span>
                  {peers.nextTierCities.length > 0 && (
                    <span style={{ color: "#666" }}>
                      {" "}(alongside {peers.nextTierCities.slice(0, 3).map((c) => c.city).join(", ")})
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ======== COMPETITIVE POSITION ======== */}
          <div className="section-card" style={cardStyle}>
            <h2 style={headingStyle}>Competitive Position</h2>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              {peers.sameTier.length > 0 && (
                <div style={{ flex: "1 1 300px" }}>
                  <h3 style={{ fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: "0.1em", margin: "0 0 6px" }}>
                    SAME TIER ({enhanced.tier})
                  </h3>
                  {peers.sameTier.map((p) => (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 12 }}>
                      <span>{p.city}, {p.state}</span>
                      <span style={{ color: "#888" }}>{p.score}</span>
                    </div>
                  ))}
                </div>
              )}
              {peers.nextTier && peers.nextTierCities.length > 0 && (
                <div style={{ flex: "1 1 300px" }}>
                  <h3 style={{ fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: "0.1em", margin: "0 0 6px" }}>
                    NEXT TIER ({peers.nextTier})
                  </h3>
                  {peers.nextTierCities.map((p) => (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 12 }}>
                      <span>{p.city}, {p.state}</span>
                      <span style={{ color: "#888" }}>{p.score}</span>
                    </div>
                  ))}
                </div>
              )}
              {!peers.nextTier && (
                <p style={{ fontSize: 12, color: "#00ff88", margin: 0 }}>
                  {city.city} is in the highest tier (ADVANCED).
                </p>
              )}
            </div>
          </div>

          {/* ======== SCORE TRAJECTORY ======== */}
          <div className="section-card" style={cardStyle}>
            <h2 style={headingStyle}>Score Trajectory</h2>
            {rawHistory.length > 1 ? (
              <>
                <ScoreTrend history={rawHistory} color={enhanced.tierColor} />
                <div style={{ marginTop: 20 }}>
                  <FactorSparklines history={rawHistory} />
                </div>
                {/* Compact event log */}
                <div style={{ marginTop: 20, borderTop: "1px solid #1a1a2e", paddingTop: 14 }}>
                  <div style={{ fontSize: 10, color: "#888", fontWeight: 600, letterSpacing: "0.08em", marginBottom: 8 }}>RECENT EVENTS</div>
                  {history.filter((h) => h.triggeringEvent).slice(-5).map((h, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, padding: "3px 0", fontSize: 11, borderBottom: "1px solid #0a0a14" }}>
                      <span style={{ color: "#666", flexShrink: 0, width: 50 }}>
                        {new Date(h.capturedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      <span style={{ color: "#00d4ff", fontWeight: 600, flexShrink: 0, width: 28 }}>{h.score}</span>
                      <span style={{ color: "#888" }}>{h.triggeringEvent?.summary?.slice(0, 70)}</span>
                    </div>
                  ))}
                  {history.filter((h) => h.triggeringEvent).length === 0 && (
                    <p style={{ fontSize: 11, color: "#666", margin: 0 }}>No triggering events recorded yet.</p>
                  )}
                </div>
              </>
            ) : (
              <p style={{ fontSize: 12, color: "#888", margin: 0 }}>
                Score tracking began {rawHistory.length === 1
                  ? new Date(rawHistory[0].capturedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
                  : "recently"}.
                Trajectory data will appear as more snapshots are captured.
              </p>
            )}
          </div>

          {/* ======== ENTERPRISE CTA ======== */}
          <div
            style={{
              background: "rgba(0,212,255,0.05)",
              border: "1px solid rgba(0,212,255,0.15)",
              borderRadius: 8,
              padding: "20px 24px",
              marginBottom: 20,
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 13, color: "#aaa", margin: "0 0 6px" }}>
              Need the full gap analysis, federal grant language, or a co-branded version of this report?
            </p>
            <p style={{ fontSize: 12, color: "#00d4ff", margin: 0 }}>
              <a href="/contact?tier=enterprise&ref=snapshot" style={{ color: "#00d4ff", textDecoration: "none", fontWeight: 600 }}>
                Request enterprise intelligence &rarr;
              </a>
            </p>
          </div>

          {/* FOOTER */}
          <div style={{ textAlign: "center", padding: "20px 0 32px", color: "#555", fontSize: 10 }}>
            <p style={{ margin: 0 }}>
              {city.city}, {city.state} &middot; Market Snapshot &middot; {today}
            </p>
            <p style={{ margin: "4px 0 0" }}>
              <span style={{ fontFamily: "'Courier New', monospace", fontWeight: 800, letterSpacing: "0.1em" }}>AIR</span>
              <span className="neon-accent" style={{ fontFamily: "'Courier New', monospace", fontWeight: 400, color: "#00d4ff", letterSpacing: "0.1em" }}>INDEX</span>
              {" "}&middot; Vertical Data Group LLC &middot; airindex.io
            </p>
            <p className="screen-only" style={{ margin: "6px 0 0", color: "#777" }}>
              Cmd+P to save as PDF
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
