/**
 * Score Updater — persists override candidates, auto-applies high-confidence
 * overrides, recalculates scores, logs changes, and takes snapshots.
 */

import type { OverrideCandidate } from "@/lib/rules-engine";
import { addChangelogEntries } from "@/lib/changelog";
import { calculateReadinessScoreFromFkb, getScoreTier } from "@/lib/scoring";
import { CITIES_MAP } from "@/data/seed";

// Fields that require primary source documentation (Federal Register, FAA, LegiScan, etc.)
// News coverage alone is insufficient for auto-application of these factors
const REQUIRES_PRIMARY_SOURCE = new Set([
  "hasActivePilotProgram",
  "hasVertiportZoning",
  "stateLegislationStatus",
]);

function sourceIsPrimary(url: string | null | undefined): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes("federalregister.gov") ||
    lower.includes("faa.gov") ||
    lower.includes("dot.gov") ||
    lower.includes("legiscan.com") ||
    lower.includes("sec.gov") ||
    lower.includes(".gov/")
  );
}

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
    // Dedup: skip only if an override with the SAME (sourceRecordId, field, value)
    // already exists. This allows status updates from the same source record to
    // pass through (e.g. SB1827 going from "actively_moving" to "none" when the
    // bill fails) and supersede the prior override below.
    if (candidate.sourceRecordId) {
      const candidateValueJson = JSON.stringify(candidate.value);
      const existing = await prisma.scoringOverride.findFirst({
        where: {
          sourceRecordId: candidate.sourceRecordId,
          field: candidate.field,
        },
        select: { id: true, value: true },
      });
      if (existing && JSON.stringify(existing.value) === candidateValueJson) {
        continue;
      }
    }

    // Skip unresolved city placeholders for auto-apply (still persist them)
    const isResolvable = candidate.cityId !== "__unresolved__" && candidate.field !== "__review__";

    // Downgrade confidence for fields that require primary sources when
    // the source is news/operator coverage (not Federal Register, FAA, etc.)
    let effectiveConfidence = candidate.confidence;
    if (
      candidate.confidence === "high" &&
      REQUIRES_PRIMARY_SOURCE.has(candidate.field) &&
      !sourceIsPrimary(candidate.sourceUrl)
    ) {
      effectiveConfidence = "medium";
    }

    // Auto-apply high confidence always, medium confidence when backed by primary source
    const shouldAutoApply = isResolvable && (
      effectiveConfidence === "high" ||
      (effectiveConfidence === "medium" && sourceIsPrimary(candidate.sourceUrl))
    );

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
        confidence: effectiveConfidence,
        appliedAt: shouldAutoApply ? now : null,
      },
    });
    persisted++;

    if (shouldAutoApply) {
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

    // Group overrides by city, translating override fields to City interface fields
    const overridesByCity = new Map<string, Record<string, unknown>>();
    for (const override of overrides) {
      const existing = overridesByCity.get(override.cityId) ?? {};
      // Translate override fields that don't directly match City interface
      if (override.field === "approvedVertiport" && override.value === true) {
        existing["vertiportCount"] = Math.max((existing["vertiportCount"] as number) ?? 0, 1);
      } else if (override.field === "activeOperatorPresence" && override.value === true) {
        const current = (existing["activeOperators"] as string[]) ?? [];
        if (!current.includes("__override__")) current.push("__override__");
        existing["activeOperators"] = current;
      } else if (override.field === "hasStateLegislation") {
        // Legacy alias — classifier emits "hasStateLegislation" with value
        // "enacted" | "actively_moving" | "none". The City interface uses
        // stateLegislationStatus, which is what scoring reads.
        existing["stateLegislationStatus"] = override.value;
      } else {
        existing[override.field] = override.value;
      }
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
      const { score: newScore } = await calculateReadinessScoreFromFkb(mergedCity);

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

      const changelogEntries = await addChangelogEntries(changelogBatch);

      // Build a map from cityId → changelog entry ID for linking snapshots
      const cityToEntryId = new Map<string, string>();
      for (const entry of changelogEntries) {
        cityToEntryId.set(entry.relatedEntityId, entry.id);
      }

      // Take score snapshots for affected cities
      const snapshotData = await Promise.all(
        scoreChanges.map(async (change) => {
          const baseCity = CITIES_MAP[change.cityId];
          const cityOverrides = overridesByCity.get(change.cityId) ?? {};
          const mergedCity = { ...baseCity, ...cityOverrides };
          const { breakdown } = await calculateReadinessScoreFromFkb(mergedCity);

          return {
            cityId: change.cityId,
            score: change.newScore,
            breakdown: (breakdown ?? {}) as unknown as Record<string, number>,
            tier: getScoreTier(change.newScore),
            triggeringEventId: cityToEntryId.get(change.cityId) ?? null,
            filingIngestedAt: now,
            capturedAt: now,
          };
        })
      );
      await prisma.scoreSnapshot.createMany({
        data: snapshotData,
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
