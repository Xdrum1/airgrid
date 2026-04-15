/**
 * Cleanup stale MCS SAME_TIER peer groups.
 *
 * MCS had 21 SAME_TIER peer-group rows seeded when cities were in different
 * score tiers. After v1.3 scoring recalibration + daily score drift, many
 * of those rows pointed to peers that no longer share the same tier
 * (e.g. Phoenix listed MODERATE peers despite now being EARLY).
 *
 * Since Apr 15, 2026, getPeerContextWithMcs computes SAME_TIER peers at
 * runtime from live scores — MCS SAME_TIER rows are never read. Deleting
 * them removes the stale-data liability.
 *
 * Idempotent. Ran once on AWS on Apr 15, 2026 — this script is retained
 * for audit trail. SAME_STATE, SIMILAR_PROFILE, REGIONAL groupings are
 * unaffected.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const before = await prisma.mcsPeerGroup.count({ where: { groupingBasis: "SAME_TIER" } });
  console.log(`SAME_TIER rows before: ${before}`);

  const result = await prisma.mcsPeerGroup.deleteMany({
    where: { groupingBasis: "SAME_TIER" },
  });
  console.log(`Deleted: ${result.count}`);

  const byBasis = await prisma.mcsPeerGroup.findMany({ select: { groupingBasis: true } });
  const bag: Record<string, number> = {};
  for (const g of byBasis) bag[g.groupingBasis] = (bag[g.groupingBasis] || 0) + 1;
  console.log("Remaining MCS peer groups by basis:", bag);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
