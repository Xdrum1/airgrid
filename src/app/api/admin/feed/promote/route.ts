import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { requireAdmin, getClientIp } from "@/lib/admin-helpers";
import { promoteToDraft } from "@/lib/feed";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`admin-feed-promote:${ip}`, 10, 5 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const denied = await requireAdmin(request);
  if (denied) return denied;

  let body: { recordId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.recordId) {
    return NextResponse.json({ error: "Missing required field: recordId" }, { status: 400 });
  }

  try {
    const item = await promoteToDraft(body.recordId);
    return NextResponse.json({ ok: true, data: item }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to promote record";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
