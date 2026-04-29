/**
 * Pull every score-affecting event from the last 36 hours and reconstruct
 * what changed, when, why.
 *
 * Usage: npx tsx scripts/check-score-changes-today.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SINCE = new Date(Date.now() - 36 * 60 * 60 * 1000);

async function main() {
  const dbHost = process.env.DATABASE_URL?.match(/@([^:/]+)/)?.[1] ?? "(unknown)";
  console.log(`DB host: ${dbHost}`);
  console.log(`Window: since ${SINCE.toISOString()}\n`);

  // 1) ChangelogEntry rows tagged as score_change
  const scoreChanges = await prisma.changelogEntry.findMany({
    where: {
      changeType: "score_change",
      timestamp: { gte: SINCE },
    },
    orderBy: { timestamp: "asc" },
  });
  console.log(`=== ChangelogEntry score_change rows: ${scoreChanges.length} ===`);
  for (const c of scoreChanges) {
    console.log(`  [${c.timestamp.toISOString()}] ${c.relatedEntityType}=${c.relatedEntityId}`);
    console.log(`    ${c.summary}`);
    if (c.sourceUrl) console.log(`    src: ${c.sourceUrl}`);
  }
  console.log();

  // 2) ScoringOverrides applied (auto or manual) since window
  const applied = await prisma.scoringOverride.findMany({
    where: { appliedAt: { gte: SINCE } },
    orderBy: { appliedAt: "asc" },
  });
  console.log(`=== ScoringOverrides applied: ${applied.length} ===`);
  for (const o of applied) {
    console.log(
      `  [${o.appliedAt?.toISOString()}] ${o.cityId}.${o.field} = ${JSON.stringify(o.value)} ` +
        `(conf=${o.confidence}, origin=${o.origin})`,
    );
    console.log(`    reason: ${o.reason.slice(0, 140)}`);
  }
  console.log();

  // 3) ScoreSnapshots taken in window
  const snapshots = await prisma.scoreSnapshot.findMany({
    where: { capturedAt: { gte: SINCE } },
    orderBy: { capturedAt: "desc" },
    take: 200,
  });
  console.log(`=== Recent ScoreSnapshots: ${snapshots.length} ===`);
  const byMoment = new Map<string, typeof snapshots>();
  for (const s of snapshots) {
    const key = s.capturedAt.toISOString();
    if (!byMoment.has(key)) byMoment.set(key, []);
    byMoment.get(key)!.push(s);
  }
  for (const [moment, rows] of Array.from(byMoment.entries()).sort()) {
    console.log(`  ${moment} — ${rows.length} city snapshots`);
  }
  console.log();

  console.log(`=== Per-city diff (latest vs previous snapshot) ===`);
  const cityIds = Array.from(new Set(snapshots.map((s) => s.cityId)));
  for (const cityId of cityIds) {
    const recent = await prisma.scoreSnapshot.findMany({
      where: { cityId },
      orderBy: { capturedAt: "desc" },
      take: 2,
    });
    if (recent.length < 2) continue;
    const [now, prev] = recent;
    if (now.score === prev.score && now.tier === prev.tier) continue;
    console.log(
      `  ${cityId}: ${prev.score}/${prev.tier} (${prev.capturedAt.toISOString()}) → ` +
        `${now.score}/${now.tier} (${now.capturedAt.toISOString()})`,
    );
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
