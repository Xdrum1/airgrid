import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import crypto from "crypto";
import { rateLimit } from "@/lib/rate-limit";
import { signAdminCookie, COOKIE_NAME } from "@/lib/admin-auth";

const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL;
const ADMIN_PIN = process.env.ADMIN_PIN;

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // Rate limit: 5 PIN attempts per 15 minutes
  const rl = rateLimit(`admin-pin:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.allowed) {
    console.log(`[admin/auth] Rate limited PIN attempt from ${ip}`);
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }

  // Verify JWT — must be logged in as admin
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
  if (!token?.email || token.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify PIN
  if (!ADMIN_PIN) {
    console.error("[admin/auth] ADMIN_PIN not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  let body: { pin?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const pinMatch =
    typeof body.pin === "string" &&
    body.pin.length === ADMIN_PIN.length &&
    crypto.timingSafeEqual(Buffer.from(body.pin), Buffer.from(ADMIN_PIN));
  if (!pinMatch) {
    console.log(`[admin/auth] Wrong PIN attempt from ${token.email} (${ip}), ${rl.remaining} attempts remaining`);
    return NextResponse.json({ error: "Invalid PIN" }, { status: 403 });
  }

  // Success — set signed cookie
  console.log(`[admin/auth] PIN verified for ${token.email} (${ip})`);
  const cookieValue = signAdminCookie(token.email as string);
  const isProduction = process.env.NODE_ENV === "production";

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, cookieValue, {
    httpOnly: true,
    sameSite: "strict",
    secure: isProduction,
    maxAge: 3600, // 1 hour
    path: "/",
  });

  return response;
}
