/**
 * Feed data access — CRUD for FeedItem records.
 * Follows the corridors.ts pattern: lazy Prisma, in-memory cache, invalidation.
 */

import { CITIES_MAP } from "@/data/seed";
import { createLogger } from "@/lib/logger";

const logger = createLogger("feed");

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

// -------------------------------------------------------
// In-memory cache (60s TTL)
// -------------------------------------------------------

let cachedFeed: FeedItemPublic[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000;

export function invalidateFeedCache() {
  cachedFeed = null;
  cacheTimestamp = 0;
}

// -------------------------------------------------------
// Types
// -------------------------------------------------------

export const FEED_CATEGORIES = ["Regulatory", "Infrastructure", "Operator", "Legislative"] as const;
export type FeedCategory = (typeof FEED_CATEGORIES)[number];

export interface FeedItemPublic {
  id: string;
  title: string;
  summary: string;
  sourceUrl: string | null;
  category: string;
  cityIds: string[];
  cities: { id: string; name: string }[];
  scoreImpact: boolean;
  publishedAt: string;
}

export interface FeedItemAdmin extends FeedItemPublic {
  status: string;
  promotedBy: string | null;
  sourceRecordId: string | null;
  classificationResultId: string | null;
  createdAt: string;
}

// -------------------------------------------------------
// Public reads
// -------------------------------------------------------

export async function getPublishedFeedItems(options?: {
  limit?: number;
  offset?: number;
  category?: string;
  cityId?: string;
}): Promise<{ items: FeedItemPublic[]; total: number }> {
  const { limit = 20, offset = 0, category, cityId } = options ?? {};

  const now = Date.now();
  if (cachedFeed && now - cacheTimestamp < CACHE_TTL_MS && !category && !cityId && offset === 0 && limit >= 20) {
    return { items: cachedFeed.slice(0, limit), total: cachedFeed.length };
  }

  try {
    const prisma = await getPrisma();

    const where: Record<string, unknown> = {
      status: "published",
      publishedAt: { not: null },
    };
    if (category) where.category = category;
    if (cityId) where.cityIds = { has: cityId };

    const [rows, total] = await Promise.all([
      prisma.feedItem.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.feedItem.count({ where }),
    ]);

    const items: FeedItemPublic[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      summary: r.summary,
      sourceUrl: r.sourceUrl,
      category: r.category,
      cityIds: r.cityIds,
      cities: r.cityIds
        .map((id) => ({ id, name: CITIES_MAP[id]?.city ?? id }))
        .filter((c) => c.name !== c.id || CITIES_MAP[c.id]),
      scoreImpact: r.scoreImpact,
      publishedAt: (r.publishedAt ?? r.createdAt).toISOString(),
    }));

    // Cache unfiltered results
    if (!category && !cityId && offset === 0) {
      cachedFeed = items;
      cacheTimestamp = Date.now();
    }

    return { items, total };
  } catch (err) {
    logger.error("Failed to fetch feed items:", err);
    return { items: [], total: 0 };
  }
}

// -------------------------------------------------------
// Admin reads
// -------------------------------------------------------

