import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getCitiesWithOverrides, CITIES } from "@/data/seed";
import {
  calculateReadinessScoreFromFkb,
  getScoreTier,
  getScoreColor,
  SCORE_WEIGHTS,
} from "@/lib/scoring";
import { analyzeGaps } from "@/lib/gap-analysis";
import type { FactorAnalysis } from "@/lib/gap-analysis";
import type { ScoreBreakdown } from "@/types";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import PrintButton from "../../gap/[cityId]/PrintButton";

// Factor key → FKB short code
const KEY_TO_CODE: Record<keyof ScoreBreakdown, string> = {
  approvedVertiport: "VRT",
  vertiportZoning: "ZON",
  stateLegislation: "LEG",
  regulatoryPosture: "REG",
  activePilotProgram: "PLT",
  activeOperatorPresence: "OPR",
  weatherInfrastructure: "WTH",
};

// Custom display order for infrastructure-developer audience
const DISPLAY_ORDER: (keyof ScoreBreakdown)[] = [
  "approvedVertiport",
  "vertiportZoning",
  "stateLegislation",
  "regulatoryPosture",
  "activePilotProgram",
  "activeOperatorPresence",
  "weatherInfrastructure",
];

// Gap controllability classification
const GAP_CLASS: Record<
  string,
  { frame: string; controllability: string; whoBears: string }
> = {
  VRT: {
    frame: "Requires developer capital to close",
    controllability: "Controllable",
    whoBears: "Developer",
  },
  ZON: {
    frame: "Requires developer capital to close",
    controllability: "Partially controllable",
    whoBears: "Municipality (developer advocates)",
  },
  LEG: {
    frame: "Requires legislative/regulatory action outside developer control",
    controllability: "Not controllable",
    whoBears: "State legislature",
  },
  REG: {
    frame: "Requires legislative/regulatory action outside developer control",
    controllability: "Partially controllable",
    whoBears: "Varies",
  },
  PLT: {
    frame: "Requires legislative/regulatory action outside developer control",
    controllability: "Not controllable",
    whoBears: "Operator/government",
  },
  OPR: {
    frame: "Market-driven",
    controllability: "Not controllable",
    whoBears: "Operator",
  },
  WTH: {
    frame: "Requires infrastructure investment",
    controllability: "Partially controllable",
    whoBears: "Developer/government",
  },
};

// Cost benchmarks per factor
const COST_BENCHMARKS: Record<
  string,
  { cost: string; timeline: string }
> = {
  VRT: { cost: "$5-25M per site", timeline: "18-36 months" },
  ZON: { cost: "$50-200K legal/consulting", timeline: "6-12 months" },
  LEG: { cost: "N/A (policy)", timeline: "12-24 months" },
  REG: { cost: "$100-500K compliance", timeline: "6-18 months" },
  PLT: { cost: "$1-5M", timeline: "12-24 months" },
  OPR: { cost: "N/A (market-driven)", timeline: "6-18 months" },
  WTH: { cost: "$500K-2M per network", timeline: "12-24 months" },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cityId: string }>;
}): Promise<Metadata> {
  const { cityId } = await params;
  const allCities = await getCitiesWithOverrides();
  const city = allCities.find((c) => c.id === cityId);
  if (!city) return { title: "Market Intelligence Briefing" };

  const { score } = await calculateReadinessScoreFromFkb(city);
  const tier = getScoreTier(score);

  return {
    title: `${city.city}, ${city.state} — Market Intelligence Briefing | AirIndex`,
    description: `Infrastructure developer briefing for ${city.city}. Score: ${score}/100 (${tier}). Factor breakdown, capital exposure, and development roadmap.`,
    robots: "noindex, nofollow",
  };
}

