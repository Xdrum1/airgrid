import { NextRequest, NextResponse } from "next/server";
import { getCorridors, getCorridorsForCity } from "@/lib/corridors";

export async function GET(request: NextRequest) {
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