export async function getAllFeedItems(): Promise<FeedItemAdmin[]> {
  const prisma = await getPrisma();
  const rows = await prisma.feedItem.findMany({
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toAdmin);
}

export async function getFeedItemById(id: string): Promise<FeedItemAdmin | null> {
  const prisma = await getPrisma();
  const row = await prisma.feedItem.findUnique({ where: { id } });
  return row ? toAdmin(row) : null;
}

// -------------------------------------------------------
// Admin writes
// -------------------------------------------------------

export interface CreateFeedItemInput {
  title: string;
  summary: string;
  sourceUrl?: string;
  category: string;
  cityIds: string[];
  scoreImpact?: boolean;
  status?: string;
  promotedBy?: string;
  sourceRecordId?: string;
  classificationResultId?: string;
}

export async function createFeedItem(data: CreateFeedItemInput): Promise<FeedItemAdmin> {
  const prisma = await getPrisma();
  const now = new Date();

  const row = await prisma.feedItem.create({
    data: {
      title: data.title,
      summary: data.summary,
      sourceUrl: data.sourceUrl ?? null,
      category: data.category,
      cityIds: data.cityIds,
      scoreImpact: data.scoreImpact ?? false,
      status: data.status ?? "draft",
      promotedBy: data.promotedBy ?? "admin",
      sourceRecordId: data.sourceRecordId ?? null,
      classificationResultId: data.classificationResultId ?? null,
      publishedAt: data.status === "published" ? now : null,
    },
  });

  if (row.status === "published") invalidateFeedCache();
  return toAdmin(row);
}

export interface UpdateFeedItemInput {
  title?: string;
  summary?: string;
  sourceUrl?: string | null;
  category?: string;
  cityIds?: string[];
  scoreImpact?: boolean;
  status?: string;
}

export async function updateFeedItem(id: string, data: UpdateFeedItemInput): Promise<FeedItemAdmin> {
  const prisma = await getPrisma();

  // If publishing, set publishedAt
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.summary !== undefined) updateData.summary = data.summary;
  if (data.sourceUrl !== undefined) updateData.sourceUrl = data.sourceUrl;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.cityIds !== undefined) updateData.cityIds = data.cityIds;
  if (data.scoreImpact !== undefined) updateData.scoreImpact = data.scoreImpact;
  if (data.status !== undefined) {
    updateData.status = data.status;
    if (data.status === "published") {
      // Only set publishedAt on first publish
      const existing = await prisma.feedItem.findUnique({ where: { id }, select: { publishedAt: true } });
      if (!existing?.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }
  }

  const row = await prisma.feedItem.update({
    where: { id },
    data: updateData,
  });

  invalidateFeedCache();
  return toAdmin(row);
}

export async function archiveFeedItem(id: string): Promise<void> {
  const prisma = await getPrisma();
  await prisma.feedItem.update({
    where: { id },
    data: { status: "archived" },
  });
  invalidateFeedCache();
}

// -------------------------------------------------------
// Promote from ingested record
// -------------------------------------------------------

export async function promoteToDraft(recordId: string): Promise<FeedItemAdmin> {
  const prisma = await getPrisma();

  const record = await prisma.ingestedRecord.findUnique({ where: { id: recordId } });
  if (!record) throw new Error("Ingested record not found");

  // Try to find a classification for this record
  const classification = await prisma.classificationResult.findFirst({
    where: { recordId },
    orderBy: { createdAt: "desc" },
  });

  // Infer category from source
  const categoryMap: Record<string, string> = {
    federal_register: "Regulatory",
    legiscan: "Legislative",
    sec_edgar: "Operator",
    operator_news: "Operator",
  };

  return createFeedItem({
    title: record.title.slice(0, 300),
    summary: record.summary.slice(0, 500),
    sourceUrl: record.url,
    category: categoryMap[record.source] ?? "Regulatory",
    cityIds: classification?.affectedCities ?? [],
    scoreImpact: false,
    status: "draft",
    promotedBy: "admin",
    sourceRecordId: recordId,
    classificationResultId: classification?.id ?? undefined,
  });
}

// -------------------------------------------------------
// Mapper
// -------------------------------------------------------

function toAdmin(row: {
  id: string;
  title: string;
  summary: string;
  sourceUrl: string | null;
  category: string;
  cityIds: string[];
  scoreImpact: boolean;
  status: string;
  promotedBy: string | null;
  sourceRecordId: string | null;
  classificationResultId: string | null;
  publishedAt: Date | null;
  createdAt: Date;
}): FeedItemAdmin {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    sourceUrl: row.sourceUrl,
    category: row.category,
    cityIds: row.cityIds,
    cities: row.cityIds
      .map((id) => ({ id, name: CITIES_MAP[id]?.city ?? id }))
      .filter((c) => c.name !== c.id || CITIES_MAP[c.id]),
    scoreImpact: row.scoreImpact,
    publishedAt: (row.publishedAt ?? row.createdAt).toISOString(),
    status: row.status,
    promotedBy: row.promotedBy,
    sourceRecordId: row.sourceRecordId,
    classificationResultId: row.classificationResultId,
    createdAt: row.createdAt.toISOString(),
  };
}
