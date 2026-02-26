import { prisma } from "@/lib/prisma";

export async function getWatchlist(userId: string): Promise<string[]> {
  const record = await prisma.watchlist.findUnique({
    where: { userId },
  });
  return record?.cityIds ?? [];
}

export async function addToWatchlist(
  userId: string,
  cityId: string
): Promise<string[]> {
  const record = await prisma.watchlist.upsert({
    where: { userId },
    create: { userId, cityIds: [cityId] },
    update: {
      cityIds: {
        push: cityId,
      },
    },
  });
  // Deduplicate in case of race conditions
  const unique = Array.from(new Set(record.cityIds));
  if (unique.length !== record.cityIds.length) {
    const updated = await prisma.watchlist.update({
      where: { userId },
      data: { cityIds: unique },
    });
    return updated.cityIds;
  }
  return record.cityIds;
}

export async function removeFromWatchlist(
  userId: string,
  cityId: string
): Promise<string[]> {
  const record = await prisma.watchlist.findUnique({
    where: { userId },
  });
  if (!record) return [];

  const updated = await prisma.watchlist.update({
    where: { userId },
    data: { cityIds: record.cityIds.filter((id) => id !== cityId) },
  });
  return updated.cityIds;
}
