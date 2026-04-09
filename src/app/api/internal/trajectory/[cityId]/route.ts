import { NextRequest, NextResponse } from "next/server";
import { getScoreTrajectory } from "@/lib/score-history";
import { CITIES_MAP } from "@/data/seed";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cityId: string }> },
) {
  const { cityId } = await params;

  const rl = await rateLimit(`internal:trajectory:${cityId}`, 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  if (!CITIES_MAP[cityId]) {
    return NextResponse.json({ points: [], summary: null }, { status: 404 });
  }

  try {
    const trajectory = await getScoreTrajectory(cityId);
    return NextResponse.json(trajectory);
  } catch {
    return NextResponse.json({ points: [], summary: null });
  }
}
