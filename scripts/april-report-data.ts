/**
 * April 2026 monthly report — data gathering.
 *
 * Modeled on march-report-data.ts but expanded with predictive-layer
 * metrics, override-pipeline activity, and per-source ingestion split
 * (April was the predictive expansion month).
 *
 * Usage: npx tsx scripts/april-report-data.ts
 */

import { PrismaClient } from "@prisma/client";
import { CITIES, OPERATORS } from "../src/data/seed";

const prisma = new PrismaClient();
const APRIL_START = new Date("2026-04-01T00:00:00Z");
const APRIL_END = new Date("2026-05-01T00:00:00Z");

async function main() {
  console.log("=".repeat(72));
  console.log("APRIL 2026 — REPORT DATA");
  console.log(`Window: ${APRIL_START.toISOString()} → ${APRIL_END.toISOString()}`);
  console.log("=".repeat(72));
  console.log();

  // -------------------------------------------------------
  // 1) Score movements (first April snapshot vs latest)
  // -------------------------------------------------------
  const snaps = await prisma.scoreSnapshot.findMany({
    where: { capturedAt: { gte: APRIL_START, lt: APRIL_END } },
    orderBy: { capturedAt: "asc" },
    select: { cityId: true, score: true, tier: true, capturedAt: true },
  });

  type Pair = { first: typeof snaps[0]; last: typeof snaps[0] };
  const cityMap = new Map<string, Pair>();
  for (const s of snaps) {
    const existing = cityMap.get(s.cityId);
    if (!existing) cityMap.set(s.cityId, { first: s, last: s });
    else existing.last = s;
  }

  console.log("=== SCORE MOVEMENTS (April 1 → latest) ===");
  const movers: Array<{ cityId: string; from: number; to: number; delta: number; fromTier: string | null; toTier: string | null }> = [];
  for (const [id, { first, last }] of cityMap) {
    if (first.score !== last.score || first.tier !== last.tier) {
      movers.push({
        cityId: id,
        from: first.score,
        to: last.score,
        delta: last.score - first.score,
        fromTier: first.tier,
        toTier: last.tier,
      });
    }
  }
  movers.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  for (const m of movers) {
    console.log(
      `  ${m.cityId.padEnd(20)} ${String(m.from).padStart(3)} → ${String(m.to).padStart(3)}  ` +
        `(${m.delta >= 0 ? "+" : ""}${m.delta})  ${m.fromTier} → ${m.toTier}`,
    );
  }
  if (movers.length === 0) console.log("  (no score movements in April)");
  console.log();

  // -------------------------------------------------------
  // 2) Changelog stream — score_change + milestone events
  // -------------------------------------------------------
  const changelog = await prisma.changelogEntry.findMany({
    where: { timestamp: { gte: APRIL_START, lt: APRIL_END } },
    orderBy: { timestamp: "asc" },
  });
  const byType = new Map<string, number>();
  for (const c of changelog) {
    byType.set(c.changeType, (byType.get(c.changeType) ?? 0) + 1);
  }
  console.log(`=== CHANGELOG (${changelog.length} entries in April) ===`);
  for (const [type, n] of Array.from(byType.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type.padEnd(20)} ${n}`);
  }
  console.log();

  console.log("--- score_change entries (chronological) ---");
  for (const c of changelog.filter((c) => c.changeType === "score_change")) {
    console.log(`  ${c.timestamp.toISOString().slice(0, 16)}  ${c.summary}`);
  }
  console.log();

  // -------------------------------------------------------
  // 3) Ingestion run aggregates
  // -------------------------------------------------------
  const runs = await prisma.ingestionRun.findMany({
    where: { startedAt: { gte: APRIL_START, lt: APRIL_END } },
    orderBy: { startedAt: "desc" },
  });
  let totalNew = 0;
  let totalUpdated = 0;
  for (const r of runs) {
    totalNew += r.newRecords;
    totalUpdated += r.updatedRecords;
  }
  console.log(`=== INGESTION ===`);
  console.log(`  Runs in April: ${runs.length}`);
  console.log(`  New records:    ${totalNew}`);
  console.log(`  Updated:        ${totalUpdated}`);
  if (runs[0]) {
    console.log(`  Latest snapshot total: ${runs[0].totalRecords} records`);
    console.log(`  Latest sources: ${runs[0].sources.join(", ")}`);
  }
  console.log();

  // -------------------------------------------------------
  // 4) IngestedRecord per-source breakdown for April
  // -------------------------------------------------------
  const ingestedThisMonth = await prisma.ingestedRecord.groupBy({
    by: ["source"],
    where: { ingestedAt: { gte: APRIL_START, lt: APRIL_END } },
    _count: { _all: true },
  });
  console.log(`=== INGESTED RECORDS BY SOURCE (April) ===`);
  for (const s of ingestedThisMonth.sort((a, b) => b._count._all - a._count._all)) {
    console.log(`  ${s.source.padEnd(22)} ${s._count._all}`);
  }
  console.log();

  // -------------------------------------------------------
  // 5) Override pipeline activity
  // -------------------------------------------------------
  const overridesCreated = await prisma.scoringOverride.count({
    where: { createdAt: { gte: APRIL_START, lt: APRIL_END } },
  });
  const overridesApplied = await prisma.scoringOverride.count({
    where: { appliedAt: { gte: APRIL_START, lt: APRIL_END } },
  });
  const overridesAutoApplied = await prisma.scoringOverride.count({
    where: {
      appliedAt: { gte: APRIL_START, lt: APRIL_END },
      origin: "classifier",
    },
  });
  const overridesSuperseded = await prisma.scoringOverride.count({
    where: { supersededAt: { gte: APRIL_START, lt: APRIL_END } },
  });
  console.log(`=== OVERRIDE PIPELINE (April) ===`);
  console.log(`  Created:          ${overridesCreated}`);
  console.log(`  Applied:          ${overridesApplied}`);
  console.log(`  Auto-applied:     ${overridesAutoApplied}`);
  console.log(`  Superseded:       ${overridesSuperseded}`);
  console.log();

  // -------------------------------------------------------
  // 6) Classification activity
  // -------------------------------------------------------
  const classifications = await prisma.classificationResult.count({
    where: { createdAt: { gte: APRIL_START, lt: APRIL_END } },
  });
  const byEventType = await prisma.classificationResult.groupBy({
    by: ["eventType"],
    where: { createdAt: { gte: APRIL_START, lt: APRIL_END } },
    _count: { _all: true },
  });
  console.log(`=== CLASSIFICATION (April) ===`);
  console.log(`  Total classifications: ${classifications}`);
  console.log(`  By event type:`);
  for (const e of byEventType.sort((a, b) => b._count._all - a._count._all).slice(0, 12)) {
    console.log(`    ${e.eventType.padEnd(28)} ${e._count._all}`);
  }
  console.log();

  // -------------------------------------------------------
  // 7) Users + Leads + Corridors
  // -------------------------------------------------------
  const newUsers = await prisma.user.count({
    where: { createdAt: { gte: APRIL_START, lt: APRIL_END } },
  });
  const totalUsers = await prisma.user.count();
  console.log(`=== USERS ===`);
  console.log(`  Total: ${totalUsers}, new in April: ${newUsers}`);
  console.log();

  const leads = await prisma.marketLead.count();
  const newLeads = await prisma.marketLead.count({
    where: { createdAt: { gte: APRIL_START, lt: APRIL_END } },
  });
  console.log(`=== MARKET LEADS: ${leads} total, ${newLeads} added in April ===`);
  console.log();

  const corridors = await prisma.corridor.count();
  console.log(`=== CORRIDORS: ${corridors} total ===`);
  console.log();

  // -------------------------------------------------------
  // 8) Current rankings (snapshot at end of month)
  // -------------------------------------------------------
  console.log("=== CURRENT RANKINGS ===");
  const sorted = [...CITIES].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  for (const c of sorted) {
    const score = c.score ?? 0;
    const tier =
      score >= 75 ? "ADVANCED" : score >= 50 ? "MODERATE" : score >= 30 ? "EARLY" : "NASCENT";
    console.log(`  ${String(score).padStart(3)} | ${c.city.padEnd(20)} | ${c.state} | ${tier}`);
  }
  console.log();

  // -------------------------------------------------------
  // 9) Operators & state of platform
  // -------------------------------------------------------
  console.log(`=== PLATFORM ===`);
  console.log(`  Cities:    ${CITIES.length}`);
  console.log(`  Operators: ${OPERATORS.length}`);
  console.log();

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
