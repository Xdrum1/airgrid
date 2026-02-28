/**
 * Seed script — generates 12 months of historical ScoreSnapshot data for demos.
 * Scores start lower and ramp toward each city's current score to simulate market maturation.
 *
 * Usage: npx tsx prisma/seed-snapshots.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Current scores per city (derived from the 7-factor binary model in seed.ts)
const CITY_SCORES: Record<string, number> = {
  los_angeles: 100,
  dallas: 100,
  new_york: 70,
  miami: 80,
  orlando: 80,
  las_vegas: 80,
  phoenix: 65,
  houston: 60,
  austin: 60,
  san_diego: 60,
  san_francisco: 55,
  chicago: 30,
  atlanta: 15,
  nashville: 15,
  charlotte: 15,
  denver: 15,
  seattle: 15,
  boston: 15,
  minneapolis: 15,
  washington_dc: 0,
};

function generateHistory(cityId: string, currentScore: number) {
  const snapshots = [];
  const now = new Date();

  // Start score: 40-70% of current, clamped to 0
  const startRatio = 0.4 + Math.random() * 0.3;
  const startScore = Math.max(0, Math.round(currentScore * startRatio));

  for (let i = 11; i >= 0; i--) {
    const capturedAt = new Date(now);
    capturedAt.setMonth(capturedAt.getMonth() - i);
    capturedAt.setDate(1); // normalize to 1st of month
    capturedAt.setHours(0, 0, 0, 0);

    // Linear interpolation from start to current, with small jitter
    const progress = (11 - i) / 11;
    const base = startScore + (currentScore - startScore) * progress;
    const jitter = (Math.random() - 0.5) * 6; // ±3 points
    const score = Math.max(0, Math.min(100, Math.round(base + jitter)));

    snapshots.push({
      cityId,
      score: i === 0 ? currentScore : score, // last point = exact current
      breakdown: {},
      capturedAt,
    });
  }

  return snapshots;
}

async function main() {
  // Clear existing snapshots
  const deleted = await prisma.scoreSnapshot.deleteMany();
  console.log(`Cleared ${deleted.count} existing snapshots`);

  const allSnapshots = Object.entries(CITY_SCORES).flatMap(([cityId, score]) =>
    generateHistory(cityId, score)
  );

  const result = await prisma.scoreSnapshot.createMany({ data: allSnapshots });
  console.log(`Seeded ${result.count} snapshots (${Object.keys(CITY_SCORES).length} cities × 12 months)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
