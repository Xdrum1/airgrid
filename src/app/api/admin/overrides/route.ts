import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { rateLimit } from "@/lib/rate-limit";
import { requireAdmin, getClientIp } from "@/lib/admin-helpers";
import {
  getPendingOverrides,
  approveOverride,
  rejectOverride,
} from "@/lib/admin";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);

  // Rate limit: 30 GET requests per 5 minutes
  const rl = await rateLimit(`admin-overrides-get:${ip}`, 30, 5 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const overrides = await getPendingOverrides();
    return NextResponse.json({ data: overrides });
  } catch (err) {
    console.error("[admin/overrides] GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch overrides" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // Rate limit: 10 POST actions per 5 minutes
  const rl = await rateLimit(`admin-overrides-post:${ip}`, 10, 5 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { overrideId, action, cityId } = body as {
      overrideId: string;
      action: "approve" | "reject";
      cityId?: string;
    };

    if (!overrideId || !action) {
      return NextResponse.json(
        { error: "Missing overrideId or action" },
        { status: 400 }
      );
    }

    const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });

    if (action === "approve") {
      const result = await approveOverride(overrideId, cityId);
      console.log(`[admin] APPROVE override=${overrideId} by=${token?.email} at=${new Date().toISOString()}`);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "reject") {
      const result = await rejectOverride(overrideId);
      console.log(`[admin] REJECT override=${overrideId} by=${token?.email} at=${new Date().toISOString()}`);
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[admin/overrides] POST error:", err);
    return NextResponse.json({ error: "Failed to process override" }, { status: 500 });
  }
}
