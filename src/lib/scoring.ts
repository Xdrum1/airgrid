import { City, ScoreBreakdown, RegulatoryPosture, LegislationStatus, WeatherInfraLevel } from "@/types";

// ---------------------------------------------------------------------------
// External Score Input Architecture (v1.3)
// ---------------------------------------------------------------------------
// The weather infrastructure factor is designed to accept external data sources.
// Current: internal assessment based on ASOS/AWOS presence (full/partial/none).
// Future: external providers (e.g., TruWeather eIPP deployment data) can supply
// a scored value that overrides the internal assessment for a given city.
//
// Integration path:
//   Phase 1 (current): Internal scoring — seed.ts weatherInfraLevel per city.
//   Phase 2 (Q3 2026): Deployment map integration — external provider supplies
//     per-city coverage data, mapped to full/partial/none tiers.
//   Phase 3 (2027+): Performance algorithm — external API returns a 0-10 score
//     derived from sensor density, uptime, and data quality metrics.
//
// When external input is available, the shape will be:
//   interface WeatherScoreInput {
//     source: "internal" | "truweather";
//     value: 0 | 5 | 10;  // maps to none/partial/full tiers
//     method: "interim" | "deployment_map" | "performance_algorithm";
//     lastUpdated: string; // ISO timestamp
//   }
//
// The scoreWeather() function below is the single integration point.
// To absorb external data: accept WeatherScoreInput, use its value directly,
// and fall back to internal tier-based scoring when source is "internal".
// No changes to the scoring model or weights are needed — only the input.
// ---------------------------------------------------------------------------

export const SCORE_WEIGHTS = {
  activePilotProgram: 15,
  approvedVertiport: 15,
  activeOperatorPresence: 15,
  vertiportZoning: 15,
  regulatoryPosture: 10,
  stateLegislation: 20,
  weatherInfrastructure: 10,
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
    weatherInfrastructure: scoreWeather(city.weatherInfraLevel),
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
    case "actively_moving": return 10;
    case "none":            return 0;
    default:                return 0;
  }
}

function scoreWeather(level: WeatherInfraLevel): number {
  switch (level) {
    case "full":    return SCORE_WEIGHTS.weatherInfrastructure;
    case "partial": return 5;
    case "none":    return 0;
    default:        return 0;
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

export function getWeatherConfig(level: WeatherInfraLevel) {
  switch (level) {
    case "full":    return { label: "FULL",    color: "#00ff88" };
    case "partial": return { label: "PARTIAL", color: "#f59e0b" };
    case "none":    return { label: "NONE",    color: "#ff4444" };
    default:        return { label: "UNKNOWN", color: "#555555" };
  }
}
