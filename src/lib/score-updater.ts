/**
 * Score Updater — persists override candidates, auto-applies high-confidence
 * overrides, recalculates scores, logs changes, and takes snapshots.
 */

import type { OverrideCandidate } from "@/lib/rules-engine";
import { addChangelogEntries } from "@/lib/changelog";
import { calculateReadinessScore } from "@/lib/scoring";
import { CITIES_MAP } from "@/data/seed";

// Dynamic import to prevent client bundle contamination
async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

// -------------------------------------------------------
// Persist override candidates
// -------------------------------------------------------

export async function applyOverrides(candidates: OverrideCandidate[]): Promise<{
  persisted: number;
  applied: number;
  scoreChanges: { cityId: string; oldScore: number; newScore: number }[];
}> {
  if (candidates.length === 0) {
    return { persisted: 0, applied: 0, scoreChanges: [] };
  }

  const prisma = await getPrisma();
  const now = new Date();
  let persisted = 0;
  let applied = 0;
  const scoreChanges: { cityId: string; oldScore: number; newScore: number }[] = [];
  const affectedCityIds = new Set<string>();

  for (const candidate of candidates) {
    // Skip unresolved city placeholders for auto-apply (still persist them)
    const isResolvable = candidate.cityId !== "__unresolved__" && candidate.field !== "__review__";

    // Supersede any existing active override for the same cityId+field
    if (isResolvable) {
      await prisma.scoringOverride.updateMany({
        where: {
          cityId: candidate.cityId,
          field: candidate.field,
          supersededAt: null,
        },
        data: { supersededAt: now },
      });
    }

    // Create the new override
    await prisma.scoringOverride.create({
      data: {
        cityId: candidate.cityId,
        field: candidate.field,
        value: candidate.value as never,
        reason: candidate.reason,
        sourceRecordId: candidate.sourceRecordId,
        sourceUrl: candidate.sourceUrl,
        confidence: candidate.confidence,
        appliedAt: candidate.confidence === "high" && isResolvable ? now : null,
      },
    });
    persisted++;

    if (candidate.confidence === "high" && isResolvable) {
      applied++;
      affectedCityIds.add(candidate.cityId);
    }
  }

  // Recalculate scores for affected cities
  if (affectedCityIds.size > 0) {
    // Get all active high-confidence overrides for affected cities
    const overrides = await prisma.scoringOverride.findMany({
      where: {
        cityId: { in: Array.from(affectedCityIds) },
        confidence: "high",
        appliedAt: { not: null },
        supersededAt: null,
      },
    });

    // Group overrides by city
    const overridesByCity = new Map<string, Record<string, unknown>>();
    for (const override of overrides) {
      const existing = overridesByCity.get(override.cityId) ?? {};
      existing[override.field] = override.value;
      overridesByCity.set(override.cityId, existing);
    }

    // Recalculate and track score changes
    for (const cityId of Array.from(affectedCityIds)) {
      const baseCity = CITIES_MAP[cityId];
      if (!baseCity) continue;

      const oldScore = baseCity.score ?? 0;
      const cityOverrides = overridesByCity.get(cityId) ?? {};

      // Merge overrides onto the base city data
      const mergedCity = { ...baseCity, ...cityOverrides };
      const { score: newScore } = calculateReadinessScore(mergedCity);

      if (newScore !== oldScore) {
        scoreChanges.push({ cityId, oldScore, newScore });
      }
    }

    // Log score changes to changelog
    if (scoreChanges.length > 0) {
      const changelogBatch = scoreChanges.map((change) => ({
        changeType: "score_change" as const,
        relatedEntityType: "city" as const,
        relatedEntityId: change.cityId,
        summary: `${CITIES_MAP[change.cityId]?.city ?? change.cityId} readiness score updated: ${change.oldScore} → ${change.newScore}`,
      }));

      await addChangelogEntries(changelogBatch);

      // Take score snapshots for affected cities
      await prisma.scoreSnapshot.createMany({
        data: scoreChanges.map((change) => {
          const baseCity = CITIES_MAP[change.cityId];
          const cityOverrides = overridesByCity.get(change.cityId) ?? {};
          const mergedCity = { ...baseCity, ...cityOverrides };
          const { breakdown } = calculateReadinessScore(mergedCity);

          return {
            cityId: change.cityId,
            score: change.newScore,
            breakdown: (breakdown ?? {}) as unknown as Record<string, number>,
            capturedAt: now,
          };
        }),
      });
    }

    // Invalidate cities cache so next page load picks up overrides
    const { invalidateCitiesCache } = await import("@/data/seed");
    invalidateCitiesCache();
  }

  console.log(
    `[score-updater] Persisted ${persisted} overrides, auto-applied ${applied}, ${scoreChanges.length} score changes`
  );

  return { persisted, applied, scoreChanges };
}
