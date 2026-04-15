/**
 * Seed regulatoryBurdenLevel + regulatoryBurdenNote for tracked states.
 *
 * Rex's proposal (Apr 15, 2026): state/municipal regulatory burden is a
 * distinct axis from posture. A state can be posture-friendly AND
 * burden-heavy at the same time (FL is the example). This seed populates
 * the MCS state-context field for tracked states where we have source
 * material, leaves others null pending research.
 *
 * Sourcing philosophy:
 *   - FL: direct from Rex's FDOT Heliport Documentation Requirements doc
 *         citing FS 330.30(1) + FL Admin Rule 14-60.005(5)
 *   - TX/CA/AZ/NY: inferred from publicly available state aviation regs
 *         + AAM framework documents; flagged as initial assessment pending
 *         Rex or analyst confirmation
 *
 * Idempotent. Upsert by stateCode.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface Seed {
  stateCode: string;
  level: "low" | "moderate" | "high" | "severe";
  note: string;
}

const SEEDS: Seed[] = [
  {
    stateCode: "FL",
    level: "severe",
    note:
      "FS 330.30(1) + FL Admin Rule 14-60.005(5) requires a 13-document packet for heliport construction approval. Rex Alexander (Five-Alpha LLC, NFPA 418 Chair) documents the full requirement list in public/docs/FDOT Heliport Documentation Requirements List 2026.pdf. Several items duplicate FAA review or other state-level reviews already completed. Result: demanding, over-kill, out-of-date, redundant — significantly increases man-hours and cost vs. peer states.",
  },
  {
    stateCode: "TX",
    level: "moderate",
    note:
      "HB 1735 (2023) established a UAM enabling framework that largely defers operational details to the FAA; state review layer is lighter than FL. Houston and Dallas have shown relatively streamlined heliport permitting pathways. Initial assessment pending verification by credentialed advisor.",
  },
  {
    stateCode: "CA",
    level: "high",
    note:
      "CEQA (California Environmental Quality Act) review adds significant environmental documentation on top of FAA + state aviation approvals. Coastal Commission jurisdiction in coastal markets adds a third layer. Initial assessment pending verification.",
  },
  {
    stateCode: "AZ",
    level: "low",
    note:
      "Joby Aviation autonomous-flight testing has proceeded in Arizona without documented state-level friction. State aviation regulations defer substantively to FAA. Initial assessment pending verification.",
  },
  {
    stateCode: "NY",
    level: "high",
    note:
      "Dense urban airspace + multi-jurisdictional review (city, county, state, Port Authority in NYC). Helicopter operations have historically faced prolonged local-approval cycles. Initial assessment pending verification.",
  },
];

async function main() {
  console.log(`Seeding regulatoryBurdenLevel for ${SEEDS.length} states...\n`);

  let created = 0;
  let updated = 0;
  const skipped: string[] = [];

  for (const seed of SEEDS) {
    const existing = await prisma.mcsStateContext.findUnique({
      where: { stateCode: seed.stateCode },
    });

    if (!existing) {
      skipped.push(`${seed.stateCode} (no MCS state context row exists)`);
      continue;
    }

    if (
      existing.regulatoryBurdenLevel === seed.level &&
      existing.regulatoryBurdenNote === seed.note
    ) {
      console.log(`  NOCHANGE ${seed.stateCode} ${seed.level}`);
      continue;
    }

    if (existing.regulatoryBurdenLevel) {
      await prisma.mcsStateContext.update({
        where: { stateCode: seed.stateCode },
        data: {
          regulatoryBurdenLevel: seed.level,
          regulatoryBurdenNote: seed.note,
        },
      });
      console.log(`  UPDATE   ${seed.stateCode} ${seed.level}`);
      updated++;
    } else {
      await prisma.mcsStateContext.update({
        where: { stateCode: seed.stateCode },
        data: {
          regulatoryBurdenLevel: seed.level,
          regulatoryBurdenNote: seed.note,
        },
      });
      console.log(`  CREATE   ${seed.stateCode} ${seed.level}`);
      created++;
    }
  }

  if (skipped.length > 0) {
    console.log(`\nSkipped:`);
    skipped.forEach((s) => console.log(`  ${s}`));
  }

  console.log(`\nResult: ${created} created, ${updated} updated`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
