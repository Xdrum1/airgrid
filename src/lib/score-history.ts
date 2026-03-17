import { prisma } from "@/lib/prisma";

export interface ScoreHistoryPoint {
  score: number;
  capturedAt: string;
}

export interface ScoreHistoryFull {
  score: number;
  breakdown: Record<string, number>;
  tier: string | null;
  triggeringEventId: string | null;
  filingIngestedAt: string | null;
  capturedAt: string;
  triggeringEvent?: {
    summary: string;
    sourceUrl: string | null;
    changeType: string;
    timestamp: string;
  };
}

export async function getScoreHistory(cityId: string): Promise<ScoreHistoryPoint[]> {
  const snapshots = await prisma.scoreSnapshot.findMany({
    where: { cityId },
    orderBy: { capturedAt: "asc" },
    take: 52,
    select: { score: true, capturedAt: true },
  });

  return snapshots.map((s) => ({
    score: s.score,
    capturedAt: s.capturedAt.toISOString(),
  }));
}

export async function getScoreHistoryFull(cityId: string): Promise<ScoreHistoryFull[]> {
  const snapshots = await prisma.scoreSnapshot.findMany({
    where: { cityId },
    orderBy: { capturedAt: "asc" },
    take: 52,
    select: {
      score: true,
      breakdown: true,
      tier: true,
      triggeringEventId: true,
      filingIngestedAt: true,
      capturedAt: true,
    },
  });

  // Batch-fetch linked ChangelogEntry records for event-triggered snapshots
  const eventIds = snapshots
    .map((s) => s.triggeringEventId)
    .filter((id): id is string => id !== null);

  const changelogEntries =
    eventIds.length > 0
      ? await prisma.changelogEntry.findMany({
          where: { id: { in: eventIds } },
          select: {
            id: true,
            summary: true,
            sourceUrl: true,
            changeType: true,
            timestamp: true,
          },
        })
      : [];

  const entryMap = new Map(changelogEntries.map((e) => [e.id, e]));

  return snapshots.map((s) => {
    const entry = s.triggeringEventId ? entryMap.get(s.triggeringEventId) : undefined;
    return {
      score: s.score,
      breakdown: (s.breakdown ?? {}) as Record<string, number>,
      tier: s.tier,
      triggeringEventId: s.triggeringEventId,
      filingIngestedAt: s.filingIngestedAt?.toISOString() ?? null,
      capturedAt: s.capturedAt.toISOString(),
      ...(entry && {
        triggeringEvent: {
          summary: entry.summary,
          sourceUrl: entry.sourceUrl,
          changeType: entry.changeType,
          timestamp: entry.timestamp.toISOString(),
        },
      }),
    };
  });
}

// -------------------------------------------------------
// Brief tier history (for market detail endpoint)
// -------------------------------------------------------

export interface ScoreHistoryBrief {
  score: number;
  tier: string | null;
  capturedAt: string;
}

export async function getScoreHistoryBrief(cityId: string): Promise<ScoreHistoryBrief[]> {
  const snapshots = await prisma.scoreSnapshot.findMany({
    where: { cityId },
    orderBy: { capturedAt: "asc" },
    take: 52,
    select: { score: true, tier: true, capturedAt: true },
  });

  return snapshots.map((s) => ({
    score: s.score,
    tier: s.tier,
    capturedAt: s.capturedAt.toISOString(),
  }));
}

// -------------------------------------------------------
// Full trajectory with factor-level deltas
// -------------------------------------------------------

export interface FactorDelta {
  factor: string;
  previous: number;
  current: number;
  delta: number;
}

export interface TrajectoryPoint {
  score: number;
  previousScore: number | null;
  scoreDelta: number | null;
  breakdown: Record<string, number>;
  factorDeltas: FactorDelta[];
  tier: string | null;
  triggeringEventId: string | null;
  filingIngestedAt: string | null;
  capturedAt: string;
  triggeringEvent?: {
    summary: string;
    sourceUrl: string | null;
    changeType: string;
    timestamp: string;
  };
}

export interface TrajectorySummary {
  entries: number;
  firstSnapshot: string | null;
  lastSnapshot: string | null;
  scoreRange: { min: number; max: number } | null;
  netScoreChange: number | null;
  factorsChanged: string[];
}

