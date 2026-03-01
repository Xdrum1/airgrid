import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { logEvent, isValidEvent } from "@/lib/event-tracking";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Rate limit: 60 per minute per user
    const rl = await rateLimit(`events:${session.user.id}`, 60, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const body = await request.json();
    const { event, entityType, entityId, metadata } = body;

    if (!event || typeof event !== "string" || !isValidEvent(event)) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }

    // Fire-and-forget: don't await — respond immediately
    logEvent(session.user.id, event, entityType, entityId, metadata);

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to log event" }, { status: 500 });
  }
}
