import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { requireAdmin, getClientIp } from "@/lib/admin-helpers";
import { updateCorridorById, deleteCorridor } from "@/lib/corridors";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(request);
  const { id } = await params;

  const rl = await rateLimit(`admin-corridors-put:${ip}`, 10, 5 * 60 * 1000);
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

  // Sanitize sourceUrl if provided
  if (body.sourceUrl !== undefined) {
    const raw = String(body.sourceUrl);
    body.sourceUrl = /^https?:\/\//i.test(raw) ? raw.slice(0, 2048) : null;
  }

  // Cap string field lengths
  if (body.name) body.name = String(body.name).slice(0, 200);
  if (body.status) body.status = String(body.status).slice(0, 50);
  if (body.cityId) body.cityId = String(body.cityId).slice(0, 100);
  if (body.operatorId) body.operatorId = String(body.operatorId).slice(0, 100);
  if (body.startPointLabel) body.startPointLabel = String(body.startPointLabel).slice(0, 200);
  if (body.endPointLabel) body.endPointLabel = String(body.endPointLabel).slice(0, 200);
  if (body.notes) body.notes = String(body.notes).slice(0, 2000);

  try {
    const corridor = await updateCorridorById(id, body);
    return NextResponse.json({ ok: true, data: corridor });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update corridor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(request);
  const { id } = await params;

  const rl = await rateLimit(`admin-corridors-del:${ip}`, 10, 5 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    await deleteCorridor(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete corridor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
