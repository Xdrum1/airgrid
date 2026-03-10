/**
 * Backfill 90 days of daily ScoreSnapshots for all 21 markets.
 *
 * Handles the March 7 data audit correction:
 *   - Before March 7: Las Vegas (85), Phoenix (65), Austin (45), Houston (45)
 *   - March 7 onward: current seed scores
 *
 * Skips dates that already have snapshots for a given city.
 *
 * Usage:
 *   DATABASE_URL=<your-db-url> npx tsx scripts/backfill-snapshots.ts
 *   DATABASE_URL=<your-db-url> npx tsx scripts/backfill-snapshots.ts --dry-run
 */

import { PrismaClient } from "@prisma/client";
import { CITIES } from "../src/data/seed";
import { calculateReadinessScore } from "../src/lib/scoring";

const dryRun = process.argv.includes("--dry-run");

// March 7 correction: these cities had inflated scores before the audit
// Pre-March-7 factor overrides that reproduce the old (inflated) scores:
//   Las Vegas: 85, Phoenix: 65, Austin: 45, Houston: 45
const PRE_CORRECTION_OVERRIDES: Record<string, Partial<typeof CITIES[0]>> = {
  las_vegas: {
    // 85 = pilot(20) + zoning(15) + vertiport(20) + friendly(10) + legislation(10) + laanc(10)
    hasActivePilotProgram: true,
    hasVertiportZoning: true,
    regulatoryPosture: "friendly" as const,
    hasStateLegislation: true,
  },
  phoenix: {
    // 65 = pilot(20) + zoning(15) + friendly(10) + legislation(10) + laanc(10)
    hasVertiportZoning: true,
    regulatoryPosture: "friendly" as const,
    hasStateLegislation: true,
  },
  austin: {
    // 45 = operator(15) + friendly(10) + legislation(10) + laanc(10)
    activeOperators: ["op_placeholder" as never],
  },
  houston: {
    // 45 = operator(15) + friendly(10) + legislation(10) + laanc(10)
    activeOperators: ["op_placeholder" as never],
  },
};

function getScoreTier(score: number): string {
  if (score >= 75) return "ADVANCED";
  if (score >= 50) return "MODERATE";
  if (score >= 30) return "EARLY";
  return "NASCENT";
}

const CORRECTION_DATE = new Date("2026-03-07T00:00:00Z");
const DAYS_BACK = 90;

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
    console.log(`Cities: ${CITIES.length}`);
    console.log(`Days: ${DAYS_BACK}\n`);

    // Fetch existing snapshots to avoid duplicates
    const startDate = new Date(Date.now() - DAYS_BACK * 86400000);
    const existing = await prisma.scoreSnapshot.findMany({
      where: { capturedAt: { gte: startDate } },
      select: { cityId: true, capturedAt: true },
    });

    // Build a set of "cityId|YYYY-MM-DD" for quick lookup
    const existingKeys = new Set(
      existing.map(
        (s) => `${s.cityId}|${s.capturedAt.toISOString().split("T")[0]}`
      )
    );
    console.log(`Existing snapshots in range: ${existing.length}`);

    const toInsert: {
      cityId: string;
      score: number;
      breakdown: object;
      tier: string;
      capturedAt: Date;
    }[] = [];

    for (let d = 0; d < DAYS_BACK; d++) {
      const date = new Date(Date.now() - (DAYS_BACK - d) * 86400000);
      const dateStr = date.toISOString().split("T")[0];
      const isPreCorrection = date < CORRECTION_DATE;

      for (const city of CITIES) {
        const key = `${city.id}|${dateStr}`;
        if (existingKeys.has(key)) continue;

        let score: number;
        let breakdown: object;

        if (isPreCorrection && PRE_CORRECTION_OVERRIDES[city.id]) {
          // Merge overrides to compute the old (inflated) score
          const merged = { ...city, ...PRE_CORRECTION_OVERRIDES[city.id] };
          const result = calculateReadinessScore(merged);
          score = result.score;
          breakdown = result.breakdown;
        } else {
          score = city.score ?? 0;
          breakdown = city.breakdown ?? {};
        }

        const tier = getScoreTier(score);

        // Set capturedAt to 06:00 UTC (when the cron runs)
        const capturedAt = new Date(`${dateStr}T06:00:00Z`);

        toInsert.push({ cityId: city.id, score, breakdown, tier, capturedAt });
      }
    }

    console.log(`\nSnapshots to insert: ${toInsert.length}`);

    if (toInsert.length === 0) {
      console.log("Nothing to backfill.");
      return;
    }

    // Show sample
    const sample = toInsert.slice(0, 5);
    for (const s of sample) {
      console.log(`  ${s.cityId} ${s.capturedAt.toISOString().split("T")[0]} → ${s.score} (${s.tier})`);
    }
    console.log("  ...");

    // Verify correction boundary
    const lvPre = toInsert.find(
      (s) => s.cityId === "las_vegas" && s.capturedAt < CORRECTION_DATE
    );
    const lvPost = toInsert.find(
      (s) => s.cityId === "las_vegas" && s.capturedAt >= CORRECTION_DATE
    );
    if (lvPre && lvPost) {
      console.log(
        `\nCorrection check — Las Vegas: ${lvPre.score} (pre) → ${lvPost.score} (post)`
      );
    }

    if (dryRun) {
      console.log(`\n[DRY RUN] Would insert ${toInsert.length} snapshots.`);
      return;
    }

    // Batch insert (Prisma createMany)
    const BATCH_SIZE = 500;
    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE);
      await prisma.scoreSnapshot.createMany({ data: batch });
      inserted += batch.length;
      console.log(`  Inserted ${inserted}/${toInsert.length}`);
    }

    console.log(`\nDone. Inserted ${inserted} snapshots.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
