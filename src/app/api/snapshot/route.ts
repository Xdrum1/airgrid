import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCitiesWithOverrides } from "@/data/seed";
import { getScoreTier } from "@/lib/scoring";

function authorize(request: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { success: false, error: "CRON_SECRET not configured" },
      { status: 401 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  return null; // authorized
}

// Vercel crons send GET requests
export async function GET(request: NextRequest) {
  const denied = authorize(request);
  if (denied) return denied;
  return captureSnapshots();
}

// Keep POST for manual/external triggers
export async function POST(request: NextRequest) {
  const denied = authorize(request);
  if (denied) return denied;
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
