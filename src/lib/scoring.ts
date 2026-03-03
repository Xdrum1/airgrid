import { City, ScoreBreakdown, RegulatoryPosture } from "@/types";

export const SCORE_WEIGHTS = {
  activePilotProgram: 20,
  approvedVertiport: 20,
  activeOperatorPresence: 15,
  vertiportZoning: 15,
  regulatoryPosture: 10,
  stateLegislation: 10,
  laancCoverage: 10,
} as const;

export function calculateReadinessScore(city: City): {
  score: number;
  breakdown: ScoreBreakdown;
} {
  const breakdown: ScoreBreakdown = {
    activePilotProgram: city.hasActivePilotProgram
      ? SCORE_WEIGHTS.activePilotProgram
      : 0,
    vertiportZoning: city.hasVertiportZoning
      ? SCORE_WEIGHTS.vertiportZoning
      : 0,
    approvedVertiport: city.vertiportCount > 0
      ? SCORE_WEIGHTS.approvedVertiport
      : 0,
    activeOperatorPresence: city.activeOperators.length > 0
      ? SCORE_WEIGHTS.activeOperatorPresence
      : 0,
    regulatoryPosture: scorePosture(city.regulatoryPosture),
    stateLegislation: city.hasStateLegislation
      ? SCORE_WEIGHTS.stateLegislation
      : 0,
    laancCoverage: city.hasLaancCoverage
      ? SCORE_WEIGHTS.laancCoverage
      : 0,
  };

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { score, breakdown };
}

function scorePosture(posture: RegulatoryPosture): number {
  switch (posture) {
    case "friendly":    return SCORE_WEIGHTS.regulatoryPosture;
    case "neutral":     return 5;
    case "restrictive": return 0;
    default:            return 0;
  }
}

export function getScoreColor(score: number): string {
  if (score >= 75) return "#00ff88";
  if (score >= 50) return "#00d4ff";
  if (score >= 30) return "#f59e0b";
  return "#ff4444";
}

export function getScoreTier(score: number): string {
  if (score >= 75) return "ADVANCED";
  if (score >= 50) return "MODERATE";
  if (score >= 30) return "EARLY";
  return "NASCENT";
}

export function getPostureConfig(posture: RegulatoryPosture) {
  switch (posture) {
    case "friendly":    return { label: "FRIENDLY",    color: "#00ff88" };
    case "neutral":     return { label: "NEUTRAL",     color: "#f59e0b" };
    case "restrictive": return { label: "RESTRICTIVE", color: "#ff4444" };
    default:            return { label: "UNKNOWN",     color: "#555555" };
  }
}
