/**
 * API key generation, validation, and management.
 */

import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";

const KEY_PREFIX = "aix_";

/** Generate a raw API key: aix_ + 40 hex chars */
export function generateRawKey(): string {
  return KEY_PREFIX + randomBytes(20).toString("hex");
}

/** SHA-256 hash of a raw key for storage */
export function hashKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

/** Extract display prefix from raw key (first 8 chars after aix_) */
function keyPrefix(rawKey: string): string {
  return rawKey.slice(0, KEY_PREFIX.length + 8);
}

/** Create a new API key — returns the raw key (shown once) + DB record */
export async function createApiKey(userId: string, name: string, tier: string) {
  const rawKey = generateRawKey();
  const record = await prisma.apiKey.create({
    data: {
      userId,
      name,
      keyHash: hashKey(rawKey),
      keyPrefix: keyPrefix(rawKey),
      tier,
    },
  });
  return { rawKey, record };
}

/** Validate a raw API key — returns the key record or null */
export async function validateApiKey(rawKey: string) {
  if (!rawKey.startsWith(KEY_PREFIX)) return null;

  const hash = hashKey(rawKey);
  const key = await prisma.apiKey.findUnique({
    where: { keyHash: hash },
    include: { user: { select: { id: true, email: true, tier: true } } },
  });

  if (!key || key.revokedAt) return null;
  return key;
}

/** Update lastUsedAt (fire-and-forget) */
export function touchApiKey(keyId: string) {
  prisma.apiKey.update({
    where: { id: keyId },
    data: { lastUsedAt: new Date() },
  }).catch(() => {}); // best-effort
}

/** Revoke an API key */
export async function revokeApiKey(keyId: string, userId: string) {
  const key = await prisma.apiKey.findFirst({
    where: { id: keyId, userId, revokedAt: null },
  });
  if (!key) return null;

  return prisma.apiKey.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
  });
}

/** List active API keys for a user */
export async function listApiKeys(userId: string) {
  return prisma.apiKey.findMany({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      tier: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });
}
