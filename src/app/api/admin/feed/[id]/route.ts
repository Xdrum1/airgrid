import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { requireAdmin, getClientIp } from "@/lib/admin-helpers";
import { updateFeedItem, archiveFeedItem, FEED_CATEGORIES } from "@/lib/feed";
import { CITIES_MAP } from "@/data/seed";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(request);
  const { id } = await params;

  const rl = await rateLimit(`admin-feed-patch:${ip}`, 10, 5 * 60 * 1000);
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

  // Validate category if provided
  if (body.category && !FEED_CATEGORIES.includes(body.category as (typeof FEED_CATEGORIES)[number])) {
    return NextResponse.json(
      { error: `Invalid category. Must be one of: ${FEED_CATEGORIES.join(", ")}` },
      { status: 400 }
    );
  }

  // Sanitize fields
  const updateData: Record<string, unknown> = {};
  if (body.title) updateData.title = String(body.title).slice(0, 300);
  if (body.summary) updateData.summary = String(body.summary).slice(0, 1000);
  if (body.category) updateData.category = body.category;
  if (body.scoreImpact !== undefined) updateData.scoreImpact = body.scoreImpact === true;
  if (body.status !== undefined) updateData.status = body.status;

  if (body.sourceUrl !== undefined) {
    const raw = String(body.sourceUrl);
    updateData.sourceUrl = /^https?:\/\//i.test(raw) ? raw.slice(0, 2048) : null;
  }

  if (Array.isArray(body.cityIds)) {
    updateData.cityIds = body.cityIds
      .filter((id): id is string => typeof id === "string" && !!CITIES_MAP[id as string])
      .slice(0, 10);
  }

  try {
    const item = await updateFeedItem(id, updateData);
    return NextResponse.json({ ok: true, data: item });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update feed item";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(request);
  const { id } = await params;

  const rl = await rateLimit(`admin-feed-del:${ip}`, 10, 5 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    await archiveFeedItem(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to archive feed item";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
