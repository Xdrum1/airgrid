import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/api/middleware";
import { apiResponse, toSnakeCase } from "@/lib/api/transforms";
import { getActiveMarketWatchList, getRecentlyResolvedEntries } from "@/lib/market-watchlist";
import { CITIES_MAP } from "@/data/seed";
import { getScoreTier } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if ("error" in auth) return auth.error;

  const includeResolved = req.nextUrl.searchParams.get("include_resolved") === "true";

  const active = await getActiveMarketWatchList();

  const entries = active.map((entry) => {
    const city = CITIES_MAP[entry.cityId];
    const daysOnWatch = Math.floor(
      (Date.now() - new Date(entry.triggeredAt).getTime()) / 86400000
    );

    return {
      market_id: entry.cityId,
      market_name: city?.city ?? entry.cityId,
      state: city?.state ?? "",
      current_score: entry.currentScore,
      tier: getScoreTier(entry.currentScore),
      trigger_type: entry.triggerType.toLowerCase(),
      trigger_detail: entry.triggerDetail,
      days_on_watch: daysOnWatch,
      triggered_at: entry.triggeredAt.toISOString(),
    };
  });

  const result: Record<string, unknown> = { active: entries };

  if (includeResolved) {
    const resolved = await getRecentlyResolvedEntries(30);
    result.recently_resolved = resolved.map((entry) => {
      const city = CITIES_MAP[entry.cityId];
      return {
        market_id: entry.cityId,
        market_name: city?.city ?? entry.cityId,
        state: city?.state ?? "",
        trigger_type: entry.triggerType.toLowerCase(),
        resolution_reason: entry.resolutionReason?.toLowerCase() ?? "unknown",
        triggered_at: entry.triggeredAt.toISOString(),
        resolved_at: entry.resolvedAt?.toISOString() ?? null,
      };
    });
  }

  return apiResponse(result, { active_count: entries.length }, auth.headers);
}