export async function getScoreTrajectory(
  cityId: string,
  options?: { sinceDaysAgo?: number },
): Promise<{ points: TrajectoryPoint[]; summary: TrajectorySummary }> {
  const where: { cityId: string; capturedAt?: { gte: Date } } = { cityId };
  if (options?.sinceDaysAgo) {
    const since = new Date();
    since.setDate(since.getDate() - options.sinceDaysAgo);
    where.capturedAt = { gte: since };
  }

  const snapshots = await prisma.scoreSnapshot.findMany({
    where,
    orderBy: { capturedAt: "asc" },
    select: {
      score: true,
      breakdown: true,
      tier: true,
      triggeringEventId: true,
      filingIngestedAt: true,
      capturedAt: true,
    },
  });

  // Batch-fetch linked changelog entries
  const eventIds = snapshots
    .map((s) => s.triggeringEventId)
    .filter((id): id is string => id !== null);

  const changelogEntries =
    eventIds.length > 0
      ? await prisma.changelogEntry.findMany({
          where: { id: { in: eventIds } },
          select: {
            id: true,
            summary: true,
            sourceUrl: true,
            changeType: true,
            timestamp: true,
          },
        })
      : [];

  const entryMap = new Map(changelogEntries.map((e) => [e.id, e]));

  // Compute factor deltas between consecutive snapshots
  const factorsChangedSet = new Set<string>();
  const points: TrajectoryPoint[] = snapshots.map((s, i) => {
    const breakdown = (s.breakdown ?? {}) as Record<string, number>;
    const prev = i > 0 ? snapshots[i - 1] : null;
    const prevBreakdown = prev ? ((prev.breakdown ?? {}) as Record<string, number>) : null;

    const factorDeltas: FactorDelta[] = [];
    if (prevBreakdown) {
      const allFactors = new Set([...Object.keys(breakdown), ...Object.keys(prevBreakdown)]);
      for (const factor of allFactors) {
        const current = breakdown[factor] ?? 0;
        const previous = prevBreakdown[factor] ?? 0;
        if (current !== previous) {
          factorDeltas.push({ factor, previous, current, delta: current - previous });
          factorsChangedSet.add(factor);
        }
      }
    }

    const entry = s.triggeringEventId ? entryMap.get(s.triggeringEventId) : undefined;

    return {
      score: s.score,
      previousScore: prev ? prev.score : null,
      scoreDelta: prev ? s.score - prev.score : null,
      breakdown,
      factorDeltas,
      tier: s.tier,
      triggeringEventId: s.triggeringEventId,
      filingIngestedAt: s.filingIngestedAt?.toISOString() ?? null,
      capturedAt: s.capturedAt.toISOString(),
      ...(entry && {
        triggeringEvent: {
          summary: entry.summary,
          sourceUrl: entry.sourceUrl,
          changeType: entry.changeType,
          timestamp: entry.timestamp.toISOString(),
        },
      }),
    };
  });

  const scores = points.map((p) => p.score);
  const summary: TrajectorySummary = {
    entries: points.length,
    firstSnapshot: points.length > 0 ? points[0].capturedAt : null,
    lastSnapshot: points.length > 0 ? points[points.length - 1].capturedAt : null,
    scoreRange: scores.length > 0 ? { min: Math.min(...scores), max: Math.max(...scores) } : null,
    netScoreChange: scores.length >= 2 ? scores[scores.length - 1] - scores[0] : null,
    factorsChanged: Array.from(factorsChangedSet).sort(),
  };

  return { points, summary };
}

// -------------------------------------------------------
// Tier history for all cities (single query for export)
// -------------------------------------------------------

export async function getTierHistoryAllCities(): Promise<Record<string, ScoreHistoryBrief[]>> {
  const snapshots = await prisma.scoreSnapshot.findMany({
    orderBy: { capturedAt: "asc" },
    select: { cityId: true, score: true, tier: true, capturedAt: true },
  });

  const result: Record<string, ScoreHistoryBrief[]> = {};
  for (const s of snapshots) {
    if (!result[s.cityId]) result[s.cityId] = [];
    result[s.cityId].push({
      score: s.score,
      tier: s.tier,
      capturedAt: s.capturedAt.toISOString(),
    });
  }
  return result;
}
