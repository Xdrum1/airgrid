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
  if (score >= 50) return "#5B8DB8";
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

// ═══════════════════════════════════════════════════════════
// FKB-backed scoring — reads weights from database
// Falls back to SCORE_WEIGHTS if DB is unreachable
// ═══════════════════════════════════════════════════════════

// FKB factor code → seed.ts field key mapping
const FKB_CODE_TO_KEY: Record<string, keyof typeof SCORE_WEIGHTS> = {
  OPR: "activeOperatorPresence",
  LEG: "stateLegislation",
  VRT: "approvedVertiport",
  REG: "regulatoryPosture",
  PLT: "activePilotProgram",
  ZON: "vertiportZoning",
  WTH: "weatherInfrastructure",
};

const KEY_TO_FKB_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(FKB_CODE_TO_KEY).map(([code, key]) => [key, code])
);

export { KEY_TO_FKB_CODE };

// Cached FKB weights — refreshed on first call, then cached for process lifetime
let fkbWeightsCache: Record<string, number> | null = null;
let fkbWeightsCacheTime = 0;
let fkbWeightsPending: Promise<Record<string, number>> | null = null;
const FKB_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch current active weights from FKB database.
 * Returns weights keyed by seed.ts field names (e.g. "activePilotProgram": 15)
 * for drop-in compatibility with existing scoring.
 *
 * Uses a pending-promise guard to prevent thundering herd on cold cache —
 * concurrent callers share a single DB fetch instead of each firing their own.
 *
 * Falls back to hardcoded SCORE_WEIGHTS if DB is unreachable.
 */
export async function getWeightsFromFkb(): Promise<Record<string, number>> {
  const now = Date.now();
  if (fkbWeightsCache && now - fkbWeightsCacheTime < FKB_CACHE_TTL_MS) {
    return fkbWeightsCache;
  }

  // If another call is already fetching, wait for it instead of hitting DB again
  if (fkbWeightsPending) {
    return fkbWeightsPending;
  }

  fkbWeightsPending = fetchFkbWeights();

  try {
    return await fkbWeightsPending;
  } finally {
    fkbWeightsPending = null;
  }
}

async function fetchFkbWeights(): Promise<Record<string, number>> {
  try {
    // Dynamic import to avoid bundling Prisma in client components
    const { prisma } = await import("@/lib/prisma");

    const activeWeights = await prisma.fkbFactorWeight.findMany({
      where: { effectiveTo: null },
      include: { factor: { select: { code: true, retired: true } } },
    });

    if (activeWeights.length === 0) {
      // No FKB data — fall back to hardcoded
      return { ...SCORE_WEIGHTS };
    }

    const weights: Record<string, number> = {};
    for (const w of activeWeights) {
      if (w.factor.retired) continue;
      const key = FKB_CODE_TO_KEY[w.factor.code];
      if (key) {
        weights[key] = Number(w.weightPct);
      }
    }

    // Verify we got all 7 active factors
    if (Object.keys(weights).length === 7) {
      fkbWeightsCache = weights;
      fkbWeightsCacheTime = Date.now();
      return weights;
    }

    // Partial result — fall back to hardcoded
    return { ...SCORE_WEIGHTS };
  } catch {
    // DB unreachable — fall back to hardcoded
    return { ...SCORE_WEIGHTS };
  }
}

/**
 * FKB-backed readiness score calculation.
 * Reads weights from the FKB database instead of hardcoded constants.
 * Same interface as calculateReadinessScore for drop-in replacement.
 *
 * Use in server components and API routes where async is available.
 */
export async function calculateReadinessScoreFromFkb(city: City): Promise<{
  score: number;
  breakdown: ScoreBreakdown;
  weightsSource: "fkb" | "fallback";
  methodologyVersion: string;
}> {
  const weights = await getWeightsFromFkb();
  const isFkb = fkbWeightsCache !== null;

  const breakdown: ScoreBreakdown = {
    activePilotProgram: city.hasActivePilotProgram
      ? (weights.activePilotProgram ?? SCORE_WEIGHTS.activePilotProgram)
      : 0,
    vertiportZoning: city.hasVertiportZoning
      ? (weights.vertiportZoning ?? SCORE_WEIGHTS.vertiportZoning)
      : 0,
    approvedVertiport: city.vertiportCount > 0
      ? (weights.approvedVertiport ?? SCORE_WEIGHTS.approvedVertiport)
      : 0,
    activeOperatorPresence: city.activeOperators.length > 0
      ? (weights.activeOperatorPresence ?? SCORE_WEIGHTS.activeOperatorPresence)
      : 0,
    regulatoryPosture: scorePostureFkb(city.regulatoryPosture, weights.regulatoryPosture ?? SCORE_WEIGHTS.regulatoryPosture),
    stateLegislation: scoreLegislationFkb(city.stateLegislationStatus, weights.stateLegislation ?? SCORE_WEIGHTS.stateLegislation),
    weatherInfrastructure: scoreWeatherFkb(city.weatherInfraLevel, weights.weatherInfrastructure ?? SCORE_WEIGHTS.weatherInfrastructure),
  };

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return {
    score,
    breakdown,
    weightsSource: isFkb ? "fkb" : "fallback",
    methodologyVersion: isFkb ? "v1.3" : "v1.3-static",
  };
}

// Graduated scoring with dynamic max weight
function scorePostureFkb(posture: RegulatoryPosture, maxWeight: number): number {
  switch (posture) {
    case "friendly":    return maxWeight;
    case "neutral":     return Math.round(maxWeight * 0.5);
    case "restrictive": return 0;
    default:            return 0;
  }
}

function scoreLegislationFkb(status: LegislationStatus, maxWeight: number): number {
  switch (status) {
    case "enacted":         return maxWeight;
    case "actively_moving": return Math.round(maxWeight * 0.5);
    case "none":            return 0;
    default:                return 0;
  }
}

function scoreWeatherFkb(level: WeatherInfraLevel, maxWeight: number): number {
  switch (level) {
    case "full":    return maxWeight;
    case "partial": return Math.round(maxWeight * 0.5);
    case "none":    return 0;
    default:        return 0;
  }
}
