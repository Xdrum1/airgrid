/**
 * Clean up unactionable ScoringOverrides:
 *   1. Supersede all overrides with field "__review__" (generic review placeholders)
 *   2. Supersede all overrides with cityId "__unresolved__" that can't be city-mapped
 *
 * "Supersede" = set supersededAt to now(), preserving audit trail.
 *
 * Usage:
 *   DATABASE_URL=<your-db-url> npx tsx scripts/cleanup-overrides.ts
 *   DATABASE_URL=<your-db-url> npx tsx scripts/cleanup-overrides.ts --dry-run
 */

import { PrismaClient } from "@prisma/client";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

    // 1. Find __review__ field overrides (generic placeholders)
    const reviewOverrides = await prisma.scoringOverride.findMany({
      where: {
        field: "__review__",
        supersededAt: null,
      },
    });

    console.log(`__review__ overrides (not yet superseded): ${reviewOverrides.length}`);
    for (const o of reviewOverrides.slice(0, 5)) {
      console.log(`  [${o.id}] city=${o.cityId} reason="${o.reason.slice(0, 60)}..."`);
    }
    if (reviewOverrides.length > 5) console.log(`  ... and ${reviewOverrides.length - 5} more`);

    // 2. Find __unresolved__ city overrides that are still pending
    const unresolvedOverrides = await prisma.scoringOverride.findMany({
      where: {
        cityId: "__unresolved__",
        supersededAt: null,
        appliedAt: null, // never applied — can't be applied without a city
      },
    });

    console.log(`\n__unresolved__ city overrides (unapplied, not superseded): ${unresolvedOverrides.length}`);
    for (const o of unresolvedOverrides.slice(0, 5)) {
      console.log(`  [${o.id}] field=${o.field} conf=${o.confidence} reason="${o.reason.slice(0, 60)}..."`);
    }
    if (unresolvedOverrides.length > 5) console.log(`  ... and ${unresolvedOverrides.length - 5} more`);

    // Deduplicate IDs (some may overlap)
    const allIds = new Set([
      ...reviewOverrides.map((o) => o.id),
      ...unresolvedOverrides.map((o) => o.id),
    ]);

    console.log(`\nTotal overrides to supersede: ${allIds.size}`);

    if (allIds.size === 0) {
      console.log("Nothing to clean up.");
      return;
    }

    if (dryRun) {
      console.log(`\n[DRY RUN] Would supersede ${allIds.size} overrides.`);
      return;
    }

    const result = await prisma.scoringOverride.updateMany({
      where: {
        id: { in: Array.from(allIds) },
      },
      data: {
        supersededAt: new Date(),
      },
    });

    console.log(`\nSuperseded ${result.count} overrides.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
