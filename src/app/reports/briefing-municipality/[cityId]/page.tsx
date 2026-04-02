import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getCitiesWithOverrides, CITIES, MARKET_COUNT } from "@/data/seed";
import {
  calculateReadinessScoreFromFkb,
  getScoreTier,
  getScoreColor,
  SCORE_WEIGHTS,
} from "@/lib/scoring";
import { analyzeGaps } from "@/lib/gap-analysis";
import type { FactorAnalysis } from "@/lib/gap-analysis";
import type { ScoreBreakdown } from "@/types";
import { prisma } from "@/lib/prisma";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import PrintButton from "../../gap/[cityId]/PrintButton";

// Factor key -> FKB short code
const KEY_TO_CODE: Record<keyof ScoreBreakdown, string> = {
  approvedVertiport: "VRT",
  vertiportZoning: "ZON",
  stateLegislation: "LEG",
  regulatoryPosture: "REG",
  activePilotProgram: "PLT",
  activeOperatorPresence: "OPR",
  weatherInfrastructure: "WTH",
};

// Municipality-focused display order: LEG, ZON, REG, PLT, VRT, OPR, WTH
const DISPLAY_ORDER: (keyof ScoreBreakdown)[] = [
  "stateLegislation",
  "vertiportZoning",
  "regulatoryPosture",
  "activePilotProgram",
  "approvedVertiport",
  "activeOperatorPresence",
  "weatherInfrastructure",
];

// Controllability tags for municipality audience
function getControllabilityTag(code: string): {
  label: string;
  color: string;
} {
  switch (code) {
    case "ZON":
    case "REG":
      return { label: "City controls directly", color: "#00ff88" };
    case "LEG":
      return { label: "Requires state action", color: "#f59e0b" };
    case "VRT":
    case "OPR":
      return { label: "Requires private capital", color: "#ff4444" };
    case "PLT":
      return { label: "Requires state action", color: "#f59e0b" };
    case "WTH":
      return { label: "Requires private capital", color: "#ff4444" };
    default:
      return { label: "Varies", color: "#888" };
  }
}

// Ordinance audit question definitions
const ORDINANCE_QUESTIONS = [
  {
    field: "faaTerminology" as const,
    question:
      "Does the city code use correct FAA terminology (heliport, helistop, vertiport per 14 CFR Part 157)?",
    fix: "Replace 'helipad' with 'heliport' and add 'vertiport' as defined in FAA AC 150/5390-2D.",
  },
  {
    field: "zoningOrdinance" as const,
    question:
      "Is heliport/vertiport addressed in zoning as permitted or conditional use?",
    fix: "Add vertiport as a conditional use in commercial and mixed-use zoning districts.",
  },
  {
    field: "airspaceDetermination" as const,
    question:
      "Is FAA airspace determination requirement written into the permit process?",
    fix: "Require a favorable FAA airspace determination letter as a condition of heliport/vertiport permit approval.",
  },
  {
    field: "nfpa418Referenced" as const,
    question:
      "Is NFPA 418 referenced in the fire code or building code?",
    fix: "Adopt NFPA 418 by reference in the municipal fire code for all vertical flight facilities.",
  },
  {
    field: "stateAdoptedAC" as const,
    question:
      "Has the state adopted FAA AC 150/5390-2D as enforceable?",
    fix: "Engage state DOT to adopt FAA advisory circular as state-level standard.",
  },
];

// Status indicator rendering
function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "yes":
      return (
        <span style={{ color: "#00ff88", fontSize: 16, fontWeight: 700 }}>
          &#10003;
        </span>
      );
    case "partial":
      return (
        <span style={{ color: "#f59e0b", fontSize: 16, fontWeight: 700 }}>
          &#9679;
        </span>
      );
    case "no":
      return (
        <span style={{ color: "#ff4444", fontSize: 16, fontWeight: 700 }}>
          &#10005;
        </span>
      );
    default:
      return (
        <span style={{ color: "#666", fontSize: 16, fontWeight: 700 }}>
          ?
        </span>
      );
  }
}

