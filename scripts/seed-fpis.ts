/**
 * FPIS — Seed Federal Programs Intelligence Store
 *
 * 10 programs from the FPIS spec + factor impact mappings +
 * VDG grant tracker entries for active applications.
 *
 * Usage:
 *   npx tsx scripts/seed-fpis.ts
 *   npx tsx scripts/seed-fpis.ts --dry-run
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

interface ProgramDef {
  code: string;
  name: string;
  agency: string;
  awardMin: number | null;
  awardMax: number | null;
  cycle: string;
  programType: string;
  description: string;
  eligibility: string;
  gapAnalysisRole: string;
  vdgRelevance: string;
  vdgPriority: string;
  sbirEligible: boolean;
  factorImpacts: { factorCode: string; points: number; note: string }[];
}

const PROGRAMS: ProgramDef[] = [
  {
    code: "DOT-RAISE",
    name: "Rebuilding American Infrastructure with Sustainability and Equity",
    agency: "DOT",
    awardMin: 1000000, awardMax: 25000000,
    cycle: "Annual — rolling NOFO",
    programType: "GRANT",
    description: "The DOT RAISE grant funds surface transportation, aviation infrastructure, and multimodal projects with significant community impact. AAM/UAM vertiport infrastructure has been explicitly funded under RAISE since the 2022 cycle. FY2025 RAISE funded $1.2B across 162 awards.",
    eligibility: "States, local governments, tribes, metropolitan planning organizations. NOT direct to operators or developers. City or airport authority must apply.",
    gapAnalysisRole: "The highest-value Gap Analysis program for EARLY-tier markets. A RAISE application is an actionable step any city can take regardless of current score. Surfaces for any market with PLT < 5 and population > 200k. Peer precedent: Orlando RAISE 2023 — $4.2M vertiport feasibility.",
    vdgRelevance: "VDG SBIR Phase I (DOT) creates Phase III pathway to DOT data service contracts. A DOT Phase I award makes VDG eligible for sole-source DOT data contracts without competitive procurement. Priority: HIGHEST for VDG grant strategy.",
    vdgPriority: "HIGHEST",
    sbirEligible: true,
    factorImpacts: [
      { factorCode: "PLT", points: 7, note: "+7 pts on award as federal pilot program signal" },
      { factorCode: "VRT", points: 5, note: "+5 pts if award funds vertiport construction or feasibility" },
    ],
  },
  {
    code: "FAA-BEYOND",
    name: "FAA BEYOND Program — UAS/UAM Integration",
    agency: "FAA",
    awardMin: null, awardMax: null,
    cycle: "Rolling enrollment",
    programType: "PARTNERSHIP",
    description: "The FAA BEYOND program provides selected cities and airport authorities with direct FAA technical assistance for UAS and UAM airspace integration. BEYOND cities get access to FAA flight standards resources, waiver processing priority, and UTM pilot program participation. Currently 14 enrolled cities.",
    eligibility: "Cities, airport authorities, and research institutions with demonstrated UAM infrastructure readiness or active pilot programs. Enrollment by application to FAA UAS Integration Office.",
    gapAnalysisRole: "Surfaces for any market with REG < 8. The Gap Analysis 'what did Dallas do' playbook for REG factor gaps almost always includes BEYOND enrollment as step 1. BEYOND enrollment is also a prerequisite signaled for several RAISE applications.",
    vdgRelevance: "AirIndex data directly supports BEYOND program management — market readiness scores help FAA prioritize which cities to enroll next. This is the most direct federal agency use case for AirIndex data. Priority: HIGH — name BEYOND explicitly in SBIR Phase I DOT application.",
    vdgPriority: "HIGH",
    sbirEligible: false,
    factorImpacts: [
      { factorCode: "REG", points: 8, note: "+8 pts — highest single REG signal in methodology" },
      { factorCode: "PLT", points: 5, note: "+5 pts as FAA-sanctioned pilot program" },
    ],
  },
  {
    code: "FAA-AIP",
    name: "Airport Improvement Program",
    agency: "FAA",
    awardMin: 150000, awardMax: 50000000,
    cycle: "Annual — state block grants + direct",
    programType: "GRANT",
    description: "The FAA AIP provides grants to public-use airports for infrastructure development. Vertiport infrastructure attached to or at an existing airport is AIP-eligible. The 2024 FAA Reauthorization Act explicitly added vertiport infrastructure to the list of AIP-eligible project types.",
    eligibility: "Airport sponsors (airport authorities, municipalities that own airports). Vertiport projects must be on or adjacent to an FAA-designated public-use airport.",
    gapAnalysisRole: "Surfaces for any market with VRT < 10 that has a qualifying airport. All 21 scored markets have a qualifying primary airport. Gap Analysis shows AIP as an available VRT pathway for every market.",
    vdgRelevance: "AIP award data is public via FAA AIP database — automatically ingested as VRT factor signals. Historical AIP awards for any vertiport-adjacent infrastructure in scored markets should be backfilled into fpis.program_awards.",
    vdgPriority: "MEDIUM",
    sbirEligible: false,
    factorImpacts: [
      { factorCode: "VRT", points: 14, note: "+6 for feasibility, +14 for construction — most impactful VRT program" },
    ],
  },
  {
    code: "DOT-SBIR-UAM",
    name: "DOT Small Business Innovation Research — UAM/AAM",
    agency: "DOT",
    awardMin: 200000, awardMax: 1700000,
    cycle: "Annual — Spring solicitation",
    programType: "SBIR",
    description: "The DOT SBIR program funds small business R&D on transportation technology topics. DOT SBIR solicitations have included Urban Air Mobility data, market intelligence, and infrastructure readiness as funded topics in recent cycles. Phase I is a 6-month feasibility study. Phase II is a 2-year development contract. Phase III is a sole-source follow-on contract with any DOT agency — no competition required.",
    eligibility: "US small businesses (< 500 employees). Primary place of performance must be US. PI must be employed by the small business. VDG qualifies on all dimensions as of March 2026.",
    gapAnalysisRole: "DOT SBIR Phase I is the gateway to the federal contract pathway. Gap Analysis does not surface SBIR to city planners — it is not a city-eligible program.",
    vdgRelevance: "VDG PRIORITY: HIGHEST. DOT SBIR Phase I application is the single most important grant action VDG can take in 2026. Phase III mechanism means one Phase I award enables unlimited sole-source DOT data contracts. Target solicitation: DOT SBIR FY2026 Spring — topic area: Transportation Data and Analytics / Urban Air Mobility Market Intelligence.",
    vdgPriority: "HIGHEST",
    sbirEligible: true,
    factorImpacts: [],
  },
  {
    code: "AFWERX-SBIR",
    name: "AFWERX Open Topic SBIR — Dual-Use Technology",
    agency: "DoD/AFWERX",
    awardMin: 50000, awardMax: 1500000,
    cycle: "Continuous — rolling NOFO",
    programType: "SBIR",
    description: "AFWERX is the Air Force innovation hub that runs the most accessible SBIR program in the federal government. Open Topic SBIR accepts applications on a rolling basis — no fixed solicitation window. AFWERX has funded UAM situational awareness, airspace deconfliction, and market readiness data tools under the dual-use (commercial + military) technology track.",
    eligibility: "US small businesses. Dual-use framing required: the technology must have both a clear commercial application and a plausible defense/Air Force use case. AirIndex dual-use framing: commercial UAM market intelligence + military airspace deconfliction and base community air mobility readiness.",
    gapAnalysisRole: "Does not feed Gap Analysis directly. AFWERX award data appears in USASpending and is ingested as a PLT factor signal for any market where an AFWERX-funded UAM pilot is operating.",
    vdgRelevance: "VDG PRIORITY: HIGH. Rolling acceptance makes this the lowest-friction federal SBIR entry point. Apply before DOT SBIR window — use as proof of federal validation in DOT application. Dual-use framing: 'AirIndex scores UAM market readiness for both commercial operators and DoD installations evaluating UAM for base transportation and logistics.'",
    vdgPriority: "HIGH",
    sbirEligible: true,
    factorImpacts: [],
  },
  {
    code: "DOT-TIGER-AAM",
    name: "DOT Advanced Air Mobility Pilot Program",
    agency: "DOT/FAA",
    awardMin: 5000000, awardMax: 50000000,
    cycle: "Discretionary — White House initiative",
    programType: "PILOT",
    description: "The White House Advanced Air Mobility National Strategy (2022) established a DOT/FAA joint pilot program for AAM infrastructure demonstrations. The program funds city-level vertiport construction, airspace integration demonstration, and public-private partnership development. This is the highest-value single program in the FPIS catalog — an award represents federal validation of a market's readiness.",
    eligibility: "State and local governments, airport authorities, and regional planning organizations. Competitive — typically 3-8 awards per cycle. Markets with existing BEYOND enrollment and RAISE history are strongly favored.",
    gapAnalysisRole: "The most impactful single program in Gap Analysis. Surfaces for ADVANCED-tier and MODERATE-tier markets as the next-level accelerator, and for high-potential EARLY-tier markets as an aspirational target. Gap Analysis shows the prerequisite chain: BEYOND → RAISE feasibility → AAM Pilot Program application. Typical pathway: 18-24 months.",
    vdgRelevance: "AirIndex data is the exact type of market readiness intelligence DOT uses to evaluate AAM Pilot Program applications. This program is the clearest use case for a DOT data service contract: 'DOT uses AirIndex to identify and monitor AAM Pilot Program candidate markets.' Priority: HIGH — name this program explicitly in SBIR Phase I narrative.",
    vdgPriority: "HIGH",
    sbirEligible: true,
    factorImpacts: [
      { factorCode: "PLT", points: 10, note: "+10 pts — maximum pilot program score" },
      { factorCode: "REG", points: 4, note: "+4 pts federal engagement signal" },
      { factorCode: "VRT", points: 14, note: "+9-14 pts depending on infrastructure funded" },
    ],
  },
  {
    code: "NASA-AAM",
    name: "NASA Advanced Air Mobility National Campaign",
    agency: "NASA",
    awardMin: 500000, awardMax: 10000000,
    cycle: "Rolling — STTR/SBIR + direct contracts",
    programType: "STTR",
    description: "The NASA AAM National Campaign coordinates national air mobility research across universities, industry, and government. NASA funds market readiness research, operations concept development, and community engagement studies under the campaign. The NASA/CCU STTR pathway is the most directly applicable mechanism for VDG given the CCU research relationship.",
    eligibility: "STTR requires a small business (VDG) + research institution (CCU) partnership. At least 40% of work must be performed by the research institution. The CCU connection (Dr. Jeong, Dr. Salvino) is the prerequisite.",
    gapAnalysisRole: "Surfaces in Gap Analysis for markets with strong university research presence and PLT < 7. 'NASA-funded market readiness research in similar markets has accelerated BEYOND enrollment by 6-12 months.'",
    vdgRelevance: "VDG PRIORITY: HIGH. NASA/CCU STTR is the grant pathway that: (1) funds V2 development via CCU partnership, (2) creates NASA relationship for future data contracts, (3) adds academic credibility to AirIndex methodology. Pursue after CCU relationship with Dr. Jeong is established. Timeline: Q2-Q3 2026 STTR application with CCU.",
    vdgPriority: "HIGH",
    sbirEligible: true,
    factorImpacts: [
      { factorCode: "PLT", points: 5, note: "+5 pts for NASA-funded research in market" },
      { factorCode: "REG", points: 3, note: "+3 pts federal regulatory partner signal" },
    ],
  },
  {
    code: "EDA-BUILD",
    name: "EDA Build to Scale — Venture Challenge",
    agency: "EDA",
    awardMin: 500000, awardMax: 3000000,
    cycle: "Annual — Fall NOFO",
    programType: "GRANT",
    description: "The EDA Build to Scale program funds regional innovation ecosystems and entrepreneurial support organizations. The Venture Challenge track specifically supports scalable technology commercialization in regions where innovation infrastructure is underdeveloped. AirIndex/VDG fits as a data infrastructure company enabling regional economic development through UAM market readiness.",
    eligibility: "Non-profit organizations, universities, economic development organizations, and public entities. NOT direct to for-profit companies. VDG would need to apply through a partner organization — SCRA, CCU, or a regional economic development entity.",
    gapAnalysisRole: "Surfaces in Gap Analysis for markets with MKT < 3 and strong economic development activity. Framing: 'EDA Build to Scale has funded data infrastructure tools in markets that subsequently attracted UAM investment.'",
    vdgRelevance: "VDG PRIORITY: MEDIUM. Requires a non-profit or academic partner — CCU is the natural fit. Pursue after SCRA membership is established and the CCU research relationship (Dr. Jeong/Dr. Salvino) is formalized. Timeline: Q3 2026 application if CCU partnership progresses.",
    vdgPriority: "MEDIUM",
    sbirEligible: false,
    factorImpacts: [],
  },
  {
    code: "DOT-EIPP",
    name: "DOT Enhanced Instrument Performance Products (eIPP)",
    agency: "DOT/FAA",
    awardMin: null, awardMax: null,
    cycle: "Rolling — FAA partnership selection",
    programType: "PARTNERSHIP",
    description: "The eIPP program establishes partnerships between FAA and weather technology providers to deploy enhanced weather sensing at airports and vertiports. Don Berchoff (TruWeather Solutions) is an eIPP participant — 5 of 8 FAA eIPP teams use TruWeather data. eIPP participation signals direct federal engagement with weather infrastructure for a specific market.",
    eligibility: "Weather technology providers with FAA-approved sensing capabilities. Markets selected based on operational need and existing aviation infrastructure. City/airport must demonstrate willingness to host equipment.",
    gapAnalysisRole: "Surfaces for any market with WTH < 5. 'eIPP deployment in this market would upgrade Weather Infrastructure from partial to full, adding 5 points to the composite score.' Direct pathway to closing the WTH gap that currently caps every US market below 100.",
    vdgRelevance: "VDG PRIORITY: HIGH via TruWeather partnership. Don Berchoff relationship is the conduit. eIPP intelligence packages ($5-15K per team) are a near-term revenue product. AirIndex data helps eIPP teams prioritize deployment markets. Co-selling play: TruWeather deploys sensing, AirIndex provides the market intelligence layer.",
    vdgPriority: "HIGH",
    sbirEligible: false,
    factorImpacts: [
      { factorCode: "WTH", points: 5, note: "+5 pts — upgrades from partial to full weather infrastructure" },
      { factorCode: "REG", points: 2, note: "+2 pts federal engagement signal" },
    ],
  },
  {
    code: "SC-LAUNCH",
    name: "SC Launch — South Carolina Innovation Fund",
    agency: "SCRA",
    awardMin: 25000, awardMax: 200000,
    cycle: "Rolling — quarterly review",
    programType: "GRANT",
    description: "SC Launch is SCRA's flagship startup funding program for South Carolina-based technology companies. Provides non-dilutive grant funding for product development, market validation, and early commercialization. VDG qualifies through SCRA membership and SC business registration.",
    eligibility: "SC-incorporated technology companies. Must be SCRA member. Product must have clear commercial application. VDG meets all criteria.",
    gapAnalysisRole: "Not a market-facing program — does not appear in subscriber Gap Analysis. Internal VDG funding pathway.",
    vdgRelevance: "VDG application status: UNDER_REVIEW ($50K requested). Relationship manager: Meghan Corsello. Status moved from SUBMITTED to UNDER_REVIEW on March 19, 2026. Thursday April 3 call with Meghan. If awarded, funds initial platform development costs and validates SCRA relationship for future EDA Build to Scale application.",
    vdgPriority: "HIGH",
    sbirEligible: false,
    factorImpacts: [],
  },
];

// VDG Grant Tracker entries for active applications
const VDG_TRACKER = [
  { programCode: "SC-LAUNCH", name: "SC Launch Application", status: "UNDER_REVIEW", amount: 50000, submitted: "2026-03-01", nextAction: "April 3 call with Meghan Corsello (SCRA)" },
  { programCode: "AFWERX-SBIR", name: "AFWERX Open Topic Phase I", status: "DRAFTING", amount: 50000, submitted: null, nextAction: "Finalize dual-use framing. Apply before DOT SBIR window opens." },
  { programCode: "DOT-SBIR-UAM", name: "DOT SBIR Phase I — UAM Data", status: "IDENTIFIED", amount: 200000, submitted: null, nextAction: "FY2026 Spring solicitation expected April/May. Highest priority application." },
  { programCode: "NASA-AAM", name: "NASA/CCU STTR Phase I", status: "IDENTIFIED", amount: 150000, submitted: null, nextAction: "Establish CCU partnership with Dr. Jeong. Q2-Q3 2026 timeline." },
  { programCode: "EDA-BUILD", name: "EDA Build to Scale — CCU Partner", status: "IDENTIFIED", amount: 500000, submitted: null, nextAction: "Requires CCU/SCRA partnership. Q3 2026 if CCU progresses." },
];

async function main() {
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

  // ── Programs ──
  console.log("═══ FPIS Program Catalog ═══\n");
  const programIdMap = new Map<string, string>();

  for (const p of PROGRAMS) {
    if (dryRun) {
      console.log(`  [dry] ${p.code} — ${p.name} (${p.agency}, ${p.vdgPriority})`);
      programIdMap.set(p.code, p.code);
      continue;
    }

    const existing = await prisma.fpisProgram.findUnique({ where: { code: p.code } });
    if (existing) {
      programIdMap.set(p.code, existing.id);
      console.log(`  ○ ${p.code} (already exists)`);
      continue;
    }

    const created = await prisma.fpisProgram.create({
      data: {
        code: p.code,
        name: p.name,
        agency: p.agency,
        awardRangeMin: p.awardMin,
        awardRangeMax: p.awardMax,
        cycle: p.cycle,
        programType: p.programType,
        description: p.description,
        eligibility: p.eligibility,
        gapAnalysisRole: p.gapAnalysisRole,
        vdgRelevance: p.vdgRelevance,
        vdgPriority: p.vdgPriority,
        sbirEligible: p.sbirEligible,
      },
    });
    programIdMap.set(p.code, created.id);
    console.log(`  ✓ ${p.code} — ${p.name} (${p.vdgPriority})`);

    // Factor impacts
    for (const fi of p.factorImpacts) {
      await prisma.fpisProgramFactorImpact.create({
        data: {
          programId: created.id,
          factorCode: fi.factorCode,
          pointsOnAward: fi.points,
          impactNote: fi.note,
        },
      });
    }
  }

  console.log(`\n${programIdMap.size} programs seeded.\n`);

  // ── VDG Grant Tracker ──
  console.log("═══ VDG Grant Tracker ═══\n");
  for (const entry of VDG_TRACKER) {
    const progId = programIdMap.get(entry.programCode);
    if (!progId) continue;

    if (dryRun) {
      console.log(`  [dry] ${entry.name}: ${entry.status} ($${entry.amount?.toLocaleString()})`);
      continue;
    }

    const existing = await prisma.fpisVdgGrantTracker.findFirst({
      where: { programId: progId, applicationName: entry.name },
    });
    if (existing) {
      console.log(`  ○ ${entry.name} (already exists)`);
      continue;
    }

    await prisma.fpisVdgGrantTracker.create({
      data: {
        programId: progId,
        applicationName: entry.name,
        status: entry.status,
        targetAmount: entry.amount,
        submittedDate: entry.submitted ? new Date(entry.submitted) : null,
        nextAction: entry.nextAction,
      },
    });
    console.log(`  ✓ ${entry.name}: ${entry.status}`);
  }

  // ── Summary ──
  console.log("\n═══ FPIS Summary ═══");
  console.log(`Programs: ${PROGRAMS.length}`);
  console.log(`  Market-facing (Gap Analysis): ${PROGRAMS.filter(p => p.factorImpacts.length > 0).length}`);
  console.log(`  VDG-facing (Grant Strategy): ${PROGRAMS.filter(p => p.vdgPriority === "HIGHEST" || p.vdgPriority === "HIGH").length}`);
  console.log(`  SBIR/STTR eligible: ${PROGRAMS.filter(p => p.sbirEligible).length}`);
  console.log(`\nVDG active applications: ${VDG_TRACKER.length}`);

  console.log("\n═══ Factor Impact Map ═══");
  const impactMap: Record<string, { program: string; points: number }[]> = {};
  for (const p of PROGRAMS) {
    for (const fi of p.factorImpacts) {
      if (!impactMap[fi.factorCode]) impactMap[fi.factorCode] = [];
      impactMap[fi.factorCode].push({ program: p.code, points: fi.points });
    }
  }
  for (const [factor, impacts] of Object.entries(impactMap).sort((a, b) => a[0].localeCompare(b[0]))) {
    const programs = impacts.map(i => `${i.program}(+${i.points})`).join(", ");
    console.log(`  ${factor}: ${programs}`);
  }
}

main()
  .catch((err) => { console.error("Error:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
