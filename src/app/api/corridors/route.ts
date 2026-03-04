import { NextRequest, NextResponse } from "next/server";
import { getCorridors, getCorridorsForCity } from "@/lib/corridors";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/admin-helpers";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`corridors:${ip}`, 60, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  try {
    const cityId = request.nextUrl.searchParams.get("cityId");

    const corridors = cityId
      ? await getCorridorsForCity(cityId)
      : await getCorridors();

    return NextResponse.json({
      data: corridors,
      count: corridors.length,
    });
  } catch (err) {
    console.error("[API /corridors] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch corridors" },
      { status: 500 }
    );
  }
}
