import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { requireAdmin, getClientIp } from "@/lib/admin-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // Rate limit: 5 bulk operations per 5 minutes
  const rl = await rateLimit(`admin-bulk-reject:${ip}`, 5, 5 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { ids } = body as { ids: string[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Missing or empty ids array" },
        { status: 400 }
      );
    }

    if (ids.length > 500) {
      return NextResponse.json(
        { error: "Maximum 500 IDs per request" },
        { status: 400 }
      );
    }

    const now = new Date();

    const result = await prisma.scoringOverride.updateMany({
      where: {
        id: { in: ids },
        supersededAt: null,
      },
      data: { supersededAt: now },
    });

    const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
    console.log(
      `[admin] BULK REJECT count=${result.count} by=${token?.email} at=${now.toISOString()}`
    );

    return NextResponse.json({ ok: true, rejected: result.count });
  } catch (err) {
    console.error("[admin/overrides/bulk-reject] error:", err);
    return NextResponse.json(
      { error: "Failed to bulk reject" },
      { status: 500 }
    );
  }
}
