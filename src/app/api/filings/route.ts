import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchFederalRegisterUAM } from "@/lib/faa-api";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  // Require authentication — filings tab is gated in the UI
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Authentication required", data: [], count: 0 },
      { status: 401 }
    );
  }

  // Rate limit: 20 requests per 5 minutes per user
  const rl = await rateLimit(`filings:${session.user.id}`, 20, 5 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limited — try again later", data: [], count: 0 },
      { status: 429 }
    );
  }

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
