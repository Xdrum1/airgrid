import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/api/middleware";
import { apiResponse, apiError } from "@/lib/api/transforms";
import { transformHistoryEntry } from "@/lib/api/market-transforms";
import { getCitiesMapWithOverrides } from "@/data/seed";
import { getScoreHistoryFull } from "@/lib/score-history";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ cityId: string }> },
) {
  const auth = await authenticateApiRequest(req);
  if ("error" in auth) return auth.error;

  const { cityId } = await params;
  const citiesMap = await getCitiesMapWithOverrides();

  if (!citiesMap[cityId]) {
    return apiError(`Market "${cityId}" not found`, 404, auth.headers);
  }

  const history = await getScoreHistoryFull(cityId);
  const data = history.map(transformHistoryEntry);

  return apiResponse(data, { market_id: cityId, entries: data.length }, auth.headers);
}
