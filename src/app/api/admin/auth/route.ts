import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { rateLimit } from "@/lib/rate-limit";
import { signAdminCookie, COOKIE_NAME } from "@/lib/admin-auth";
import { createLogger } from "@/lib/logger";

const logger = createLogger("admin/auth");

const ADMIN_PIN = process.env.ADMIN_PIN;

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // Rate limit: 5 PIN attempts per 15 minutes
  const rl = await rateLimit(`admin-pin:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.allowed) {
    logger.info(`Rate limited PIN attempt from ${ip}`);
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }

  // Verify PIN
  if (!ADMIN_PIN) {
    logger.error("ADMIN_PIN not configured");
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
    logger.info(`Wrong PIN attempt from ${ip}, ${rl.remaining} attempts remaining`);
    return NextResponse.json({ error: "Invalid PIN" }, { status: 403 });
  }

  // Success — set signed cookie
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL ?? "admin";
  logger.info(`PIN verified from ${ip}`);
  const cookieValue = signAdminCookie(adminEmail);
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
