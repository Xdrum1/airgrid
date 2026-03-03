import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/api/middleware";
import { apiResponse } from "@/lib/api/transforms";
import { transformMarketDetail } from "@/lib/api/market-transforms";
import { getCitiesWithOverrides } from "@/data/seed";
import { getCorridors } from "@/lib/corridors";
import { getTierHistoryAllCities } from "@/lib/score-history";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if ("error" in auth) return auth.error;

  const [cities, allCorridors, tierHistoryMap] = await Promise.all([
    getCitiesWithOverrides(),
    getCorridors(),
    getTierHistoryAllCities(),
  ]);

  const data = cities.map((city) => {
    const corridors = allCorridors.filter((c) => c.cityId === city.id);
    const tierHistory = tierHistoryMap[city.id] ?? [];
    return transformMarketDetail(city, corridors, tierHistory);
  });

  return apiResponse(data, { market_count: data.length, export: true }, auth.headers);
}
