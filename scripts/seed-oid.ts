/**
 * OID Phase 1 — Seed Operator Registry + Market Presence
 *
 * Migrates operators from seed.ts into structured OID tables
 * with deployment stage classification per market.
 *
 * Usage:
 *   npx tsx scripts/seed-oid.ts
 *   npx tsx scripts/seed-oid.ts --dry-run
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { OPERATORS, CITIES } from "../src/data/seed";

const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

// Map seed.ts operator IDs to OID data
const OPERATOR_ENRICHMENT: Record<string, {
  ticker?: string;
  cik?: string;
  entityType: string;
  vehicleType: string;
  hqCountry: string;
  foundedYear?: number;
  isActive: boolean;
  inactiveReason?: string;
  acquiredBySeedId?: string;
}> = {
  op_joby: { ticker: "JOBY", cik: "0001819848", entityType: "OPERATOR_MANUFACTURER", vehicleType: "eVTOL", hqCountry: "US", foundedYear: 2009, isActive: true },
  op_archer: { ticker: "ACHR", cik: "0001811882", entityType: "OPERATOR_MANUFACTURER", vehicleType: "eVTOL", hqCountry: "US", foundedYear: 2018, isActive: true },
  op_wisk: { entityType: "MANUFACTURER", vehicleType: "eVTOL", hqCountry: "US", foundedYear: 2019, isActive: true },
  op_blade: { ticker: "BLDE", cik: "0001779474", entityType: "OPERATOR", vehicleType: "eVTOL", hqCountry: "US", foundedYear: 2014, isActive: false, inactiveReason: "Acquired by Joby Aviation (Aug 2025, ~$125M). NYC/LA/Miami terminal network consolidated under Joby.", acquiredBySeedId: "op_joby" },
  op_volocopter: { entityType: "MANUFACTURER", vehicleType: "eVTOL", hqCountry: "DE", foundedYear: 2011, isActive: true },
};

// Deployment stage classification based on seed data
function classifyStage(operatorId: string, cityId: string): { stage: string; score: number; confidence: string } {
  // Joby — commercially operating in Dubai, testing in US markets
  if (operatorId === "op_joby") {
    if (cityId === "new_york") return { stage: "COMMERCIAL_OPS", score: 20, confidence: "HIGH" }; // Operating NYC air taxi routes (ex-Blade)
    if (cityId === "miami") return { stage: "COMMERCIAL_OPS", score: 20, confidence: "HIGH" }; // Operating Miami routes (ex-Blade)
    if (cityId === "los_angeles") return { stage: "TESTING", score: 10, confidence: "HIGH" }; // LA is confirmed next US eVTOL market
    if (cityId === "san_francisco") return { stage: "TESTING", score: 10, confidence: "HIGH" }; // Golden Gate demo flight completed
    if (cityId === "phoenix") return { stage: "TESTING", score: 10, confidence: "MEDIUM" }; // AZ flight testing + eIPP
    if (cityId === "columbus") return { stage: "ANNOUNCED", score: 5, confidence: "MEDIUM" }; // Dayton manufacturing
    return { stage: "WATCHLIST", score: 2, confidence: "LOW" };
  }

  // Archer — testing and announced in multiple markets
  if (operatorId === "op_archer") {
    if (cityId === "los_angeles") return { stage: "TESTING", score: 10, confidence: "HIGH" }; // LA targeting 2026 launch
    if (cityId === "miami") return { stage: "ANNOUNCED", score: 5, confidence: "HIGH" }; // White House Pilot Program
    if (cityId === "new_york") return { stage: "ANNOUNCED", score: 5, confidence: "MEDIUM" }; // Planning NYC ops
    if (cityId === "chicago") return { stage: "ANNOUNCED", score: 5, confidence: "MEDIUM" }; // United partnership
    return { stage: "WATCHLIST", score: 2, confidence: "LOW" };
  }

  // Wisk — testing in Dallas
  if (operatorId === "op_wisk") {
    if (cityId === "dallas") return { stage: "TESTING", score: 10, confidence: "HIGH" }; // Autonomous testing at DFW
    return { stage: "WATCHLIST", score: 2, confidence: "LOW" };
  }

  // Blade — acquired, exited all markets
  if (operatorId === "op_blade") {
    return { stage: "EXITED", score: 0, confidence: "HIGH" };
  }

  // Volocopter — no US market presence
  if (operatorId === "op_volocopter") {
    return { stage: "WATCHLIST", score: 2, confidence: "LOW" };
  }

  return { stage: "WATCHLIST", score: 2, confidence: "LOW" };
}

async function main() {
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

  // ── Step 1: Seed Operators ──
  console.log("═══ OID Operator Registry ═══\n");

  const operatorIdMap = new Map<string, string>(); // seed ID → OID ID

  for (const op of OPERATORS) {
    const enrichment = OPERATOR_ENRICHMENT[op.id];
    if (!enrichment) {
      console.log(`  ⚠ No enrichment data for ${op.id} — skipping`);
      continue;
    }

    const hqCity = op.hq?.split(",")[0]?.trim() ?? null;

    if (dryRun) {
      console.log(`  [dry] ${op.name} (${enrichment.entityType}) ${enrichment.isActive ? "" : "[INACTIVE]"}`);
      operatorIdMap.set(op.id, op.id);
    } else {
      const existing = await prisma.oidOperator.findFirst({
        where: { shortName: op.name.split(" ")[0] },
      });

      if (existing) {
        operatorIdMap.set(op.id, existing.id);
        console.log(`  ○ ${op.name} (already exists)`);
      } else {
        const created = await prisma.oidOperator.create({
          data: {
            name: op.name,
            shortName: op.name.split(" ")[0], // "Joby", "Archer", etc.
            ticker: enrichment.ticker ?? null,
            cik: enrichment.cik ?? null,
            entityType: enrichment.entityType,
            vehicleType: enrichment.vehicleType,
            hqCity,
            hqCountry: enrichment.hqCountry,
            foundedYear: enrichment.foundedYear ?? null,
            website: op.website ?? null,
            isActive: enrichment.isActive,
            inactiveReason: enrichment.inactiveReason ?? null,
          },
        });
        operatorIdMap.set(op.id, created.id);
        console.log(`  ✓ ${op.name} (${enrichment.entityType}) ${enrichment.isActive ? "" : "[INACTIVE]"}`);
      }
    }
  }

  console.log(`\n${operatorIdMap.size} operators seeded.\n`);

  // ── Step 2: Seed Market Presence ──
  console.log("═══ OID Market Presence ═══\n");

  let presenceCreated = 0;
  const stageCounts: Record<string, number> = {};

  for (const city of CITIES) {
    for (const seedOpId of city.activeOperators) {
      const oidOpId = operatorIdMap.get(seedOpId);
      if (!oidOpId) continue;

      const { stage, score, confidence } = classifyStage(seedOpId, city.id);
      stageCounts[stage] = (stageCounts[stage] ?? 0) + 1;

      if (dryRun) {
        console.log(`  [dry] ${city.city} / ${seedOpId}: ${stage} (${score} pts, ${confidence})`);
      } else {
        const existing = await prisma.oidOperatorMarketPresence.findUnique({
          where: { operatorId_cityId: { operatorId: oidOpId, cityId: city.id } },
        });

        if (existing) {
          console.log(`  ○ ${city.city} / ${seedOpId} (already exists)`);
        } else {
          await prisma.oidOperatorMarketPresence.create({
            data: {
              operatorId: oidOpId,
              cityId: city.id,
              deploymentStage: stage,
              stageScore: score,
              stageSetAt: new Date(),
              stageSetBy: "ANALYST",
              confidence,
              isActive: stage !== "EXITED",
            },
          });
          console.log(`  ✓ ${city.city} / ${seedOpId}: ${stage} (${score} pts)`);
          presenceCreated++;
        }
      }
    }
  }

  console.log(`\n${presenceCreated} market presence records created.\n`);

  // ── Summary ──
  console.log("═══ Deployment Stage Distribution ═══");
  for (const [stage, count] of Object.entries(stageCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${stage}: ${count}`);
  }

  // ── OPR Score Preview ──
  console.log("\n═══ OPR Score Preview (top 3 per market, capped at 20) ═══");
  if (!dryRun) {
    const markets = await prisma.market.findMany({ where: { isActive: true }, select: { id: true, city: true } });
    for (const market of markets.sort((a, b) => a.city.localeCompare(b.city))) {
      const presence = await prisma.oidOperatorMarketPresence.findMany({
        where: { cityId: market.id, isActive: true, deploymentStage: { not: "EXITED" } },
        orderBy: [{ stageScore: "desc" }, { lastSignalAt: "desc" }],
        take: 3,
        include: { operator: { select: { shortName: true } } },
      });
      if (presence.length === 0) continue;
      const rawScore = presence.reduce((sum, p) => sum + p.stageScore, 0);
      const cappedScore = Math.min(rawScore, 20);
      const ops = presence.map(p => `${p.operator.shortName}(${p.stageScore})`).join(" + ");
      console.log(`  ${market.city.padEnd(18)} ${ops.padEnd(40)} = ${rawScore} → ${cappedScore}/20`);
    }
  }
}

main()
  .catch((err) => { console.error("Error:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
