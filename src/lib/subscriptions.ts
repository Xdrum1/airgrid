import type { ChangeType } from "@/types";
import { CITIES_MAP } from "@/data/seed";
import { prisma } from "@/lib/prisma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_CHANGE_TYPES: ChangeType[] = [
  "new_filing",
  "status_change",
  "new_law",
  "faa_update",
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

export async function getSubscriptions() {
  const subs = await prisma.subscription.findMany({
    include: { user: { select: { email: true } } },
  });
  return subs.map((s) => ({
    id: s.id,
    email: s.user.email,
    cityIds: s.cityIds,
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
    changeTypes: s.changeTypes as ChangeType[],
    createdAt: s.createdAt.toISOString(),
  }));
}

export async function addSubscription(
  userId: string,
  cityIds: string[],
  changeTypes: ChangeType[]
) {
  // Duplicate check
  const existing = await prisma.subscription.findFirst({
    where: {
      userId,
      cityIds: { equals: [...cityIds].sort() },
      changeTypes: { equals: [...changeTypes].sort() },
    },
  });
  if (existing) throw new Error("DUPLICATE");

  const sub = await prisma.subscription.create({
    data: {
      userId,
      cityIds: [...cityIds].sort(),
      changeTypes: [...changeTypes].sort(),
    },
  });

  return {
    id: sub.id,
    cityIds: sub.cityIds,
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
