import { PrismaClient } from "@prisma/client";
import { CITIES } from "../src/data/seed";

const prisma = new PrismaClient();

async function main() {
  // Score changes in March
  const snaps = await prisma.scoreSnapshot.findMany({
    where: { capturedAt: { gte: new Date("2026-03-01") } },
    orderBy: { capturedAt: "asc" },
    select: { cityId: true, score: true, tier: true, capturedAt: true },
  });
  const cityMap = new Map<string, { first: typeof snaps[0]; last: typeof snaps[0] }>();
  for (const s of snaps) {
    const existing = cityMap.get(s.cityId);
    if (!existing) cityMap.set(s.cityId, { first: s, last: s });
    else existing.last = s;
  }
  console.log("=== MARCH SCORE CHANGES ===");
  for (const [id, { first, last }] of cityMap) {
    if (first.score !== last.score) {
      console.log(`${id}: ${first.score} → ${last.score} (${first.tier} → ${last.tier})`);
    }
  }

  // Changelog
  const changelog = await prisma.changelogEntry.findMany({
    where: { timestamp: { gte: new Date("2026-03-01") } },
    orderBy: { timestamp: "desc" },
    take: 20,
  });
  console.log(`\n=== CHANGELOG (${changelog.length} entries) ===`);
  for (const c of changelog) {
    console.log(`${c.timestamp.toISOString().split("T")[0]} | ${c.changeType} | ${c.summary.slice(0, 100)}`);
  }

  // Ingestion stats
  const runs = await prisma.ingestionRun.findMany({
    where: { startedAt: { gte: new Date("2026-03-01") } },
    orderBy: { startedAt: "desc" },
  });
  console.log(`\n=== INGESTION: ${runs.length} runs ===`);
  let totalNew = 0;
  let totalOverrides = 0;
  for (const r of runs) {
    totalNew += r.newRecords;
    totalOverrides += r.overridesCreated;
  }
  console.log(`New records: ${totalNew}, Overrides created: ${totalOverrides}`);
  if (runs[0]) console.log(`Latest total: ${runs[0].totalRecords} records across sources`);

  // Users
  const users = await prisma.user.count();
  const marchUsers = await prisma.user.count({ where: { createdAt: { gte: new Date("2026-03-01") } } });
  console.log(`\n=== USERS: ${users} total, ${marchUsers} new in March ===`);

  // Leads
  const leads = await prisma.marketLead.findMany();
  console.log(`\n=== MARKET LEADS: ${leads.length} ===`);
  for (const l of leads) {
    console.log(`${l.city}, ${l.state} — ${l.status} (${l.signalCount} signals)`);
  }

  // Current rankings
  console.log("\n=== CURRENT RANKINGS ===");
  for (const c of CITIES) {
    const tier = (c.score ?? 0) >= 75 ? "ADVANCED" : (c.score ?? 0) >= 50 ? "MODERATE" : (c.score ?? 0) >= 30 ? "EARLY" : "NASCENT";
    console.log(`${String(c.score).padStart(3)} | ${c.city.padEnd(18)} | ${c.state} | ${tier}`);
  }

  // Corridors
  const corridors = await prisma.corridor.findMany({ select: { id: true, name: true, status: true, cityId: true } });
  console.log(`\n=== CORRIDORS: ${corridors.length} ===`);
  for (const c of corridors) {
    console.log(`${c.id} | ${c.status} | ${c.name}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
