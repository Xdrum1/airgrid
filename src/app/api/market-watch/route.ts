import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getAllMarketWatches } from "@/lib/market-watch";
import { hasProAccess } from "@/lib/billing";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const watches = await getAllMarketWatches();

    // Check if user has Pro access for analyst notes
    const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
    const isPro = token?.email ? await hasProAccess(token.email as string) : false;

    const data = watches.map((w) => ({
      cityId: w.cityId,
      watchStatus: w.watchStatus,
      outlook: w.outlook,
      analystNote: isPro ? w.analystNote : null,
      publishedAt: w.publishedAt?.toISOString() ?? null,
      updatedAt: w.updatedAt.toISOString(),
    }));

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[api/market-watch] error:", err);
    return NextResponse.json({ error: "Failed to fetch watch data" }, { status: 500 });
  }
}
