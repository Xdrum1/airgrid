/**
 * Admin functions — approve/reject scoring overrides, list pending items,
 * and list recent classification results for audit.
 */

import { addChangelogEntries } from "@/lib/changelog";
import { calculateReadinessScoreFromFkb, getScoreTier } from "@/lib/scoring";
import { CITIES_MAP, invalidateCitiesCache } from "@/data/seed";

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

// -------------------------------------------------------
// Approve an override
// -------------------------------------------------------

export async function approveOverride(
  overrideId: string,
  cityId?: string
): Promise<{
  override: Record<string, unknown>;
  scoreChange?: { cityId: string; oldScore: number; newScore: number };
}> {
  const prisma = await getPrisma();
  const now = new Date();

  // 1. Fetch the override
  const override = await prisma.scoringOverride.findUnique({
    where: { id: overrideId },
  });

  if (!override) throw new Error("Override not found");
  if (override.appliedAt) throw new Error("Override already applied");
  if (override.supersededAt) throw new Error("Override already superseded");

  // 2. If cityId provided, update the override (resolving __unresolved__)
  const resolvedCityId = cityId ?? override.cityId;
  if (resolvedCityId === "__unresolved__") {
    throw new Error("Must assign a city before approving an unresolved override");
  }

  if (cityId && cityId !== override.cityId) {
    await prisma.scoringOverride.update({
      where: { id: overrideId },
      data: { cityId },
    });
  }

  // 3. Supersede any existing active override for the same cityId+field
  await prisma.scoringOverride.updateMany({
    where: {
      cityId: resolvedCityId,
      field: override.field,
      supersededAt: null,
      id: { not: overrideId },
    },
    data: { supersededAt: now },
  });

  // 4. Apply the override
  const updated = await prisma.scoringOverride.update({
    where: { id: overrideId },
    data: {
      cityId: resolvedCityId,
      appliedAt: now,
    },
  });

  // 5. Recalculate score for the affected city
  let scoreChange: { cityId: string; oldScore: number; newScore: number } | undefined;

  const baseCity = CITIES_MAP[resolvedCityId];
  if (baseCity) {
    const oldScore = baseCity.score ?? 0;

    // Load all active overrides for this city
    const activeOverrides = await prisma.scoringOverride.findMany({
      where: {
        cityId: resolvedCityId,
        appliedAt: { not: null },
        supersededAt: null,
      },
    });

    const overrideMap: Record<string, unknown> = {};
    for (const o of activeOverrides) {
      overrideMap[o.field] = o.value;
    }

    const mergedCity = { ...baseCity, ...overrideMap };
    const { score: newScore, breakdown } = await calculateReadinessScoreFromFkb(mergedCity);

    if (newScore !== oldScore) {
      scoreChange = { cityId: resolvedCityId, oldScore, newScore };

      // Changelog entry
      const entries = await addChangelogEntries([
        {
          changeType: "score_change" as const,
          relatedEntityType: "city" as const,
          relatedEntityId: resolvedCityId,
          summary: `${baseCity.city} readiness score updated: ${oldScore} → ${newScore} (admin override approved)`,
        },
      ]);

      // Score snapshot
      await prisma.scoreSnapshot.create({
        data: {
          cityId: resolvedCityId,
          score: newScore,
          breakdown: (breakdown ?? {}) as unknown as Record<string, number>,
          tier: getScoreTier(newScore),
          triggeringEventId: entries[0]?.id ?? null,
          filingIngestedAt: override.createdAt,
          capturedAt: now,
        },
      });
    }

    // Invalidate cache
    invalidateCitiesCache();
  }

  // Record human outcome for auto-reviewer feedback loop
  try {
    const { recordOverrideOutcome } = await import("@/lib/auto-reviewer");
    await recordOverrideOutcome(overrideId, "approve");
  } catch {
    // Non-blocking — feedback is best-effort
  }

  return {
    override: {
      id: updated.id,
      cityId: updated.cityId,
      field: updated.field,
      value: updated.value,
      reason: updated.reason,
      confidence: updated.confidence,
      appliedAt: updated.appliedAt?.toISOString() ?? null,
    },
    scoreChange,
  };
}

// -------------------------------------------------------
// Reject an override
// -------------------------------------------------------

export async function rejectOverride(
  overrideId: string
): Promise<{ id: string; supersededAt: string }> {
  const prisma = await getPrisma();
  const now = new Date();

  const override = await prisma.scoringOverride.findUnique({
    where: { id: overrideId },
  });

  if (!override) throw new Error("Override not found");
  if (override.supersededAt) throw new Error("Override already superseded");

  await prisma.scoringOverride.update({
    where: { id: overrideId },
    data: { supersededAt: now },
  });

  // Record human outcome for auto-reviewer feedback loop
  try {
    const { recordOverrideOutcome } = await import("@/lib/auto-reviewer");
    await recordOverrideOutcome(overrideId, "reject");
  } catch {
    // Non-blocking — feedback is best-effort
  }

  return { id: overrideId, supersededAt: now.toISOString() };
}

// -------------------------------------------------------
// List pending overrides
// -------------------------------------------------------

export async function getPendingOverrides() {
  const prisma = await getPrisma();

  const overrides = await prisma.scoringOverride.findMany({
    where: {
      appliedAt: null,
      supersededAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch latest AutoReviewResult for each override (if any)
  const overrideIds = overrides.map((o) => o.id);
  const reviewResults = overrideIds.length > 0
    ? await prisma.autoReviewResult.findMany({
        where: { overrideId: { in: overrideIds } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  // Build map: overrideId → latest review result
  const reviewMap = new Map<string, (typeof reviewResults)[number]>();
  for (const r of reviewResults) {
    // Only keep the most recent (first, since sorted desc)
    if (!reviewMap.has(r.overrideId)) {
      reviewMap.set(r.overrideId, r);
    }
  }

  return overrides.map((o) => {
    const review = reviewMap.get(o.id);
    return {
      id: o.id,
      cityId: o.cityId,
      cityName:
        o.cityId === "__unresolved__"
          ? null
          : CITIES_MAP[o.cityId]?.city ?? o.cityId,
      field: o.field,
      value: o.value,
      reason: o.reason,
      sourceRecordId: o.sourceRecordId,
      sourceUrl: o.sourceUrl,
      confidence: o.confidence,
      createdAt: o.createdAt.toISOString(),
      recommendation: review
        ? {
            decision: review.decision,
            aiConfidence: review.confidence,
            reasoning: review.reasoning,
            sourceContent: review.sourceContent,
            reviewedAt: review.createdAt.toISOString(),
          }
        : null,
    };
  });
}

// -------------------------------------------------------
// List recent classifications
// -------------------------------------------------------

export async function getRecentClassifications(limit: number = 50) {
  const prisma = await getPrisma();

  const results = await prisma.classificationResult.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return results.map((r) => ({
    id: r.id,
    recordId: r.recordId,
    eventType: r.eventType,
    factorsJson: r.factorsJson,
    affectedCities: r.affectedCities,
    confidence: r.confidence,
    rawResponse: r.rawResponse,
    modelUsed: r.modelUsed,
    promptVersion: r.promptVersion,
    createdAt: r.createdAt.toISOString(),
  }));
}
