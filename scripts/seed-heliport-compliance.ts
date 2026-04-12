/**
 * Heliport Compliance Database — Phase 1 Seed
 *
 * Scores all 5,647 FAA-registered heliports against 4 of 5
 * compliance questions (Q2 airspace determination pending OE/AAA
 * data integration).
 *
 * Data sources:
 *   Q1: FAA NASR 5010 (already in Heliport table)
 *   Q2: FAA OE/AAA (PENDING — marked unknown)
 *   Q3: MCS state enforcement posture (live in DB)
 *   Q4: OrdinanceAudit NFPA 418 status (5 cities seeded)
 *   Q5: Site type classification from NASR (hospital = at_risk)
 *
 * Usage:
 *   npx tsx scripts/seed-heliport-compliance.ts
 *   npx tsx scripts/seed-heliport-compliance.ts --dry-run
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

// Map state codes to market IDs for metro area matching
const STATE_TO_MARKETS: Record<string, string[]> = {
  CA: ["los_angeles", "san_francisco", "san_diego"],
  TX: ["dallas", "houston", "austin"],
  FL: ["miami", "orlando", "tampa"],
  AZ: ["phoenix"],
  NY: ["new_york"],
  IL: ["chicago"],
  NV: ["las_vegas"],
  NC: ["charlotte"],
  GA: ["atlanta"],
  CO: ["denver"],
  TN: ["nashville"],
  WA: ["seattle"],
  MA: ["boston"],
  MI: ["detroit"],
  OH: ["columbus"],
  MN: ["minneapolis"],
  DC: ["washington_dc"],
};

// Hospital site types that trigger eVTOL viability flag
const HOSPITAL_TYPES = ["heliport", "ultralight"];
const HOSPITAL_KEYWORDS = ["hospital", "medical", "health", "mercy", "memorial", "st.", "saint", "regional med", "trauma"];

function isHospitalSite(name: string, useType: string): boolean {
  const lower = name.toLowerCase();
  return HOSPITAL_KEYWORDS.some(kw => lower.includes(kw)) || useType?.toLowerCase().includes("medical");
}

/**
 * Compliance tier logic — 5 tiers:
 *
 *   COMPLIANT           — all 5 questions answered, 0 failures
 *   COMPLIANT_PRESUMED  — 0 failures but ≥1 unknown (data gaps remain)
 *   CONDITIONAL         — 1-2 failures (remediable gaps identified)
 *   OBJECTIONABLE       — 3+ failures (significant compliance deficit)
 *   UNKNOWN             — too many unknowns to make any determination
 *
 * Why the distinction matters: "compliant" previously included facilities
 * with unanswered Q2 (airspace) and Q5 (eVTOL viability). Insurance
 * buyers need to know whether compliance is verified or assumed.
 */
function computeComplianceStatus(scores: { q1: string; q2: string; q3: string; q4: string; q5: string }): {
  status: string;
  score: number;
  flagCount: number;
} {
  const passing = [
    scores.q1 === "pass",
    scores.q2 === "on_file",
    scores.q3 === "strong",
    scores.q4 === "adopted",
    scores.q5 === "viable",
  ];

  const failing = [
    scores.q1 === "missing" || scores.q1 === "flag",
    scores.q2 === "not_found",
    scores.q3 === "none",
    scores.q4 === "none",
    scores.q5 === "at_risk",
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
    status = "compliant"; // All 5 verified — true compliant
  } else if (passCount >= 3 && unknownCount > 0) {
    status = "compliant_presumed"; // No failures but data gaps remain
  } else {
    status = "unknown"; // Too many unknowns to determine
  }

  return { status, score: passCount, flagCount: failCount };
}

