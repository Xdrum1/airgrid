import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/api/middleware";
import { apiResponse, apiError } from "@/lib/api/transforms";
import { transformTrajectoryEntry, transformTrajectorySummary } from "@/lib/api/market-transforms";
import { getCitiesMapWithOverrides } from "@/data/seed";
import { getScoreTrajectory } from "@/lib/score-history";
import { hasProAccess, hasInstitutionalAccess } from "@/lib/billing-shared";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ cityId: string }> },
) {
  const auth = await authenticateApiRequest(req);
  if ("error" in auth) return auth.error;

  // Trajectory requires Pro+
  if (!hasProAccess(auth.ctx.tier)) {
    return apiError(
      "Trajectory data requires authorized access. Contact sales@airindex.io to discuss your requirements.",
      403,
      auth.headers,
    );
  }

  const { cityId } = await params;
  const citiesMap = await getCitiesMapWithOverrides();

  if (!citiesMap[cityId]) {
    return apiError(`Market "${cityId}" not found`, 404, auth.headers);
  }

  // Institutional+ gets full history, Pro gets 90 days
  const sinceDaysAgo = hasInstitutionalAccess(auth.ctx.tier) ? undefined : 90;

  const { points, summary } = await getScoreTrajectory(cityId, { sinceDaysAgo });
  const data = points.map(transformTrajectoryEntry);

  return apiResponse(data, {
    market_id: cityId,
    access_level: hasInstitutionalAccess(auth.ctx.tier) ? "full" : "90_day",
    ...transformTrajectorySummary(summary),
  }, auth.headers);
}
