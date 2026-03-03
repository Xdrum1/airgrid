/**
 * API v1 authentication middleware.
 * Extracts Bearer token, validates key, applies tier-based rate limiting.
 */

import { NextRequest } from "next/server";
import { validateApiKey, touchApiKey } from "@/lib/api/keys";
import { rateLimit } from "@/lib/rate-limit";
import { apiError } from "@/lib/api/transforms";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api-middleware");

const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  pro:            { limit: 100,    windowMs: 3_600_000 },
  grandfathered:  { limit: 100,    windowMs: 3_600_000 },
  institutional:  { limit: 1_000,  windowMs: 3_600_000 },
  enterprise:     { limit: 10_000, windowMs: 3_600_000 },
};

const DEFAULT_RATE_LIMIT = { limit: 100, windowMs: 3_600_000 };

function rateLimitHeaders(limit: number, remaining: number, resetAt: number) {
  const headers = new Headers();
  headers.set("X-RateLimit-Limit", String(limit));
  headers.set("X-RateLimit-Remaining", String(Math.max(0, remaining)));
  headers.set("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
  return headers;
}

export interface ApiContext {
  userId: string;
  email: string;
  tier: string;
  keyId: string;
}

export interface AuthResult {
  ctx: ApiContext;
  headers: Headers;
}

/**
 * Authenticate an API request.
 * Returns { ctx, headers } on success, or a NextResponse error.
 */
export async function authenticateApiRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: apiError("Missing or invalid Authorization header. Use: Bearer aix_...", 401) };
  }

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey) {
    return { error: apiError("Empty API key", 401) };
  }

  const key = await validateApiKey(rawKey);
  if (!key) {
    return { error: apiError("Invalid or revoked API key", 401) };
  }

  // Tier-based rate limiting
  const { limit, windowMs } = RATE_LIMITS[key.tier] ?? DEFAULT_RATE_LIMIT;
  const rl = await rateLimit(`api:${key.id}`, limit, windowMs);
  const headers = rateLimitHeaders(limit, rl.remaining, rl.resetAt);

  if (!rl.allowed) {
    logger.info(`Rate limited API key ${key.keyPrefix}... (tier: ${key.tier})`);
    return { error: apiError("Rate limit exceeded", 429, headers) };
  }

  // Touch lastUsedAt (fire-and-forget)
  touchApiKey(key.id);

  const ctx: ApiContext = {
    userId: key.user.id,
    email: key.user.email ?? "",
    tier: key.tier,
    keyId: key.id,
  };

  return { ctx, headers } as AuthResult;
}
