import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { requireAdmin, getClientIp } from "@/lib/admin-helpers";
import { createCorridor } from "@/lib/corridors";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  const rl = await rateLimit(`admin-corridors-post:${ip}`, 10, 5 * 60 * 1000);
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

  const { name, status, cityId, startPointLabel, endPointLabel } = body as {
    name?: string;
    status?: string;
    cityId?: string;
    startPointLabel?: string;
    endPointLabel?: string;
  };

  if (!name || !status || !cityId || !startPointLabel || !endPointLabel) {
    return NextResponse.json(
      { error: "Missing required fields: name, status, cityId, startPointLabel, endPointLabel" },
      { status: 400 }
    );
  }

  // Validate sourceUrl if provided
  const rawSourceUrl = body.sourceUrl as string | undefined;
  const sourceUrl = rawSourceUrl && /^https?:\/\//i.test(rawSourceUrl)
    ? rawSourceUrl.slice(0, 2048)
    : undefined;

  try {
    const corridor = await createCorridor({
      name: name.slice(0, 200),
      status: status.slice(0, 50),
      cityId: cityId.slice(0, 100),
      operatorId: body.operatorId ? String(body.operatorId).slice(0, 100) : undefined,
      startPointLabel: startPointLabel.slice(0, 200),
      endPointLabel: endPointLabel.slice(0, 200),
      distanceKm: typeof body.distanceKm === "number" ? body.distanceKm : undefined,
      estimatedFlightMinutes: typeof body.estimatedFlightMinutes === "number" ? body.estimatedFlightMinutes : undefined,
      notes: body.notes ? String(body.notes).slice(0, 2000) : undefined,
      sourceUrl,
    });
    return NextResponse.json({ ok: true, data: corridor }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create corridor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
