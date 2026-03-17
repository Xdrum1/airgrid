/**
 * Transform internal city/corridor/history data into API v1 response shapes.
 */

import type { City, Corridor, Operator, Vertiport } from "@/types";
import { getScoreColor, getScoreTier, getPostureConfig, SCORE_WEIGHTS } from "@/lib/scoring";
import { OPERATORS_MAP, VERTIPORTS } from "@/data/seed";
import { toSnakeCase } from "@/lib/api/transforms";
import type { ScoreHistoryFull } from "@/lib/score-history";

// -------------------------------------------------------
// Market summary (used in /markets list)
// -------------------------------------------------------

export interface WatchInfo {
  watchStatus: string;
  outlook: string;
  analystNote?: string | null;
  publishedAt?: string | null;
}

export function transformMarketSummary(city: City, watch?: WatchInfo | null) {
  const score = city.score ?? 0;
  const tier = getScoreTier(score);
  const posture = getPostureConfig(city.regulatoryPosture);
  const cityVertiports = VERTIPORTS.filter((v) => v.cityId === city.id);

  return toSnakeCase({
    id: city.id,
    city: city.city,
    state: city.state,
    metro: city.metro,
    coordinates: { lat: city.lat, lng: city.lng },
    score,
    tier,
    tierColor: getScoreColor(score),
    breakdown: city.breakdown ?? {},
    regulatoryPosture: city.regulatoryPosture,
    postureLabel: posture.label,
    operatorCount: city.activeOperators.length,
    vertiportCount: cityVertiports.length,
    watchStatus: watch?.watchStatus ?? "STABLE",
    outlook: watch?.outlook ?? "STABLE",
    lastUpdated: city.lastUpdated,
  });
}

// -------------------------------------------------------
// Market detail (used in /markets/[cityId])
// -------------------------------------------------------

interface TierHistoryEntry {
  score: number;
  tier: string | null;
  capturedAt: string;
}

export function transformMarketDetail(
  city: City,
  corridors: Corridor[],
  tierHistory: TierHistoryEntry[],
  watch?: WatchInfo | null,
) {
  const summary = transformMarketSummary(city, watch);

  const operators = city.activeOperators
    .map((id) => OPERATORS_MAP[id])
    .filter(Boolean)
    .map((op: Operator) => toSnakeCase({
      id: op.id,
      name: op.name,
      type: op.type,
      faaCertStatus: op.faaCertStatus,
      aircraft: op.aircraft,
      website: op.website ?? null,
    }));

  const vertiports = VERTIPORTS.filter((v) => v.cityId === city.id).map((v: Vertiport) =>
    toSnakeCase({
      id: v.id,
      name: v.name,
      status: v.status,
      siteType: v.siteType,
      coordinates: { lat: v.lat, lng: v.lng },
      operatorId: v.operatorId ?? null,
      padCount: v.padCount ?? null,
      chargingCapable: v.chargingCapable,
    }),
  );

  const corridorData = corridors.map((c) =>
    toSnakeCase({
      id: c.id,
      name: c.name,
      status: c.status,
      startPoint: c.startPoint,
      endPoint: c.endPoint,
      distanceKm: c.distanceKm,
      estimatedFlightMinutes: c.estimatedFlightMinutes,
      maxAltitudeFt: c.maxAltitudeFt,
      operatorId: c.operatorId ?? null,
    }),
  );

  return {
    ...summary,
    analyst_note: watch?.analystNote ?? null,
    operators,
    vertiports,
    corridors: corridorData,
    tier_history: toSnakeCase(tierHistory),
    score_sources: city.scoreSources ? toSnakeCase(city.scoreSources) : null,
    score_weights: toSnakeCase(SCORE_WEIGHTS),
    notes: city.notes,
    key_milestones: city.keyMilestones,
  };
}

// -------------------------------------------------------
// Trajectory entry (used in /markets/[cityId]/trajectory)
// -------------------------------------------------------

import type { TrajectoryPoint, TrajectorySummary } from "@/lib/score-history";

const FACTOR_LABELS: Record<string, string> = {
  activePilotProgram: "Active Pilot Program",
  approvedVertiport: "Approved Vertiport",
  activeOperatorPresence: "Operator Presence",
  vertiportZoning: "Vertiport Zoning",
  regulatoryPosture: "Regulatory Posture",
  stateLegislation: "State Legislation",
  laancCoverage: "LAANC Coverage",
};

function humanFactorName(key: string): string {
  return FACTOR_LABELS[key] ?? key;
}

export function transformTrajectoryEntry(point: TrajectoryPoint) {
  return toSnakeCase({
    score: point.score,
    previousScore: point.previousScore,
    scoreDelta: point.scoreDelta,
    tier: point.tier,
    breakdown: Object.fromEntries(
      Object.entries(point.breakdown).map(([k, v]) => [humanFactorName(k), v]),
    ),
    factorDeltas: point.factorDeltas.map((d) => ({
      factor: humanFactorName(d.factor),
      previous: d.previous,
      current: d.current,
      delta: d.delta,
    })),
    capturedAt: point.capturedAt,
    triggeringEventId: point.triggeringEventId,
    filingIngestedAt: point.filingIngestedAt,
    triggeringEvent: point.triggeringEvent
      ? {
          summary: point.triggeringEvent.summary,
          sourceUrl: point.triggeringEvent.sourceUrl,
          changeType: point.triggeringEvent.changeType,
          timestamp: point.triggeringEvent.timestamp,
        }
      : null,
  });
}

export function transformTrajectorySummary(summary: TrajectorySummary) {
  return toSnakeCase({
    entries: summary.entries,
    firstSnapshot: summary.firstSnapshot,
    lastSnapshot: summary.lastSnapshot,
    scoreRange: summary.scoreRange,
    netScoreChange: summary.netScoreChange,
    factorsChanged: summary.factorsChanged.map(humanFactorName),
  });
}

// -------------------------------------------------------
// History entry (used in /markets/[cityId]/history)
// -------------------------------------------------------

export function transformHistoryEntry(entry: ScoreHistoryFull) {
  return toSnakeCase({
    score: entry.score,
    tier: entry.tier,
    breakdown: entry.breakdown,
    capturedAt: entry.capturedAt,
    triggeringEventId: entry.triggeringEventId,
    filingIngestedAt: entry.filingIngestedAt,
    triggeringEvent: entry.triggeringEvent
      ? {
          summary: entry.triggeringEvent.summary,
          sourceUrl: entry.triggeringEvent.sourceUrl,
          changeType: entry.triggeringEvent.changeType,
          timestamp: entry.triggeringEvent.timestamp,
        }
      : null,
  });
}
