import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("=== san_antonio: full snapshot history (last 14d) ===");
  const snaps = await prisma.scoreSnapshot.findMany({
    where: { cityId: "san_antonio", capturedAt: { gte: new Date(Date.now() - 14 * 86400_000) } },
    orderBy: { capturedAt: "asc" },
  });
  for (const s of snaps) {
    const b = s.breakdown as Record<string, unknown>;
    console.log(
      `  ${s.capturedAt.toISOString()}  score=${s.score}  tier=${s.tier}  ` +
        `vert=${b.approvedVertiport}  zon=${b.hasVertiportZoning}  ` +
        `pilot=${b.hasActivePilotProgram}  op=${b.activeOperatorPresence}  ` +
        `legis=${b.hasStateLegislation}`,
    );
  }
  console.log();

  console.log("=== san_antonio: ALL ScoringOverrides ever ===");
  const overrides = await prisma.scoringOverride.findMany({
    where: { cityId: "san_antonio" },
    orderBy: { createdAt: "asc" },
  });
  for (const o of overrides) {
    console.log(
      `  created=${o.createdAt.toISOString()}  applied=${o.appliedAt?.toISOString() ?? "—"}  ` +
        `superseded=${o.supersededAt?.toISOString() ?? "—"}  ${o.field}=${JSON.stringify(o.value)}  ` +
        `conf=${o.confidence} origin=${o.origin}`,
    );
    console.log(`    reason: ${o.reason.slice(0, 180)}`);
    if (o.sourceUrl) console.log(`    src: ${o.sourceUrl}`);
  }
  console.log();

  console.log("=== san_antonio: ChangelogEntry (last 14d) ===");
  const cl = await prisma.changelogEntry.findMany({
    where: {
      relatedEntityType: "city",
      relatedEntityId: "san_antonio",
      timestamp: { gte: new Date(Date.now() - 14 * 86400_000) },
    },
    orderBy: { timestamp: "asc" },
  });
  for (const c of cl) {
    console.log(`  [${c.timestamp.toISOString()}] ${c.changeType}: ${c.summary}`);
    if (c.sourceUrl) console.log(`    src: ${c.sourceUrl}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
