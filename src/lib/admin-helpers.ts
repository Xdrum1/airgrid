import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { verifyAdminCookie, COOKIE_NAME } from "@/lib/admin-auth";

const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL;

export function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  if (!token?.email || token.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookie || !verifyAdminCookie(cookie)) {
    return NextResponse.json({ error: "Admin PIN required" }, { status: 403 });
  }

  return null;
}
