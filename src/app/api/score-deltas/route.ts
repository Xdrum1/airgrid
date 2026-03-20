import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Returns the most recent score delta for each city.
 * Compares latest two snapshots per city to compute change.
 * Public endpoint — no auth required (deltas are not sensitive).
 */
export async function GET() {
  try {
    // Get the two most recent snapshots per city in a single query
    const snapshots = await prisma.scoreSnapshot.findMany({
      orderBy: { capturedAt: "desc" },
      select: { cityId: true, score: true, capturedAt: true },
    });

    // Group by city, keep first two (most recent)
    const byCityMap = new Map<string, { score: number; capturedAt: Date }[]>();
    for (const s of snapshots) {
      const arr = byCityMap.get(s.cityId) ?? [];
      if (arr.length < 2) {
        arr.push({ score: s.score, capturedAt: s.capturedAt });
        byCityMap.set(s.cityId, arr);
      }
    }

    const deltas: Record<string, { delta: number; previousScore: number; currentScore: number; changedAt: string }> = {};
    for (const [cityId, entries] of byCityMap) {
      if (entries.length === 2) {
        const current = entries[0];
        const previous = entries[1];
        const delta = current.score - previous.score;
        if (delta !== 0) {
          deltas[cityId] = {
            delta,
            previousScore: previous.score,
            currentScore: current.score,
            changedAt: current.capturedAt.toISOString(),
          };
        }
      }
    }

    return NextResponse.json({ data: deltas });
  } catch {
    return NextResponse.json({ data: {} });
  }
}
