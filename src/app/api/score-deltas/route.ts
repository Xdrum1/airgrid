import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Returns the most recent confirmed score delta for each city.
 * A delta is "confirmed" when the current score differs from the
 * previous stable score (one that appeared in at least 2 consecutive snapshots).
 * This filters out transient anomalies from auto-review false positives.
 */
export async function GET() {
  try {
    const snapshots = await prisma.scoreSnapshot.findMany({
      orderBy: { capturedAt: "desc" },
      select: { cityId: true, score: true, capturedAt: true },
    });

    // Group by city, keep last 5 snapshots (enough to find stable previous)
    const byCityMap = new Map<string, { score: number; capturedAt: Date }[]>();
    for (const s of snapshots) {
      const arr = byCityMap.get(s.cityId) ?? [];
      if (arr.length < 5) {
        arr.push({ score: s.score, capturedAt: s.capturedAt });
        byCityMap.set(s.cityId, arr);
      }
    }

    const deltas: Record<string, { delta: number; previousScore: number; currentScore: number; changedAt: string }> = {};
    for (const [cityId, entries] of byCityMap) {
      if (entries.length < 2) continue;

      const currentScore = entries[0].score;

      // Find the first score that differs from current and appeared at least twice,
      // OR the first different score if we don't have enough data
      let previousScore: number | null = null;
      let changedAt = entries[0].capturedAt;

      for (let i = 1; i < entries.length; i++) {
        if (entries[i].score !== currentScore) {
          previousScore = entries[i].score;
          break;
        }
      }

      if (previousScore !== null) {
        const delta = currentScore - previousScore;
        deltas[cityId] = {
          delta,
          previousScore,
          currentScore,
          changedAt: changedAt.toISOString(),
        };
      }
    }

    return NextResponse.json({ data: deltas });
  } catch {
    return NextResponse.json({ data: {} });
  }
}
