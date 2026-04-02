import { City, ScoreBreakdown, SubIndicator } from "@/types";
import { SCORE_WEIGHTS, calculateReadinessScore, calculateReadinessScoreFromFkb, getScoreTier, getScoreColor, getWeightsFromFkb } from "@/lib/scoring";
import { SCORE_COMPONENT_LABELS } from "@/lib/dashboard-constants";
import { getSubIndicatorsWithPeers, getSubIndicatorSummary, getDefsForFactor, type SubIndicatorSummary } from "@/lib/sub-indicators";

// -------------------------------------------------------
// Types
// -------------------------------------------------------

export interface FactorAnalysis {
  key: keyof ScoreBreakdown;
  label: string;
  weight: number;
  earned: number;
  max: number;
  achieved: boolean;
  partial: boolean; // regulatoryPosture "neutral" = 5/10
  citation?: string;
  citationDate?: string;
  citationUrl?: string;
  recommendation: string;
  subIndicators: SubIndicator[];
}

export interface GapAnalysis {
  cityId: string;
  cityName: string;
  state: string;
  score: number;
  tier: string;
  tierColor: string;
  totalFactors: number;
  achievedCount: number;
  factors: FactorAnalysis[];
  gaps: FactorAnalysis[];
  quickWins: FactorAnalysis[];
  highImpact: FactorAnalysis[];
  topGapPointsAvailable: number;
  subIndicatorSummary: SubIndicatorSummary;
}

export interface EnhancedGapAnalysis extends GapAnalysis {
  peers: PeerContext;
}

export interface PeerContext {
  sameTier: { id: string; city: string; state: string; score: number }[];
  nextTier: string | null;
  nextTierCities: { id: string; city: string; state: string; score: number }[];
  pointsToNextTier: number | null;
}

// -------------------------------------------------------
// Static recommendation templates per factor
// -------------------------------------------------------

const RECOMMENDATIONS: Record<keyof ScoreBreakdown, string> = {
  activePilotProgram:
    "Launch a UAM pilot program in partnership with an eVTOL operator. Dallas launched a pilot with Wisk Aero for autonomous flight testing near DFW — a time-limited demonstration partnership that immediately qualified the market. Orlando took a similar approach with the Lake Nona smart city pilot. A city-sponsored demo program, even small-scale, signals operator readiness and earns this factor.",
  approvedVertiport:
    "Commission a vertiport feasibility study and identify at least one site for permitting. Dallas permitted the DFW Vertiport Texas as an airport-adjacent facility — a site type that faces fewer zoning hurdles and accelerates timelines. Airport authorities are natural partners: they control land, have FAA relationships, and benefit from last-mile connectivity. State DOTs increasingly offer AAM infrastructure grants to fund these studies.",
  activeOperatorPresence:
    "Engage eVTOL operators (Joby, Archer, Wisk) through an RFI or memorandum of understanding. Dallas secured Wisk Aero by creating a regulatory environment that made the city an obvious choice for autonomous testing — the operator came to them. Cities that pass UAM-friendly legislation, designate test corridors, and publicly signal readiness attract operator commitments. Issue a formal RFI to all three major operators and publicize it.",
  vertiportZoning:
    "Adopt a vertiport zoning overlay or amend the zoning code to accommodate vertical takeoff and landing facilities. Dallas adopted a vertiport zoning code amendment in 2024 that created a clear permitting pathway — before that, operators had no legal framework to site infrastructure. Clark County (Las Vegas) took a similar approach with an overlay zone. The amendment itself is straightforward municipal code — the key is doing it before operators arrive, not after.",
  regulatoryPosture:
    "Signal regulatory openness by issuing an executive order, forming a UAM task force, or publishing a supportive policy statement. Moving from neutral to friendly posture adds 5 points. Texas and Arizona set the standard — their governors publicly endorsed AAM as economic development priority, which gave operators confidence to invest. A mayor's executive order or city council resolution costs nothing and immediately changes the market signal.",
  stateLegislation:
    "Advocate for state-level UAM legislation. Texas HB 1735 is the gold standard — it created a statewide legal framework that gave Dallas, Houston, Austin, and San Antonio all immediate credibility with operators. California followed with SB 944, Florida with the Advanced Air Mobility Act. State legislation provides the legal certainty operators need before committing capital to a market.",
  weatherInfrastructure:
    "Deploy dedicated low-altitude weather sensing infrastructure for AAM operations. Airport weather stations provide regional coverage but don't measure conditions at the altitudes eVTOLs operate (200-2,000 ft AGL). Performance-based weather standards are being developed — cities that invest in dedicated sensing infrastructure now will be better positioned when operators require real-time weather data for vertiport operations.",
};

// -------------------------------------------------------
// Core analysis functions
// -------------------------------------------------------

