/**
 * Market Watch List — Automated pipeline-driven market intelligence
 *
 * Evaluates all markets against three trigger criteria and maintains
 * WatchListEntry records. Run as part of the 06:00 UTC daily cron.
 *
 * Triggers:
 *   1. LEGISLATION — stateLegislationStatus === "actively_moving"
 *   2. PIPELINE_OVERRIDE — unresolved high/medium confidence overrides
 *   3. ELEVATED_ACTIVITY — 3+ relevant classifications in 30 days with no score change
 */

import { prisma } from "@/lib/prisma";
import { CITIES } from "@/data/seed";
import { calculateReadinessScoreFromFkb } from "@/lib/scoring";
import { createLogger } from "@/lib/logger";

const logger = createLogger("market-watchlist");

interface TriggerCandidate {
  cityId: string;
  triggerType: "LEGISLATION" | "PIPELINE_OVERRIDE" | "ELEVATED_ACTIVITY";
  triggerDetail: string;
  currentScore: number;
}

// ── Trigger Evaluation ───────────────────────────────────

async function evaluateLegislationTriggers(): Promise<TriggerCandidate[]> {
  const candidates: TriggerCandidate[] = [];

  for (const city of CITIES) {
    if (city.stateLegislationStatus === "actively_moving") {
      const { score } = await calculateReadinessScoreFromFkb(city);
      candidates.push({
        cityId: city.id,
        triggerType: "LEGISLATION",
        triggerDetail: `State legislation actively moving — ${city.state} has UAM-specific bills in late legislative stages`,
        currentScore: score,
      });
    }
  }

  return candidates;
}

async function evaluateOverrideTriggers(): Promise<TriggerCandidate[]> {
  const candidates: TriggerCandidate[] = [];

  const pendingOverrides = await prisma.scoringOverride.groupBy({
    by: ["cityId"],
    where: {
      appliedAt: null,
      supersededAt: null,
      confidence: { in: ["high", "medium"] },
      cityId: { not: "__unresolved__" },
    },
    _count: true,
  });

  for (const group of pendingOverrides) {
    const overrides = await prisma.scoringOverride.findMany({
      where: {
        cityId: group.cityId,
        appliedAt: null,
        supersededAt: null,
        confidence: { in: ["high", "medium"] },
      },
      select: { field: true, confidence: true, reason: true },
      take: 3,
    });

    const city = CITIES.find((c) => c.id === group.cityId);
    if (!city) continue;
    const { score } = await calculateReadinessScoreFromFkb(city);

    const fields = overrides.map((o) => o.field).join(", ");
    const topReason = overrides[0]?.reason?.slice(0, 100) || "";

    candidates.push({
      cityId: group.cityId,
      triggerType: "PIPELINE_OVERRIDE",
      triggerDetail: `${group._count} pending override${group._count > 1 ? "s" : ""} (${fields}): ${topReason}`,
      currentScore: score,
    });
  }

  return candidates;
}

async function evaluateActivityTriggers(): Promise<TriggerCandidate[]> {
  const candidates: TriggerCandidate[] = [];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  const recentClassifications = await prisma.classificationResult.findMany({
    where: {
      createdAt: { gte: thirtyDaysAgo },
      eventType: { not: "not_relevant" },
    },
    select: { affectedCities: true },
  });

  const cityCounts: Record<string, number> = {};
  for (const cr of recentClassifications) {
    for (const cityId of cr.affectedCities) {
      cityCounts[cityId] = (cityCounts[cityId] || 0) + 1;
    }
  }

  for (const [cityId, count] of Object.entries(cityCounts)) {
    if (count < 3) continue;

    const city = CITIES.find((c) => c.id === cityId);
    if (!city) continue;

    // Check if score changed in the last 30 days
    const snapshots = await prisma.scoreSnapshot.findMany({
      where: { cityId, capturedAt: { gte: thirtyDaysAgo } },
      orderBy: { capturedAt: "desc" },
      select: { score: true },
      take: 2,
    });

    if (snapshots.length >= 2) {
      const scores = new Set(snapshots.map((s) => s.score));
      if (scores.size > 1) continue; // Score changed — not a trigger
    }

    const { score } = await calculateReadinessScoreFromFkb(city);
    candidates.push({
      cityId,
      triggerType: "ELEVATED_ACTIVITY",
      triggerDetail: `${count} relevant classifications in 30 days with no score movement — elevated pipeline activity detected`,
      currentScore: score,
    });
  }

  return candidates;
}

// ── Watch List Update (runs in cron) ─────────────────────

export async function updateMarketWatchList(): Promise<{
  added: number;
  resolved: number;
  active: number;
}> {
  logger.info("Evaluating market watch list triggers...");

  const [legislation, overrides, activity] = await Promise.all([
    Promise.resolve(evaluateLegislationTriggers()),
    evaluateOverrideTriggers(),
    evaluateActivityTriggers(),
  ]);

  const allTriggers = [...legislation, ...overrides, ...activity];
  logger.info(`Found ${allTriggers.length} trigger candidates`);

  const activeEntries = await prisma.watchListEntry.findMany({
    where: { resolvedAt: null },
  });

  let added = 0;
  let resolved = 0;

  // Add new triggers (skip duplicates)
  const activeKeys = new Set(
    activeEntries.map((e) => `${e.cityId}:${e.triggerType}`)
  );

  for (const trigger of allTriggers) {
    const key = `${trigger.cityId}:${trigger.triggerType}`;
    if (!activeKeys.has(key)) {
      await prisma.watchListEntry.create({
        data: {
          cityId: trigger.cityId,
          triggerType: trigger.triggerType,
          triggerDetail: trigger.triggerDetail,
          currentScore: trigger.currentScore,
        },
      });
      added++;
      logger.info(`Added: ${trigger.cityId} — ${trigger.triggerType}`);
    }
  }

  // Resolve entries that no longer qualify
  const triggerKeys = new Set(
    allTriggers.map((t) => `${t.cityId}:${t.triggerType}`)
  );

  for (const entry of activeEntries) {
    const key = `${entry.cityId}:${entry.triggerType}`;
    if (!triggerKeys.has(key)) {
      let reason = "SIGNAL_RESOLVED";

      const city = CITIES.find((c) => c.id === entry.cityId);
      if (city) {
        const { score } = await calculateReadinessScoreFromFkb(city);
        if (score !== entry.currentScore) {
          reason = "SCORE_CHANGED";
        }
        if (entry.triggerType === "LEGISLATION" && city.stateLegislationStatus === "enacted") {
          reason = "SCORE_CHANGED";
        }
      }

      await prisma.watchListEntry.update({
        where: { id: entry.id },
        data: { resolvedAt: new Date(), resolutionReason: reason },
      });
      resolved++;
      logger.info(`Resolved: ${entry.cityId} — ${entry.triggerType} (${reason})`);
    }
  }

  const active = await prisma.watchListEntry.count({
    where: { resolvedAt: null },
  });

  logger.info(`Watch list: ${added} added, ${resolved} resolved, ${active} active`);
  return { added, resolved, active };
}

// ── Query Helpers ────────────────────────────────────────

export async function getActiveMarketWatchList() {
  return prisma.watchListEntry.findMany({
    where: { resolvedAt: null },
    orderBy: { triggeredAt: "asc" },
  });
}

export async function getRecentlyResolvedEntries(days = 30) {
  const since = new Date(Date.now() - days * 86400000);
  return prisma.watchListEntry.findMany({
    where: {
      resolvedAt: { gte: since },
    },
    orderBy: { resolvedAt: "desc" },
  });
}
