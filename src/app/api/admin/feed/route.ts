import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { requireAdmin, getClientIp } from "@/lib/admin-helpers";
import { getAllFeedItems, createFeedItem, FEED_CATEGORIES } from "@/lib/feed";
import { CITIES_MAP } from "@/data/seed";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const items = await getAllFeedItems();
    return NextResponse.json({ data: items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch feed items";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`admin-feed-post:${ip}`, 10, 5 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const denied = await requireAdmin(request);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { title, summary, category } = body as {
    title?: string;
    summary?: string;
    category?: string;
  };

  if (!title || !summary || !category) {
    return NextResponse.json(
      { error: "Missing required fields: title, summary, category" },
      { status: 400 }
    );
  }

  if (!FEED_CATEGORIES.includes(category as (typeof FEED_CATEGORIES)[number])) {
    return NextResponse.json(
      { error: `Invalid category. Must be one of: ${FEED_CATEGORIES.join(", ")}` },
      { status: 400 }
    );
  }

  // Validate cityIds
  const rawCityIds = Array.isArray(body.cityIds) ? body.cityIds : [];
  const cityIds = rawCityIds
    .filter((id): id is string => typeof id === "string" && !!CITIES_MAP[id])
    .slice(0, 10);

  // Validate sourceUrl
  const rawSourceUrl = body.sourceUrl as string | undefined;
  const sourceUrl = rawSourceUrl && /^https?:\/\//i.test(rawSourceUrl)
    ? rawSourceUrl.slice(0, 2048)
    : undefined;

  const status = body.status === "published" ? "published" : "draft";

  try {
    const item = await createFeedItem({
      title: title.slice(0, 300),
      summary: summary.slice(0, 1000),
      sourceUrl,
      category,
      cityIds,
      scoreImpact: body.scoreImpact === true,
      status,
    });
    return NextResponse.json({ ok: true, data: item }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create feed item";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
