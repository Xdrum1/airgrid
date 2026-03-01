import { NextRequest, NextResponse } from "next/server";
import { verifyAdminCookie, COOKIE_NAME } from "@/lib/admin-auth";

export function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookie || !verifyAdminCookie(cookie)) {
    return NextResponse.json({ error: "Admin PIN required" }, { status: 403 });
  }

  return null;
}
