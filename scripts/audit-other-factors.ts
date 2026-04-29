/**
 * Audit hasActivePilotProgram and hasVertiportZoning overrides for the
 * same overreach pattern that bit activeOperatorPresence (v7) and
 * approvedVertiport: classifier emitting value=true on partnership,
 * MOU, "plans to", "RFP", "exploring" language.
 *
 * Usage: npx tsx scripts/audit-other-factors.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Plan/partnership/RFP signals — overlap with VERTIPORT_PLAN_PATTERNS
// but adds RFP/feasibility/study/proposal terms more relevant to pilot
// programs and zoning.
const SUSPICIOUS = [
  /\bto\s+(build|launch|develop|create|start|begin)\b/i,
  /\bplans?\s+to\b/i,
  /\bwill\s+(build|launch|develop|create|start|begin)\b/i,
  /\bpartner(?:ship)?\s+(with|to)\b/i,
  /\bMOU\b/,
  /\bmemorandum\s+of\s+understanding\b/i,
  /\bproposed?\b/i,
  /\bRFP\b/,
  /\brequest\s+for\s+proposals?\b/i,
  /\bexplor(e|es|ing|atory)\b/i,
  /\benvisions?\b/i,
  /\bfeasibility\s+stud/i,
  /\bdeveloping\s+plans?\b/i,
  /\bpaving\s+(the\s+)?way\b/i,
  /\bwould\s+(allow|create|build|launch)\b/i,
  /\bcould\s+(allow|create|build|launch|host)\b/i,
];

function flagsSuspicious(text: string): RegExp[] {
  return SUSPICIOUS.filter((p) => p.test(text));
}

async function auditField(field: string) {
  console.log("=".repeat(72));
  console.log(`Field: ${field}`);
  console.log("=".repeat(72));

  const overrides = await prisma.scoringOverride.findMany({
    where: { field, origin: "classifier" },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const trueOverrides = overrides.filter((o) => o.value === true);

  console.log(
    `Total ${field}=true classifier overrides (last 200 ever): ${trueOverrides.length}\n`,
  );

  let suspicious = 0;
  let appliedSuspicious = 0;
  let unappliedSuspicious = 0;
  const suspiciousList: Array<{
    title: string;
    cityId: string;
    confidence: string;
    applied: boolean;
    superseded: boolean;
    hits: string[];
  }> = [];

  for (const o of trueOverrides) {
    if (!o.sourceRecordId) continue;
    const r = await prisma.ingestedRecord.findUnique({
      where: { id: o.sourceRecordId },
      select: { title: true, summary: true },
    });
    if (!r) continue;

    const text = `${r.title} ${r.summary}`;
    const hits = flagsSuspicious(text);
    if (hits.length > 0) {
      suspicious++;
      const applied = !!o.appliedAt;
      const superseded = !!o.supersededAt;
      if (applied && !superseded) appliedSuspicious++;
      else unappliedSuspicious++;

      suspiciousList.push({
        title: r.title,
        cityId: o.cityId,
        confidence: o.confidence,
        applied,
        superseded,
        hits: hits.map((p) => p.source),
      });
    }
  }

  console.log(
    `Suspicious (matches plan/RFP/MOU patterns): ${suspicious}/${trueOverrides.length}`,
  );
  console.log(
    `  - applied AND not superseded (currently active): ${appliedSuspicious}`,
  );
  console.log(
    `  - never applied OR already superseded: ${unappliedSuspicious}`,
  );
  console.log();

  console.log("--- Suspicious entries (currently active first) ---");
  const sorted = suspiciousList.sort((a, b) => {
    const aActive = a.applied && !a.superseded;
    const bActive = b.applied && !b.superseded;
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    return 0;
  });
  for (const s of sorted.slice(0, 25)) {
    const status =
      s.applied && !s.superseded
        ? "ACTIVE"
        : s.applied && s.superseded
          ? "applied→superseded"
          : "unapplied";
    console.log(`  [${status}] ${s.cityId} conf=${s.confidence}`);
    console.log(`    ${s.title.slice(0, 110)}`);
    console.log(`    hits: ${s.hits.slice(0, 3).join(", ")}`);
  }
  console.log();

  return { total: trueOverrides.length, suspicious, appliedSuspicious };
}

async function main() {
  const dbHost = process.env.DATABASE_URL?.match(/@([^:/]+)/)?.[1] ?? "(unknown)";
  console.log(`DB host: ${dbHost}\n`);

  const pilot = await auditField("hasActivePilotProgram");
  const zoning = await auditField("hasVertiportZoning");
  const legis = await auditField("hasStateLegislation");

  console.log("=".repeat(72));
  console.log("SUMMARY");
  console.log("=".repeat(72));
  console.log(
    `hasActivePilotProgram: ${pilot.suspicious}/${pilot.total} suspicious, ${pilot.appliedSuspicious} active`,
  );
  console.log(
    `hasVertiportZoning  : ${zoning.suspicious}/${zoning.total} suspicious, ${zoning.appliedSuspicious} active`,
  );
  console.log(
    `hasStateLegislation : ${legis.suspicious}/${legis.total} suspicious, ${legis.appliedSuspicious} active`,
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
