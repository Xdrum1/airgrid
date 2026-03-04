import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { rateLimit } from "@/lib/rate-limit";
import { signAdminCookie, COOKIE_NAME } from "@/lib/admin-auth";
import { getClientIp } from "@/lib/admin-helpers";
import { createLogger } from "@/lib/logger";

const logger = createLogger("admin/auth");

const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL;
const ADMIN_PIN = process.env.ADMIN_PIN;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // Rate limit: 5 attempts per 15 minutes
  const rl = await rateLimit(`admin-pin:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.allowed) {
    logger.info(`Rate limited admin auth attempt from ${ip}`);
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }

  if (!ADMIN_PIN || !ADMIN_EMAIL) {
    const missing = [
      !ADMIN_EMAIL && "ADMIN_NOTIFY_EMAIL",
      !ADMIN_PIN && "ADMIN_PIN",
    ].filter(Boolean).join(", ");
    logger.error(`Missing env vars: ${missing}`);
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  let body: { email?: string; pin?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Verify email matches admin email (timing-safe)
  const emailMatch =
    typeof body.email === "string" &&
    body.email.length === ADMIN_EMAIL.length &&
    crypto.timingSafeEqual(
      Buffer.from(body.email.toLowerCase()),
      Buffer.from(ADMIN_EMAIL.toLowerCase())
    );

  // Verify PIN (timing-safe)
  const pinMatch =
    typeof body.pin === "string" &&
    body.pin.length === ADMIN_PIN.length &&
    crypto.timingSafeEqual(Buffer.from(body.pin), Buffer.from(ADMIN_PIN));

  if (!emailMatch || !pinMatch) {
    logger.info(`Failed admin auth from ${ip}, ${rl.remaining} attempts remaining`);
    return NextResponse.json({ error: "Invalid credentials" }, { status: 403 });
  }

  // Success — set signed cookie
  logger.info(`Admin verified from ${ip}`);
  const cookieValue = signAdminCookie(ADMIN_EMAIL);
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
