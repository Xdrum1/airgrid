/**
 * FKB Phase 2 — Seed Weight Configuration + Methodology Versions
 *
 * Seeds historical weight configs for v1.0 and v1.3,
 * plus methodology version records.
 *
 * Usage:
 *   npx tsx scripts/seed-fkb-weights.ts
 *   npx tsx scripts/seed-fkb-weights.ts --dry-run
 *
 * Prerequisites:
 *   - FKB Factor Registry must be seeded (scripts/seed-fkb.ts)
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────
// Methodology Versions
// ─────────────────────────────────────────────────────────

const METHODOLOGY_VERSIONS = [
  {
    version: "v1.0",
    effectiveDate: "2026-02-01",
    summary: "Initial scoring methodology. 7 factors, 0-100 scale. Pilot Programs and Vertiport Infrastructure weighted highest at 20 pts each. LAANC Coverage as binary factor. All factors binary except Regulatory Posture (graduated).",
    factorsAdded: ["OPR", "LEG", "VRT", "REG", "PLT", "ZON", "LNC"],
    factorsRetired: [],
    weightsChanged: null,
    approvedBy: "Alan Michael, CEO",
  },
  {
    version: "v1.3",
    effectiveDate: "2026-03-24",
    summary: "Major rebalance. State Legislation elevated to highest-weighted factor (20 pts) based on field validation showing legislation functions as a prerequisite for infrastructure capital. LAANC Coverage retired (20/21 markets had it — no differentiating signal). Weather Infrastructure added as graduated factor (full/partial/none) per USDOT AAM National Strategy four-pillar framework. Pilot Programs and Vertiport Infrastructure reduced from 20 to 15 pts each. State Legislation and Weather Infrastructure now use graduated scoring.",
    factorsAdded: ["WTH"],
    factorsRetired: ["LNC"],
    weightsChanged: [
      { factorCode: "LEG", oldWeight: 10, newWeight: 20 },
      { factorCode: "PLT", oldWeight: 20, newWeight: 15 },
      { factorCode: "VRT", oldWeight: 20, newWeight: 15 },
      { factorCode: "LNC", oldWeight: 10, newWeight: 0 },
      { factorCode: "WTH", oldWeight: 0, newWeight: 10 },
    ],
    approvedBy: "Alan Michael, CEO",
  },
];

// ─────────────────────────────────────────────────────────
// Weight Configuration — v1.0 (launch) and v1.3 (current)
// ─────────────────────────────────────────────────────────

const WEIGHT_CONFIGS = [
  // ── v1.0 weights (Feb 1, 2026 – Mar 23, 2026) ──
  { factorCode: "OPR", version: "v1.0", weight: 15, effectiveFrom: "2026-02-01", effectiveTo: "2026-03-23", rationale: "Operator presence weighted at 15% — strong signal of commercial readiness." },
  { factorCode: "LEG", version: "v1.0", weight: 10, effectiveFrom: "2026-02-01", effectiveTo: "2026-03-23", rationale: "State legislation at 10% — initial assessment of legislative importance." },
  { factorCode: "VRT", version: "v1.0", weight: 20, effectiveFrom: "2026-02-01", effectiveTo: "2026-03-23", rationale: "Vertiport infrastructure at 20% — physical infrastructure weighted highest alongside pilot programs." },
  { factorCode: "REG", version: "v1.0", weight: 10, effectiveFrom: "2026-02-01", effectiveTo: "2026-03-23", rationale: "Regulatory posture at 10% — necessary but not sufficient condition." },
  { factorCode: "PLT", version: "v1.0", weight: 20, effectiveFrom: "2026-02-01", effectiveTo: "2026-03-23", rationale: "Pilot programs at 20% — weighted highest as strongest operational signal." },
  { factorCode: "ZON", version: "v1.0", weight: 15, effectiveFrom: "2026-02-01", effectiveTo: "2026-03-23", rationale: "Zoning at 15% — municipal land use framework for vertiport development." },
  { factorCode: "LNC", version: "v1.0", weight: 10, effectiveFrom: "2026-02-01", effectiveTo: "2026-03-23", rationale: "LAANC coverage at 10% — binary airspace authorization indicator." },

  // ── v1.3 weights (Mar 24, 2026 – current) ──
  { factorCode: "OPR", version: "v1.3", weight: 15, effectiveFrom: "2026-03-24", effectiveTo: null, rationale: "Operator presence unchanged at 15%." },
  { factorCode: "LEG", version: "v1.3", weight: 20, effectiveFrom: "2026-03-24", effectiveTo: null, rationale: "State legislation elevated to 20% — field validation showed legislation is a prerequisite for infrastructure capital. Community preparedness reflected in legislative activity precedes and enables operator engagement." },
  { factorCode: "VRT", version: "v1.3", weight: 15, effectiveFrom: "2026-03-24", effectiveTo: null, rationale: "Vertiport infrastructure reduced from 20% to 15% — still critical but not the gating factor. Legislation must precede infrastructure investment." },
  { factorCode: "REG", version: "v1.3", weight: 10, effectiveFrom: "2026-03-24", effectiveTo: null, rationale: "Regulatory posture unchanged at 10%." },
  { factorCode: "PLT", version: "v1.3", weight: 15, effectiveFrom: "2026-03-24", effectiveTo: null, rationale: "Pilot programs reduced from 20% to 15% — important operational signal but v1.0 over-indexed on it relative to legislative prerequisites." },
  { factorCode: "ZON", version: "v1.3", weight: 15, effectiveFrom: "2026-03-24", effectiveTo: null, rationale: "Zoning unchanged at 15%." },
  { factorCode: "WTH", version: "v1.3", weight: 10, effectiveFrom: "2026-03-24", effectiveTo: null, rationale: "Weather infrastructure added at 10% — USDOT AAM National Strategy identifies weather as one of four infrastructure pillars. Graduated: full (10), partial (5), none (0). No market currently scores full points." },
];

// ─────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────

async function main() {
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

  // Look up factor IDs by code
  const factors = await prisma.fkbFactor.findMany({ select: { id: true, code: true } });
  const factorMap = new Map(factors.map((f) => [f.code, f.id]));

  if (factorMap.size === 0) {
    console.error("ERROR: No factors found in FKB. Run seed-fkb.ts first.");
    process.exit(1);
  }

  // ── Methodology Versions ──
  console.log("═══ Methodology Versions ═══");
  for (const mv of METHODOLOGY_VERSIONS) {
    if (dryRun) {
      console.log(`  [dry] Would upsert: ${mv.version} (${mv.effectiveDate})`);
    } else {
      await prisma.fkbMethodologyVersion.upsert({
        where: { version: mv.version },
        create: {
          version: mv.version,
          effectiveDate: new Date(mv.effectiveDate),
          summary: mv.summary,
          factorsAdded: mv.factorsAdded,
          factorsRetired: mv.factorsRetired,
          weightsChanged: mv.weightsChanged ?? undefined,
          approvedBy: mv.approvedBy,
        },
        update: {
          summary: mv.summary,
          factorsAdded: mv.factorsAdded,
          factorsRetired: mv.factorsRetired,
          weightsChanged: mv.weightsChanged ?? undefined,
        },
      });
      console.log(`  ✓ ${mv.version} — effective ${mv.effectiveDate}`);
    }
  }
  console.log();

  // ── Weight Configuration ──
  console.log("═══ Weight Configuration ═══");
  let created = 0;
  for (const w of WEIGHT_CONFIGS) {
    const factorId = factorMap.get(w.factorCode);
    if (!factorId) {
      console.error(`  ✗ Factor code ${w.factorCode} not found in registry!`);
      continue;
    }

    if (dryRun) {
      console.log(`  [dry] ${w.factorCode} ${w.version}: ${w.weight}% (${w.effectiveFrom} → ${w.effectiveTo ?? "current"})`);
    } else {
      // Check if this exact weight config already exists
      const existing = await prisma.fkbFactorWeight.findFirst({
        where: {
          factorId,
          methodologyVersion: w.version,
        },
      });

      if (existing) {
        console.log(`  ○ ${w.factorCode} ${w.version}: ${w.weight}% (already exists)`);
      } else {
        await prisma.fkbFactorWeight.create({
          data: {
            factorId,
            methodologyVersion: w.version,
            weightPct: w.weight,
            effectiveFrom: new Date(w.effectiveFrom),
            effectiveTo: w.effectiveTo ? new Date(w.effectiveTo) : null,
            changeRationale: w.rationale,
            approvedBy: "Alan Michael, CEO",
          },
        });
        console.log(`  ✓ ${w.factorCode} ${w.version}: ${w.weight}% (${w.effectiveFrom} → ${w.effectiveTo ?? "current"})`);
        created++;
      }
    }
  }
  console.log(`\n${created} weight configs created.\n`);

  // ── Summary Table ──
  console.log("═══ Weight History ═══");
  console.log("┌──────┬───────┬────────┬─────────────────────────────┐");
  console.log("│ Code │ Ver   │ Weight │ Period                      │");
  console.log("├──────┼───────┼────────┼─────────────────────────────┤");
  for (const w of WEIGHT_CONFIGS) {
    const code = w.factorCode.padEnd(4);
    const ver = w.version.padEnd(5);
    const weight = `${w.weight}%`.padEnd(6);
    const period = `${w.effectiveFrom} → ${w.effectiveTo ?? "current"}`.padEnd(27);
    console.log(`│ ${code} │ ${ver} │ ${weight} │ ${period} │`);
  }
  console.log("└──────┴───────┴────────┴─────────────────────────────┘");
}

main()
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
