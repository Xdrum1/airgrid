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

// -------------------------------------------------------
// Derivation — populate MarketWatch automatically from
// recent classifier events. Runs at the end of every
// ingestion cycle so the ratings-agency layer reflects
// current pipeline state without manual analyst input.
// -------------------------------------------------------

interface DerivationResult {
  evaluated: number;
  changed: number;
  changes: Array<{ cityId: string; from: string; to: string; reason: string }>;
}

// Categorical events that flip a market's watch status. These are rare,
// high-impact regulatory transitions — bills actually signed/killed, zoning
// actually approved. They survive the noise floor of operator news.
const HIGH_IMPACT_NEGATIVE = new Set(["state_legislation_failed"]);
const HIGH_IMPACT_POSITIVE = new Set([
  "state_legislation_signed",
  "vertiport_zoning_approved",
]);

// Activity-level events that signal elevated interest but don't categorically
// flip the market. Used to qualify a market for DEVELOPING when present in
// volume but never alone trigger POSITIVE_WATCH.
const ACTIVITY_EVENTS = new Set([
  "operator_market_expansion",
  "regulatory_posture_change",
  "infrastructure_development",
  "faa_certification_milestone",
  "faa_corridor_filing",
]);

const ACTIVITY_THRESHOLD = 3;

export async function deriveMarketWatchesFromSignals(): Promise<DerivationResult> {
  const prisma = await getPrisma();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

  // Pull all classifier results from the last 30 days, joined with the source
  // record so we can apply the cross-state guard. Existing classifications in
  // the DB include false-positive city assignments from earlier prompt versions
  // (e.g. AZ bills tagging las_vegas, VA bills tagging washington_dc).
  const recentClassifications = await prisma.classificationResult.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: {
      eventType: true,
      affectedCities: true,
      confidence: true,
      createdAt: true,
      recordId: true,
    },
  });

  // Fetch source record states in one query
  const recordIds = Array.from(new Set(recentClassifications.map((c) => c.recordId)));
  const records = await prisma.ingestedRecord.findMany({
    where: { id: { in: recordIds } },
    select: { id: true, state: true, title: true },
  });
  const recordById = new Map(records.map((r) => [r.id, r]));

  // Score change activity in the last 7 days
  const recentScoreChanges = await prisma.changelogEntry.findMany({
    where: {
      changeType: "score_change",
      timestamp: { gte: sevenDaysAgo },
    },
    select: { relatedEntityId: true },
  });

  const scoreChangeCounts = new Map<string, number>();
  for (const c of recentScoreChanges) {
    scoreChangeCounts.set(
      c.relatedEntityId,
      (scoreChangeCounts.get(c.relatedEntityId) ?? 0) + 1
    );
  }

  // Aggregate signal evidence per city — separate categorical vs activity
  type Evidence = {
    negativeCategorical: number;
    positiveCategorical: number;
    activityCount: number;
    latestNegativeAt?: Date;
    latestPositiveAt?: Date;
  };
  const byCity = new Map<string, Evidence>();
  // Filter against ceremonial / non-binding bill types — concurrent
  // resolutions ("SCR", "HCR", "SR", "HR" prefix), memorials, etc. The
  // classifier sometimes calls these "state_legislation_signed" but they
  // are not enforceable law and should not move scores.
  const isNonBindingTitle = (title: string | undefined): boolean => {
    if (!title) return false;
    return /\b(?:concurrent|simple)\s+resolution\b|memorial(?:ize|izing)?|commend|honoring|\bSCR\d|\bHCR\d|^\s*[A-Z]{2}\s+SR\d|^\s*[A-Z]{2}\s+HR\d/i.test(title);
  };

  for (const c of recentClassifications) {
    if (c.confidence !== "high" && c.confidence !== "medium") continue;
    const isCategoricalNegative = HIGH_IMPACT_NEGATIVE.has(c.eventType);
    const isCategoricalPositive = HIGH_IMPACT_POSITIVE.has(c.eventType);
    const isActivity = ACTIVITY_EVENTS.has(c.eventType);
    if (!isCategoricalNegative && !isCategoricalPositive && !isActivity) continue;

    const sourceRecord = recordById.get(c.recordId);
    const sourceState = sourceRecord?.state?.toUpperCase();

    // Drop non-binding resolutions for categorical positive events (the
    // case that motivated this filter — UT SCR010 was tagging Salt Lake
    // City as POSITIVE_WATCH for a non-binding resolution).
    if (isCategoricalPositive && isNonBindingTitle(sourceRecord?.title)) {
      continue;
    }

    for (const cityId of c.affectedCities) {
      if (!CITIES_MAP[cityId]) continue;

      // Cross-state guard: if the source has a state, the city must be
      // in that state. Drops AZ→las_vegas, VA→washington_dc errors.
      if (sourceState) {
        const cityState = CITIES_MAP[cityId]?.state;
        if (cityState !== sourceState) continue;
      }

      const ev = byCity.get(cityId) ?? { negativeCategorical: 0, positiveCategorical: 0, activityCount: 0 };
      if (isCategoricalNegative) {
        ev.negativeCategorical++;
        if (!ev.latestNegativeAt || c.createdAt > ev.latestNegativeAt) {
          ev.latestNegativeAt = c.createdAt;
        }
      } else if (isCategoricalPositive) {
        ev.positiveCategorical++;
        if (!ev.latestPositiveAt || c.createdAt > ev.latestPositiveAt) {
          ev.latestPositiveAt = c.createdAt;
        }
      } else if (isActivity) {
        ev.activityCount++;
      }
      byCity.set(cityId, ev);
    }
  }

  // Decide watch status + outlook for each city
  const result: DerivationResult = { evaluated: byCity.size, changed: 0, changes: [] };

  // Cities currently on watch — we want to demote them to STABLE if their
  // signal has aged out of the 30-day window and no new signals exist.
  const allCurrentWatches = await prisma.marketWatch.findMany({
    select: { cityId: true, watchStatus: true, outlook: true },
  });

  const citiesToConsider = new Set<string>([
    ...byCity.keys(),
    ...allCurrentWatches.filter((w) => w.watchStatus !== "STABLE").map((w) => w.cityId),
  ]);

  for (const cityId of citiesToConsider) {
    const ev = byCity.get(cityId) ?? { negativeCategorical: 0, positiveCategorical: 0, activityCount: 0 };
    const scoreChanges = scoreChangeCounts.get(cityId) ?? 0;

    let watchStatus: WatchStatus = "STABLE";
    let outlook: Outlook = "STABLE";
    let reason = "";

    if (
      ev.negativeCategorical > 0 &&
      (!ev.latestPositiveAt ||
        (ev.latestNegativeAt && ev.latestNegativeAt > ev.latestPositiveAt))
    ) {
      // Most recent categorical signal is negative — bill failed, zoning rejected
      watchStatus = "NEGATIVE_WATCH";
      outlook = "DETERIORATING";
      reason = `${ev.negativeCategorical} categorical negative event(s) in last 30 days. Latest: ${ev.latestNegativeAt?.toISOString().substring(0, 10)}.`;
    } else if (ev.positiveCategorical > 0) {
      // A real bill was signed or zoning was approved
      watchStatus = "POSITIVE_WATCH";
      outlook = "IMPROVING";
      reason = `${ev.positiveCategorical} categorical positive event(s) in last 30 days. Latest: ${ev.latestPositiveAt?.toISOString().substring(0, 10)}.`;
    } else if (ev.activityCount >= ACTIVITY_THRESHOLD || scoreChanges >= 2) {
      // High activity but no categorical event — elevated but undirectional
      watchStatus = "DEVELOPING";
      outlook = "STABLE";
      reason = `Elevated activity: ${ev.activityCount} operator/regulatory events in 30d, ${scoreChanges} score changes in 7d.`;
    } else {
      // Demote any existing non-STABLE entry back to STABLE since signal aged out
      const existingForDemotion = allCurrentWatches.find((w) => w.cityId === cityId);
      if (!existingForDemotion || existingForDemotion.watchStatus === "STABLE") {
        continue;
      }
      watchStatus = "STABLE";
      outlook = "STABLE";
      reason = `No qualifying signals in last 30 days — returning to STABLE.`;
    }

    // Skip if status hasn't changed (avoid history-table bloat)
    const existing = await prisma.marketWatch.findUnique({ where: { cityId } });
    if (
      existing &&
      existing.watchStatus === watchStatus &&
      existing.outlook === outlook
    ) {
      continue;
    }

    await updateMarketWatch({
      cityId,
      watchStatus,
      outlook,
      reason,
      source: "ai_suggested",
      suggestedBy: "pipeline-derivation",
      // Auto-publish — the derivation is the canonical source for now.
      publish: true,
    });

    result.changed++;
    result.changes.push({
      cityId,
      from: existing?.watchStatus ?? "NEW",
      to: watchStatus,
      reason,
    });
  }

  logger.info(
    `[market-watch] Derivation complete: evaluated ${result.evaluated} cities, changed ${result.changed}`
  );

  return result;
}
