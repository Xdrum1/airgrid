import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/api/middleware";
import { apiResponse, apiError } from "@/lib/api/transforms";
import { transformMarketDetail } from "@/lib/api/market-transforms";
import { getCitiesMapWithOverrides } from "@/data/seed";
import { getCorridorsForCity } from "@/lib/corridors";
import { getScoreHistoryBrief } from "@/lib/score-history";

export const dynamic = "force-dynamic";

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

  const [corridors, tierHistory] = await Promise.all([
    getCorridorsForCity(cityId),
    getScoreHistoryBrief(cityId),
  ]);

  const data = transformMarketDetail(city, corridors, tierHistory);
  return apiResponse(data, undefined, auth.headers);
}
