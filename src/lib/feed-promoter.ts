/**
 * Feed Promoter — auto-promotes high-confidence pipeline signals to FeedItem
 *
 * Scans recent ClassificationResult records with HIGH confidence and
 * relevant event types, creates draft FeedItem records for admin review.
 * Does NOT auto-publish — items go to draft status for editorial review.
 *
 * Idempotent: uses classificationResultId to skip already-promoted signals.
 */

import { createLogger } from "@/lib/logger";

const logger = createLogger("feed-promoter");

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

// Event types worth promoting to the feed
const PROMOTABLE_EVENTS = new Set([
  "state_legislation_signed",
  "state_legislation_enacted",
  "vertiport_zoning_approved",
  "vertiport_development",
  "faa_corridor_filing",
  "regulatory_posture_change",
  "faa_rulemaking",
  "operator_market_expansion",
  "operator_certification",
  "pilot_program_launch",
  "infrastructure_development",
]);

// Map event type → feed category
function eventToCategory(eventType: string): string {
  if (eventType.startsWith("state_legislation")) return "Legislative";
  if (eventType.startsWith("vertiport") || eventType === "infrastructure_development") return "Infrastructure";
  if (eventType.startsWith("operator")) return "Operator";
  return "Regulatory";
}

// Generate a URL-safe slug from title
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export interface PromoteResult {
  scanned: number;
  promoted: number;
  skipped: number;
  alreadyPromoted: number;
}

/**
 * Scan recent classifications and promote high-confidence signals to feed drafts.
 * @param daysBack — how many days of classifications to scan (default 7)
 */
export async function promoteSignalsToFeed(daysBack = 7): Promise<PromoteResult> {
  const prisma = await getPrisma();
  const since = new Date(Date.now() - daysBack * 86400000);

  const result: PromoteResult = {
    scanned: 0,
    promoted: 0,
    skipped: 0,
    alreadyPromoted: 0,
  };

  // Find high-confidence classified signals
  const classifications = await prisma.classificationResult.findMany({
    where: {
      createdAt: { gte: since },
      confidence: "high",
      eventType: { not: "not_relevant" },
    },
    orderBy: { createdAt: "desc" },
  });

  result.scanned = classifications.length;

  // Check which are already promoted
  const existingPromotions = new Set(
    (
      await prisma.feedItem.findMany({
        where: { classificationResultId: { in: classifications.map((c) => c.id) } },
        select: { classificationResultId: true },
      })
    ).map((f) => f.classificationResultId)
  );

  // Batch-fetch the source records for titles/URLs
  const recordIds = [...new Set(classifications.map((c) => c.recordId))];
  const records = await prisma.ingestedRecord.findMany({
    where: { id: { in: recordIds } },
    select: { id: true, title: true, url: true, source: true },
  });
  const recordMap = new Map(records.map((r) => [r.id, r]));

  for (const cls of classifications) {
    // Skip if already promoted
    if (existingPromotions.has(cls.id)) {
      result.alreadyPromoted++;
      continue;
    }

    // Skip non-promotable event types
    if (!cls.eventType || !PROMOTABLE_EVENTS.has(cls.eventType)) {
      result.skipped++;
      continue;
    }

    const record = recordMap.get(cls.recordId);
    const title = record?.title ?? "Untitled signal";
    const category = eventToCategory(cls.eventType);
    const slug = slugify(title) + "-" + cls.id.slice(-6);

    // Create a short editorial summary from the title
    const summary = `${title}. Classified as ${cls.eventType.replace(/_/g, " ")} with high confidence.`;

    await prisma.feedItem.create({
      data: {
        slug,
        title: title.slice(0, 300),
        summary: summary.slice(0, 500),
        sourceUrl: record?.url ?? null,
        category,
        cityIds: cls.affectedCities ?? [],
        scoreImpact: false,
        status: "draft",
        promotedBy: "auto",
        sourceRecordId: cls.recordId,
        classificationResultId: cls.id,
      },
    });

    result.promoted++;
  }

  logger.info(
    `Feed promoter: ${result.scanned} scanned, ${result.promoted} promoted, ` +
    `${result.skipped} skipped (wrong type), ${result.alreadyPromoted} already promoted`
  );

  return result;
}
