import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-helpers";
import { getRecentEvents } from "@/lib/event-tracking";

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const url = new URL(req.url);
  const userId = url.searchParams.get("userId") ?? undefined;
  const event = url.searchParams.get("event") ?? undefined;
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);

  try {
    const events = await getRecentEvents({ userId, event, limit });
    return NextResponse.json({ data: events, count: events.length });
  } catch {
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}
