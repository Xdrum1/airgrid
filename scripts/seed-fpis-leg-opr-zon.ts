/**
 * Seed FPIS factor impacts for LEG, OPR, and ZON.
 *
 * As of Apr 15, 2026 FPIS had 10 programs but 0 mappings to three scoring
 * factors: State Legislation (LEG), Operator Presence (OPR), and Vertiport
 * Zoning (ZON). Per-advisor review: the real dynamic is that federal
 * programs mostly fund infrastructure and regulatory enablers — state
 * legislation, operator presence, and zoning are non-federal activities —
 * but a few programs do have defensible indirect links. This script adds
 * those.
 *
 * Mapping philosophy: pointsOnAward is modest (2-5) to reflect indirect
 * rather than direct causation. Every mapping carries a prose rationale
 * in impactNote so the investor briefing can cite why each program
 * belongs under a factor.
 *
 * Idempotent. Upsert keyed on (programId, factorCode).
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface FactorImpactSeed {
  programCode: string;
  factorCode: "LEG" | "OPR" | "ZON";
  pointsOnAward: number;
  impactNote: string;
}

const SEEDS: FactorImpactSeed[] = [
  // ── LEG (State Legislation) ──
  // Federal programs that condition funding on enabling state legislation
  // or explicitly favor states with existing UAM frameworks.
  {
    programCode: "DOT-EIPP",
    factorCode: "LEG",
    pointsOnAward: 3,
    impactNote:
      "eIPP selection historically favors states with enacted UAM legislative framework. TX HB 1735, FL SB 1662, and AZ SB 1307 each preceded or accompanied eIPP partnership selection.",
  },
  {
    programCode: "DOT-RAISE",
    factorCode: "LEG",
    pointsOnAward: 2,
    impactNote:
      "RAISE applications scored on state transportation plan alignment. States with UAM-enabling legislation present stronger applications and have higher historical award rates.",
  },

  // ── OPR (Operator Presence) ──
  // Programs that fund specific operators, making commercial presence a
  // direct outcome of award.
  {
    programCode: "DOT-SBIR-UAM",
    factorCode: "OPR",
    pointsOnAward: 5,
    impactNote:
      "SBIR Phase II/III contracts fund operator-specific capability development. Phase III award often materializes as declared commercial presence in the awardee's target market.",
  },
  {
    programCode: "DOT-EIPP",
    factorCode: "OPR",
    pointsOnAward: 5,
    impactNote:
      "eIPP selection requires operator-city pairing in the application. Award creates or formalizes declared operator market presence.",
  },
  {
    programCode: "AFWERX-SBIR",
    factorCode: "OPR",
    pointsOnAward: 3,
    impactNote:
      "AFWERX dual-use SBIR partnerships fund eVTOL tech development with commercial operators for fielding. Typically surfaces as TESTING or ANNOUNCED stage in the operator's target markets.",
  },
  {
    programCode: "NASA-AAM",
    factorCode: "OPR",
    pointsOnAward: 2,
    impactNote:
      "NASA AAM partnerships formalize operator presence at research sites for testing and data collection. Drives WATCHLIST or TESTING stage in NASA center markets.",
  },

  // ── ZON (Vertiport Zoning) ──
  // Programs that fund municipal planning + zoning work around AAM
  // infrastructure.
  {
    programCode: "EDA-BUILD",
    factorCode: "ZON",
    pointsOnAward: 2,
    impactNote:
      "Build to Scale regional innovation grants fund municipal planning and zoning work around AAM corridors. Local permitting frameworks often emerge from award-funded planning studies.",
  },
  {
    programCode: "DOT-RAISE",
    factorCode: "ZON",
    pointsOnAward: 2,
    impactNote:
      "RAISE includes local transportation planning components covering vertiport siting and zoning. Award-funded studies typically precede municipal zoning-code updates.",
  },
];

async function main() {
  console.log(`Seeding ${SEEDS.length} FPIS factor impacts across LEG/OPR/ZON...\n`);

  let created = 0;
  let updated = 0;
  const skipped: string[] = [];

  for (const seed of SEEDS) {
    const program = await prisma.fpisProgram.findUnique({
      where: { code: seed.programCode },
    });
    if (!program) {
      skipped.push(`${seed.programCode} (program not found)`);
      continue;
    }

    const existing = await prisma.fpisProgramFactorImpact.findFirst({
      where: { programId: program.id, factorCode: seed.factorCode },
    });

    if (existing) {
      await prisma.fpisProgramFactorImpact.update({
        where: { id: existing.id },
        data: {
          pointsOnAward: seed.pointsOnAward,
          impactNote: seed.impactNote,
        },
      });
      console.log(`  UPDATE ${seed.programCode.padEnd(15)} ${seed.factorCode} +${seed.pointsOnAward}`);
      updated++;
    } else {
      await prisma.fpisProgramFactorImpact.create({
        data: {
          programId: program.id,
          factorCode: seed.factorCode,
          pointsOnAward: seed.pointsOnAward,
          impactNote: seed.impactNote,
        },
      });
      console.log(`  CREATE ${seed.programCode.padEnd(15)} ${seed.factorCode} +${seed.pointsOnAward}`);
      created++;
    }
  }

  if (skipped.length > 0) {
    console.log(`\nSkipped:`);
    skipped.forEach((s) => console.log(`  ${s}`));
  }

  // Final factor-coverage report
  const allImpacts = await prisma.fpisProgramFactorImpact.findMany({
    select: { factorCode: true },
  });
  const byFactor: Record<string, number> = {};
  for (const i of allImpacts) byFactor[i.factorCode] = (byFactor[i.factorCode] ?? 0) + 1;

  console.log(`\nResult: ${created} created, ${updated} updated`);
  console.log(`\nFactor coverage after seed:`);
  for (const factor of ["LEG", "OPR", "VRT", "REG", "PLT", "ZON", "WTH"]) {
    console.log(`  ${factor}: ${byFactor[factor] ?? 0}`);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
