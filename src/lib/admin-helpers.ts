import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminCookie, signAdminCookie, COOKIE_NAME } from "@/lib/admin-auth";

export function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export function authorizeCron(request: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${cronSecret}`;
  if (
    authHeader.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))
  ) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/**
 * Verify admin cookie. Returns null (authorized) or a 403 response.
 *
 * Note: This is a check-only function. For sliding expiry (cookie
 * refresh on success), wrap responses with refreshAdminCookie() in
 * the route handler.
 */
export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookie || !verifyAdminCookie(cookie)) {
    return NextResponse.json({ error: "Admin PIN required" }, { status: 403 });
  }

  return null;
}

/**
 * Refresh the admin cookie on a successful response (sliding expiry).
 * Call this before returning a response from an authenticated admin route
 * to extend the session without requiring re-authentication.
 */
export function refreshAdminCookie(response: NextResponse): NextResponse {
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
  if (!adminEmail) return response;
  const fresh = signAdminCookie(adminEmail);
  response.cookies.set(COOKIE_NAME, fresh, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 4 * 60 * 60, // 4 hours in seconds
    path: "/",
  });
  return response;
}
