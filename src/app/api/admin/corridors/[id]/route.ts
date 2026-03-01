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
