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

export function transformMarketSummary(city: City) {
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
) {
  const summary = transformMarketSummary(city);

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
