import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { requireAdmin, getClientIp } from "@/lib/admin-helpers";
import { getRecentClassifications } from "@/lib/admin";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);

  // Rate limit: 30 GET requests per 5 minutes
  const rl = await rateLimit(`admin-class-get:${ip}`, 30, 5 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = Math.min(Math.max(Number(limitParam ?? 50), 1), 200);
    const data = await getRecentClassifications(limit);
    console.log(`[admin] GET classifications limit=${limit} at=${new Date().toISOString()}`);
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[admin/classifications] GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch classifications" },
      { status: 500 }
    );
  }
}
