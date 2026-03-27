/**
 * Transform enhanced gap analysis output to snake_case API response shape.
 */

import type { EnhancedGapAnalysis, FactorAnalysis } from "@/lib/gap-analysis";
import { toSnakeCase } from "@/lib/api/transforms";
import type { SubIndicator } from "@/types";

function transformSubIndicator(si: SubIndicator) {
  return toSnakeCase({
    id: si.id,
    label: si.label,
    status: si.status,
    citation: si.citation ?? null,
    citationDate: si.citationDate ?? null,
    citationUrl: si.citationUrl ?? null,
    peerNote: si.peerNote ?? null,
  });
}

function transformFactor(f: FactorAnalysis) {
  return toSnakeCase({
    key: f.key,
    label: f.label,
    weight: f.weight,
    earned: f.earned,
    max: f.max,
    achieved: f.achieved,
    partial: f.partial,
    citation: f.citation ?? null,
    citationDate: f.citationDate ?? null,
    citationUrl: f.citationUrl ?? null,
    recommendation: f.recommendation,
    subIndicators: f.subIndicators.map(transformSubIndicator),
  });
}

export function transformGapAnalysis(enhanced: EnhancedGapAnalysis) {
  return {
    city_id: enhanced.cityId,
    city_name: enhanced.cityName,
    state: enhanced.state,
    score: enhanced.score,
    tier: enhanced.tier,
    tier_color: enhanced.tierColor,
    total_factors: enhanced.totalFactors,
    achieved_count: enhanced.achievedCount,
    factors: enhanced.factors.map(transformFactor),
    gaps: enhanced.gaps.map(transformFactor),
    quick_wins: enhanced.quickWins.map(transformFactor),
    high_impact: enhanced.highImpact.map(transformFactor),
    top_gap_points_available: enhanced.topGapPointsAvailable,
    sub_indicator_summary: toSnakeCase(enhanced.subIndicatorSummary),
    peer_context: toSnakeCase({
      sameTier: enhanced.peers.sameTier,
      nextTier: enhanced.peers.nextTier,
      nextTierCities: enhanced.peers.nextTierCities,
      pointsToNextTier: enhanced.peers.pointsToNextTier,
    }),
  };
}
