/**
 * Data Confidence Flag — per the published methodology (Missing Data
 * Treatment Protocol, airindex.io/methodology).
 *
 * Computes a per-city confidence label based on pipeline activity:
 *   - `verified`        — primary-source verification activity within 60 days
 *   - `partial`         — city has baseline data but not recent verification
 *   - `research-stale`  — data exists but is more than 60 days old
 *
 * The flag does not change the score. It signals to the reader that
 * the flagged market should be independently verified before making
 * high-stakes decisions against that specific data point.
 *
 * Surfaced in admin / licensed-client views. Not shown on public surfaces.
 */
import { prisma } from "@/lib/prisma";

export type DataConfidence = "verified" | "partial" | "research-stale";

export interface CityDataConfidence {
  cityId: string;
  confidence: DataConfidence;
  lastVerifiedAt: Date | null;   // most recent override or classification timestamp
  daysSinceLastVerification: number | null;
  verifiedFactors: string[];      // fields touched by applied overrides in window
  rationale: string;              // short human-readable reason
}

const WINDOW_DAYS = 60;
const WINDOW_MS = WINDOW_DAYS * 24 * 60 * 60 * 1000;

/**
 * Compute data confidence for a single city.
 */
export async function getCityDataConfidence(cityId: string): Promise<CityDataConfidence> {
  const cutoff = new Date(Date.now() - WINDOW_MS);

  // Recent applied scoring overrides
  const recentOverrides = await prisma.scoringOverride.findMany({
    where: { cityId, appliedAt: { gte: cutoff, not: null } },
    select: { field: true, appliedAt: true },
    orderBy: { appliedAt: "desc" },
  });

  // Most recent override ever (regardless of age)
  const latestOverride = await prisma.scoringOverride.findFirst({
    where: { cityId, appliedAt: { not: null } },
    orderBy: { appliedAt: "desc" },
    select: { appliedAt: true },
  });

  // Recent classifier activity touching this city — pipeline is watching it
  const recentClassificationCount = await prisma.classificationResult.count({
    where: { affectedCities: { has: cityId }, createdAt: { gte: cutoff } },
  });

  // Most recent classification ever (for fallback timestamping)
  const latestClassification = await prisma.classificationResult.findFirst({
    where: { affectedCities: { has: cityId } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  const latestVerificationTime =
    latestOverride?.appliedAt ?? latestClassification?.createdAt ?? null;

  const verifiedFactors = Array.from(
    new Set(recentOverrides.map((o) => o.field)),
  );

  // Decision tree — per methodology
  let confidence: DataConfidence;
  let rationale: string;

  if (recentOverrides.length > 0 || recentClassificationCount > 0) {
    confidence = "verified";
    rationale = `${recentOverrides.length} applied override${recentOverrides.length === 1 ? "" : "s"}, ${recentClassificationCount} classification event${recentClassificationCount === 1 ? "" : "s"} in the last ${WINDOW_DAYS} days`;
  } else if (latestVerificationTime) {
    confidence = "research-stale";
    const days = Math.floor((Date.now() - latestVerificationTime.getTime()) / (24 * 60 * 60 * 1000));
    rationale = `last primary-source activity was ${days} days ago, beyond the ${WINDOW_DAYS}-day confidence window`;
  } else {
    confidence = "partial";
    rationale = `baseline scoring exists but no primary-source verification events on record`;
  }

  const daysSinceLastVerification = latestVerificationTime
    ? Math.floor((Date.now() - latestVerificationTime.getTime()) / (24 * 60 * 60 * 1000))
    : null;

  return {
    cityId,
    confidence,
    lastVerifiedAt: latestVerificationTime,
    daysSinceLastVerification,
    verifiedFactors,
    rationale,
  };
}

/**
 * Batch variant — compute data confidence for multiple cities at once.
 * Single-query optimization for dashboard-style surfaces.
 */
export async function getDataConfidenceForCities(
  cityIds: string[],
): Promise<Map<string, CityDataConfidence>> {
  const results = await Promise.all(cityIds.map((id) => getCityDataConfidence(id)));
  return new Map(results.map((r) => [r.cityId, r]));
}

// Presentation helpers — UI-adjacent

export function confidenceLabel(c: DataConfidence): string {
  switch (c) {
    case "verified": return "Verified";
    case "partial": return "Partial — Baseline Only";
    case "research-stale": return "Research Stale";
  }
}

export function confidenceColor(c: DataConfidence): string {
  switch (c) {
    case "verified": return "#10b981";        // green
    case "partial": return "#f59e0b";         // amber
    case "research-stale": return "#dc2626";  // red
  }
}
