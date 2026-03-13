/**
 * Signed tokens for newsletter unsubscribe links.
 * No login required — the token proves the email owner clicked the link.
 */

import { createHmac } from "crypto";

function getSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required for newsletter tokens");
  return secret;
}

export function generateUnsubscribeToken(email: string): string {
  const hmac = createHmac("sha256", getSecret())
    .update(`newsletter-unsub:${email}`)
    .digest("hex");
  return hmac;
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = generateUnsubscribeToken(email);
  return token === expected;
}

export function buildUnsubscribeUrl(email: string): string {
  const token = generateUnsubscribeToken(email);
  const base = process.env.APP_URL || "https://www.airindex.io";
  return `${base}/newsletter/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}