// Gap Roadmap items
const TIER1_ITEMS = [
  {
    action: "Correct FAA terminology in city code",
    who: "City Attorney / Planning Dept",
    timeline: "30 days",
    factor: "ZON",
  },
  {
    action: "Add FAA airspace determination requirement to permit process",
    who: "Planning Director",
    timeline: "30-60 days",
    factor: "REG",
  },
  {
    action: "Publish clear vertiport/heliport permit process",
    who: "Planning Dept",
    timeline: "30-60 days",
    factor: "ZON",
  },
  {
    action: "Designate AAM point-of-contact within city government",
    who: "City Manager / Mayor's Office",
    timeline: "Immediate",
    factor: "REG",
  },
];

const TIER2_ITEMS = [
  {
    action: "Amend zoning code for vertiport as conditional use",
    who: "City Council / Planning Commission",
    timeline: "3-6 months",
    factor: "ZON",
  },
  {
    action: "Adopt NFPA 418 by reference in municipal fire code",
    who: "Fire Marshal / City Council",
    timeline: "3-6 months",
    factor: "REG",
  },
  {
    action: "Update ordinance language before June 2026 FAA AC publication",
    who: "City Attorney / Planning Dept",
    timeline: "Before June 2026",
    factor: "ZON",
  },
];

const TIER3_ITEMS = [
  {
    action: "Identify greenfield vertiport-ready sites",
    who: "Economic Development / Planning",
    timeline: "6-12 months",
    factor: "VRT",
  },
  {
    action: "Engage state legislature on AAM-enabling legislation",
    who: "Government Affairs / Mayor's Office",
    timeline: "Next legislative session",
    factor: "LEG",
  },
  {
    action: "Develop infrastructure capital plan for vertical flight facilities",
    who: "City Manager / Budget Office",
    timeline: "12-18 months",
    factor: "VRT",
  },
];

// Operator requirements mapping
const OPERATOR_REQUIREMENTS: {
  requirement: string;
  factorKey: keyof ScoreBreakdown;
  fix: string;
}[] = [
  {
    requirement: "Enacted state-level AAM legislation",
    factorKey: "stateLegislation",
    fix: "Engage state delegation to sponsor AAM-enabling legislation. Texas HB 1735 is the model bill.",
  },
  {
    requirement: "At least one vertiport-ready site identified",
    factorKey: "approvedVertiport",
    fix: "Commission a vertiport site feasibility study. Airport-adjacent and hospital heliport sites are fastest to permit.",
  },
  {
    requirement: "Friendly regulatory posture",
    factorKey: "regulatoryPosture",
    fix: "Issue a mayoral executive order or city council resolution supporting AAM development.",
  },
  {
    requirement: "Designated AAM coordinator within city government",
    factorKey: "regulatoryPosture",
    fix: "Assign a single point-of-contact for all AAM/vertiport inquiries within the planning or economic development department.",
  },
  {
    requirement: "Clear permitting pathway for vertiport/heliport facilities",
    factorKey: "vertiportZoning",
    fix: "Adopt a vertiport zoning overlay or amend code to include vertiport as a permitted or conditional use.",
  },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cityId: string }>;
}): Promise<Metadata> {
  const { cityId } = await params;
  const allCities = await getCitiesWithOverrides();
  const city = allCities.find((c) => c.id === cityId);
  if (!city) return { title: "Municipality Briefing" };

  const { score } = await calculateReadinessScoreFromFkb(city);
  const tier = getScoreTier(score);

  return {
    title: `${city.city}, ${city.state} — Municipality Briefing | AirIndex`,
    description: `Municipality briefing for ${city.city}. Score: ${score}/100 (${tier}). Ordinance audit, gap roadmap, and operator attraction assessment.`,
    robots: "noindex, nofollow",
  };
}

