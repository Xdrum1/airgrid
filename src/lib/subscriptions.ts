import type { ChangeType } from "@/types";
import { CITIES_MAP, CORRIDORS_MAP } from "@/data/seed";
import { prisma } from "@/lib/prisma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_CHANGE_TYPES: ChangeType[] = [
  "new_filing",
  "status_change",
  "new_law",
  "faa_update",
  "score_change",
];

export function validateEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

export function validateCityIds(cityIds: string[]): boolean {
  if (cityIds.length === 0) return true; // empty = all cities
  return cityIds.every((id) => id in CITIES_MAP);
}

export function validateChangeTypes(types: ChangeType[]): boolean {
  if (types.length === 0) return true; // empty = all types
  return types.every((t) => VALID_CHANGE_TYPES.includes(t));
}

export async function validateCorridorIds(corridorIds: string[]): Promise<boolean> {
  if (corridorIds.length === 0) return true;
  // Check DB first, fallback to seed
  try {
    const dbCount = await prisma.corridor.count({
      where: { id: { in: corridorIds } },
    });
    return dbCount === corridorIds.length;
  } catch {
    return corridorIds.every((id) => id in CORRIDORS_MAP);
  }
}

export async function getSubscriptions() {
  const subs = await prisma.subscription.findMany({
    include: { user: { select: { email: true } } },
  });
  return subs.map((s) => ({
    id: s.id,
    email: s.user.email,
    cityIds: s.cityIds,
    corridorIds: s.corridorIds,
    changeTypes: s.changeTypes as ChangeType[],
    createdAt: s.createdAt.toISOString(),
  }));
}

export async function getSubscriptionsForUser(userId: string) {
  const subs = await prisma.subscription.findMany({
    where: { userId },
    include: { user: { select: { email: true } } },
  });
  return subs.map((s) => ({
    id: s.id,
    email: s.user.email,
    cityIds: s.cityIds,
    corridorIds: s.corridorIds,
    changeTypes: s.changeTypes as ChangeType[],
    createdAt: s.createdAt.toISOString(),
  }));
}

export async function addSubscription(
  userId: string,
  cityIds: string[],
  changeTypes: ChangeType[],
  corridorIds: string[] = []
) {
  // Duplicate check
  const existing = await prisma.subscription.findFirst({
    where: {
      userId,
      cityIds: { equals: [...cityIds].sort() },
      corridorIds: { equals: [...corridorIds].sort() },
      changeTypes: { equals: [...changeTypes].sort() },
    },
  });
  if (existing) throw new Error("DUPLICATE");

  const sub = await prisma.subscription.create({
    data: {
      userId,
      cityIds: [...cityIds].sort(),
      corridorIds: [...corridorIds].sort(),
      changeTypes: [...changeTypes].sort(),
    },
  });

  return {
    id: sub.id,
    cityIds: sub.cityIds,
    corridorIds: sub.corridorIds,
    changeTypes: sub.changeTypes as ChangeType[],
    createdAt: sub.createdAt.toISOString(),
  };
}

export async function removeSubscription(
  id: string,
  userId: string
): Promise<boolean> {
  const sub = await prisma.subscription.findFirst({
    where: { id, userId },
  });
  if (!sub) return false;

  await prisma.subscription.delete({ where: { id } });
  return true;
}
