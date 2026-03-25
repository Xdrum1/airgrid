/**
 * Daily Social Media Post Drafter
 *
 * Pulls current AirIndex data and drafts posts for X and LinkedIn.
 * Positions AirIndex as the Moody's of UAM — authoritative, data-driven, concise.
 *
 * Usage: npx tsx scripts/draft-social.ts
 *
 * Options:
 *   --days=N   Look back N days for changes (default: 1)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DAYS_BACK = parseInt(
  process.argv.find((a) => a.startsWith("--days="))?.split("=")[1] ?? "1",
  10
);
const SINCE = new Date(Date.now() - DAYS_BACK * 86400000);

const SITE = "https://www.airindex.io";
const HANDLE_X = "@AirIndexHQ";

// -------------------------------------------------------
// Data pulls
// -------------------------------------------------------

interface ScoreMove {
  cityId: string;
  cityName: string;
  state: string;
  oldScore: number;
  newScore: number;
  direction: "up" | "down";
  tier: string;
}

async function getScoreMoves(): Promise<ScoreMove[]> {
  // Get latest 2 snapshots per city to detect movement
  const cities = await prisma.scoreSnapshot.groupBy({
    by: ["cityId"],
  });

  const moves: ScoreMove[] = [];

  for (const { cityId } of cities) {
    const snaps = await prisma.scoreSnapshot.findMany({
      where: { cityId },
      orderBy: { capturedAt: "desc" },
      take: 2,
      select: { score: true, tier: true, capturedAt: true },
    });

    if (snaps.length < 2) continue;
    if (snaps[0].score !== snaps[1].score) {
      // Look up city name from seed data
      const cityInfo = CITY_NAMES[cityId];
      moves.push({
        cityId,
        cityName: cityInfo?.name ?? cityId,
        state: cityInfo?.state ?? "",
        oldScore: snaps[1].score,
        newScore: snaps[0].score,
        direction: snaps[0].score > snaps[1].score ? "up" : "down",
        tier: snaps[0].tier ?? "",
      });
    }
  }

  return moves;
}

// Simple city name lookup (avoids importing seed.ts which needs full app context)
const CITY_NAMES: Record<string, { name: string; state: string }> = {
  los_angeles: { name: "Los Angeles", state: "CA" },
  dallas: { name: "Dallas", state: "TX" },
  new_york: { name: "New York", state: "NY" },
  miami: { name: "Miami", state: "FL" },
  orlando: { name: "Orlando", state: "FL" },
  columbus: { name: "Columbus", state: "OH" },
  san_francisco: { name: "San Francisco", state: "CA" },
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
  salt_lake_city: { name: "Salt Lake City", state: "UT" },
  detroit: { name: "Detroit", state: "MI" },
};

interface NewOverride {
  cityId: string;
  cityName: string;
  field: string;
  confidence: string;
  reason: string;
}

async function getRecentOverrides(): Promise<NewOverride[]> {
  const overrides = await prisma.scoringOverride.findMany({
    where: { createdAt: { gte: SINCE } },
    select: { cityId: true, field: true, confidence: true, reason: true },
    orderBy: { createdAt: "desc" },
  });

  return overrides
    .filter((o) => o.cityId !== "__unresolved__")
    .map((o) => ({
      ...o,
      cityName: CITY_NAMES[o.cityId]?.name ?? o.cityId,
    }));
}

interface RecentClassification {
  eventType: string;
  confidence: string;
  cities: string[];
  source: string;
  title: string;
}

async function getRecentClassifications(): Promise<RecentClassification[]> {
  const classifications = await prisma.classificationResult.findMany({
    where: {
      createdAt: { gte: SINCE },
      eventType: { not: "not_relevant" },
    },
    select: {
      eventType: true,
      confidence: true,
      affectedCities: true,
      recordId: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const results: RecentClassification[] = [];
  for (const c of classifications) {
    const record = await prisma.ingestedRecord.findUnique({
      where: { id: c.recordId },
      select: { source: true, title: true },
    });
    results.push({
      eventType: c.eventType,
      confidence: c.confidence,
      cities: c.affectedCities,
      source: record?.source ?? "unknown",
      title: record?.title ?? "",
    });
  }
  return results;
}

async function getTopCities() {
  // Get latest snapshot per city
  const cities = await prisma.scoreSnapshot.groupBy({
    by: ["cityId"],
  });

  const latest: { cityId: string; score: number; tier: string }[] = [];
  for (const { cityId } of cities) {
    const snap = await prisma.scoreSnapshot.findFirst({
      where: { cityId },
      orderBy: { capturedAt: "desc" },
      select: { score: true, tier: true },
    });
    if (snap) latest.push({ cityId, score: snap.score, tier: snap.tier ?? "" });
  }

  return latest.sort((a, b) => b.score - a.score);
}

async function getIngestionStats() {
  const total = await prisma.ingestedRecord.count();
  const sources = await prisma.ingestedRecord.groupBy({
    by: ["source"],
    _count: true,
  });
  const classTotal = await prisma.classificationResult.count();
  const relevant = await prisma.classificationResult.count({
    where: { eventType: { not: "not_relevant" } },
  });
  return { total, sources, classTotal, relevant };
}

// -------------------------------------------------------
// Post templates
// -------------------------------------------------------

const FACTOR_LABELS: Record<string, string> = {
  hasActivePilotProgram: "active pilot program",
  approvedVertiport: "approved vertiport",
  activeOperatorPresence: "operator presence",
  hasVertiportZoning: "vertiport zoning",
  regulatoryPosture: "regulatory posture",
  stateLegislationStatus: "state legislation",
  hasStateLegislation: "state legislation",
  weatherInfraLevel: "weather infrastructure",
};

function formatEventType(et: string): string {
  return et
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function draftScoreMovePosts(moves: ScoreMove[]) {
  const posts: { x: string; linkedin: string }[] = [];

  for (const m of moves) {
    const arrow = m.direction === "up" ? "+" : "";
    const delta = m.newScore - m.oldScore;

    const x = [
      `${m.cityName} UAM Readiness Score: ${m.oldScore} → ${m.newScore} (${arrow}${delta})`,
      "",
      `Tier: ${m.tier}`,
      "",
      `The data moved. We tracked it.`,
      "",
      `Full breakdown: ${SITE}/city/${m.cityId}`,
      "",
      `#UAM #eVTOL #AdvancedAirMobility #AirIndex`,
    ].join("\n");

    const linkedin = [
      `**${m.cityName} UAM Market Readiness: ${m.oldScore} → ${m.newScore}**`,
      "",
      `Our scoring model detected a ${Math.abs(delta)}-point ${m.direction === "up" ? "increase" : "decrease"} in ${m.cityName}'s readiness score, moving it to the ${m.tier} tier.`,
      "",
      `AirIndex tracks ${Object.keys(CITY_NAMES).length} US markets across 7 readiness factors — pilot programs, vertiport infrastructure, operator presence, zoning, legislation, regulatory posture, and weather infrastructure.`,
      "",
      `When the data moves, we publish. No speculation, no hype — just the score.`,
      "",
      `See the full city breakdown: ${SITE}/city/${m.cityId}`,
      "",
      `#UrbanAirMobility #eVTOL #AirIndex #UAM #AdvancedAirMobility`,
    ].join("\n");

    posts.push({ x, linkedin });
  }

  return posts;
}

function draftSignalPosts(
  classifications: RecentClassification[],
  overrides: NewOverride[]
) {
  const posts: { x: string; linkedin: string }[] = [];

  // Group signals by event type for a roundup
  const byType = new Map<string, RecentClassification[]>();
  for (const c of classifications) {
    if (!byType.has(c.eventType)) byType.set(c.eventType, []);
    byType.get(c.eventType)!.push(c);
  }

  // FAA certification milestones
  const faa = byType.get("faa_certification_milestone") ?? [];
  if (faa.length > 0) {
    const x = [
      `${faa.length} FAA certification signal${faa.length > 1 ? "s" : ""} detected in the last ${DAYS_BACK}d.`,
      "",
      `Our pipeline ingests Federal Register filings, operator news, and state legislation — then classifies what actually moves UAM readiness scores.`,
      "",
      `${SITE}/feed`,
      "",
      `#FAA #eVTOL #UAM #AirIndex`,
    ].join("\n");

    const titles = faa.slice(0, 3).map((f) => `• ${f.title.slice(0, 80)}`).join("\n");
    const linkedin = [
      `**${faa.length} FAA Certification Signals Detected**`,
      "",
      `In the last ${DAYS_BACK} day${DAYS_BACK > 1 ? "s" : ""}, our automated pipeline flagged ${faa.length} FAA certification milestone${faa.length > 1 ? "s" : ""}:`,
      "",
      titles,
      "",
      `AirIndex doesn't aggregate news — we classify regulatory signals and measure their impact on market readiness. Think of it as a credit rating for UAM markets.`,
      "",
      `${SITE}/feed`,
      "",
      `#UrbanAirMobility #FAA #eVTOL #AirIndex`,
    ].join("\n");

    posts.push({ x, linkedin });
  }

  // Operator market expansion
  const ops = byType.get("operator_market_expansion") ?? [];
  if (ops.length > 0) {
    const citiesSet = new Set<string>();
    ops.forEach((o) => o.cities.forEach((c) => citiesSet.add(c)));
    const cityNames = [...citiesSet]
      .map((id) => CITY_NAMES[id]?.name ?? id)
      .filter(Boolean);

    if (cityNames.length > 0) {
      const x = [
        `Operator expansion signals detected in: ${cityNames.join(", ")}`,
        "",
        `${ops.length} new data point${ops.length > 1 ? "s" : ""} from our classification pipeline.`,
        "",
        `We track where eVTOL operators are actually moving — not where they say they'll go.`,
        "",
        `${SITE}`,
        "",
        `#eVTOL #UAM #AirIndex #AdvancedAirMobility`,
      ].join("\n");

      posts.push({ x, linkedin: x }); // Same for both on this one
    }
  }

  // High-confidence overrides (score-affecting signals)
  const highOverrides = overrides.filter((o) => o.confidence === "high");
  if (highOverrides.length > 0) {
    const lines = highOverrides.slice(0, 3).map(
      (o) => `• ${o.cityName}: ${FACTOR_LABELS[o.field] ?? o.field}`
    );

    const x = [
      `${highOverrides.length} high-confidence scoring signal${highOverrides.length > 1 ? "s" : ""} auto-applied:`,
      "",
      ...lines,
      "",
      `When the evidence is clear, the score updates automatically.`,
      "",
      `${SITE}`,
      "",
      `#UAM #eVTOL #AirIndex`,
    ].join("\n");

    posts.push({ x, linkedin: x });
  }

  return posts;
}

function draftRankingPost(topCities: { cityId: string; score: number; tier: string }[]) {
  const top5 = topCities.slice(0, 5);
  const lines = top5.map(
    (c, i) =>
      `${i + 1}. ${CITY_NAMES[c.cityId]?.name ?? c.cityId} — ${c.score}/100`
  );

  const x = [
    `Current UAM Market Readiness Rankings:`,
    "",
    ...lines,
    "",
    `Updated daily. ${Object.keys(CITY_NAMES).length} US markets scored on 7 factors.`,
    "",
    `${SITE}`,
    "",
    `#UAM #eVTOL #AirIndex #AdvancedAirMobility`,
  ].join("\n");

  const linkedin = [
    `**UAM Market Readiness Rankings — ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}**`,
    "",
    ...lines,
    "",
    `AirIndex scores ${Object.keys(CITY_NAMES).length} US markets across 7 readiness factors: pilot programs, vertiport infrastructure, operator presence, zoning, state legislation, regulatory posture, and LAANC airspace coverage.`,
    "",
    `These aren't opinions. They're measurements.`,
    "",
    `See all markets: ${SITE}`,
    "",
    `#UrbanAirMobility #eVTOL #AirIndex #UAM`,
  ].join("\n");

  return { x, linkedin };
}

function draftPipelinePost(stats: {
  total: number;
  classTotal: number;
  relevant: number;
}) {
  const signalRate = ((stats.relevant / stats.classTotal) * 100).toFixed(0);

  const x = [
    `${stats.total.toLocaleString()} regulatory filings ingested.`,
    `${stats.classTotal} classified by AI.`,
    `${stats.relevant} identified as scoring signals (${signalRate}% signal rate).`,
    "",
    `The rest is noise. We filter it so you don't have to.`,
    "",
    `${SITE}`,
    "",
    `#UAM #eVTOL #AirIndex #RegTech`,
  ].join("\n");

  return { x, linkedin: x };
}

// -------------------------------------------------------
// Main
// -------------------------------------------------------

async function main() {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`  AIRINDEX SOCIAL MEDIA DRAFT — ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}`);
  console.log(`  Looking back ${DAYS_BACK} day(s) from ${SINCE.toISOString().slice(0, 10)}`);
  console.log(`${"=".repeat(70)}\n`);

  // Pull all data
  const [moves, overrides, classifications, topCities, stats] = await Promise.all([
    getScoreMoves(),
    getRecentOverrides(),
    getRecentClassifications(),
    getTopCities(),
    getIngestionStats(),
  ]);

  console.log(`DATA PULLED:`);
  console.log(`  Score moves: ${moves.length}`);
  console.log(`  New overrides: ${overrides.length} (${overrides.filter((o) => o.confidence === "high").length} high)`);
  console.log(`  Recent signals: ${classifications.length}`);
  console.log(`  Total ingested: ${stats.total}`);
  console.log(`  Classifications: ${stats.classTotal} (${stats.relevant} relevant)\n`);

  const allPosts: { label: string; x: string; linkedin: string }[] = [];

  // 1. Score move posts (highest value — something changed)
  if (moves.length > 0) {
    const movePosts = draftScoreMovePosts(moves);
    movePosts.forEach((p, i) =>
      allPosts.push({ label: `SCORE MOVE: ${moves[i].cityName}`, ...p })
    );
  }

  // 2. Signal-based posts
  if (classifications.length > 0 || overrides.length > 0) {
    const signalPosts = draftSignalPosts(classifications, overrides);
    signalPosts.forEach((p, i) =>
      allPosts.push({ label: `SIGNAL POST ${i + 1}`, ...p })
    );
  }

  // 3. Rankings post (always available, good filler)
  const rankingPost = draftRankingPost(topCities);
  allPosts.push({ label: "RANKINGS", ...rankingPost });

  // 4. Pipeline authority post
  if (stats.classTotal > 0) {
    const pipelinePost = draftPipelinePost(stats);
    allPosts.push({ label: "PIPELINE AUTHORITY", ...pipelinePost });
  }

  // Output
  for (const post of allPosts) {
    console.log(`\n${"─".repeat(70)}`);
    console.log(`  ${post.label}`);
    console.log(`${"─".repeat(70)}`);

    console.log(`\n📱 X (${post.x.length} chars${post.x.length > 280 ? " — THREAD NEEDED" : ""}):\n`);
    console.log(post.x);

    console.log(`\n💼 LinkedIn:\n`);
    console.log(post.linkedin);
  }

  console.log(`\n\n${"=".repeat(70)}`);
  console.log(`  ${allPosts.length} DRAFT POSTS GENERATED`);
  console.log(`  Pick 1 for X, 1 for LinkedIn. Edit voice/tone as needed.`);
  console.log(`${"=".repeat(70)}\n`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
