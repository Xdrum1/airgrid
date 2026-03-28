import { NextRequest, NextResponse } from "next/server";
import { getHeliportsGeoJSON } from "@/lib/heliports";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/admin-helpers";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`heliports:${ip}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  try {
    const geojson = await getHeliportsGeoJSON();
    return NextResponse.json(geojson, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (err) {
    console.error("[API /heliports] Error:", err);
    return NextResponse.json({ error: "Failed to fetch heliports" }, { status: 500 });
  }
}
