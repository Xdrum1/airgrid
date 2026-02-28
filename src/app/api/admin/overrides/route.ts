import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  getPendingOverrides,
  approveOverride,
  rejectOverride,
} from "@/lib/admin";

const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL;

async function isAdmin(req: NextRequest): Promise<boolean> {
  if (!ADMIN_EMAIL) return false;
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  return token?.email === ADMIN_EMAIL;
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

    if (action === "approve") {
      const result = await approveOverride(overrideId, cityId);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "reject") {
      const result = await rejectOverride(overrideId);
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[admin/overrides] POST error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
