/**
 * Classification Accuracy Audit — Sample Pull
 *
 * Pulls 35 records across confidence buckets:
 *   20 high, 10 medium, 5 needs_review
 *
 * Shows source content alongside classification result
 * for manual verification.
 *
 * Usage: npx tsx scripts/audit-sample.ts
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function pullBucket(confidence: string, count: number) {
  const results = await prisma.classificationResult.findMany({
    where: { confidence },
    orderBy: { createdAt: "desc" },
    take: count,
  });

  const records = await Promise.all(
    results.map(async (r) => {
      const source = await prisma.ingestedRecord.findUnique({
        where: { id: r.recordId },
        select: { source: true, title: true, summary: true, url: true, date: true },
      });
      return { classification: r, source };
    })
  );

  return records;
}

async function main() {
  const high = await pullBucket("high", 20);
  const medium = await pullBucket("medium", 10);
  const needsReview = await pullBucket("needs_review", 5);

  const all = [
    ...high.map((r) => ({ ...r, bucket: "HIGH" })),
    ...medium.map((r) => ({ ...r, bucket: "MEDIUM" })),
    ...needsReview.map((r) => ({ ...r, bucket: "NEEDS_REVIEW" })),
  ];

  let num = 0;
  for (const entry of all) {
    num++;
    const c = entry.classification;
    const s = entry.source;
    console.log(`\n${"=".repeat(80)}`);
    console.log(`#${num} | ${entry.bucket} | ${c.eventType} | cities: [${c.affectedCities.join(", ")}]`);
    console.log(`${"=".repeat(80)}`);
    console.log(`SOURCE: ${s?.source ?? "unknown"} | ${s?.date ?? "?"}`);
    console.log(`TITLE:  ${s?.title ?? "N/A"}`);
    console.log(`URL:    ${s?.url ?? "N/A"}`);
    console.log(`SUMMARY:\n  ${(s?.summary ?? "N/A").slice(0, 500)}`);
    console.log(`\nCLASSIFICATION:`);
    console.log(`  Event Type:  ${c.eventType}`);
    console.log(`  Confidence:  ${c.confidence}`);
    console.log(`  Cities:      [${c.affectedCities.join(", ")}]`);
    console.log(`  Factors:     ${JSON.stringify(c.factorsJson, null, 2).split("\n").join("\n               ")}`);
    console.log(`  Model:       ${c.modelUsed}`);
    console.log(`  Prompt Ver:  ${c.promptVersion}`);
    console.log(`  Classified:  ${c.createdAt.toISOString().slice(0, 16)}`);
  }

  console.log(`\n\n${"=".repeat(80)}`);
  console.log(`AUDIT SUMMARY: ${all.length} records pulled`);
  console.log(`  HIGH: ${high.length}, MEDIUM: ${medium.length}, NEEDS_REVIEW: ${needsReview.length}`);
  console.log(`${"=".repeat(80)}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
