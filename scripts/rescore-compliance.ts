/**
 * Re-score HeliportCompliance records with updated tier logic.
 *
 * Adds "compliant_presumed" tier for facilities that have 0 failures
 * but ≥1 unknown question. Previously these were lumped into "compliant."
 *
 * Usage:
 *   npx tsx scripts/rescore-compliance.ts --dry-run
 *   npx tsx scripts/rescore-compliance.ts
 */
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

function computeStatus(c: {
  q1FaaRegistration: string;
  q2AirspaceDetermination: string;
  q3StateEnforcement: string;
  q4Nfpa418: string;
  q5EvtolViability: string;
}): { status: string; score: number; flagCount: number } {
  const passing = [
    c.q1FaaRegistration === "pass",
    c.q2AirspaceDetermination === "on_file",
    c.q3StateEnforcement === "strong",
    c.q4Nfpa418 === "adopted",
    c.q5EvtolViability === "viable",
  ];

  const failing = [
    c.q1FaaRegistration === "missing" || c.q1FaaRegistration === "flag",
    c.q2AirspaceDetermination === "not_found",
    c.q3StateEnforcement === "none",
    c.q4Nfpa418 === "none",
    c.q5EvtolViability === "at_risk",
  ];

  const passCount = passing.filter(Boolean).length;
  const failCount = failing.filter(Boolean).length;
  const unknownCount = 5 - passCount - failCount;

  let status: string;
  if (failCount >= 3) {
    status = "objectionable";
  } else if (failCount >= 1) {
    status = "conditional";
  } else if (passCount === 5) {
    status = "compliant";
  } else if (passCount >= 3 && unknownCount > 0) {
    status = "compliant_presumed";
  } else {
    status = "unknown";
  }

  return { status, score: passCount, flagCount: failCount };
}

async function main() {
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

  const all = await prisma.heliportCompliance.findMany();
  console.log(`Total records: ${all.length}\n`);

  // Count changes
  let changed = 0;
  let unchanged = 0;
  const transitions: Record<string, number> = {};

  for (const record of all) {
    const { status, score, flagCount } = computeStatus(record);

    if (status !== record.complianceStatus || score !== record.complianceScore || flagCount !== record.flagCount) {
      const key = `${record.complianceStatus} → ${status}`;
      transitions[key] = (transitions[key] || 0) + 1;
      changed++;

      if (!dryRun) {
        await prisma.heliportCompliance.update({
          where: { id: record.id },
          data: {
            complianceStatus: status,
            complianceScore: score,
            flagCount: flagCount,
          },
        });
      }
    } else {
      unchanged++;
    }
  }

  console.log(`Changed: ${changed}`);
  console.log(`Unchanged: ${unchanged}\n`);

  if (Object.keys(transitions).length > 0) {
    console.log("Transitions:");
    for (const [key, count] of Object.entries(transitions).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${key}: ${count}`);
    }
  }

  // Show new distribution
  if (!dryRun) {
    console.log("\nNew distribution:");
    const dist = await prisma.heliportCompliance.groupBy({
      by: ["complianceStatus"],
      _count: true,
    });
    dist.forEach((d) => console.log(`  ${d.complianceStatus}: ${d._count}`));
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
