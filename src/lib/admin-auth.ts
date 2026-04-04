import crypto from "crypto";

function getAuthSecret(): string {
  const val = process.env.AUTH_SECRET;
  if (!val) throw new Error("AUTH_SECRET is required");
  return val;
}

function getAdminEmail(): string {
  const val = process.env.ADMIN_NOTIFY_EMAIL;
  if (!val) throw new Error("ADMIN_NOTIFY_EMAIL is required");
  return val;
}
const COOKIE_NAME = "admin-verified";
const MAX_AGE_MS = 4 * 60 * 60 * 1000; // 4 hours

/**
 * Create a signed admin cookie value.
 * Format: base64({email, ts}).HMAC-SHA256-signature
 */
export function signAdminCookie(email: string): string {
  const payload = Buffer.from(JSON.stringify({ email, ts: Date.now() })).toString("base64");
  const sig = crypto.createHmac("sha256", getAuthSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

/**
 * Verify an admin cookie: check signature, email, and expiry.
 */
export function verifyAdminCookie(cookie: string): boolean {
  const dotIdx = cookie.lastIndexOf(".");
  if (dotIdx === -1) return false;

  const payload = cookie.slice(0, dotIdx);
  const sig = cookie.slice(dotIdx + 1);

  const expectedSig = crypto.createHmac("sha256", getAuthSecret()).update(payload).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return false;
  }

  try {
    const { email, ts } = JSON.parse(Buffer.from(payload, "base64").toString("utf-8"));
    if (email !== getAdminEmail()) return false;
    if (Date.now() - ts > MAX_AGE_MS) return false;
    return true;
  } catch {
    return false;
  }
}

export { COOKIE_NAME };
