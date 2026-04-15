/**
 * Seed SAME_STATE peer groups for markets missing them.
 *
 * 4 tracked markets had no SAME_STATE peer group as of Apr 15, 2026:
 * Tampa, San Antonio, Cincinnati, Salt Lake City. After today's MCS
 * integration into briefings + Pulse template, these markets show no
 * "State Peers" section. This script fills the gap.
 *
 * Salt Lake City has no in-state peer (only UT market) — we insert a
 * row with an empty peer array + a note so the absence is explicit,
 * not a missing entry. (The renderer skips empty arrays.)
 *
 * Idempotent — uses upsert.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SAME_STATE_FILLS: Array<{
  marketId: string;
  peerMarketIds: string[];
  notes: string;
}> = [
  { marketId: "tampa", peerMarketIds: ["miami", "orlando"], notes: "Florida state peers" },
  { marketId: "san_antonio", peerMarketIds: ["dallas", "austin", "houston"], notes: "Texas state peers" },
  { marketId: "cincinnati", peerMarketIds: ["columbus"], notes: "Ohio state peer" },
  { marketId: "salt_lake_city", peerMarketIds: [], notes: "No other Utah markets tracked (2026-04-15)" },
];

async function main() {
  for (const fill of SAME_STATE_FILLS) {
    await prisma.mcsPeerGroup.upsert({
      where: {
        marketId_groupingBasis: {
          marketId: fill.marketId,
          groupingBasis: "SAME_STATE",
        },
      },
      create: {
        marketId: fill.marketId,
        groupingBasis: "SAME_STATE",
        peerMarketIds: fill.peerMarketIds,
        notes: fill.notes,
      },
      update: {
        peerMarketIds: fill.peerMarketIds,
        notes: fill.notes,
      },
    });
    console.log(`  ${fill.marketId.padEnd(18)} -> ${fill.peerMarketIds.join(", ") || "(no peers)"}`);
  }

  const total = await prisma.mcsPeerGroup.count({ where: { groupingBasis: "SAME_STATE" } });
  console.log(`\nDone. SAME_STATE peer groups now: ${total}`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
