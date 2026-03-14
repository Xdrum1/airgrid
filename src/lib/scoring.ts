import { City, ScoreBreakdown, RegulatoryPosture, LegislationStatus } from "@/types";

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
    stateLegislation: scoreLegislation(city.stateLegislationStatus),
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

function scoreLegislation(status: LegislationStatus): number {
  switch (status) {
    case "enacted":         return SCORE_WEIGHTS.stateLegislation;
    case "actively_moving": return 5;
    case "none":            return 0;
    default:                return 0;
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

export function getLegislationConfig(status: LegislationStatus) {
  switch (status) {
    case "enacted":         return { label: "ENACTED",         color: "#00ff88" };
    case "actively_moving": return { label: "ACTIVELY MOVING", color: "#f59e0b" };
    case "none":            return { label: "NONE",            color: "#ff4444" };
    default:                return { label: "UNKNOWN",         color: "#555555" };
  }
}
