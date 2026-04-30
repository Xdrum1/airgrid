/**
 * Signed tokens for newsletter unsubscribe links.
 * No login required — the token proves the email owner clicked the link.
 */

import { createHmac, timingSafeEqual } from "crypto";

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
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
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
    .digest("hex");
  return hmac;
}

export function verifyTrackingToken(email: string, issue: number, token: string): boolean {
  const expected = generateTrackingToken(email, issue);
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export function buildTrackingPixelUrl(email: string, issue: number, series = "newsletter"): string {
  const token = generateTrackingToken(email, issue);
  const base = process.env.APP_URL || "https://www.airindex.io";
  return `${base}/api/newsletter/track?e=${encodeURIComponent(email)}&i=${issue}&t=${token}&s=${series}`;
}

// ── Click tokens (URL-bound — prevents open-redirect token reuse) ─────────────
//
// The pixel/track tokens above are bound to (email, issue) only, which is fine
// for an open pixel since there's no destination to abuse. Click tokens MUST
// also bind the destination URL — otherwise any holder of a valid (e, i, t)
// triple can substitute `url=` to redirect through airindex.io to any host.

export function generateClickToken(email: string, issue: number, url: string): string {
  const hmac = createHmac("sha256", getSecret())
    .update(`newsletter-click:${email}:${issue}:${url}`)
    .digest("hex");
  return hmac;
}

export function verifyClickToken(email: string, issue: number, url: string, token: string): boolean {
  const expected = generateClickToken(email, issue, url);
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export function buildClickTrackUrl(email: string, issue: number, destinationUrl: string, series = "newsletter"): string {
  const token = generateClickToken(email, issue, destinationUrl);
  const base = process.env.APP_URL || "https://www.airindex.io";
  return `${base}/api/newsletter/click?e=${encodeURIComponent(email)}&i=${issue}&t=${token}&s=${series}&url=${encodeURIComponent(destinationUrl)}`;
}
