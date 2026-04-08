import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/api/middleware";
import { apiResponse, apiError, toSnakeCase } from "@/lib/api/transforms";
import { hasProAccess } from "@/lib/billing-shared";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/signals/live
 *
 * Returns signal events from the last 24 hours with HIGH confidence.
 * Requires Pro+ tier. Available once event-driven pipeline is active.
 *
 * Query params:
 *   ?city_id=los_angeles   — filter by market
 *   ?hours=48              — lookback window (default 24, max 168)
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if ("error" in auth) return auth.error;

  if (!hasProAccess(auth.ctx.tier)) {
    return apiError(
      "Signal feed requires authorized access. Contact sales@airindex.io to discuss your requirements.",
      403,
      auth.headers,
    );
  }

  const { searchParams } = new URL(req.url);
  const cityId = searchParams.get("city_id");
  const hoursParam = parseInt(searchParams.get("hours") ?? "24", 10);
  const hours = Math.min(Math.max(hoursParam, 1), 168); // 1h to 7 days

  const since = new Date();
  since.setHours(since.getHours() - hours);

  const where: {
    detectedAt: { gte: Date };
    confidence: string;
    cityId?: string;
  } = {
    detectedAt: { gte: since },
    confidence: "high",
  };

  if (cityId) {
    where.cityId = cityId;
  }

  const signals = await prisma.signalEvent.findMany({
    where,
    orderBy: { detectedAt: "desc" },
    take: 100,
  });

  const data = signals.map((s) =>
    toSnakeCase({
      id: s.id,
      source: s.source,
      cityId: s.cityId,
      eventType: s.eventType,
      title: s.title,
      confidence: s.confidence,
      detectedAt: s.detectedAt.toISOString(),
      notifiedAt: s.notifiedAt?.toISOString() ?? null,
    }),
  );

  return apiResponse(data, {
    lookback_hours: hours,
    ...(cityId && { city_id: cityId }),
    signal_count: data.length,
  }, auth.headers);
}
