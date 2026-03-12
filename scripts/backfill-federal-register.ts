/**
 * One-time Federal Register backfill script.
 *
 * Fetches 730 days of Federal Register filings, one search term at a time,
 * with delays between terms and pages to avoid rate limiting.
 * Writes directly to the IngestedRecord table.
 *
 * Usage:
 *   npx tsx scripts/backfill-federal-register.ts
 *
 * This uses the prod DATABASE_URL from .env by default.
 */

import { PrismaClient } from "@prisma/client";
import { fetchFederalRegisterUAM, FederalFiling } from "../src/lib/faa-api";

const prisma = new PrismaClient();

function normalizeFederalFiling(f: FederalFiling) {
  return {
    id: `federal_register_${f.document_number}`,
    source: "federal_register" as const,
    sourceId: f.document_number,
    title: f.title,
    summary: f.abstract ?? "",
    status: f.type ?? "unknown",
    date: f.publication_date,
    url: f.html_url,
    state: null,
    raw: f as unknown as Record<string, never>,
    ingestedAt: new Date(),
  };
}

async function main() {
  console.log("=== Federal Register Backfill (730 days) ===\n");

  const before = await prisma.ingestedRecord.count({
    where: { source: "federal_register" },
  });
  console.log(`Current federal_register records: ${before}\n`);

  console.log("Fetching from Federal Register API (this may take a few minutes)...\n");
  const filings = await fetchFederalRegisterUAM(730);
  console.log(`Fetched ${filings.length} filings from API\n`);

  if (filings.length === 0) {
    console.log("No filings found. Exiting.");
    return;
  }

  // Upsert in batches
  const batchSize = 50;
  let created = 0;
  let updated = 0;

  for (let i = 0; i < filings.length; i += batchSize) {
    const batch = filings.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (f) => {
        const record = normalizeFederalFiling(f);
        const result = await prisma.ingestedRecord.upsert({
          where: { id: record.id },
          create: {
            id: record.id,
            source: record.source,
            sourceId: record.sourceId,
            title: record.title,
            summary: record.summary,
            status: record.status,
            date: record.date,
            url: record.url,
            state: record.state,
            raw: record.raw,
            ingestedAt: record.ingestedAt,
          },
          update: {
            summary: record.summary,
            status: record.status,
            raw: record.raw,
          },
        });
        return result;
      })
    );
    const batchEnd = Math.min(i + batchSize, filings.length);
    console.log(`  Upserted batch ${Math.floor(i / batchSize) + 1}: records ${i + 1}-${batchEnd}`);
  }

  const after = await prisma.ingestedRecord.count({
    where: { source: "federal_register" },
  });
  const newRecords = after - before;

  console.log(`\n=== Backfill Complete ===`);
  console.log(`  Before: ${before}`);
  console.log(`  After:  ${after}`);
  console.log(`  New records: ${newRecords}`);
  console.log(`\nThe next regular cron run will classify these through Haiku.`);
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
