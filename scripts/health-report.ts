import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const buckets = await prisma.classificationResult.groupBy({
    by: ["confidence"],
    _count: true,
    orderBy: { _count: { confidence: "desc" } },
  });
  const total = buckets.reduce((s, b) => s + b._count, 0);
  console.log("=== CLASSIFICATION CONFIDENCE BUCKETS ===");
  console.log("Total classifications: " + total);
  for (const b of buckets) {
    const pct = ((b._count / total) * 100).toFixed(1);
    console.log("  " + b.confidence + ": " + b._count + " (" + pct + "%)");
  }

  console.log("\n=== EVENT TYPE DISTRIBUTION ===");
  const eventTypes = await prisma.classificationResult.groupBy({
    by: ["eventType"],
    _count: true,
    orderBy: { _count: { eventType: "desc" } },
  });
  for (const e of eventTypes) {
    console.log("  " + e.eventType + ": " + e._count);
  }

  console.log("\n=== SCORING OVERRIDES ===");
  const overrides = await prisma.scoringOverride.groupBy({
    by: ["confidence"],
    _count: true,
    orderBy: { _count: { confidence: "desc" } },
  });
  const overrideTotal = overrides.reduce((s, o) => s + o._count, 0);
  console.log("Total overrides: " + overrideTotal);
  for (const o of overrides) {
    console.log("  " + o.confidence + ": " + o._count);
  }
  const applied = await prisma.scoringOverride.count({ where: { appliedAt: { not: null } } });
  const superseded = await prisma.scoringOverride.count({ where: { supersededAt: { not: null } } });
  console.log("  Applied: " + applied + ", Superseded: " + superseded + ", Pending: " + (overrideTotal - applied - superseded));

  console.log("\n=== AUTO-REVIEW DECISIONS ===");
  const reviews = await prisma.autoReviewResult.groupBy({
    by: ["decision"],
    _count: true,
    orderBy: { _count: { decision: "desc" } },
  });
  const reviewTotal = reviews.reduce((s, r) => s + r._count, 0);
  console.log("Total reviews: " + reviewTotal);
  for (const r of reviews) {
    console.log("  " + r.decision + ": " + r._count);
  }

  console.log("\n=== INGESTED RECORDS BY SOURCE ===");
  const sources = await prisma.ingestedRecord.groupBy({
    by: ["source"],
    _count: true,
    orderBy: { _count: { source: "desc" } },
  });
  const ingestTotal = sources.reduce((s, r) => s + r._count, 0);
  console.log("Total ingested: " + ingestTotal);
  for (const s of sources) {
    const pct = ((s._count / ingestTotal) * 100).toFixed(1);
    console.log("  " + s.source + ": " + s._count + " (" + pct + "%)");
  }

  console.log("\n=== LAST 5 INGESTION RUNS ===");
  const runs = await prisma.ingestionRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 5,
  });
  for (const r of runs) {
    const status = r.error ? "ERROR: " + r.error.slice(0, 80) : "OK";
    console.log("  " + r.startedAt.toISOString().slice(0, 16) + " | new=" + r.newRecords + " upd=" + r.updatedRecords + " total=" + r.totalRecords + " | overrides=" + r.overridesCreated + "/" + r.overridesApplied + " | scores=" + r.scoreChanges + " | " + status);
  }

  // New classifications since backfill
  console.log("\n=== NEW CLASSIFICATIONS (SINCE BACKFILL) ===");
  const cutoff = new Date("2026-03-12T18:00:00Z");
  const newClassifications = await prisma.classificationResult.findMany({
    where: { createdAt: { gte: cutoff } },
    select: { eventType: true, confidence: true, affectedCities: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  console.log("New classifications since backfill: " + newClassifications.length);
  const newRelevant = newClassifications.filter(function(c) { return c.eventType !== "not_relevant"; });
  console.log("  Relevant (non not_relevant): " + newRelevant.length);
  for (const c of newRelevant) {
    console.log("    [" + c.confidence + "] " + c.eventType + " -> cities: [" + c.affectedCities.join(", ") + "]");
  }
  const newNotRelevant = newClassifications.length - newRelevant.length;
  if (newNotRelevant > 0) {
    console.log("  not_relevant: " + newNotRelevant);
  }

  // New overrides since backfill
  console.log("\n=== NEW OVERRIDES (SINCE BACKFILL) ===");
  const newOverrides = await prisma.scoringOverride.findMany({
    where: { createdAt: { gte: cutoff } },
    select: { cityId: true, field: true, confidence: true, reason: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  console.log("New overrides since backfill: " + newOverrides.length);
  for (const o of newOverrides.slice(0, 20)) {
    console.log("  [" + o.confidence + "] " + o.cityId + " -> " + o.field + ": " + o.reason.slice(0, 90));
  }
  if (newOverrides.length > 20) console.log("  ... and " + (newOverrides.length - 20) + " more");
}

main().catch(console.error).finally(function() { return prisma.$disconnect(); });
