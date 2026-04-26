/**
 * Signed share-token utilities. Lets admin mint read-only URLs that grant
 * a client temporary access to a specific report (RiskIndex assessment or
 * Site Shortlist), without needing to log them in.
 *
 * Token format: base64url(payload).hex(HMAC-SHA256(payload))
 * Payload:      JSON of { type, params, iat, exp, clientName? }
 *
 * Verify before trusting any field. Tokens are single-purpose — every
 * report path validates `type` separately.
 */

import crypto from "crypto";

export type ShareTokenType = "risk-assessment" | "site-shortlist" | "ahj-briefing";

export interface ShareTokenPayload {
  type: ShareTokenType;
  /** Per-type parameters (siteId, ids[], jurisdiction, etc.) */
  params: Record<string, string>;
  /** Issued at (epoch ms) */
  iat: number;
  /** Expires at (epoch ms) */
  exp: number;
  /** Optional client label shown on the report cover */
  clientName?: string;
}

const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecret(): string {
  const val = process.env.AUTH_SECRET;
  if (!val) throw new Error("AUTH_SECRET is required for share tokens");
  return val;
}

function base64url(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4);
  return Buffer.from(padded, "base64");
}

export function createShareToken(opts: {
  type: ShareTokenType;
  params: Record<string, string>;
  ttlMs?: number;
  clientName?: string;
}): string {
  const now = Date.now();
  const payload: ShareTokenPayload = {
    type: opts.type,
    params: opts.params,
    iat: now,
    exp: now + (opts.ttlMs ?? DEFAULT_TTL_MS),
    clientName: opts.clientName,
  };
  const payloadB64 = base64url(Buffer.from(JSON.stringify(payload)));
  const sig = crypto.createHmac("sha256", getSecret()).update(payloadB64).digest("hex");
  return `${payloadB64}.${sig}`;
}

export function verifyShareToken(token: string): ShareTokenPayload | null {
  try {
    const dot = token.lastIndexOf(".");
    if (dot === -1) return null;

    const payloadB64 = token.slice(0, dot);
    const sig = token.slice(dot + 1);

    const expectedSig = crypto.createHmac("sha256", getSecret()).update(payloadB64).digest("hex");
    if (sig.length !== expectedSig.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;

    const payload = JSON.parse(fromBase64url(payloadB64).toString("utf8")) as ShareTokenPayload;

    if (typeof payload !== "object" || !payload) return null;
    if (typeof payload.type !== "string") return null;
    if (typeof payload.params !== "object" || !payload.params) return null;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Build the path the client visits for a given share token. Always under
 * /reports/share/[token] so the route guard is centralized.
 */
export function shareUrl(token: string): string {
  return `/reports/share/${encodeURIComponent(token)}`;
}
