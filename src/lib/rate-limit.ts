/**
 * Rate limiter with persistent Upstash Redis backend.
 * Falls back to in-memory when Upstash env vars are missing or Redis is unreachable.
 */

import { createLogger } from "@/lib/logger";

const logger = createLogger("rate-limit");

// -------------------------------------------------------
// In-memory fallback (same logic as original)
// -------------------------------------------------------

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  store.forEach((entry, key) => {
    if (now > entry.resetAt) store.delete(key);
  });
}, 60_000);

function inMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  entry.count++;
  if (entry.count > limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

// -------------------------------------------------------
// Upstash rate limiter (lazy-initialized)
// -------------------------------------------------------

type UpstashRatelimit = import("@upstash/ratelimit").Ratelimit;

const upstashInstances = new Map<string, UpstashRatelimit>();
let upstashAvailable: boolean | null = null;

async function getUpstashLimiter(limit: number, windowMs: number): Promise<UpstashRatelimit | null> {
  if (upstashAvailable === false) return null;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    upstashAvailable = false;
    return null;
  }

  const cacheKey = `${limit}:${windowMs}`;
  const cached = upstashInstances.get(cacheKey);
  if (cached) return cached;

  try {
    const { Redis } = await import("@upstash/redis");
    const { Ratelimit } = await import("@upstash/ratelimit");

    const redis = new Redis({ url, token });
    const windowSec = Math.max(1, Math.ceil(windowMs / 1000));

    const instance = new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(limit, `${windowSec} s`),
      prefix: "airgrid:rl",
    });

    upstashInstances.set(cacheKey, instance);
    upstashAvailable = true;
    return instance;
  } catch (err) {
    logger.error("Failed to initialize Upstash:", err);
    upstashAvailable = false;
    return null;
  }
}

// -------------------------------------------------------
// Public API
// -------------------------------------------------------

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check if a request is allowed under the rate limit.
 * Uses Upstash Redis when available, falls back to in-memory.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const limiter = await getUpstashLimiter(limit, windowMs);

  if (limiter) {
    try {
      const result = await limiter.limit(key);
      return {
        allowed: result.success,
        remaining: result.remaining,
        resetAt: result.reset,
      };
    } catch (err) {
      logger.error("Upstash request failed, falling back to in-memory:", err);
    }
  }

  return inMemoryRateLimit(key, limit, windowMs);
}
