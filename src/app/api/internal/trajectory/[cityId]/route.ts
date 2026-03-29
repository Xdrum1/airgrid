import { NextRequest, NextResponse } from "next/server";
import { getScoreTrajectory } from "@/lib/score-history";
import { CITIES_MAP } from "@/data/seed";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cityId: string }> },
) {
  const { cityId } = await params;

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