export default async function MunicipalityBriefingPage({
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

  // Compute national rank
  const sortedCities = [...allCities].sort(
    (a, b) => (b.score ?? 0) - (a.score ?? 0)
  );
  const rank = sortedCities.findIndex((c) => c.id === cityId) + 1;

  // National average
  const nationalAvg = Math.round(
    allCities.reduce((sum, c) => sum + (c.score ?? 0), 0) / allCities.length
  );

  // Top 5 markets for peer comparison
  const top5 = sortedCities.slice(0, 5).map((c) => {
    const s = c.score ?? 0;
    return { city: c.city, state: c.state, score: s, tier: getScoreTier(s), id: c.id };
  });

  // Ordered factors for municipality display
  const factorMap = new Map(gap.factors.map((f) => [f.key, f]));
  const orderedFactors = DISPLAY_ORDER.map(
    (key) => factorMap.get(key)!
  ).filter(Boolean);

  // Ordinance audit lookup
  let ordinanceAudit: {
    faaTerminology: string;
    zoningOrdinance: string;
    airspaceDetermination: string;
    nfpa418Referenced: string;
    stateAdoptedAC: string;
    faaTerminologyNote: string | null;
    zoningOrdinanceNote: string | null;
    airspaceDeterminationNote: string | null;
    nfpa418ReferencedNote: string | null;
    stateAdoptedACNote: string | null;
  } | null = null;
  try {
    ordinanceAudit = await prisma.ordinanceAudit.findUnique({
      where: { marketId: cityId },
    });
  } catch {
    // DB unavailable — treat as no data
  }

  // Score trajectory calculations
  const trajectoryRows = orderedFactors
    .filter((f) => !f.achieved)
    .map((f) => {
      const code = KEY_TO_CODE[f.key];
      const pointsGained = f.max - f.earned;
      const projectedScore = score + pointsGained;
      const projectedTier = getScoreTier(projectedScore);
      return {
        code,
        label: f.label,
        factorKey: f.key,
        currentEarned: f.earned,
        maxPoints: f.max,
        projectedScore,
        projectedTier,
        pointsGained,
      };
    });

  // Cumulative: all Tier 1 + Tier 2 actions
  const allGapPoints = gap.gaps.reduce((sum, g) => sum + (g.max - g.earned), 0);
  const cumulativeScore = Math.min(score + allGapPoints, 100);
  const cumulativeTier = getScoreTier(cumulativeScore);

  // Operator attraction status
  const operatorStatus = OPERATOR_REQUIREMENTS.map((req) => {
    const factor = factorMap.get(req.factorKey);
    const met = factor ? factor.achieved : false;
    return { ...req, met };
  });

  // Count how many peer cities in top 5 meet each operator requirement
  const peerGaps = await Promise.all(
    top5.map(async (p) => {
      const pCity = allCities.find((c) => c.id === p.id);
      if (!pCity) return false;
      const pGap = await analyzeGaps(pCity);
      const pMap = new Map(pGap.factors.map((f) => [f.key, f]));
      return (
        (pMap.get("stateLegislation")?.achieved ?? false) &&
        (pMap.get("approvedVertiport")?.achieved ?? false) &&
        (pMap.get("regulatoryPosture")?.achieved ?? false)
      );
    })
  );
  const peerOperatorCount = peerGaps.filter(Boolean).length;

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
          .roadmap-card { border-width: 2px !important; }
          table { border-collapse: collapse; }
          table th, table td { border: 1px solid #d1d5db !important; }
          .callout-box { background: #f9fafb !important; border: 1px solid #e5e7eb !important; }
          .callout-box * { color: #374151 !important; }
          .ordinance-row { border-color: #e5e7eb !important; }
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
              SECTION 1: Where Your City Stands
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
                  color: "#5B8DB8",
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
                MUNICIPALITY BRIEFING
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

            {/* Opening statement */}
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
              Here is how {city.city} compares to the {MARKET_COUNT} markets
              competing for the same operators.
            </p>

            {/* Peer comparison table */}
            <div style={{ marginTop: 24, overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12,
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr>
                    {["Market", "Score", "Tier"].map((h) => (
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
                  {/* Top 5 markets */}
                  {top5.map((p) => {
                    const isTarget = p.id === cityId;
                    const rowBg = isTarget
                      ? "rgba(91,141,184,0.08)"
                      : "transparent";
                    const pTierColor = getScoreColor(p.score);
                    return (
                      <tr key={p.id} style={{ background: rowBg }}>
                        <td
                          style={{
                            padding: "10px",
                            borderBottom: "1px solid #0f0f1a",
                            fontWeight: isTarget ? 700 : 400,
                            color: isTarget ? "#5B8DB8" : "#e0e0e0",
                          }}
                        >
                          {p.city}, {p.state}
                          {isTarget && (
                            <span
                              style={{
                                fontSize: 9,
                                color: "#5B8DB8",
                                marginLeft: 8,
                                fontFamily: "'Space Mono', monospace",
                              }}
                            >
                              YOUR CITY
                            </span>
                          )}
                        </td>
                        <td
                          style={{
                            padding: "10px",
                            borderBottom: "1px solid #0f0f1a",
                            fontFamily: "'Space Mono', monospace",
                            fontWeight: 600,
                            color: pTierColor,
                          }}
                        >
                          {p.score}
                        </td>
                        <td
                          style={{
                            padding: "10px",
                            borderBottom: "1px solid #0f0f1a",
                            fontSize: 10,
                            fontWeight: 600,
                            fontFamily: "'Space Mono', monospace",
                            color: pTierColor,
                          }}
                        >
                          {p.tier}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Target city row if not in top 5 */}
                  {!top5.some((p) => p.id === cityId) && (
                    <tr style={{ background: "rgba(91,141,184,0.08)" }}>
                      <td
                        style={{
                          padding: "10px",
                          borderBottom: "1px solid #0f0f1a",
                          fontWeight: 700,
                          color: "#5B8DB8",
                        }}
                      >
                        {city.city}, {city.state}
                        <span
                          style={{
                            fontSize: 9,
                            color: "#5B8DB8",
                            marginLeft: 8,
                            fontFamily: "'Space Mono', monospace",
                          }}
                        >
                          YOUR CITY
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "10px",
                          borderBottom: "1px solid #0f0f1a",
                          fontFamily: "'Space Mono', monospace",
                          fontWeight: 600,
                          color: tierColor,
                        }}
                      >
                        {score}
                      </td>
                      <td
                        style={{
                          padding: "10px",
                          borderBottom: "1px solid #0f0f1a",
                          fontSize: 10,
                          fontWeight: 600,
                          fontFamily: "'Space Mono', monospace",
                          color: tierColor,
                        }}
                      >
                        {tier}
                      </td>
                    </tr>
                  )}
                  {/* National average */}
                  <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                    <td
                      style={{
                        padding: "10px",
                        borderBottom: "1px solid #0f0f1a",
                        fontStyle: "italic",
                        color: "#888",
                      }}
                    >
                      National Average
                    </td>
                    <td
                      style={{
                        padding: "10px",
                        borderBottom: "1px solid #0f0f1a",
                        fontFamily: "'Space Mono', monospace",
                        color: "#888",
                      }}
                    >
                      {nationalAvg}
                    </td>
                    <td
                      style={{
                        padding: "10px",
                        borderBottom: "1px solid #0f0f1a",
                        fontSize: 10,
                        fontFamily: "'Space Mono', monospace",
                        color: "#888",
                      }}
                    >
                      {getScoreTier(nationalAvg)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ================================================================
              SECTION 2: Ordinance & Terminology Audit
              ================================================================ */}
          <div className="section-card" style={cardStyle}>
            <h2 style={sectionHeading}>
              Ordinance &amp; Terminology Audit
            </h2>

            {!ordinanceAudit ? (
              <div
                className="callout-box"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid #1a1a2e",
                  borderRadius: 8,
                  padding: "24px",
                }}
              >
                <p
                  style={{
                    fontSize: 13,
                    lineHeight: 1.7,
                    color: "#888",
                    margin: "0 0 12px",
                  }}
                >
                  Ordinance audit data for {city.city} is being compiled.
                  Contact us for priority assessment.
                </p>
                <a
                  href="/contact?tier=briefing&ref=ordinance-audit"
                  style={{
                    color: "#5B8DB8",
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Request priority assessment &rarr;
                </a>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {ORDINANCE_QUESTIONS.map((q) => {
                  const status = (ordinanceAudit as Record<string, unknown>)[q.field] as string;
                  const note = (ordinanceAudit as Record<string, unknown>)[q.field + "Note"] as string | null;
                  const showFix = status === "no" || status === "partial";
                  return (
                    <div
                      key={q.field}
                      className="ordinance-row"
                      style={{
                        borderBottom: "1px solid #1a1a2e",
                        paddingBottom: 14,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 12,
                        }}
                      >
                        <div style={{ marginTop: 2, flexShrink: 0 }}>
                          <StatusIcon status={status} />
                        </div>
                        <div>
                          <p
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "#e0e0e0",
                              margin: "0 0 4px",
                              lineHeight: 1.5,
                            }}
                          >
                            {q.question}
                          </p>
                          {note && (
                            <p
                              style={{
                                fontSize: 11,
                                color: "#888",
                                margin: "0 0 6px",
                                lineHeight: 1.5,
                              }}
                            >
                              {note}
                            </p>
                          )}
                          {showFix && (
                            <p
                              style={{
                                fontSize: 11,
                                color: "#f59e0b",
                                margin: 0,
                                lineHeight: 1.5,
                                fontWeight: 500,
                              }}
                            >
                              Recommended fix: {q.fix}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Static callout box */}
            <div
              className="callout-box"
              style={{
                background: "rgba(245,158,11,0.06)",
                border: "1px solid rgba(245,158,11,0.2)",
                borderRadius: 8,
                padding: "20px",
                marginTop: 20,
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  lineHeight: 1.7,
                  color: "#ccc",
                  margin: 0,
                }}
              >
                <strong style={{ color: "#f59e0b" }}>
                  Advisory Circular Timeline:
                </strong>{" "}
                The FAA is expected to publish a unified vertical flight
                infrastructure Advisory Circular for public comment in June
                2026. Cities that have not updated their ordinance language
                before this publication will face a more complex update
                process. This is the highest-leverage action a municipality
                can take in the next 90 days.
              </p>
            </div>
          </div>

          {/* ================================================================
              SECTION 3: Factor Breakdown with Municipal Emphasis
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
                Municipal emphasis
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
                const isGap = !f.achieved;
                const controllability = getControllabilityTag(code);
                const isExpandedFactor =
                  code === "LEG" || code === "ZON";

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

                    {/* Gap narrative */}
                    {isGap && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#777",
                          lineHeight: 1.6,
                          paddingLeft: 12,
                          borderLeft: `2px solid ${barColor}33`,
                        }}
                      >
                        {/* Controllability tag */}
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: 9,
                            fontWeight: 700,
                            color: controllability.color,
                            border: `1px solid ${controllability.color}44`,
                            borderRadius: 3,
                            padding: "2px 8px",
                            marginBottom: 6,
                            fontFamily: "'Space Mono', monospace",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {controllability.label}
                        </span>
                        <br />
                        {isExpandedFactor
                          ? f.recommendation
                          : f.recommendation
                              .split(".")
                              .slice(0, 2)
                              .join(".") + "."}
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
              SECTION 4: Gap Roadmap Prioritized by Ease and Impact
              ================================================================ */}
          <div className="section-card" style={cardStyle}>
            <h2 style={sectionHeading}>Gap Roadmap</h2>
            <p
              style={{
                fontSize: 12,
                color: "#888",
                margin: "0 0 20px",
                lineHeight: 1.6,
              }}
            >
              Prioritized by ease of implementation and impact on AirIndex
              score. These are not phases on a timeline — they are a stack
              ranked by leverage.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Tier 1: Fix Now */}
              <div
                className="roadmap-card"
                style={{
                  border: "1px solid rgba(0,255,136,0.3)",
                  borderRadius: 8,
                  padding: "20px",
                  background: "rgba(0,255,136,0.03)",
                }}
              >
                <div
                  style={{
                    ...labelStyle,
                    color: "#00ff88",
                    marginBottom: 14,
                    fontSize: 11,
                  }}
                >
                  TIER 1 &mdash; FIX NOW
                </div>
                {TIER1_ITEMS.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      marginBottom: i < TIER1_ITEMS.length - 1 ? 14 : 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: "#050508",
                        background: "#00ff88",
                        borderRadius: 3,
                        padding: "2px 6px",
                        fontFamily: "'Space Mono', monospace",
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      {item.factor}
                    </span>
                    <div>
                      <p
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#e0e0e0",
                          margin: "0 0 3px",
                        }}
                      >
                        {item.action}
                      </p>
                      <p
                        style={{
                          fontSize: 10,
                          color: "#777",
                          margin: 0,
                          fontFamily: "'Space Mono', monospace",
                        }}
                      >
                        {item.who} &middot; {item.timeline}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tier 2: Fix in 3-6 Months */}
              <div
                className="roadmap-card"
                style={{
                  border: "1px solid rgba(245,158,11,0.3)",
                  borderRadius: 8,
                  padding: "20px",
                  background: "rgba(245,158,11,0.03)",
                }}
              >
                <div
                  style={{
                    ...labelStyle,
                    color: "#f59e0b",
                    marginBottom: 14,
                    fontSize: 11,
                  }}
                >
                  TIER 2 &mdash; FIX IN 3-6 MONTHS
                </div>
                {TIER2_ITEMS.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      marginBottom: i < TIER2_ITEMS.length - 1 ? 14 : 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: "#050508",
                        background: "#f59e0b",
                        borderRadius: 3,
                        padding: "2px 6px",
                        fontFamily: "'Space Mono', monospace",
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      {item.factor}
                    </span>
                    <div>
                      <p
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#e0e0e0",
                          margin: "0 0 3px",
                        }}
                      >
                        {item.action}
                      </p>
                      <p
                        style={{
                          fontSize: 10,
                          color: "#777",
                          margin: 0,
                          fontFamily: "'Space Mono', monospace",
                        }}
                      >
                        {item.who} &middot; {item.timeline}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tier 3: Longer Horizon */}
              <div
                className="roadmap-card"
                style={{
                  border: "1px solid rgba(255,68,68,0.3)",
                  borderRadius: 8,
                  padding: "20px",
                  background: "rgba(255,68,68,0.03)",
                }}
              >
                <div
                  style={{
                    ...labelStyle,
                    color: "#ff4444",
                    marginBottom: 14,
                    fontSize: 11,
                  }}
                >
                  TIER 3 &mdash; LONGER HORIZON
                </div>
                {TIER3_ITEMS.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      marginBottom: i < TIER3_ITEMS.length - 1 ? 14 : 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: "#050508",
                        background: "#ff4444",
                        borderRadius: 3,
                        padding: "2px 6px",
                        fontFamily: "'Space Mono', monospace",
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      {item.factor}
                    </span>
                    <div>
                      <p
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#e0e0e0",
                          margin: "0 0 3px",
                        }}
                      >
                        {item.action}
                      </p>
                      <p
                        style={{
                          fontSize: 10,
                          color: "#777",
                          margin: 0,
                          fontFamily: "'Space Mono', monospace",
                        }}
                      >
                        {item.who} &middot; {item.timeline}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ================================================================
              SECTION 5: Operator Attraction Assessment
              ================================================================ */}
          <div className="section-card" style={cardStyle}>
            <h2 style={sectionHeading}>Operator Attraction Assessment</h2>
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
                      "What Operators Require",
                      `What ${city.city} Currently Offers`,
                      "Recommended Action",
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
                  {operatorStatus.map((req, i) => (
                    <tr key={i}>
                      <td
                        style={{
                          padding: "10px",
                          borderBottom: "1px solid #0f0f1a",
                          color: "#e0e0e0",
                          fontWeight: 500,
                          verticalAlign: "top",
                        }}
                      >
                        {req.requirement}
                      </td>
                      <td
                        style={{
                          padding: "10px",
                          borderBottom: "1px solid #0f0f1a",
                          verticalAlign: "top",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: req.met ? "#00ff88" : "#ff4444",
                            fontFamily: "'Space Mono', monospace",
                          }}
                        >
                          {req.met ? "YES" : "NO"}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "10px",
                          borderBottom: "1px solid #0f0f1a",
                          fontSize: 11,
                          color: req.met ? "#555" : "#ccc",
                          lineHeight: 1.5,
                          verticalAlign: "top",
                        }}
                      >
                        {req.met ? "No action needed" : req.fix}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Peer comparison closing */}
            <p
              style={{
                fontSize: 12,
                lineHeight: 1.7,
                color: "#aaa",
                margin: "20px 0 0",
                padding: "16px 0 0",
                borderTop: "1px solid #1a1a2e",
              }}
            >
              Of the top 5 markets nationally, {peerOperatorCount} currently
              meet the three core operator requirements (enacted legislation,
              vertiport-ready site, and friendly regulatory posture).{" "}
              {city.city} meets {operatorStatus.filter((r) => r.met).length} of{" "}
              {operatorStatus.length} operator requirements.{" "}
              {operatorStatus.filter((r) => r.met).length <
              operatorStatus.length
                ? `Closing the remaining gaps would position ${city.city} to compete directly for operator commitments alongside leading markets like ${top5[0]?.city ?? "Dallas"} and ${top5[1]?.city ?? "Los Angeles"}.`
                : `${city.city} is well-positioned to attract operator commitments. Maintaining this profile and actively engaging operators through RFIs will be the differentiator.`}
            </p>
          </div>

          {/* ================================================================
              SECTION 6: Score Trajectory and What Moves the Needle
              ================================================================ */}
          <div className="section-card" style={cardStyle}>
            <h2 style={sectionHeading}>
              Score Trajectory
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 400,
                  color: "#666",
                  marginLeft: 8,
                }}
              >
                What moves the needle
              </span>
            </h2>

            {trajectoryRows.length > 0 ? (
              <div style={{ overflowX: "auto", marginBottom: 20 }}>
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
                        "Action",
                        "Factor",
                        "Current",
                        "Projected",
                        "Points Gained",
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
                    {trajectoryRows.map((row) => (
                      <tr key={row.code}>
                        <td
                          style={{
                            padding: "10px",
                            borderBottom: "1px solid #0f0f1a",
                            color: "#e0e0e0",
                            fontWeight: 500,
                          }}
                        >
                          Close {row.label} gap
                        </td>
                        <td
                          style={{
                            padding: "10px",
                            borderBottom: "1px solid #0f0f1a",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              color: "#050508",
                              background: getScoreColor(row.projectedScore),
                              borderRadius: 3,
                              padding: "2px 6px",
                              fontFamily: "'Space Mono', monospace",
                            }}
                          >
                            {row.code}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "10px",
                            borderBottom: "1px solid #0f0f1a",
                            fontFamily: "'Space Mono', monospace",
                            color: "#888",
                          }}
                        >
                          {score}
                        </td>
                        <td
                          style={{
                            padding: "10px",
                            borderBottom: "1px solid #0f0f1a",
                            fontFamily: "'Space Mono', monospace",
                            fontWeight: 600,
                            color: getScoreColor(row.projectedScore),
                          }}
                        >
                          {row.projectedScore}{" "}
                          <span
                            style={{
                              fontSize: 9,
                              color: "#888",
                              fontWeight: 400,
                            }}
                          >
                            ({row.projectedTier})
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "10px",
                            borderBottom: "1px solid #0f0f1a",
                            fontFamily: "'Space Mono', monospace",
                            color: "#00ff88",
                            fontWeight: 600,
                          }}
                        >
                          +{row.pointsGained}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: "#00ff88", margin: "0 0 20px" }}>
                All factors at maximum score. No further gap closure available
                under current methodology.
              </p>
            )}

            {/* Cumulative projection */}
            <div
              className="callout-box"
              style={{
                background: "rgba(0,255,136,0.04)",
                border: "1px solid rgba(0,255,136,0.2)",
                borderRadius: 8,
                padding: "20px",
                marginBottom: 20,
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: "#e0e0e0",
                  margin: 0,
                }}
              >
                If {city.city} implements all Tier 1 and Tier 2 actions,
                projected score:{" "}
                <strong style={{ color: getScoreColor(cumulativeScore) }}>
                  {cumulativeScore} ({cumulativeTier})
                </strong>{" "}
                — up from{" "}
                <strong style={{ color: tierColor }}>
                  {score} ({tier})
                </strong>
                .
              </p>
            </div>

            {/* Closing paragraph for a city official */}
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.8,
                color: "#aaa",
                margin: 0,
                padding: "16px 0 0",
                borderTop: "1px solid #1a1a2e",
              }}
            >
              {city.city} has a clear path from {tier} to{" "}
              {cumulativeTier !== tier ? cumulativeTier : "a stronger position"}.
              The actions outlined in this briefing are sequenced by what your
              office controls directly — starting with ordinance language and
              permitting processes that require no state action or private
              capital. Every point gained moves {city.city} up the national
              ranking and sends a signal to operators that this market is ready
              for investment. The question facing council is not whether
              advanced air mobility is coming to your region, but whether{" "}
              {city.city} will be positioned to capture it — or watch competing
              cities attract the operators, jobs, and infrastructure investment
              first.
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
              {city.city}, {city.state} &middot; Municipality Briefing
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
                  color: "#5B8DB8",
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