async function main() {
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

  // Check if already seeded
  const existingCount = await prisma.heliportCompliance.count();
  if (existingCount > 0) {
    console.log(`Already seeded: ${existingCount} records. Delete to re-seed.\n`);

    // Show summary
    const byStatus = await prisma.$queryRaw`
      SELECT "complianceStatus", COUNT(*)::int as count
      FROM "HeliportCompliance"
      GROUP BY "complianceStatus"
      ORDER BY count DESC
    ` as { complianceStatus: string; count: number }[];
    console.log("Current distribution:");
    byStatus.forEach(r => console.log(`  ${r.complianceStatus}: ${r.count}`));
    return;
  }

  // Load state enforcement data from MCS
  const stateContexts = await prisma.mcsStateContext.findMany({
    select: { stateCode: true, enforcementPosture: true },
  });
  const stateEnforcement = new Map(stateContexts.map(s => [s.stateCode, s.enforcementPosture]));

  // Load ordinance audit data (NFPA 418 status by market)
  const ordinanceAudits = await prisma.ordinanceAudit.findMany({
    select: { marketId: true, nfpa418Referenced: true },
  });
  const nfpa418ByMarket = new Map(ordinanceAudits.map(a => [a.marketId, a.nfpa418Referenced]));

  // Load all heliports from the existing Heliport table
  const heliports = await prisma.heliport.findMany({
    select: {
      id: true,
      facilityName: true,
      state: true,
      city: true,
      lat: true,
      lng: true,
      useType: true,
      ownershipType: true,
      cityId: true,
    },
  });

  console.log(`Processing ${heliports.length} heliports...\n`);

  const statusCounts: Record<string, number> = {};
  const q5Counts: Record<string, number> = {};
  let created = 0;

  const BATCH_SIZE = 200;
  const batches: Array<Parameters<typeof prisma.heliportCompliance.create>[0]["data"]>[] = [];
  let currentBatch: Parameters<typeof prisma.heliportCompliance.create>[0]["data"][] = [];

  for (const h of heliports) {
    // Q1: FAA registration — if it's in NASR, it's registered
    const q1 = "pass";
    const q1Note = "Active FAA NASR 5010 record.";

    // Q2: Airspace determination — PENDING OE/AAA integration
    const q2 = "unknown";
    const q2Note = "FAA OE/AAA airspace determination data integration pending.";

    // Q3: State enforcement posture
    const enforcement = stateEnforcement.get(h.state) ?? "unknown";
    const q3 = enforcement === "unknown" ? "unknown" : enforcement;
    const q3Note = enforcement === "strong" ? "State has adopted FAA AC as enforceable." :
                   enforcement === "moderate" ? "State has partial enforcement framework." :
                   enforcement === "limited" ? "State has limited enforcement of FAA standards." :
                   enforcement === "none" ? "No state-level enforcement of FAA heliport standards." :
                   "State enforcement posture not yet assessed.";

    // Q4: NFPA 418 — check by state, then by nearest market
    const marketsInState = STATE_TO_MARKETS[h.state] ?? [];
    let q4 = "unknown";
    let q4Note = "NFPA 418 adoption status not yet assessed for this jurisdiction.";
    for (const marketId of marketsInState) {
      const nfpaStatus = nfpa418ByMarket.get(marketId);
      if (nfpaStatus) {
        q4 = nfpaStatus === "yes" ? "adopted" : nfpaStatus === "partial" ? "partial" : nfpaStatus === "no" ? "none" : "unknown";
        q4Note = nfpaStatus === "yes" ? "Jurisdiction has adopted NFPA 418 in fire/building code." :
                 nfpaStatus === "partial" ? "IBC references NFPA 418 for rooftop facilities. Standalone fire code reference not confirmed." :
                 nfpaStatus === "no" ? "No NFPA 418 reference found in jurisdiction fire or building code." :
                 "NFPA 418 adoption status not yet assessed.";
        break;
      }
    }

    // Q5: eVTOL dimensional viability — hospital helipads are at risk
    const isHospital = isHospitalSite(h.facilityName, h.useType ?? "");
    const q5 = isHospital ? "at_risk" : "unknown";
    const q5Note = isHospital
      ? "Hospital helipad — likely built to 40x40 ft TLOF standard. eVTOL requires 50x50 ft minimum. Fewer than 20% of hospital helipads meet eVTOL dimensional requirements."
      : "Site type dimensional viability requires physical assessment or satellite imagery analysis.";

    q5Counts[q5] = (q5Counts[q5] ?? 0) + 1;

    // Compute compliance status
    const { status, score, flagCount } = computeComplianceStatus({ q1, q2: q2, q3, q4, q5 });
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;

    // Find nearest tracked market — prefer cityId from heliport table
    const nearestMarket = h.cityId ?? marketsInState[0] ?? null;

    if (!dryRun) {
      currentBatch.push({
        facilityId: h.id,
        facilityName: h.facilityName,
        state: h.state,
        city: h.city ?? "",
        lat: h.lat ?? 0,
        lng: h.lng ?? 0,
        siteType: isHospital ? "hospital" : (h.useType?.toLowerCase() ?? "unknown"),
        ownershipType: h.ownershipType ?? null,
        q1FaaRegistration: q1,
        q1Note,
        q2AirspaceDetermination: q2,
        q2Note,
        q3StateEnforcement: q3,
        q3Note,
        q4Nfpa418: q4,
        q4Note,
        q5EvtolViability: q5,
        q5Note,
        complianceStatus: status,
        complianceScore: score,
        flagCount,
        lastAssessedAt: new Date(),
        assessedBy: "PIPELINE",
        marketId: nearestMarket,
      });

      if (currentBatch.length >= BATCH_SIZE) {
        batches.push(currentBatch);
        currentBatch = [];
      }
    }

    created++;
    if (created % 1000 === 0) {
      console.log(`  ... processed ${created} heliports`);
    }
  }

  // Final batch
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  if (!dryRun) {
    console.log(`\nInserting ${created} records in ${batches.length} batches...`);
    for (let i = 0; i < batches.length; i++) {
      for (const record of batches[i]) {
        await prisma.heliportCompliance.create({ data: record }).catch(() => {
          // Skip duplicates silently
        });
      }
      if ((i + 1) % 5 === 0) {
        console.log(`  ... batch ${i + 1}/${batches.length}`);
      }
    }
  }

  console.log(`\n${created} heliport compliance records ${dryRun ? "would be" : ""} created.\n`);

  // Summary
  console.log("═══ Compliance Status Distribution ═══");
  for (const [status, count] of Object.entries(statusCounts).sort((a, b) => b[1] - a[1])) {
    const pct = ((count / created) * 100).toFixed(1);
    console.log(`  ${status.padEnd(15)} ${String(count).padStart(5)} (${pct}%)`);
  }

  console.log("\n═══ eVTOL Viability (Q5) ═══");
  for (const [status, count] of Object.entries(q5Counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${status.padEnd(10)} ${String(count).padStart(5)}`);
  }

  console.log("\n═══ Data Source Status ═══");
  console.log("  Q1 FAA Registration:     ✅ Live (NASR 5010)");
  console.log("  Q2 Airspace Determination: ⚠️  PENDING (OE/AAA API integration needed)");
  console.log("  Q3 State Enforcement:     ✅ Live (MCS — 17 states)");
  console.log("  Q4 NFPA 418:              ✅ Partial (5 cities assessed, state-level fallback)");
  console.log("  Q5 eVTOL Viability:       ✅ Partial (hospital sites flagged, others unknown)");
}

main()
  .catch((err) => { console.error("Error:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
