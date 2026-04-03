import { CITIES_MAP } from "@/data/seed";
import { addChangelogEntries } from "@/lib/changelog";
import { createLogger } from "@/lib/logger";

const logger = createLogger("market-watch");

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

// -------------------------------------------------------
// Constants
// -------------------------------------------------------

export const WATCH_STATUSES = ["STABLE", "POSITIVE_WATCH", "NEGATIVE_WATCH", "DEVELOPING"] as const;
export const OUTLOOKS = ["IMPROVING", "STABLE", "DETERIORATING"] as const;

export type WatchStatus = (typeof WATCH_STATUSES)[number];
export type Outlook = (typeof OUTLOOKS)[number];

// -------------------------------------------------------
// Read
// -------------------------------------------------------

export async function getMarketWatch(cityId: string) {
  const prisma = await getPrisma();
  return prisma.marketWatch.findUnique({ where: { cityId } });
}

export async function getAllMarketWatches() {
  const prisma = await getPrisma();
  return prisma.marketWatch.findMany({
    where: { published: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getAllMarketWatchesAdmin() {
  const prisma = await getPrisma();
  const watches = await prisma.marketWatch.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return watches.map((w) => ({
    ...w,
    cityName: CITIES_MAP[w.cityId]?.city ?? w.cityId,
  }));
}

/**
 * Get active pipeline-generated watch triggers (from WatchListEntry).
 * These are automated signals — not the admin-curated MarketWatch records.
 */
export async function getActivePipelineTriggers() {
  const prisma = await getPrisma();
  const entries = await prisma.watchListEntry.findMany({
    where: { resolvedAt: null },
    orderBy: { triggeredAt: "desc" },
  });
  return entries.map((e) => ({
    ...e,
    cityName: CITIES_MAP[e.cityId]?.city ?? e.cityId,
    state: CITIES_MAP[e.cityId]?.state ?? "",
  }));
}

export async function getRecentlyResolvedTriggers(days = 30) {
  const prisma = await getPrisma();
  const since = new Date(Date.now() - days * 86400000);
  const entries = await prisma.watchListEntry.findMany({
    where: { resolvedAt: { gte: since } },
    orderBy: { resolvedAt: "desc" },
  });
  return entries.map((e) => ({
    ...e,
    cityName: CITIES_MAP[e.cityId]?.city ?? e.cityId,
    state: CITIES_MAP[e.cityId]?.state ?? "",
  }));
}

export async function getWatchHistory(cityId: string, limit = 20) {
  const prisma = await getPrisma();
  return prisma.marketWatchHistory.findMany({
    where: { cityId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// -------------------------------------------------------
// Write
// -------------------------------------------------------

export async function updateMarketWatch(params: {
  cityId: string;
  watchStatus: WatchStatus;
  outlook: Outlook;
  analystNote?: string | null;
  reason: string;
  publish?: boolean;
  source?: "admin" | "ai_suggested";
  suggestedBy?: string;
}) {
  const prisma = await getPrisma();
  const { cityId, watchStatus, outlook, analystNote, reason, publish, source = "admin", suggestedBy } = params;

  // Get current state for history
  const current = await prisma.marketWatch.findUnique({ where: { cityId } });

  const now = new Date();
  const shouldPublish = publish ?? current?.published ?? false;
  const publishedAt = shouldPublish ? (current?.publishedAt ?? now) : null;

  // Upsert the watch record
  const watch = await prisma.marketWatch.upsert({
    where: { cityId },
    create: {
      cityId,
      watchStatus,
      outlook,
      analystNote: analystNote ?? null,
      published: shouldPublish,
      publishedAt: shouldPublish ? now : null,
    },
    update: {
      watchStatus,
      outlook,
      analystNote: analystNote ?? undefined,
      published: shouldPublish,
      publishedAt,
    },
  });

  // Create history entry
  await prisma.marketWatchHistory.create({
    data: {
      marketWatchId: watch.id,
      cityId,
      fromWatchStatus: current?.watchStatus ?? null,
      toWatchStatus: watchStatus,
      fromOutlook: current?.outlook ?? null,
      toOutlook: outlook,
      analystNote: analystNote ?? null,
      reason,
      source,
      suggestedBy,
      publishedAt: shouldPublish ? now : null,
    },
  });

  // Create changelog entry if published and status actually changed
  const statusChanged = current?.watchStatus !== watchStatus;
  const outlookChanged = current?.outlook !== outlook;

  if (shouldPublish && (statusChanged || outlookChanged || !current)) {
    const cityName = CITIES_MAP[cityId]?.city ?? cityId;
    const parts: string[] = [];
    if (statusChanged || !current) {
      parts.push(`watch status → ${watchStatus.replace("_", " ")}`);
    }
    if (outlookChanged || !current) {
      parts.push(`outlook → ${outlook}`);
    }

    await addChangelogEntries([
      {
        changeType: "watch_change" as const,
        relatedEntityType: "city" as const,
        relatedEntityId: cityId,
        summary: `${cityName}: ${parts.join(", ")}`,
      },
    ]);
  }

  logger.info(
    `[market-watch] ${cityId}: ${current?.watchStatus ?? "NEW"} → ${watchStatus}, outlook ${current?.outlook ?? "NEW"} → ${outlook} (published=${shouldPublish})`
  );

  return watch;
}

export async function publishMarketWatch(cityId: string) {
  const prisma = await getPrisma();
  return prisma.marketWatch.update({
    where: { cityId },
    data: { published: true, publishedAt: new Date() },
  });
}

export async function unpublishMarketWatch(cityId: string) {
  const prisma = await getPrisma();
  return prisma.marketWatch.update({
    where: { cityId },
    data: { published: false },
  });
}

// -------------------------------------------------------
// Suggestions
// -------------------------------------------------------

export async function getPendingSuggestions() {
  const prisma = await getPrisma();
  const suggestions = await prisma.marketWatchSuggestion.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "desc" },
  });
  return suggestions.map((s) => ({
    ...s,
    cityName: CITIES_MAP[s.cityId]?.city ?? s.cityId,
  }));
}

export async function dismissSuggestion(id: string) {
  const prisma = await getPrisma();
  return prisma.marketWatchSuggestion.update({
    where: { id },
    data: { status: "dismissed" },
  });
}

export async function acceptSuggestion(id: string) {
  const prisma = await getPrisma();
  return prisma.marketWatchSuggestion.update({
    where: { id },
    data: { status: "accepted" },
  });
}
