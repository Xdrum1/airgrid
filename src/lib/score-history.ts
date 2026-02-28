import { prisma } from "@/lib/prisma";

export interface ScoreHistoryPoint {
  score: number;
  capturedAt: string;
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
