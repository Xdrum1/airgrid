import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { verifyAdminCookie, COOKIE_NAME } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rate-limit";
import { getRecentClassifications } from "@/lib/admin";

const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL;

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);

  // Rate limit: 30 GET requests per 5 minutes
  const rl = rateLimit(`admin-class-get:${ip}`, 30, 5 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  // Check JWT
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
  if (!token?.email || token.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check signed admin cookie (PIN verification)
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (!cookie || !verifyAdminCookie(cookie)) {
    return NextResponse.json({ error: "Admin PIN required" }, { status: 403 });
  }

  try {
    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = Math.min(Math.max(Number(limitParam ?? 50), 1), 200);
    const data = await getRecentClassifications(limit);
    console.log(`[admin] GET classifications limit=${limit} by=${token.email} at=${new Date().toISOString()}`);
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[admin/classifications] GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch classifications" },
      { status: 500 }
    );
  }
}
