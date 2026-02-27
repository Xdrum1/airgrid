import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCitiesWithOverrides } from "@/data/seed";

export async function GET(request: NextRequest) {
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

  return captureSnapshots();
}

export async function POST(request: NextRequest) {
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
