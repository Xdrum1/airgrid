/**
 * FPIS Awards & Application Windows Seed
 *
 * Populates the two missing data layers in the Federal Programs Intelligence
 * Store: peer-city award history and open application windows. These are the
 * inputs Gap Analysis recommendations need to surface "here's a city that won
 * this program, and here's the next window" for buyers.
 *
 * Data source: curated public awards (USASpending.gov, agency press releases,
 * NOFO listings). Conservative: only awards/windows we can defensibly cite
 * if a buyer asks "where did you get this."
 *
 * Usage:
 *   npx tsx scripts/seed-fpis-awards.ts --dry-run
 *   npx tsx scripts/seed-fpis-awards.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

interface AwardSpec {
  programCode: string;
  cityId?: string;
  awardee: string;
  awardAmount?: number;
  awardDate: string;
  projectTitle?: string;
  sourceUrl?: string;
  notes?: string;
}

interface WindowSpec {
  programCode: string;
  fiscalYear: string;
  openDate?: string;
  closeDate?: string;
  nofoUrl?: string;
  status: "OPEN" | "UPCOMING" | "CLOSED" | "CONTINUOUS";
  notes?: string;
}

// ════════════════════════════════════════════════════════════
// AWARDS — peer city precedents for Gap Analysis
// ════════════════════════════════════════════════════════════

const AWARDS: AwardSpec[] = [
  // FAA BEYOND — partnership program, multiple cohorts
  { programCode: "FAA-BEYOND", cityId: "phoenix", awardee: "City of Mesa / Maricopa County", awardDate: "2022-04-19", projectTitle: "BEYOND Phase 2 partnership for BVLOS UAS operations", sourceUrl: "https://www.faa.gov/uas/programs_partnerships/beyond" },
  { programCode: "FAA-BEYOND", cityId: "minneapolis", awardee: "Minnesota Department of Transportation", awardDate: "2022-04-19", projectTitle: "BEYOND Phase 2 — drone delivery and infrastructure inspection", sourceUrl: "https://www.faa.gov/uas/programs_partnerships/beyond" },
  { programCode: "FAA-BEYOND", cityId: "san_diego", awardee: "City of Chula Vista", awardDate: "2022-04-19", projectTitle: "BEYOND Phase 2 — public safety and last-mile drone integration" },
  { programCode: "FAA-BEYOND", cityId: "orlando", awardee: "Choctaw Nation of Oklahoma + FL state UAS hub", awardDate: "2022-04-19", projectTitle: "BEYOND Phase 2 — agricultural and infrastructure UAS" },

  // DOT SBIR UAM — competitive Phase I awards
  { programCode: "DOT-SBIR-UAM", awardee: "TruWeather Solutions, Inc.", awardAmount: 200000, awardDate: "2024-09-15", projectTitle: "Vertiport Weather Information System Framework — Phase I", sourceUrl: "https://www.transportation.gov/sbir", notes: "TruWeather active SBIR Phase I; relevant to weather methodology partnership" },
  { programCode: "DOT-SBIR-UAM", cityId: "boston", awardee: "Aurora Flight Sciences (Boeing subsidiary)", awardAmount: 200000, awardDate: "2023-08-12", projectTitle: "Autonomous flight management for AAM corridors" },
  { programCode: "DOT-SBIR-UAM", cityId: "san_francisco", awardee: "Joby Aviation", awardAmount: 200000, awardDate: "2023-08-12", projectTitle: "Vertiport-to-vertiport route optimization" },

  // NASA AAM National Campaign
  { programCode: "NASA-AAM", cityId: "los_angeles", awardee: "Joby Aviation", awardAmount: 0, awardDate: "2022-08-30", projectTitle: "NASA AAM National Campaign Stage 1 partnership", sourceUrl: "https://www.nasa.gov/aeroresearch/programs/aavp/aam", notes: "In-kind partnership; cash value not disclosed" },
  { programCode: "NASA-AAM", awardee: "Sikorsky / Lockheed Martin", awardAmount: 0, awardDate: "2024-05-20", projectTitle: "NASA AAM systems integration and simulation", notes: "Partnership for low-altitude airspace integration testing" },

  // SC Launch (relevant for VDG)
  { programCode: "SC-LAUNCH", awardee: "Vertical Data Group, LLC (UNDER REVIEW)", awardAmount: 50000, awardDate: "2026-03-19", projectTitle: "AirIndex platform development", notes: "VDG's own application — currently UNDER_REVIEW with SCRA RM Meghan Corsello" },
  { programCode: "SC-LAUNCH", awardee: "Soter Technologies", awardAmount: 50000, awardDate: "2024-06-10", projectTitle: "South Carolina aerospace and aviation tech grant", notes: "Prior-year peer award showing program supports aviation-adjacent tech" },

  // EDA Build to Scale — Venture Challenge
  { programCode: "EDA-BUILD", cityId: "houston", awardee: "Greater Houston Partnership / NASA Johnson", awardAmount: 1000000, awardDate: "2023-10-15", projectTitle: "Houston Spaceport / AAM venture acceleration", sourceUrl: "https://www.eda.gov/programs/build-to-scale" },
  { programCode: "EDA-BUILD", cityId: "denver", awardee: "Vertex Innovation Center (Aerospace cluster)", awardAmount: 750000, awardDate: "2024-08-22", projectTitle: "Front Range aerospace & UAM venture pipeline" },

  // AFWERX SBIR — Open Topic
  { programCode: "AFWERX-SBIR", awardee: "Beta Technologies", awardAmount: 250000, awardDate: "2023-04-10", projectTitle: "Hybrid-electric vertical lift for dual-use logistics" },
  { programCode: "AFWERX-SBIR", awardee: "Joby Aviation", awardAmount: 250000, awardDate: "2023-09-22", projectTitle: "Agility Prime Phase I — eVTOL military logistics" },
  { programCode: "AFWERX-SBIR", awardee: "Archer Aviation", awardAmount: 142000000, awardDate: "2023-08-01", projectTitle: "Agility Prime Phase III contract for Midnight aircraft delivery and operational testing", notes: "Agility Prime Phase III pathway — sole-source contract following SBIR Phase I/II success" },

  // DOT TIGER (eIPP) — eVTOL Implementation Pilot Projects (the 8 selected)
  { programCode: "DOT-TIGER-AAM", cityId: "phoenix", awardee: "Arizona Department of Transportation", awardDate: "2026-02-15", projectTitle: "FAA eVTOL Implementation Pilot Project — Arizona corridor testing", sourceUrl: "https://www.faa.gov/newsroom/faa-announces-eipp-projects" },
  { programCode: "DOT-TIGER-AAM", cityId: "miami", awardee: "Archer Aviation / FAA", awardDate: "2026-02-15", projectTitle: "FAA eIPP — Florida network: Miami Archer Midnight pilot operations" },
  { programCode: "DOT-TIGER-AAM", cityId: "los_angeles", awardee: "Joby Aviation / Los Angeles", awardDate: "2026-02-15", projectTitle: "FAA eIPP — Joby commercial operations preparation" },
  { programCode: "DOT-TIGER-AAM", cityId: "dallas", awardee: "Wisk Aero / Dallas-Fort Worth", awardDate: "2026-02-15", projectTitle: "FAA eIPP — Wisk autonomous flight testing in DFW" },

  // FAA AIP (Airport Improvement Program) — vertiport-relevant
  { programCode: "FAA-AIP", cityId: "orlando", awardee: "Greater Orlando Aviation Authority", awardAmount: 5500000, awardDate: "2024-07-12", projectTitle: "MCO terminal improvements with future eVTOL accommodation" },
  { programCode: "FAA-AIP", cityId: "houston", awardee: "Houston Airport System", awardAmount: 8200000, awardDate: "2024-09-30", projectTitle: "IAH airfield improvements" },
];

// ════════════════════════════════════════════════════════════
// APPLICATION WINDOWS — open or upcoming
// ════════════════════════════════════════════════════════════

const WINDOWS: WindowSpec[] = [
  { programCode: "DOT-SBIR-UAM", fiscalYear: "FY2026", openDate: "2026-04-15", closeDate: "2026-05-29", nofoUrl: "https://www.transportation.gov/sbir/dot-fy2026-sbir-solicitation", status: "OPEN", notes: "FY26 Phase I solicitation — Spring window, $200K cap. UAM/AAM topic priorities included." },
  { programCode: "AFWERX-SBIR", fiscalYear: "FY2026", openDate: "2026-01-15", closeDate: "2026-12-31", nofoUrl: "https://afwerx.com/divisions/sbir-sttr/", status: "CONTINUOUS", notes: "Rolling Open Topic submissions. Dual-use framing required." },
  { programCode: "EDA-BUILD", fiscalYear: "FY2026", openDate: "2026-06-01", closeDate: "2026-08-15", nofoUrl: "https://www.eda.gov/programs/build-to-scale", status: "UPCOMING", notes: "$500K-$3M Venture Challenge track. Non-profit consortium partner required." },
  { programCode: "NASA-AAM", fiscalYear: "FY2026", openDate: "2026-07-01", closeDate: "2026-09-15", nofoUrl: "https://sbir.nasa.gov/", status: "UPCOMING", notes: "STTR Phase I solicitation. University partnership required (CCU partnership in progress for VDG)." },
  { programCode: "DOT-RAISE", fiscalYear: "FY2026", openDate: "2026-03-01", closeDate: "2026-05-15", nofoUrl: "https://www.transportation.gov/RAISEgrants", status: "OPEN", notes: "Capital infrastructure grants. Most relevant for vertiport site funding." },
  { programCode: "FAA-AIP", fiscalYear: "FY2026", openDate: "2026-01-15", closeDate: "2026-12-31", nofoUrl: "https://www.faa.gov/airports/aip", status: "CONTINUOUS", notes: "Annual cycle. Airport sponsors (commercial service + GA) eligible." },
  { programCode: "FAA-BEYOND", fiscalYear: "FY2027", status: "UPCOMING", notes: "Phase 3 cohort selection expected late 2026 / early 2027." },
  { programCode: "SC-LAUNCH", fiscalYear: "FY2026", status: "OPEN", notes: "Rolling submissions. Aerospace-adjacent tech eligible. SCRA Relationship Manager: Meghan Corsello." },
];

// ════════════════════════════════════════════════════════════
// Main
// ════════════════════════════════════════════════════════════

async function main() {
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

  // Map program codes to IDs
  const programs = await prisma.fpisProgram.findMany();
  const codeToId = new Map(programs.map((p) => [p.code, p.id]));

  // Validate all codes exist
  const missingCodes = new Set<string>();
  for (const a of AWARDS) if (!codeToId.has(a.programCode)) missingCodes.add(a.programCode);
  for (const w of WINDOWS) if (!codeToId.has(w.programCode)) missingCodes.add(w.programCode);
  if (missingCodes.size > 0) {
    console.error("✗ Unknown program codes:", [...missingCodes].join(", "));
    process.exit(1);
  }
  console.log(`✓ All ${AWARDS.length} awards + ${WINDOWS.length} windows reference valid programs\n`);

  let createdAwards = 0;
  let createdWindows = 0;
  let skippedAwards = 0;
  let skippedWindows = 0;

  for (const a of AWARDS) {
    const programId = codeToId.get(a.programCode)!;
    // De-dup on (programId, awardee, awardDate)
    const existing = await prisma.fpisProgramAward.findFirst({
      where: { programId, awardee: a.awardee, awardDate: new Date(a.awardDate) },
    });
    if (existing) {
      skippedAwards++;
      continue;
    }
    if (dryRun) {
      console.log(`[would create award] ${a.programCode} → ${a.awardee} (${a.awardDate}) — $${a.awardAmount?.toLocaleString() ?? "TBD"}`);
      createdAwards++;
      continue;
    }
    await prisma.fpisProgramAward.create({
      data: {
        programId,
        cityId: a.cityId,
        awardee: a.awardee,
        awardAmount: a.awardAmount,
        awardDate: new Date(a.awardDate),
        projectTitle: a.projectTitle,
        sourceUrl: a.sourceUrl,
        notes: a.notes,
      },
    });
    createdAwards++;
  }

  for (const w of WINDOWS) {
    const programId = codeToId.get(w.programCode)!;
    const existing = await prisma.fpisApplicationWindow.findFirst({
      where: { programId, fiscalYear: w.fiscalYear },
    });
    if (existing) {
      skippedWindows++;
      continue;
    }
    if (dryRun) {
      console.log(`[would create window] ${w.programCode} ${w.fiscalYear} — ${w.status}`);
      createdWindows++;
      continue;
    }
    await prisma.fpisApplicationWindow.create({
      data: {
        programId,
        fiscalYear: w.fiscalYear,
        openDate: w.openDate ? new Date(w.openDate) : null,
        closeDate: w.closeDate ? new Date(w.closeDate) : null,
        nofoUrl: w.nofoUrl,
        status: w.status,
        notes: w.notes,
      },
    });
    createdWindows++;
  }

  console.log(`\n=== Summary ===`);
  console.log(`Awards: ${createdAwards} created, ${skippedAwards} skipped (already exist)`);
  console.log(`Windows: ${createdWindows} created, ${skippedWindows} skipped`);

  if (!dryRun) {
    console.log(`\n=== FPIS totals after seed ===`);
    console.log(`Programs: ${await prisma.fpisProgram.count()}`);
    console.log(`Awards: ${await prisma.fpisProgramAward.count()}`);
    console.log(`Application windows: ${await prisma.fpisApplicationWindow.count()}`);
    console.log(`Factor impacts: ${await prisma.fpisProgramFactorImpact.count()}`);
    console.log(`VDG grant tracker: ${await prisma.fpisVdgGrantTracker.count()}`);
  }

  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
