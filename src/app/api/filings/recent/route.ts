import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/admin-helpers";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`filings-recent:${ip}`, 30, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const limit = Math.min(
    Math.max(Number(request.nextUrl.searchParams.get("limit") ?? 3), 1),
    10
  );

  try {
    const records = await prisma.ingestedRecord.findMany({
      orderBy: { ingestedAt: "desc" },
      take: limit,
      select: {
        title: true,
        source: true,
        date: true,
        ingestedAt: true,
      },
    });

    const totalCount = await prisma.ingestedRecord.count();

    return NextResponse.json({
      data: records.map((r) => ({
        title: r.title,
        source: r.source,
        date: r.date,
        ingestedAt: r.ingestedAt,
      })),
      totalCount,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[API /filings/recent] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch filings", data: [], totalCount: 0 },
      { status: 500 }
    );
  }
}
