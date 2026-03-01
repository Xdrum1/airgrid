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
