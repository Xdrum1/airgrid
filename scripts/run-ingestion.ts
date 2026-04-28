/**
 * Daily ingestion entry point for the GitHub Actions runner.
 *
 * Runs the same `runIngestion()` pipeline that `/api/ingest` calls, but in a
 * 6-hour-budget runner instead of an Amplify Lambda behind a 30s gateway
 * timeout. The route remains for manual admin triggers; the daily cron now
 * invokes this directly.
 */

import { runIngestion } from "@/lib/ingestion";

async function main() {
  const start = Date.now();
  console.log(`[run-ingestion] Starting at ${new Date().toISOString()}`);

  const { diff, meta } = await runIngestion();

  const dur = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `[run-ingestion] Complete in ${dur}s — ${diff.newRecords.length} new, ${diff.updatedRecords.length} updated, ${diff.unchangedCount} unchanged`,
  );
  console.log(`[run-ingestion] sources: ${meta.sources.join(", ")}`);
  console.log(`[run-ingestion] fetchCounts: ${JSON.stringify(meta.fetchCounts)}`);
  if (Object.keys(meta.fetchErrors).length > 0) {
    console.log(
      `[run-ingestion] fetchErrors: ${JSON.stringify(meta.fetchErrors)}`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[run-ingestion] FAILED:", err);
    process.exit(1);
  });
