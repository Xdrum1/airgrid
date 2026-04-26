/**
 * Drain the classification backlog.
 *
 * Finds IngestedRecord rows that have no ClassificationResult row, and runs
 * them through the existing classifyRecords() pipeline (NLP classifier +
 * override application + RPL writes).
 *
 * Root cause this addresses: the cron's retry mechanism produces the
 * following race:
 *   1. /api/ingest (attempt 1) writes 200+ records to IngestedRecord
 *   2. Lambda times out before ClassificationResult writes complete
 *   3. /api/ingest (attempt 2) sees records already in DB → diff returns
 *      0 new → skips classification
 *   4. Records remain unclassified indefinitely
 *
 * Usage:
 *   DATABASE_URL=<prod-db-url> npx tsx scripts/drain-classification-backlog.ts
 *
 * Options:
 *   --dry-run    Report what would be classified without calling the API
 *   --limit=N    Only process first N records (for testing)
 *   --hours=N    Only consider records ingested in the last N hours (default: 168 = 7d)
 */
import { PrismaClient } from "@prisma/client";
import { classifyRecords } from "../src/lib/classifier";
import { applyOverrides } from "../src/lib/score-updater";
import type { IngestedRecord } from "../src/lib/ingestion";

const dryRun = process.argv.includes("--dry-run");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : Infinity;
const hoursArg = process.argv.find((a) => a.startsWith("--hours="));
const hours = hoursArg ? parseInt(hoursArg.split("=")[1], 10) : 168;

async function main() {
  const prisma = new PrismaClient();

  console.log(`[drain] Looking for unclassified records ingested in last ${hours}h...`);
  if (dryRun) console.log("[drain] DRY RUN — no API calls, no DB writes");

  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const all = await prisma.ingestedRecord.findMany({
    where: { ingestedAt: { gte: since } },
    orderBy: { ingestedAt: "desc" },
  });
  console.log(`[drain] ${all.length} records ingested in window`);

  // Find which IDs already have a ClassificationResult
  const ids = all.map((r) => r.id);
  const classified = await prisma.classificationResult.findMany({
    where: { recordId: { in: ids } },
    select: { recordId: true },
  });
  const classifiedSet = new Set(classified.map((c) => c.recordId));

  const unclassified = all.filter((r) => !classifiedSet.has(r.id));
  console.log(`[drain] ${unclassified.length} of ${all.length} unclassified`);

  if (unclassified.length === 0) {
    console.log("[drain] Nothing to do.");
    await prisma.$disconnect();
    return;
  }

  // Source breakdown
  const bySource: Record<string, number> = {};
  for (const r of unclassified) bySource[r.source] = (bySource[r.source] ?? 0) + 1;
  console.log("[drain] Unclassified by source:", bySource);

  const slice = unclassified.slice(0, limit);
  if (limit !== Infinity) console.log(`[drain] Processing first ${slice.length}`);

  if (dryRun) {
    console.log("[drain] DRY RUN — exiting before API calls");
    await prisma.$disconnect();
    return;
  }

  // Convert Prisma rows → IngestedRecord shape
  const toClassify: IngestedRecord[] = slice.map((r) => ({
    id: r.id,
    source: r.source as IngestedRecord["source"],
    sourceId: r.sourceId,
    title: r.title,
    summary: r.summary,
    status: r.status,
    date: r.date,
    url: r.url,
    state: r.state ?? undefined,
    raw: r.raw as Record<string, unknown>,
    ingestedAt: r.ingestedAt.toISOString(),
  }));

  console.log(`[drain] Calling classifyRecords on ${toClassify.length}...`);
  const result = await classifyRecords(toClassify);
  console.log(
    `[drain] Classifier produced ${result.overrideCandidates.length} override candidates, ${result.marketLeadSignals.length} lead signals`,
  );

  if (result.overrideCandidates.length > 0) {
    console.log("[drain] Applying overrides...");
    const applied = await applyOverrides(result.overrideCandidates);
    console.log(
      `[drain] Overrides: ${applied.persisted} persisted, ${applied.applied} auto-applied, ${applied.scoreChanges.length} score changes`,
    );
  }

  await prisma.$disconnect();
  console.log("[drain] Done.");
}

main().catch((err) => {
  console.error("[drain] Failed:", err);
  process.exit(1);
});
