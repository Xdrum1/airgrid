import { NextRequest, NextResponse } from "next/server";
import { getScoreHistory } from "@/lib/score-history";
import { CITIES_MAP } from "@/data/seed";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cityId: string }> },
) {
  const { cityId } = await params;

  const rl = await rateLimit(`internal:score-history:${cityId}`, 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

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
