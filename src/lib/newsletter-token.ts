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

// ── Tracking tokens ─────────────────────────────────────

export function generateTrackingToken(email: string, issue: number): string {
  const hmac = createHmac("sha256", getSecret())
    .update(`newsletter-track:${email}:${issue}`)
    .digest("hex")
    .slice(0, 32);
  return hmac;
}

export function verifyTrackingToken(email: string, issue: number, token: string): boolean {
  const expected = generateTrackingToken(email, issue);
  return token === expected;
}

export function buildTrackingPixelUrl(email: string, issue: number): string {
  const token = generateTrackingToken(email, issue);
  const base = process.env.APP_URL || "https://www.airindex.io";
  return `${base}/api/newsletter/track?e=${encodeURIComponent(email)}&i=${issue}&t=${token}`;
}

export function buildClickTrackUrl(email: string, issue: number, destinationUrl: string): string {
  const token = generateTrackingToken(email, issue);
  const base = process.env.APP_URL || "https://www.airindex.io";
  return `${base}/api/newsletter/click?e=${encodeURIComponent(email)}&i=${issue}&t=${token}&url=${encodeURIComponent(destinationUrl)}`;
}
