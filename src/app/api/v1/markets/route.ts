import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/api/middleware";
import { apiResponse } from "@/lib/api/transforms";
import { transformMarketSummary, WatchInfo } from "@/lib/api/market-transforms";
import { getCitiesWithOverrides } from "@/data/seed";
import { getAllMarketWatches } from "@/lib/market-watch";
import type { City } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if ("error" in auth) return auth.error;

  const [cities, watches] = await Promise.all([
    getCitiesWithOverrides(),
    getAllMarketWatches(),
  ]);

  const watchMap = new Map(watches.map((w: { cityId: string; watchStatus: string; outlook: string }) => [w.cityId, w]));
  const data = cities.map((city: City) => {
    const w = watchMap.get(city.id);
    const watchInfo: WatchInfo | null = w ? {
      watchStatus: w.watchStatus,
      outlook: w.outlook,
    } : null;
    return transformMarketSummary(city, watchInfo);
  });

  return apiResponse(data, { market_count: data.length }, auth.headers);
}
