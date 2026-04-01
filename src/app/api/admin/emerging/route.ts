import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getClientIp } from "@/lib/admin-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const ip = getClientIp(request);
  const rl = await rateLimit(`admin-emerging-get:${ip}`, 30, 5 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const url = request.nextUrl;
  const marketName = url.searchParams.get("marketName") || undefined;
  const relevant = url.searchParams.get("relevant");
  const momentum = url.searchParams.get("momentum") || undefined;
  const signalType = url.searchParams.get("signalType") || undefined;
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);

  // Build filter
  const where: Record<string, unknown> = {};
  if (marketName) where.marketName = marketName;
  if (relevant === "true") where.relevant = true;
  if (relevant === "false") where.relevant = false;
  if (momentum) where.momentum = momentum;
  if (signalType) where.signalType = signalType;

  try {
    // Run all queries in parallel
    const [
      signals,
      totalFiltered,
      total,
      relevantCount,
      unclassifiedCount,
      byMarketRaw,
      byMomentumRaw,
      bySourceRaw,
      bySignalTypeRaw,
      lastIngested,
      lastClassified,
    ] = await Promise.all([
      // Filtered + paginated signals
      prisma.emergingMarketSignal.findMany({
        where,
        orderBy: { ingestedAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          marketName: true,
          sourceId: true,
          title: true,
          url: true,
          source: true,
          relevant: true,
          signalType: true,
          momentum: true,
          confidence: true,
          classifiedAt: true,
          ingestedAt: true,
          promptVersion: true,
          modelUsed: true,
          rawClassification: true,
        },
      }),
      prisma.emergingMarketSignal.count({ where }),

      // Stats (always unfiltered)
      prisma.emergingMarketSignal.count(),
      prisma.emergingMarketSignal.count({ where: { relevant: true } }),
      prisma.emergingMarketSignal.count({ where: { marketName: "Unclassified" } }),

      // Group by market — relevant only
      prisma.$queryRaw`
        SELECT "marketName",
          COUNT(*)::int as total,
          SUM(CASE WHEN relevant THEN 1 ELSE 0 END)::int as relevant_count
        FROM "EmergingMarketSignal"
        WHERE "marketName" != 'Unclassified' AND "marketName" != 'Other'
        GROUP BY "marketName"
        ORDER BY relevant_count DESC
      ` as Promise<{ marketName: string; total: number; relevant_count: number }[]>,

      // Group by momentum
      prisma.$queryRaw`
        SELECT momentum, COUNT(*)::int as count
        FROM "EmergingMarketSignal"
        WHERE relevant = true
        GROUP BY momentum
      ` as Promise<{ momentum: string; count: number }[]>,

      // Group by source
      prisma.$queryRaw`
        SELECT source, COUNT(*)::int as count
        FROM "EmergingMarketSignal"
        GROUP BY source
      ` as Promise<{ source: string; count: number }[]>,

      // Group by signal type (relevant only)
      prisma.$queryRaw`
        SELECT "signalType", COUNT(*)::int as count
        FROM "EmergingMarketSignal"
        WHERE relevant = true
        GROUP BY "signalType"
        ORDER BY count DESC
      ` as Promise<{ signalType: string; count: number }[]>,

      // Last ingested
      prisma.emergingMarketSignal.findFirst({
        orderBy: { ingestedAt: "desc" },
        select: { ingestedAt: true },
      }),

      // Last classified
      prisma.emergingMarketSignal.findFirst({
        where: { marketName: { not: "Unclassified" } },
        orderBy: { classifiedAt: "desc" },
        select: { classifiedAt: true },
      }),
    ]);

    const stats = {
      total,
      relevant: relevantCount,
      unclassified: unclassifiedCount,
      byMarket: Object.fromEntries(
        byMarketRaw.map((r) => [r.marketName, { total: r.total, relevant: r.relevant_count }])
      ),
      byMomentum: Object.fromEntries(byMomentumRaw.map((r) => [r.momentum, r.count])),
      bySource: Object.fromEntries(bySourceRaw.map((r) => [r.source, r.count])),
      bySignalType: Object.fromEntries(bySignalTypeRaw.map((r) => [r.signalType, r.count])),
      lastIngestedAt: lastIngested?.ingestedAt?.toISOString() ?? null,
      lastClassifiedAt: lastClassified?.classifiedAt?.toISOString() ?? null,
    };

    return NextResponse.json({ stats, signals, totalFiltered });
  } catch (err) {
    console.error("[admin/emerging] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
