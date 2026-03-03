import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/api/middleware";
import { apiResponse } from "@/lib/api/transforms";
import { transformMarketSummary } from "@/lib/api/market-transforms";
import { getCitiesWithOverrides } from "@/data/seed";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if ("error" in auth) return auth.error;

  const cities = await getCitiesWithOverrides();
  const data = cities.map(transformMarketSummary);

  return apiResponse(data, { market_count: data.length }, auth.headers);
}
