import { NextRequest, NextResponse } from "next/server";
import { getScoreHistory } from "@/lib/score-history";
import { CITIES_MAP } from "@/data/seed";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cityId: string }> },
) {
  const { cityId } = await params;

  if (!CITIES_MAP[cityId]) {
    return NextResponse.json([], { status: 404 });
  }

  try {
    const history = await getScoreHistory(cityId);
    return NextResponse.json(history);
  } catch {
    return NextResponse.json([]);
  }
}
