import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCitiesWithOverrides } from "@/data/seed";
import { getScoreTier } from "@/lib/scoring";
import { authorizeCron } from "@/lib/admin-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { alertCronFailure } from "@/lib/cron-alerts";
import { updateMarketWatchList } from "@/lib/market-watchlist";
import { logAllPredictions } from "@/lib/forward-signals";
import { recordFacilityStatusSnapshot } from "@/lib/pre-dev-status-recorder";

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

    // Update market watch list after snapshots
    const watchResult = await updateMarketWatchList();

    // Record any pre-dev facility status transitions so facility_milestone
    // predictions can be verified against an actual status timeline.
    let facilityStatusResult: Awaited<ReturnType<typeof recordFacilityStatusSnapshot>> | null = null;
    try {
      facilityStatusResult = await recordFacilityStatusSnapshot();
    } catch (err) {
      console.error("[API /snapshot] recordFacilityStatusSnapshot failed:", err);
    }

    // Log predictions so the scorecard ledger stays current regardless of
    // whether anyone viewed a report today.
    let predictionsResult: { citiesProcessed: number; signalsLogged: number; errors: number } | null = null;
    try {
      predictionsResult = await logAllPredictions("snapshot_cron");
    } catch (err) {
      console.error("[API /snapshot] logAllPredictions failed:", err);
    }

    return NextResponse.json({
      success: true,
      count: result.count,
      capturedAt: now.toISOString(),
      watchList: watchResult,
      facilityStatus: facilityStatusResult,
      predictions: predictionsResult,
    });
  } catch (err) {
    console.error("[API /snapshot] Error:", err);
    await alertCronFailure("snapshot", err);
    return NextResponse.json(
      { success: false, error: "Snapshot capture failed" },
      { status: 500 }
    );
  }
}
