/**
 * Pre-publish check for the March 2026 report.
 * Run: npx tsx scripts/report-check.ts
 *
 * Surfaces any score movements, changelog entries, corridor status
 * changes, or new users since the report baseline (March 1, 2026).
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const MARCH_START = new Date("2026-03-01T00:00:00Z");
const MARCH_END = new Date("2026-03-31T23:59:59Z");

async function main() {
  console.log("=== AIRINDEX MARCH REPORT PRE-PUBLISH CHECK ===\n");
  console.log(`Checking: ${MARCH_START.toISOString().split("T")[0]} → ${MARCH_END.toISOString().split("T")[0]}\n`);

  // 1. Score movements
  const scoreChanges = await prisma.scoreSnapshot.findMany({
    where: {
      capturedAt: { gte: MARCH_START, lte: MARCH_END },
      triggeringEventId: { not: null },
    },
    orderBy: { capturedAt: "desc" },
  });

  if (scoreChanges.length > 0) {
    console.log(`!! SCORE MOVEMENTS: ${scoreChanges.length} — UPDATE SCORECARD TABLE`);
    for (const s of scoreChanges) {
      console.log(`   ${s.cityId} → ${s.score} (${s.tier}) at ${s.capturedAt.toISOString()}`);
      if (s.filingIngestedAt) {
        const lagMs = s.capturedAt.getTime() - s.filingIngestedAt.getTime();
        const lagDays = Math.round(lagMs / (1000 * 60 * 60 * 24));
        console.log(`   └─ filing lag: ${lagDays} days`);
      }
    }
  } else {
    console.log("   Score movements: none — scorecard unchanged from baseline");
  }

  // 2. Changelog entries
  const changelog = await prisma.changelogEntry.findMany({
    where: { timestamp: { gte: MARCH_START, lte: MARCH_END } },
    orderBy: { timestamp: "desc" },
  });

  console.log("");
  if (changelog.length > 0) {
    console.log(`!! CHANGELOG ENTRIES: ${changelog.length} — REVIEW FOR REPORT`);
    for (const e of changelog) {
      console.log(`   [${e.changeType}] ${e.summary}`);
      console.log(`   └─ ${e.relatedEntityType}/${e.relatedEntityId} — ${e.timestamp.toISOString().split("T")[0]}`);
      if (e.sourceUrl) console.log(`   └─ ${e.sourceUrl}`);
    }
  } else {
    console.log("   Changelog entries: none");
  }

  // 3. Corridor status changes
  const corridorChanges = await prisma.corridorStatusHistory.findMany({
    where: { changedAt: { gte: MARCH_START, lte: MARCH_END } },
    orderBy: { changedAt: "desc" },
    include: { corridor: { select: { name: true, cityId: true } } },
  });

  console.log("");
  if (corridorChanges.length > 0) {
    console.log(`!! CORRIDOR STATUS CHANGES: ${corridorChanges.length} — UPDATE CORRIDOR TABLE`);
    for (const c of corridorChanges) {
      console.log(`   ${c.corridor.name} (${c.corridor.cityId}): ${c.fromStatus ?? "new"} → ${c.toStatus}`);
      if (c.reason) console.log(`   └─ ${c.reason}`);
    }
  } else {
    console.log("   Corridor status changes: none");
  }

  // 4. New overrides (applied or pending)
  const overrides = await prisma.scoringOverride.findMany({
    where: { createdAt: { gte: MARCH_START, lte: MARCH_END } },
    orderBy: { createdAt: "desc" },
  });

  console.log("");
  if (overrides.length > 0) {
    const applied = overrides.filter((o) => o.appliedAt);
    const pending = overrides.filter((o) => !o.appliedAt && !o.supersededAt);
    console.log(`   Scoring overrides: ${overrides.length} total (${applied.length} applied, ${pending.length} pending review)`);
    for (const o of overrides) {
      const status = o.appliedAt ? "APPLIED" : o.supersededAt ? "SUPERSEDED" : "PENDING";
      console.log(`   [${status}] ${o.cityId} / ${o.field} = ${JSON.stringify(o.value)} (${o.confidence})`);
      console.log(`   └─ ${o.reason}`);
    }
  } else {
    console.log("   Scoring overrides: none");
  }

  // 5. New users
  const newUsers = await prisma.user.findMany({
    where: { createdAt: { gte: MARCH_START, lte: MARCH_END } },
    orderBy: { createdAt: "desc" },
  });

  console.log("");
  console.log(`   New users in March: ${newUsers.length}`);
  for (const u of newUsers) {
    console.log(`   ${u.email} — ${u.createdAt.toISOString().split("T")[0]}`);
  }

  // Summary
  console.log("\n=== REPORT STATUS ===");
  const issues = [];
  if (scoreChanges.length > 0) issues.push("scorecard needs updating");
  if (changelog.length > 0) issues.push("new changelog entries to review");
  if (corridorChanges.length > 0) issues.push("corridor table needs updating");
  if (overrides.filter((o) => !o.appliedAt && !o.supersededAt).length > 0) issues.push("pending overrides need review");

  if (issues.length === 0) {
    console.log("CLEAR — report matches current data, fill placeholders and publish");
  } else {
    console.log(`ACTION NEEDED: ${issues.join(", ")}`);
  }

  console.log("\nPlaceholders remaining:");
  console.log("  p4: [PLACEHOLDER: Add any LA developments from March 2026 here]");
  console.log("  p5: [PLACEHOLDER: Add any NY legislative developments from March 2026 here]");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
