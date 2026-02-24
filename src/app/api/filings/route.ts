import { NextRequest, NextResponse } from "next/server";
import { fetchFederalRegisterUAM } from "@/lib/faa-api";

export async function GET(request: NextRequest) {
  const days = Number(request.nextUrl.searchParams.get("days") ?? 90);

  try {
    const data = await fetchFederalRegisterUAM(days);
    return NextResponse.json({
      data,
      count: data.length,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[API /filings] Error:", err);
    return NextResponse.json(
      {
        error: "Failed to fetch filings",
        data: [],
        count: 0,
      },
      { status: 500 }
    );
  }
}
