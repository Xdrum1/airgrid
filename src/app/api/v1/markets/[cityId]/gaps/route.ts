import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/api/middleware";
import { apiResponse, apiError } from "@/lib/api/transforms";
import { transformGapAnalysis } from "@/lib/api/gap-transforms";
import { getCitiesWithOverrides, getCitiesMapWithOverrides } from "@/data/seed";
import { getEnhancedGapAnalysis } from "@/lib/gap-analysis";

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

  const allCities = await getCitiesWithOverrides();
  const enhanced = getEnhancedGapAnalysis(city, allCities);
  const data = transformGapAnalysis(enhanced);

  return apiResponse(data, undefined, auth.headers);
}
