/**
 * UAM Market Pulse — Newsletter Data Export
 *
 * Pulls fresh data from the live database for the weekly newsletter.
 * Run every Friday before building the PDF.
 *
 * Usage: npx tsx scripts/newsletter-data.ts
 *
 * Options:
 *   --days=N   Lookback window for "what moved" (default: 7)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DAYS_BACK = parseInt(
  process.argv.find((a) => a.startsWith("--days="))?.split("=")[1] ?? "7",
  10
);
const SINCE = new Date(Date.now() - DAYS_BACK * 86400000);

const CITY_NAMES: Record<string, { name: string; state: string }> = {
  los_angeles: { name: "Los Angeles", state: "CA" },
  dallas: { name: "Dallas", state: "TX" },
  new_york: { name: "New York", state: "NY" },
  miami: { name: "Miami", state: "FL" },
  orlando: { name: "Orlando", state: "FL" },
  columbus: { name: "Columbus", state: "OH" },
  san_francisco: { name: "San Francisco", state: "CA" },
  san_diego: { name: "San Diego", state: "CA" },
  houston: { name: "Houston", state: "TX" },
  austin: { name: "Austin", state: "TX" },
  denver: { name: "Denver", state: "CO" },
  seattle: { name: "Seattle", state: "WA" },
  atlanta: { name: "Atlanta", state: "GA" },
  phoenix: { name: "Phoenix", state: "AZ" },
  boston: { name: "Boston", state: "MA" },
  washington_dc: { name: "Washington DC", state: "DC" },
  las_vegas: { name: "Las Vegas", state: "NV" },
  minneapolis: { name: "Minneapolis", state: "MN" },
  tampa: { name: "Tampa", state: "FL" },
  charlotte: { name: "Charlotte", state: "NC" },
  detroit: { name: "Detroit", state: "MI" },
  nashville: { name: "Nashville", state: "TN" },
  chicago: { name: "Chicago", state: "IL" },
};

function fmt(cityId: string): string {
  const c = CITY_NAMES[cityId];
  return c ? `${c.name}, ${c.state}` : cityId;
}

async function main() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  console.log(`\n${"=".repeat(70)}`);
  console.log(`  UAM MARKET PULSE — DATA EXPORT`);
  console.log(`  ${today}`);
  console.log(`  Lookback: ${DAYS_BACK} days (since ${SINCE.toISOString().slice(0, 10)})`);
  console.log(`${"=".repeat(70)}`);

  // ── 1. Current scores (latest snapshot per city) ──────────────
  const cityIds = await prisma.scoreSnapshot.groupBy({ by: ["cityId"] });
  const scores: { cityId: string; score: number; tier: string; prevScore: number | null }[] = [];

  for (const { cityId } of cityIds) {
    // Get current score
    const current = await prisma.scoreSnapshot.findFirst({
      where: { cityId },
      orderBy: { capturedAt: "desc" },
      select: { score: true, tier: true, capturedAt: true },
    });
    if (!current) continue;

    // Get the oldest snapshot within the lookback window to compare against
    const weekAgo = await prisma.scoreSnapshot.findFirst({
      where: { cityId, capturedAt: { lte: SINCE } },
      orderBy: { capturedAt: "desc" },
      select: { score: true },
    });

    scores.push({
      cityId,
      score: current.score,
      tier: current.tier ?? "",
      prevScore: weekAgo?.score ?? null,
    });
  }

  scores.sort((a, b) => b.score - a.score || a.cityId.localeCompare(b.cityId));

  // ── 2. Leaderboard ────────────────────────────────────────────
  console.log(`\n\n${"─".repeat(70)}`);
  console.log(`  SECTION 1: LEADERBOARD — TOP 10`);
  console.log(`${"─".repeat(70)}\n`);
  console.log(`  ${"#".padEnd(4)} ${"MARKET".padEnd(28)} ${"SCORE".padEnd(8)} ${"TIER".padEnd(12)} CHANGE`);
  console.log(`  ${"─".repeat(64)}`);

  for (let i = 0; i < Math.min(10, scores.length); i++) {
    const s = scores[i];
    let change = "→ No change";
    if (s.prevScore !== null && s.prevScore !== s.score) {
      const delta = s.score - s.prevScore;
      change = delta > 0 ? `↑ +${delta} this week` : `↓ ${delta} this week`;
    }
    console.log(
      `  ${String(i + 1).padEnd(4)} ${fmt(s.cityId).padEnd(28)} ${String(s.score).padEnd(8)} ${s.tier.padEnd(12)} ${change}`
    );
  }

  const avg = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
  console.log(`\n  Average score across all ${scores.length} tracked markets: ${avg.toFixed(1)}`);

  // ── 3. Markets by Tier ────────────────────────────────────────
  console.log(`\n\n${"─".repeat(70)}`);
  console.log(`  SECTION 2: MARKETS BY TIER`);
  console.log(`${"─".repeat(70)}\n`);

  const tierOrder = ["ADVANCED", "MODERATE", "EARLY", "NASCENT"];
  const tierRanges: Record<string, string> = {
    ADVANCED: "80–100",
    MODERATE: "60–79",
    EARLY: "20–59",
    NASCENT: "0–19",
  };

  for (const tier of tierOrder) {
    const cities = scores.filter((s) => s.tier === tier);
    const names = cities.map((c) => `${fmt(c.cityId)} (${c.score})`).join(" · ");
    console.log(`  ${tier} ${tierRanges[tier] ?? ""} [${cities.length} markets]`);
    console.log(`    ${names || "(none)"}`);
    console.log();
  }

  // ── 4. What Moved This Week ───────────────────────────────────
  console.log(`\n${"─".repeat(70)}`);
  console.log(`  SECTION 3: WHAT MOVED THIS WEEK (REGULATORY SIGNALS)`);
  console.log(`${"─".repeat(70)}\n`);

  // Score changes
  const movers = scores.filter((s) => s.prevScore !== null && s.prevScore !== s.score);
  if (movers.length > 0) {
    console.log("  SCORE CHANGES:");
    for (const m of movers) {
      console.log(`    ${fmt(m.cityId)}: ${m.prevScore} → ${m.score} (${m.score - (m.prevScore ?? 0) > 0 ? "+" : ""}${m.score - (m.prevScore ?? 0)})`);
    }
    console.log();
  } else {
    console.log("  No score changes this week.\n");
  }

  // New overrides
  const overrides = await prisma.scoringOverride.findMany({
    where: { createdAt: { gte: SINCE }, cityId: { not: "__unresolved__" } },
    select: { cityId: true, field: true, confidence: true, reason: true, appliedAt: true },
    orderBy: { createdAt: "desc" },
  });

  if (overrides.length > 0) {
    console.log("  NEW SCORING SIGNALS:");
    for (const o of overrides) {
      const status = o.appliedAt ? "APPLIED" : "PENDING REVIEW";
      console.log(`    [${o.confidence.toUpperCase()}] ${fmt(o.cityId)} — ${o.field} (${status})`);
      console.log(`      ${o.reason.slice(0, 120)}`);
      console.log();
    }
  }

  // Recent relevant classifications
  const classifications = await prisma.classificationResult.findMany({
    where: { createdAt: { gte: SINCE }, eventType: { not: "not_relevant" } },
    select: { eventType: true, confidence: true, affectedCities: true, recordId: true },
    orderBy: { createdAt: "desc" },
  });

  if (classifications.length > 0) {
    console.log(`  CLASSIFIED SIGNALS: ${classifications.length} relevant`);
    const byType = new Map<string, number>();
    for (const c of classifications) {
      byType.set(c.eventType, (byType.get(c.eventType) ?? 0) + 1);
    }
    for (const [type, count] of byType) {
      console.log(`    ${type}: ${count}`);
    }
    console.log();
  }

  // ── 5. Pipeline Stats ─────────────────────────────────────────
  console.log(`\n${"─".repeat(70)}`);
  console.log(`  SECTION 4: PIPELINE STATS (FOR "ABOUT" / AUTHORITY CALLOUT)`);
  console.log(`${"─".repeat(70)}\n`);

  const totalIngested = await prisma.ingestedRecord.count();
  const sources = await prisma.ingestedRecord.groupBy({ by: ["source"], _count: true });
  const totalClassified = await prisma.classificationResult.count();
  const totalRelevant = await prisma.classificationResult.count({
    where: { eventType: { not: "not_relevant" } },
  });
  const totalOverrides = await prisma.scoringOverride.count();
  const appliedOverrides = await prisma.scoringOverride.count({
    where: { appliedAt: { not: null } },
  });

  console.log(`  Total records ingested: ${totalIngested.toLocaleString()}`);
  console.log(`  Sources:`);
  for (const s of sources.sort((a, b) => b._count - a._count)) {
    const pct = ((s._count / totalIngested) * 100).toFixed(1);
    console.log(`    ${s.source}: ${s._count.toLocaleString()} (${pct}%)`);
  }
  console.log(`  Classifications: ${totalClassified} total, ${totalRelevant} relevant (${((totalRelevant / totalClassified) * 100).toFixed(0)}% signal rate)`);
  console.log(`  Scoring overrides: ${totalOverrides} total, ${appliedOverrides} applied`);
  console.log(`  Markets tracked: ${scores.length}`);

  // ── 6. Full Rankings (copy-paste ready) ───────────────────────
  console.log(`\n\n${"─".repeat(70)}`);
  console.log(`  FULL RANKINGS — ALL ${scores.length} MARKETS`);
  console.log(`${"─".repeat(70)}\n`);
  console.log(`  ${"#".padEnd(4)} ${"MARKET".padEnd(28)} ${"SCORE".padEnd(8)} ${"TIER".padEnd(12)}`);
  console.log(`  ${"─".repeat(52)}`);
  for (let i = 0; i < scores.length; i++) {
    const s = scores[i];
    console.log(
      `  ${String(i + 1).padEnd(4)} ${fmt(s.cityId).padEnd(28)} ${String(s.score).padEnd(8)} ${s.tier.padEnd(12)}`
    );
  }

  console.log(`\n\n${"=".repeat(70)}`);
  console.log(`  DATA EXPORT COMPLETE — Use this to build the newsletter PDF`);
  console.log(`${"=".repeat(70)}\n`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