export default async function BriefingPage({
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
  const gap = await analyzeGaps(city);

  // Rex integration flag — flip to true when Five-Alpha data is live
  const rexIntegrationActive = process.env.REX_INTEGRATION_ACTIVE === "true";

  // Compute national rank (cities sorted by score descending)
  const sortedCities = [...allCities].sort(
    (a, b) => (b.score ?? 0) - (a.score ?? 0)
  );
  const rank = sortedCities.findIndex((c) => c.id === cityId) + 1;

  // Build ordered factor list
  const factorMap = new Map(gap.factors.map((f) => [f.key, f]));
  const orderedFactors = DISPLAY_ORDER.map(
    (key) => factorMap.get(key)!
  ).filter(Boolean);

  // Favorable scenario: project all gap factors to full
  const favorableScore = gap.factors.reduce((sum, f) => sum + f.max, 0);
  const favorableTier = getScoreTier(favorableScore);
  const favorableTierColor = getScoreColor(favorableScore);

  // Top gap for closing paragraph
  const topGap =
    gap.gaps.length > 0
      ? gap.gaps[0]
      : null;

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Brief factor summary for intro paragraph
  const achievedLabels = gap.factors
    .filter((f) => f.achieved)
    .map((f) => f.label.toLowerCase());
  const gapLabels = gap.gaps.map((f) => f.label.toLowerCase());
  const factorSummaryText =
    achievedLabels.length > 0
      ? `Strengths include ${achievedLabels.slice(0, 3).join(", ")}${achievedLabels.length > 3 ? ` and ${achievedLabels.length - 3} more` : ""}. ${gapLabels.length > 0 ? `Key gaps remain in ${gapLabels.slice(0, 3).join(", ")}.` : "No significant gaps identified."}`
      : `The market has gaps across ${gapLabels.slice(0, 3).join(", ")}.`;

  // Next tier info
  let nextTierName: string | null = null;
  let nextTierThreshold = 0;
  if (score < 30) {
    nextTierName = "EARLY";
    nextTierThreshold = 30;
  } else if (score < 50) {
    nextTierName = "MODERATE";
    nextTierThreshold = 50;
  } else if (score < 75) {
    nextTierName = "ADVANCED";
    nextTierThreshold = 75;
  }

  const cardStyle = {
    background: "#0a0a12",
    border: "1px solid #1a1a2e",
    borderRadius: 12,
    padding: "28px 24px",
    marginBottom: 24,
  };

  const sectionHeading = {
    fontFamily: "'Space Grotesk', sans-serif" as const,
    fontSize: 18,
    fontWeight: 700 as const,
    color: "#ffffff",
    margin: "0 0 16px",
    letterSpacing: "0.02em",
  };

  const labelStyle = {
    fontFamily: "'Space Mono', monospace" as const,
    fontSize: 10,
    fontWeight: 600 as const,
    color: "#888",
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        @media print {
          body { background: #ffffff !important; color: #1a1a1a !important; }
          .briefing-container { background: #ffffff !important; color: #1a1a1a !important; }
          .screen-only { display: none !important; }
          .section-card {
            background: #ffffff !important;
            border: 1px solid #e5e7eb !important;
            color: #1a1a1a !important;
            page-break-inside: avoid;
          }
          .section-card h2, .section-card h3 { color: #1a1a1a !important; }
          .section-card p, .section-card td, .section-card th, .section-card li, .section-card span { color: #374151 !important; }
          .cover-section {
            background: #ffffff !important;
            border: 2px solid #1a1a1a !important;
          }
          .cover-section * { color: #1a1a1a !important; }
          .score-circle { border-color: #1a1a1a !important; }
          .tier-badge { background: #e5e7eb !important; color: #1a1a1a !important; }
          a { color: #1a1a1a !important; text-decoration: none !important; }
          .neon-accent { color: #1a1a1a !important; }
          .factor-bar-fill { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .scenario-card { border-width: 2px !important; }
          table { border-collapse: collapse; }
          table th, table td { border: 1px solid #d1d5db !important; }
          .placeholder-card { background: #f9fafb !important; border: 1px solid #e5e7eb !important; }
          .placeholder-card * { color: #374151 !important; }
          .phase-card { background: #f9fafb !important; border: 1px solid #e5e7eb !important; }
          .phase-card * { color: #374151 !important; }
        }
        @page { size: letter; margin: 0.6in; }
      `}</style>

      <div className="screen-only">
        <SiteNav />
      </div>

      <div
        className="briefing-container"
        style={{
          background: "#050508",
          color: "#ccc",
          fontFamily: "'Inter', sans-serif",
          minHeight: "100vh",
          padding: "32px 24px",
        }}
      >
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          {/* TOOLBAR */}
          <div
            className="screen-only"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 24,
              padding: "8px 0",
            }}
          >
            <Link
              href="/dashboard"
              style={{ color: "#888", fontSize: 12, textDecoration: "none" }}
            >
              &larr; Back to Dashboard
            </Link>
            <PrintButton />
          </div>

          {/* ================================================================
              SECTION 1: Market Score & Readiness Tier
              ================================================================ */}
          <div
            className="cover-section section-card"
            style={{
              background: "#0a0a12",
              border: "1px solid #1a1a2e",
              borderRadius: 12,
              padding: "48px 36px",
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            <div style={{ marginBottom: 8 }}>
              <span
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontWeight: 800,
                  fontSize: 22,
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
                  fontSize: 22,
                  color: "#00d4ff",
                  letterSpacing: "0.12em",
                }}
              >
                INDEX
              </span>
              <span
                style={{
                  ...labelStyle,
                  marginLeft: 12,
                  fontSize: 11,
                }}
              >
                MARKET INTELLIGENCE BRIEFING
              </span>
            </div>
            <p style={{ ...labelStyle, color: "#666", margin: "0 0 24px", fontSize: 10 }}>
              Methodology v1.3 &middot; {today}
            </p>

            <h1
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 34,
                fontWeight: 700,
                margin: "0 0 4px",
                color: "#ffffff",
              }}
            >
              {city.city}, {city.state}
            </h1>
            <p style={{ color: "#888", fontSize: 13, margin: "0 0 28px" }}>
              {city.metro}
            </p>

            {/* Score + Tier + Rank */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 24,
              }}
            >
              <div
                className="score-circle"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 100,
                  height: 100,
                  borderRadius: "50%",
                  border: `3px solid ${tierColor}`,
                }}
              >
                <span
                  style={{ fontSize: 40, fontWeight: 700, color: tierColor }}
                >
                  {score}
                </span>
              </div>
              <div style={{ textAlign: "left" }}>
                <span
                  className="tier-badge"
                  style={{
                    display: "inline-block",
                    background: tierColor,
                    color: "#050508",
                    padding: "4px 18px",
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    fontFamily: "'Space Mono', monospace",
                  }}
                >
                  {tier}
                </span>
                <div style={{ color: "#888", fontSize: 12, marginTop: 8 }}>
                  #{rank} of {allCities.length} markets
                </div>
              </div>
            </div>

            {/* Summary paragraph */}
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.7,
                color: "#aaa",
                maxWidth: 640,
                margin: "28px auto 0",
                textAlign: "left",
              }}
            >
              {city.city} scores {score}/100 ({tier}) on the AirIndex UAM
              Market Readiness Index, ranking #{rank} of {allCities.length}+
              tracked U.S. markets under methodology v1.3. {factorSummaryText}
            </p>
          </div>

          {/* ================================================================
              SECTION 2: Site Conversion Viability (Placeholder)
              ================================================================ */}
          <div className="section-card" style={cardStyle}>
            <h2 style={sectionHeading}>Site Conversion Viability</h2>
            {rexIntegrationActive ? (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 13, lineHeight: 1.7, color: "#ccc", margin: "0 0 12px" }}>
                  Site-level conversion viability analysis powered by Five-Alpha LLC site audit methodology.
                  FATO and safety area compliance, approach path obstruction mapping, and greenfield vs. conversion
                  recommendations are included below.
                </p>
                {/* TODO: Render Five-Alpha site audit data when available */}
                <div style={{ background: "rgba(0,255,136,0.04)", border: "1px solid rgba(0,255,136,0.15)", borderRadius: 8, padding: "16px 20px" }}>
                  <p style={{ color: "#00ff88", fontSize: 11, fontWeight: 700, letterSpacing: 1, margin: "0 0 8px" }}>FIVE-ALPHA SITE AUDIT DATA</p>
                  <p style={{ color: "#888", fontSize: 12, margin: 0 }}>Detailed site audit data for this market will render here when integrated.</p>
                </div>
              </div>
            ) : (
              <div
                className="placeholder-card"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid #1a1a2e",
                  borderRadius: 8,
                  padding: "24px",
                  marginBottom: 16,
                }}
              >
                <p
                  style={{
                    fontSize: 13,
                    lineHeight: 1.7,
                    color: "#888",
                    margin: "0 0 16px",
                  }}
                >
                  Site-level conversion viability analysis — including FATO and
                  safety area compliance per site, approach path obstruction
                  mapping, and greenfield vs. conversion recommendations — is
                  available as part of an enhanced engagement. This section is
                  powered by Five-Alpha LLC site audit data.
                </p>
                <a
                  href="/contact?tier=briefing&ref=site-audit"
                  style={{
                    color: "#00d4ff",
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Contact us to scope &rarr;
                </a>
              </div>
            )}
            <p style={{ fontSize: 12, color: "#666", margin: 0 }}>
              {city.heliportCount ?? 0} FAA-registered heliports in{" "}
              {city.city} metro area. Research indicates fewer than 20% of
              existing U.S. heliports meet the dimensional requirements for
              eVTOL vertiport conversion.
            </p>
          </div>

          {/* ================================================================
              SECTION 3: Factor Breakdown with Infrastructure Emphasis
              ================================================================ */}
          <div className="section-card" style={cardStyle}>
            <h2 style={sectionHeading}>
              Factor Breakdown
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 400,
                  color: "#666",
                  marginLeft: 8,
                }}
              >
                Infrastructure emphasis
              </span>
            </h2>
            <div
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              {orderedFactors.map((f) => {
                const code = KEY_TO_CODE[f.key];
                const pct =
                  f.max > 0 ? (f.earned / f.max) * 100 : 0;
                const barColor = f.achieved
                  ? "#00ff88"
                  : f.partial
                    ? "#f59e0b"
                    : "#ff4444";
                const gapClass = GAP_CLASS[code];
                const isGap = !f.achieved;
                const source = city.scoreSources?.[f.key];

                return (
                  <div key={f.key}>
                    {/* Factor header */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 4,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            ...labelStyle,
                            color: "#555",
                            fontSize: 9,
                          }}
                        >
                          {code}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#e0e0e0",
                          }}
                        >
                          {f.label}
                        </span>
                        {source?.date && (
                          <span
                            style={{
                              fontSize: 9,
                              color: "#555",
                              fontFamily: "'Space Mono', monospace",
                            }}
                          >
                            [{source.date}]
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          color: "#888",
                          fontFamily: "'Space Mono', monospace",
                        }}
                      >
                        {f.earned}/{f.max}
                      </span>
                    </div>

                    {/* Score bar */}
                    <div
                      style={{
                        background: "#1a1a2e",
                        borderRadius: 4,
                        height: 8,
                        overflow: "hidden",
                        marginBottom: isGap ? 8 : 0,
                      }}
                    >
                      <div
                        className="factor-bar-fill"
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: barColor,
                          borderRadius: 4,
                        }}
                      />
                    </div>

                    {/* Gap statement */}
                    {isGap && gapClass && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#777",
                          lineHeight: 1.5,
                          paddingLeft: 12,
                          borderLeft: `2px solid ${barColor}33`,
                        }}
                      >
                        <span
                          style={{
                            color: barColor,
                            fontWeight: 600,
                            fontSize: 10,
                            fontFamily: "'Space Mono', monospace",
                          }}
                        >
                          {gapClass.frame}
                        </span>
                        <br />
                        {f.recommendation.split(".").slice(0, 2).join(".")}.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div
              style={{
                marginTop: 16,
                fontSize: 12,
                color: "#555",
                textAlign: "right",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              Total: {score}/100
            </div>
          </div>

          {/* ================================================================
              SECTION 4: Regulatory Trajectory
              ================================================================ */}
          <div className="section-card" style={cardStyle}>
            <h2 style={sectionHeading}>Regulatory Trajectory</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              {/* Favorable Scenario */}
              <div
                className="scenario-card"
                style={{
                  background: "rgba(0,255,136,0.04)",
                  border: "1px solid rgba(0,255,136,0.2)",
                  borderRadius: 8,
                  padding: "20px",
                }}
              >
                <div
                  style={{
                    ...labelStyle,
                    color: "#00ff88",
                    marginBottom: 12,
                  }}
                >
                  FAVORABLE SCENARIO
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 32,
                      fontWeight: 700,
                      color: favorableTierColor,
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    {favorableScore}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: favorableTierColor,
                      fontFamily: "'Space Mono', monospace",
                    }}
                  >
                    {favorableTier}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: "#888", lineHeight: 1.6, margin: 0 }}>
                  If all pending legislative activity, pilot programs, and
                  infrastructure investments reach completion within the next
                  12-18 months, {city.city} could achieve a score of{" "}
                  {favorableScore}/100 ({favorableTier}). This scenario assumes
                  all gap factors with active or pending momentum achieve full
                  points — representing the market&apos;s ceiling under current
                  methodology. Investment committees should weight this scenario
                  against operator commitment timelines and municipal budget
                  cycles.
                </p>
              </div>

              {/* Stalled Scenario */}
              <div
                className="scenario-card"
                style={{
                  background: "rgba(245,158,11,0.04)",
                  border: "1px solid rgba(245,158,11,0.2)",
                  borderRadius: 8,
                  padding: "20px",
                }}
              >
                <div
                  style={{
                    ...labelStyle,
                    color: "#f59e0b",
                    marginBottom: 12,
                  }}
                >
                  STALLED SCENARIO
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 32,
                      fontWeight: 700,
                      color: tierColor,
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    {score}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: tierColor,
                      fontFamily: "'Space Mono', monospace",
                    }}
                  >
                    {tier}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: "#888", lineHeight: 1.6, margin: 0 }}>
                  If no material regulatory, legislative, or infrastructure
                  progress occurs over the next 12 months, {city.city} remains
                  at {score}/100 ({tier}). In a stalled environment, the market
                  does not regress but loses competitive position as peer cities
                  advance. Capital deployed in this scenario faces extended
                  payback periods and heightened execution risk from regulatory
                  uncertainty.
                </p>
              </div>
            </div>
          </div>

          {/* ================================================================
              SECTION 5: Capital Exposure by Gap
              ================================================================ */}
          <div className="section-card" style={cardStyle}>
            <h2 style={sectionHeading}>Capital Exposure by Gap</h2>
            {gap.gaps.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                  }}
                >
                  <thead>
                    <tr>
                      {[
                        "Gap",
                        "Estimated Cost Range",
                        "Timeline",
                        "Who Bears Cost",
                        "Controllability",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            ...labelStyle,
                            textAlign: "left",
                            padding: "8px 10px",
                            borderBottom: "1px solid #1a1a2e",
                            fontSize: 9,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gap.gaps.map((g) => {
                      const code = KEY_TO_CODE[g.key];
                      const bench = COST_BENCHMARKS[code];
                      const cls = GAP_CLASS[code];
                      return (
                        <tr key={g.key}>
                          <td
                            style={{
                              padding: "10px",
                              borderBottom: "1px solid #0f0f1a",
                              fontWeight: 600,
                              color: "#e0e0e0",
                            }}
                          >
                            <span style={{ color: "#555", fontSize: 9, marginRight: 6, fontFamily: "'Space Mono', monospace" }}>
                              {code}
                            </span>
                            {g.label}
                          </td>
                          <td
                            style={{
                              padding: "10px",
                              borderBottom: "1px solid #0f0f1a",
                              color: "#00d4ff",
                              fontFamily: "'Space Mono', monospace",
                              fontSize: 11,
                            }}
                          >
                            {bench?.cost ?? "N/A"}
                          </td>
                          <td
                            style={{
                              padding: "10px",
                              borderBottom: "1px solid #0f0f1a",
                            }}
                          >
                            {bench?.timeline ?? "N/A"}
                          </td>
                          <td
                            style={{
                              padding: "10px",
                              borderBottom: "1px solid #0f0f1a",
                            }}
                          >
                            {cls?.whoBears ?? "N/A"}
                          </td>
                          <td
                            style={{
                              padding: "10px",
                              borderBottom: "1px solid #0f0f1a",
                            }}
                          >
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                color:
                                  cls?.controllability === "Controllable"
                                    ? "#00ff88"
                                    : cls?.controllability ===
                                        "Partially controllable"
                                      ? "#f59e0b"
                                      : "#ff4444",
                                fontFamily: "'Space Mono', monospace",
                              }}
                            >
                              {cls?.controllability ?? "N/A"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: "#00ff88", margin: 0 }}>
                No capital gaps identified — all factors at maximum score.
              </p>
            )}
            <p
              style={{
                fontSize: 10,
                color: "#555",
                marginTop: 16,
                lineHeight: 1.5,
                fontStyle: "italic",
              }}
            >
              Cost estimates are order-of-magnitude ranges based on publicly
              announced comparable projects. Site-specific figures require
              formal feasibility study.
            </p>
          </div>

          {/* ================================================================
              SECTION 6: Development Roadmap
              ================================================================ */}
          <div className="section-card" style={cardStyle}>
            <h2 style={sectionHeading}>Development Roadmap</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 16,
                marginBottom: 20,
              }}
            >
              {/* Phase 1 */}
              <div
                className="phase-card"
                style={{
                  background: "rgba(0,212,255,0.04)",
                  border: "1px solid rgba(0,212,255,0.15)",
                  borderRadius: 8,
                  padding: "20px",
                }}
              >
                <div
                  style={{
                    ...labelStyle,
                    color: "#00d4ff",
                    marginBottom: 8,
                  }}
                >
                  PHASE 1
                </div>
                <h3
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#ffffff",
                    margin: "0 0 10px",
                  }}
                >
                  Immediate Opportunities
                </h3>
                <p
                  style={{
                    fontSize: 11,
                    color: "#888",
                    lineHeight: 1.5,
                    margin: "0 0 10px",
                  }}
                >
                  Airport-adjacent sites and compliant existing heliports
                  represent near-term deployment targets requiring minimal
                  regulatory lift.
                </p>
                <div style={{ ...labelStyle, fontSize: 9, marginBottom: 4 }}>
                  ACTION
                </div>
                <p
                  style={{
                    fontSize: 11,
                    color: "#aaa",
                    margin: "0 0 10px",
                    lineHeight: 1.4,
                  }}
                >
                  Site identification + feasibility study
                </p>
                <div style={{ ...labelStyle, fontSize: 9, marginBottom: 4 }}>
                  SCORE MILESTONE
                </div>
                <p
                  style={{
                    fontSize: 11,
                    color: tierColor,
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  {tier} tier maintained
                </p>
              </div>

              {/* Phase 2 */}
              <div
                className="phase-card"
                style={{
                  background: "rgba(124,58,237,0.04)",
                  border: "1px solid rgba(124,58,237,0.15)",
                  borderRadius: 8,
                  padding: "20px",
                }}
              >
                <div
                  style={{
                    ...labelStyle,
                    color: "#7c3aed",
                    marginBottom: 8,
                  }}
                >
                  PHASE 2
                </div>
                <h3
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#ffffff",
                    margin: "0 0 10px",
                  }}
                >
                  Medium-Term Development
                </h3>
                <p
                  style={{
                    fontSize: 11,
                    color: "#888",
                    lineHeight: 1.5,
                    margin: "0 0 10px",
                  }}
                >
                  Greenfield sites requiring permits and capital deployment.
                  Zoning advocacy and vertiport development drive score
                  progression.
                </p>
                <div style={{ ...labelStyle, fontSize: 9, marginBottom: 4 }}>
                  ACTION
                </div>
                <p
                  style={{
                    fontSize: 11,
                    color: "#aaa",
                    margin: "0 0 10px",
                    lineHeight: 1.4,
                  }}
                >
                  Zoning advocacy + vertiport development
                </p>
                <div style={{ ...labelStyle, fontSize: 9, marginBottom: 4 }}>
                  SCORE MILESTONE
                </div>
                <p
                  style={{
                    fontSize: 11,
                    color: nextTierName
                      ? getScoreColor(nextTierThreshold)
                      : "#00ff88",
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  {nextTierName
                    ? `${nextTierName} tier (${nextTierThreshold}+)`
                    : "ADVANCED tier maintained"}
                </p>
              </div>

              {/* Phase 3 */}
              <div
                className="phase-card"
                style={{
                  background: "rgba(0,255,136,0.04)",
                  border: "1px solid rgba(0,255,136,0.15)",
                  borderRadius: 8,
                  padding: "20px",
                }}
              >
                <div
                  style={{
                    ...labelStyle,
                    color: "#00ff88",
                    marginBottom: 8,
                  }}
                >
                  PHASE 3
                </div>
                <h3
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#ffffff",
                    margin: "0 0 10px",
                  }}
                >
                  Long-Term Conversion
                </h3>
                <p
                  style={{
                    fontSize: 11,
                    color: "#888",
                    lineHeight: 1.5,
                    margin: "0 0 10px",
                  }}
                >
                  Full-scale conversion contingent on regulatory change.
                  Legislative engagement and operator attraction unlock the
                  remaining score potential.
                </p>
                <div style={{ ...labelStyle, fontSize: 9, marginBottom: 4 }}>
                  ACTION
                </div>
                <p
                  style={{
                    fontSize: 11,
                    color: "#aaa",
                    margin: "0 0 10px",
                    lineHeight: 1.4,
                  }}
                >
                  Legislative engagement + operator attraction
                </p>
                <div style={{ ...labelStyle, fontSize: 9, marginBottom: 4 }}>
                  SCORE MILESTONE
                </div>
                <p
                  style={{
                    fontSize: 11,
                    color: "#00ff88",
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  ADVANCED tier (75+)
                </p>
              </div>
            </div>

            {/* Closing paragraph */}
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.7,
                color: "#aaa",
                margin: 0,
                padding: "16px 0 0",
                borderTop: "1px solid #1a1a2e",
              }}
            >
              Based on {city.city}&apos;s current readiness profile, the
              highest-leverage near-term action is{" "}
              {topGap
                ? topGap.recommendation.split(".")[0].toLowerCase() + "."
                : "maintaining current infrastructure investments."}
            </p>
          </div>

          {/* ================================================================
              FOOTER
              ================================================================ */}
          <div
            style={{
              textAlign: "center",
              padding: "24px 0 32px",
              color: "#555",
              fontSize: 10,
            }}
          >
            <p style={{ margin: 0 }}>
              {city.city}, {city.state} &middot; Market Intelligence Briefing
              &middot; {today}
            </p>
            <p style={{ margin: "4px 0 0" }}>
              <span
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                }}
              >
                AIR
              </span>
              <span
                className="neon-accent"
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontWeight: 400,
                  color: "#00d4ff",
                  letterSpacing: "0.1em",
                }}
              >
                INDEX
              </span>
              {" "}&middot; Vertical Data Group LLC &middot; airindex.io
            </p>
            <p
              className="screen-only"
              style={{ margin: "8px 0 0", color: "#777" }}
            >
              Use Ctrl/Cmd+P to save as PDF
            </p>
          </div>
        </div>
      </div>

      <div className="screen-only">
        <SiteFooter />
      </div>
    </>
  );
}