function buildGapAnalysis(
  city: City,
  score: number,
  breakdown: ScoreBreakdown,
  weights: Record<string, number>,
): GapAnalysis {
  const tier = getScoreTier(score);
  const tierColor = getScoreColor(score);
  const factorKeys = Object.keys(SCORE_WEIGHTS) as (keyof ScoreBreakdown)[];

  const factors: FactorAnalysis[] = factorKeys.map((key) => {
    const max = (weights[key] ?? SCORE_WEIGHTS[key]) as number;
    const earned = breakdown[key];
    const isPartial = key === "regulatoryPosture" && city.regulatoryPosture === "neutral";
    const achieved = earned === max;

    const source = city.scoreSources?.[key];

    // Merge sub-indicator data (from seed) with defs (from registry)
    const citySubIndicators = city.subIndicators?.[key] ?? [];
    const defs = getDefsForFactor(key);
    const subInds: SubIndicator[] = defs.map((def) => {
      const existing = citySubIndicators.find((si) => si.id === def.id);
      return existing ?? { id: def.id, label: def.label, status: "unknown" as const };
    });

    return {
      key,
      label: SCORE_COMPONENT_LABELS[key] || key,
      weight: max,
      earned,
      max,
      achieved,
      partial: isPartial,
      citation: source?.citation,
      citationDate: source?.date,
      citationUrl: source?.url,
      recommendation: RECOMMENDATIONS[key],
      subIndicators: subInds,
    };
  });

  // Sort by weight descending for gap prioritization
  const gaps = factors
    .filter((f) => !f.achieved)
    .sort((a, b) => b.weight - a.weight);

  const quickWins = gaps.filter((f) => f.max <= 10);
  const highImpact = gaps.filter((f) => f.max >= 15);

  const achievedCount = factors.filter((f) => f.achieved).length;
  const topGapPointsAvailable = gaps.length > 0 ? gaps[0].max - gaps[0].earned : 0;

  return {
    cityId: city.id,
    cityName: city.city,
    state: city.state,
    score,
    tier,
    tierColor,
    totalFactors: factors.length,
    achievedCount,
    factors: factors.sort((a, b) => b.weight - a.weight),
    gaps,
    quickWins,
    highImpact,
    topGapPointsAvailable,
    subIndicatorSummary: getSubIndicatorSummary(city),
  };
}

/**
 * Async gap analysis — reads weights from FKB database.
 * Use in server components, API routes, and report pages.
 */
export async function analyzeGaps(city: City): Promise<GapAnalysis> {
  const { score, breakdown } = await calculateReadinessScoreFromFkb(city);
  const weights = await getWeightsFromFkb();
  return buildGapAnalysis(city, score, breakdown, weights);
}

/**
 * Sync gap analysis — uses static weights.
 * Use in client components where the City already has FKB-computed scores.
 */
export function analyzeGapsSync(city: City): GapAnalysis {
  const { score, breakdown } = calculateReadinessScore(city);
  return buildGapAnalysis(city, score, breakdown, { ...SCORE_WEIGHTS });
}

export function getPeerContext(city: City, allCities: City[]): PeerContext {
  const cityScore = city.score ?? 0;
  const cityTier = getScoreTier(cityScore);

  const sameTier = allCities
    .filter((c) => c.id !== city.id && getScoreTier(c.score ?? 0) === cityTier)
    .map((c) => ({ id: c.id, city: c.city, state: c.state, score: c.score ?? 0 }))
    .sort((a, b) => b.score - a.score);

  // Determine next tier threshold
  let nextTier: string | null = null;
  let nextTierThreshold = 0;
  if (cityScore < 30) {
    nextTier = "EARLY";
    nextTierThreshold = 30;
  } else if (cityScore < 50) {
    nextTier = "MODERATE";
    nextTierThreshold = 50;
  } else if (cityScore < 75) {
    nextTier = "ADVANCED";
    nextTierThreshold = 75;
  }

  const nextTierCities = nextTier
    ? allCities
        .filter((c) => getScoreTier(c.score ?? 0) === nextTier)
        .map((c) => ({ id: c.id, city: c.city, state: c.state, score: c.score ?? 0 }))
        .sort((a, b) => b.score - a.score)
    : [];

  const pointsToNextTier = nextTier ? nextTierThreshold - cityScore : null;

  return { sameTier, nextTier, nextTierCities, pointsToNextTier };
}

/**
 * Combined entry point: gap analysis + peer context + sub-indicator peer notes.
 * Used by the API and enhanced gap report page.
 */
export async function getEnhancedGapAnalysis(city: City, allCities: City[]): Promise<EnhancedGapAnalysis> {
  const gap = await analyzeGaps(city);
  const peers = getPeerContext(city, allCities);

  // Enrich sub-indicators with peer notes
  const enrichedSubIndicators = getSubIndicatorsWithPeers(city, allCities);

  // Merge peer-enriched sub-indicators into factor analyses
  const factors = gap.factors.map((f) => {
    const enriched = enrichedSubIndicators[f.key];
    return enriched ? { ...f, subIndicators: enriched } : f;
  });

  return {
    ...gap,
    factors,
    gaps: factors.filter((f) => !f.achieved).sort((a, b) => b.weight - a.weight),
    quickWins: factors.filter((f) => !f.achieved && f.max <= 10),
    highImpact: factors.filter((f) => !f.achieved && f.max >= 15),
    peers,
  };
}
