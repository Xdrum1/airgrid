/**
 * Cleanup RPL pollution — one-shot backfill.
 *
 * RPL was previously populated from `operator_news` and `sec_edgar` sources,
 * which don't belong in a regulatory precedent library. They were all written
 * as FEDERAL_RULE / HIGH significance, polluting ~77% of the table.
 *
 * This script deletes RplDocument rows (and cascading mappings/associations)
 * whose rawSignalId points at an IngestedRecord with a non-regulatory source.
 *
 * Usage:
 *   npx tsx scripts/cleanup-rpl-pollution.ts --dry-run
 *   npx tsx scripts/cleanup-rpl-pollution.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { PrismaClient } from "@prisma/client";

const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

const RPL_SOURCES = new Set([
  "federal_register",
  "legiscan",
  "congress_gov",
  "regulations_gov",
]);

async function main() {
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

  const docs = await prisma.rplDocument.findMany({
    where: { rawSignalId: { not: null } },
    select: { id: true, rawSignalId: true, docType: true, significance: true },
  });
  const rawIds = [...new Set(docs.map((d) => d.rawSignalId!).filter(Boolean))];
  const signals = await prisma.ingestedRecord.findMany({
    where: { id: { in: rawIds } },
    select: { id: true, source: true },
  });
  const sourceById = new Map(signals.map((s) => [s.id, s.source]));

  const toDelete: string[] = [];
  const breakdown: Record<string, number> = {};
  for (const d of docs) {
    const src = sourceById.get(d.rawSignalId!) ?? "unknown";
    if (!RPL_SOURCES.has(src)) {
      toDelete.push(d.id);
      breakdown[src] = (breakdown[src] ?? 0) + 1;
    }
  }

  console.log(`RPL docs total (with rawSignalId): ${docs.length}`);
  console.log(`To delete: ${toDelete.length}`);
  console.log("By source:", breakdown);

  if (toDelete.length === 0) {
    console.log("Nothing to delete.");
    await prisma.$disconnect();
    return;
  }

  if (dryRun) {
    console.log("\nDry run — no changes made.");
    await prisma.$disconnect();
    return;
  }

  // Chunked deletes to keep the DB happy
  const CHUNK = 200;
  let mappingsDeleted = 0;
  let associationsDeleted = 0;
  let detailsDeleted = 0;
  let docsDeleted = 0;

  for (let i = 0; i < toDelete.length; i += CHUNK) {
    const ids = toDelete.slice(i, i + CHUNK);
    const m = await prisma.rplDocumentFactorMapping.deleteMany({
      where: { documentId: { in: ids } },
    });
    const a = await prisma.rplDocumentCityAssociation.deleteMany({
      where: { documentId: { in: ids } },
    });
    const d = await prisma.rplLegislationDetail.deleteMany({
      where: { documentId: { in: ids } },
    });
    const s = await prisma.rplScoreChangeEvent.deleteMany({
      where: { documentId: { in: ids } },
    });
    const ann = await prisma.rplAnalystAnnotation.deleteMany({
      where: { documentId: { in: ids } },
    });
    const doc = await prisma.rplDocument.deleteMany({
      where: { id: { in: ids } },
    });
    mappingsDeleted += m.count;
    associationsDeleted += a.count;
    detailsDeleted += d.count + s.count + ann.count;
    docsDeleted += doc.count;
    console.log(`  Chunk ${i / CHUNK + 1}: ${doc.count} docs`);
  }

  console.log("\nDeleted:");
  console.log(`  Documents:          ${docsDeleted}`);
  console.log(`  Factor mappings:    ${mappingsDeleted}`);
  console.log(`  City associations:  ${associationsDeleted}`);
  console.log(`  Detail/event/annot: ${detailsDeleted}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
