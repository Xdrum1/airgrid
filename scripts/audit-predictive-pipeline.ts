/**
 * Predictive Pipeline Audit
 *
 * Verifies the predictive logic is working end-to-end across all 5 layers:
 *   0. Pipeline freshness — when did the cron last run, did it error
 *   1. Forward-tracking — ingestion stream by source (counts UPDATES, not just NEW)
 *   2. Reactive — classifier output by event type and confidence
 *   3. Conditional forecasting — overrides created and applied
 *   4. Auto-reviewer decisions
 *   5. MarketWatch (ratings agency layer)
 *
 * Run periodically — and ALWAYS before sending a Pulse / Monday / report
 * issue that makes claims about platform behavior.
 *
 * Usage: npx tsx scripts/audit-predictive-pipeline.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { CITIES } from "../src/data/seed";

const prisma = new PrismaClient();

const SEVEN_DAYS_AGO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

function pad(s: string | number, n: number): string {
  return String(s).padEnd(n);
}

async function main() {
  console.log("================================================================");
  console.log("  AIRINDEX PREDICTIVE LOGIC AUDIT — END-TO-END VERIFICATION");
  console.log("================================================================");

  // ───────────────────────────────────────────────────────────────────
  // LAYER 0: Pipeline freshness
  // ───────────────────────────────────────────────────────────────────
  console.log("\n[ LAYER 0 — Pipeline freshness ]");
  const lastRuns = await prisma.ingestionRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 5,
  });
  for (const r of lastRuns) {
    const ago = Math.round((Date.now() - r.startedAt.getTime()) / (60 * 60 * 1000));
    const ok = r.error ? "FAIL" : "OK  ";
    console.log(
      `  ${ok}  ${r.startedAt.toISOString()}  (${ago}h ago)  src:${r.sources.length}  new:${r.newRecords}  upd:${r.updatedRecords}  ovr:${r.overridesCreated}/${r.overridesApplied}  scoreΔ:${r.scoreChanges}${r.error ? "  err:" + r.error.substring(0, 60) : ""}`
    );
  }

  // ───────────────────────────────────────────────────────────────────
  // LAYER 1: Forward-tracking — by source
  // IMPORTANT: count by `updatedAt` not `ingestedAt` so we capture status
  // changes on existing records, not just first-time ingestion. The earlier
  // version of this audit reported "LegiScan dead" because it was looking
  // at ingestedAt — the bills were there, just not freshly created.
  // ───────────────────────────────────────────────────────────────────
  console.log("\n[ LAYER 1 — Forward-tracking (records updated in last 7d) ]");
  const updatedBySource = await prisma.ingestedRecord.groupBy({
    by: ["source"],
    where: { updatedAt: { gte: SEVEN_DAYS_AGO } },
    _count: { _all: true },
  });
  const totalUpdated7d = updatedBySource.reduce((s, x) => s + x._count._all, 0);
  console.log(`  Records updated last 7 days: ${totalUpdated7d}`);
  for (const s of updatedBySource.sort((a, b) => b._count._all - a._count._all)) {
    console.log(`    ${pad(s.source, 20)} ${s._count._all}`);
  }

  // Also show NEW (first-time) records — useful for spotting fresh signals
  const newBySource = await prisma.ingestedRecord.groupBy({
    by: ["source"],
    where: { ingestedAt: { gte: SEVEN_DAYS_AGO } },
    _count: { _all: true },
  });
  const totalNew7d = newBySource.reduce((s, x) => s + x._count._all, 0);
  console.log(`  Of which NEW (first-time) records: ${totalNew7d}`);
  for (const s of newBySource.sort((a, b) => b._count._all - a._count._all)) {
    console.log(`    ${pad(s.source, 20)} ${s._count._all}`);
  }

  // Source health floor — flag any source that hasn't updated anything in 7d
  const ALL_SOURCES = ["legiscan", "federal_register", "sec_edgar", "operator_news", "congress_gov", "regulations_gov"];
  const presentSources = new Set(updatedBySource.map((s) => s.source));
  const silentSources = ALL_SOURCES.filter((s) => !presentSources.has(s));
  if (silentSources.length > 0) {
    console.log(`  WARNING: ${silentSources.length} source(s) silent for 7+ days: ${silentSources.join(", ")}`);
  }

  // ───────────────────────────────────────────────────────────────────
  // LAYER 2: Reactive — classifications
  // ───────────────────────────────────────────────────────────────────
  console.log("\n[ LAYER 2 — Reactive classification ]");
  const classByType = await prisma.classificationResult.groupBy({
    by: ["eventType"],
    where: { createdAt: { gte: SEVEN_DAYS_AGO } },
    _count: { _all: true },
  });
  const totalClass7d = classByType.reduce((s, x) => s + x._count._all, 0);
  console.log(`  Classifications last 7 days: ${totalClass7d}`);
  for (const c of classByType.sort((a, b) => b._count._all - a._count._all)) {
    console.log(`    ${pad(c.eventType, 35)} ${c._count._all}`);
  }

  const classByConfidence = await prisma.classificationResult.groupBy({
    by: ["confidence"],
    where: { createdAt: { gte: SEVEN_DAYS_AGO } },
    _count: { _all: true },
  });
  console.log(`  Confidence distribution (7d):`);
  for (const c of classByConfidence) {
    console.log(`    ${pad(c.confidence, 15)} ${c._count._all}`);
  }

  const citiesWithClass = await prisma.classificationResult.findMany({
    where: { createdAt: { gte: SEVEN_DAYS_AGO } },
    select: { affectedCities: true },
  });
  const uniqueCities = new Set<string>();
  for (const c of citiesWithClass) {
    for (const city of c.affectedCities) uniqueCities.add(city);
  }
  console.log(`  Unique markets touched by classifications (7d): ${uniqueCities.size}`);

  // ───────────────────────────────────────────────────────────────────
  // LAYER 3: Conditional forecasting — overrides
  // ───────────────────────────────────────────────────────────────────
  console.log("\n[ LAYER 3 — Conditional forecasting (overrides) ]");
  const ovrByConf = await prisma.scoringOverride.groupBy({
    by: ["confidence"],
    where: { createdAt: { gte: SEVEN_DAYS_AGO } },
    _count: { _all: true },
  });
  console.log(`  Overrides created last 7 days:`);
  for (const o of ovrByConf) {
    console.log(`    ${pad(o.confidence, 15)} ${o._count._all}`);
  }

  const appliedRecent = await prisma.scoringOverride.count({
    where: { appliedAt: { gte: SEVEN_DAYS_AGO } },
  });
  const pendingNeedsReview = await prisma.scoringOverride.count({
    where: { appliedAt: null, supersededAt: null, confidence: "needs_review" },
  });
  const pendingOther = await prisma.scoringOverride.count({
    where: { appliedAt: null, supersededAt: null, confidence: { not: "needs_review" } },
  });
  console.log(`  Applied (7d): ${appliedRecent}`);
  console.log(`  Currently pending — needs_review: ${pendingNeedsReview}`);
  console.log(`  Currently pending — other (high/medium): ${pendingOther}`);

  const ovrCities = await prisma.scoringOverride.groupBy({
    by: ["cityId"],
    where: { createdAt: { gte: SEVEN_DAYS_AGO } },
    _count: { _all: true },
  });
  const realCityOvrs = ovrCities.filter((c) => c.cityId !== "__unresolved__");
  const unresolvedCount = ovrCities.find((c) => c.cityId === "__unresolved__")?._count._all ?? 0;
  console.log(`  Markets with overrides (7d): ${realCityOvrs.length} real + ${unresolvedCount} unresolved`);
  for (const c of realCityOvrs.sort((a, b) => b._count._all - a._count._all).slice(0, 10)) {
    console.log(`    ${pad(c.cityId, 25)} ${c._count._all}`);
  }
  if (unresolvedCount > realCityOvrs.length) {
    console.log(`  WARNING: more unresolved overrides than resolved (${unresolvedCount} vs ${realCityOvrs.length}) — check operator routing`);
  }

  // ───────────────────────────────────────────────────────────────────
  // LAYER 4: Auto-reviewer decisions
  // ───────────────────────────────────────────────────────────────────
  console.log("\n[ LAYER 4 — Auto-reviewer decisions (7d) ]");
  const autoReview = await prisma.autoReviewResult.groupBy({
    by: ["decision"],
    where: { createdAt: { gte: SEVEN_DAYS_AGO } },
    _count: { _all: true },
  });
  if (autoReview.length === 0) {
    console.log(`  No auto-reviewer decisions in last 7 days`);
  } else {
    for (const a of autoReview) {
      console.log(`    ${pad(a.decision, 15)} ${a._count._all}`);
    }
  }

  // ───────────────────────────────────────────────────────────────────
  // LAYER 5: MarketWatch — ratings agency layer
  // ───────────────────────────────────────────────────────────────────
  console.log("\n[ LAYER 5 — MarketWatch status ]");
  const watches = await prisma.marketWatch.groupBy({
    by: ["watchStatus"],
    _count: { _all: true },
  });
  if (watches.length === 0) {
    console.log(`  WARNING: MarketWatch table is empty — derivation hasn't run or has no signals`);
  } else {
    const total = watches.reduce((s, w) => s + w._count._all, 0);
    console.log(`  Total markets in MarketWatch: ${total}`);
    for (const w of watches) {
      console.log(`    ${pad(w.watchStatus, 20)} ${w._count._all}`);
    }
  }

  // Specifically surface NEGATIVE_WATCH and POSITIVE_WATCH cities — these
  // are the markets the platform considers materially changed. They're
  // the candidates for the next Pulse/Monday/report leads.
  const flagged = await prisma.marketWatch.findMany({
    where: { watchStatus: { in: ["NEGATIVE_WATCH", "POSITIVE_WATCH"] } },
    orderBy: [{ watchStatus: "desc" }, { cityId: "asc" }],
    select: { cityId: true, watchStatus: true, outlook: true, updatedAt: true },
  });
  if (flagged.length > 0) {
    console.log(`\n  Flagged markets (Pulse-ready leads):`);
    for (const f of flagged) {
      console.log(`    ${pad(f.cityId, 20)} ${pad(f.watchStatus, 16)} ${pad(f.outlook, 14)} updated ${f.updatedAt.toISOString().substring(0, 10)}`);
    }
  }

  // ───────────────────────────────────────────────────────────────────
  // GAPS — markets with no recent signal at all
  // ───────────────────────────────────────────────────────────────────
  console.log("\n[ GAPS — markets with zero classifier OR override activity in last 7 days ]");
  const allCityIds = CITIES.map((c) => c.id);
  const allWithSignals = new Set<string>();
  for (const c of realCityOvrs) allWithSignals.add(c.cityId);
  for (const c of uniqueCities) allWithSignals.add(c);

  const dark = allCityIds.filter((id) => !allWithSignals.has(id));
  console.log(`  Markets with NO signals in 7d: ${dark.length} of ${allCityIds.length}`);
  if (dark.length > 0 && dark.length < allCityIds.length) {
    for (const d of dark) console.log(`    ${d}`);
  }

  console.log("\n================================================================\n");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
