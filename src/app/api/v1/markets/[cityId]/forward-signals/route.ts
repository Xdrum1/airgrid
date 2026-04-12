import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/api/middleware";
import { apiResponse, apiError } from "@/lib/api/transforms";
import { getCitiesMapWithOverrides } from "@/data/seed";
import { getForwardSignals, logPredictions } from "@/lib/forward-signals";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/markets/[cityId]/forward-signals
 *
 * Returns the predictive intelligence layer for a market:
 *   - Forward signals (near/medium/long term) with timeframes and score impact
 *   - MarketWatch trajectory
 *   - Signal velocity (30d/90d, national rank, accelerating?)
 *   - 30-day forecast (expected score change with confidence)
 *
 * Use cases:
 *   - Subscribers building dashboards/alerting on forward calendars
 *   - Insurance/investment buyers querying market trajectory
 *   - Internal: powers ForwardSignalsPanel in reports
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ cityId: string }> },
) {
  const auth = await authenticateApiRequest(req);
  if ("error" in auth) return auth.error;

  const { cityId } = await params;
  const citiesMap = await getCitiesMapWithOverrides();
  const city = citiesMap[cityId];

  if (!city) {
    return apiError(`Market "${cityId}" not found`, 404, auth.headers);
  }

  const report = await getForwardSignals(cityId);
  if (report.signals.length > 0) {
    logPredictions(cityId, report, "api_v1").catch(() => {});
  }

  // Transform to snake_case API envelope
  const data = {
    city_id: report.cityId,
    generated_at: report.generatedAt.toISOString(),
    market_watch: report.marketWatch
      ? {
          status: report.marketWatch.status,
          outlook: report.marketWatch.outlook,
          set_at: report.marketWatch.setAt.toISOString(),
        }
      : null,
    velocity: {
      signals_last_30d: report.velocity.signalsLast30d,
      signals_last_90d: report.velocity.signalsLast90d,
      rank_national: report.velocity.rankNational,
      accelerating: report.velocity.accelerating,
    },
    forecast_30d: report.expectedScoreChange30d
      ? {
          delta: report.expectedScoreChange30d.delta,
          confidence: report.expectedScoreChange30d.confidence,
        }
      : null,
    signals: {
      near: report.near.map(serializeSignal),
      medium: report.medium.map(serializeSignal),
      long: report.long.map(serializeSignal),
      total: report.signals.length,
    },
  };

  return apiResponse(data, undefined, auth.headers);
}

function serializeSignal(s: import("@/lib/forward-signals").ForwardSignal) {
  return {
    id: s.id,
    type: s.type,
    category: s.category,
    description: s.description,
    window_label: s.windowLabel,
    earliest_date: s.earliestDate?.toISOString() ?? null,
    latest_date: s.latestDate?.toISOString() ?? null,
    confidence: s.confidence,
    confidence_reason: s.confidenceReason,
    score_impact: {
      factor: s.scoreImpact.factor,
      points_if_realized: s.scoreImpact.pointsIfRealized,
      direction: s.scoreImpact.direction,
    },
    source_record_id: s.sourceRecordId ?? null,
    source_url: s.sourceUrl ?? null,
    classified_at: s.classifiedAt?.toISOString() ?? null,
  };
}
