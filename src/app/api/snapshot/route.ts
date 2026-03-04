import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCitiesWithOverrides } from "@/data/seed";
import { getScoreTier } from "@/lib/scoring";
import { authorizeCron } from "@/lib/admin-helpers";
import { rateLimit } from "@/lib/rate-limit";

// Vercel crons send GET requests
export async function GET(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  const rl = await rateLimit("cron:snapshot", 2, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: "Rate limited" }, { status: 429 });
  }
  return captureSnapshots();
}

// Keep POST for manual/external triggers
export async function POST(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  const rl = await rateLimit("cron:snapshot", 2, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: "Rate limited" }, { status: 429 });
  }
  return captureSnapshots();
}

async function captureSnapshots() {
  try {
    const now = new Date();
    const CITIES = await getCitiesWithOverrides();

    const result = await prisma.scoreSnapshot.createMany({
      data: CITIES.map((city) => ({
        cityId: city.id,
        score: city.score ?? 0,
        breakdown: (city.breakdown ?? {}) as Record<string, number>,
        tier: getScoreTier(city.score ?? 0),
        triggeringEventId: null,
        filingIngestedAt: null,
        capturedAt: now,
      })),
    });

    return NextResponse.json({
      success: true,
      count: result.count,
      capturedAt: now.toISOString(),
    });
  } catch (err) {
    console.error("[API /snapshot] Error:", err);
    return NextResponse.json(
      { success: false, error: "Snapshot capture failed" },
      { status: 500 }
    );
  }
}
