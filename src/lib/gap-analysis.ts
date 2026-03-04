import { City, ScoreBreakdown } from "@/types";
import { SCORE_WEIGHTS, calculateReadinessScore, getScoreTier, getScoreColor } from "@/lib/scoring";
import { SCORE_COMPONENT_LABELS } from "@/lib/dashboard-constants";

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
    "Launch a UAM pilot program in partnership with an eVTOL operator. Reference the Lake Nona (Orlando) smart city pilot or the Wisk Aero autonomous testing program in Dallas as models. Even a time-limited demonstration program qualifies.",
  approvedVertiport:
    "Commission a vertiport feasibility study and identify at least one site for permitting. Airport-adjacent locations (like LAX Adjacent or DFW Vertiport Texas) face fewer zoning hurdles. FDOT and state DOTs increasingly offer AAM infrastructure grants.",
  activeOperatorPresence:
    "Engage eVTOL operators (Joby, Archer, Wisk) through an RFI or memorandum of understanding. Operators are actively seeking launch markets — cities that signal readiness attract operator investment. Dallas secured Wisk through proactive engagement.",
  vertiportZoning:
    "Adopt a vertiport zoning overlay or amend the zoning code to accommodate vertical takeoff and landing facilities. Reference the Dallas vertiport zoning code amendment (2024) or Clark County's overlay zone as templates.",
  regulatoryPosture:
    "Signal regulatory openness by issuing an executive order, forming a UAM task force, or publishing a supportive policy statement. Moving from neutral to friendly posture adds 5 points. Arizona and Florida are models of friendly regulatory environments.",
  stateLegislation:
    "Advocate for state-level UAM legislation. Texas HB 1735, California SB 944, and the Florida Advanced Air Mobility Act are templates. State legislation provides the legal framework operators need before committing to a market.",
  laancCoverage:
    "Ensure FAA LAANC (Low Altitude Authorization and Notification Capability) authorization is active for the metro area's airspace. Most major metros already have LAANC coverage — verify with the FAA UAS Data Exchange.",
};

// -------------------------------------------------------
// Core analysis functions
// -------------------------------------------------------

export function analyzeGaps(city: City): GapAnalysis {
  const { score, breakdown } = calculateReadinessScore(city);
  const tier = getScoreTier(score);
  const tierColor = getScoreColor(score);

  const factorKeys = Object.keys(SCORE_WEIGHTS) as (keyof ScoreBreakdown)[];

  const factors: FactorAnalysis[] = factorKeys.map((key) => {
    const max = SCORE_WEIGHTS[key];
    const earned = breakdown[key];
    const isPartial = key === "regulatoryPosture" && city.regulatoryPosture === "neutral";
    const achieved = earned === max;

    const source = city.scoreSources?.[key];

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
  };
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
