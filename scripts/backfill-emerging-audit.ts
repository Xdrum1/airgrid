/**
 * Backfill audit fields for existing emerging market signals.
 *
 * The 228 Phase 1 records (ingested March 15-16, 2026) were classified
 * before audit trail fields were added to the schema. This script backfills
 * the known values and marks confidence/rawClassification as NULL (not
 * reconstructable).
 *
 * Run: npx tsx scripts/backfill-emerging-audit.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Find all records missing audit fields (classified but no promptVersion)
  const missing = await prisma.emergingMarketSignal.count({
    where: {
      promptVersion: null,
      marketName: { not: "Unclassified" },
    },
  });

  console.log(`Found ${missing} classified records missing audit fields`);

  if (missing === 0) {
    console.log("Nothing to backfill.");
    return;
  }

  // Backfill known values — prompt version and model are deterministic
  // Confidence and rawClassification cannot be reconstructed
  const result = await prisma.emergingMarketSignal.updateMany({
    where: {
      promptVersion: null,
      marketName: { not: "Unclassified" },
    },
    data: {
      promptVersion: "emerging-v1",
      modelUsed: "claude-haiku-4-5-20251001",
      // confidence: null — cannot reconstruct, left as NULL
      // rawClassification: null — cannot reconstruct, left as NULL
    },
  });

  console.log(`Backfilled ${result.count} records with promptVersion and modelUsed`);
  console.log("Note: confidence and rawClassification left NULL — not reconstructable from Phase 1 runs");

  // Verify
  const remaining = await prisma.emergingMarketSignal.count({
    where: { promptVersion: null, marketName: { not: "Unclassified" } },
  });
  console.log(`Remaining without audit fields: ${remaining}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
