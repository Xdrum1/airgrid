import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/admin-helpers";
import { getPublishedFeedItems, FEED_CATEGORIES } from "@/lib/feed";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`feed:${ip}`, 60, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 50);
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);
  const category = searchParams.get("category");
  const cityId = searchParams.get("city");

  // Validate category if provided
  if (category && !FEED_CATEGORIES.includes(category as (typeof FEED_CATEGORIES)[number])) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const { items, total } = await getPublishedFeedItems({ limit, offset, category: category ?? undefined, cityId: cityId ?? undefined });

  return NextResponse.json({
    data: items,
    meta: { total, limit, offset, fetchedAt: new Date().toISOString() },
  });
}
