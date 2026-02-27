import { NextRequest, NextResponse } from "next/server";
import { fetchFederalRegisterUAM } from "@/lib/faa-api";

export async function GET(request: NextRequest) {
  const days = Math.min(Math.max(Number(request.nextUrl.searchParams.get("days") ?? 90), 1), 730);

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
