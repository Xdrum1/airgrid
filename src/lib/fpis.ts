/**
 * FPIS Runtime — Federal Programs Intelligence Store query module.
 *
 * Dual-consumer: Gap Analysis (subscriber-facing) and VDG Grant Tracker (internal).
 * Provides program lookups, award history, application windows, and
 * factor-to-program matching for Gap Analysis recommendations.
 */

import { createLogger } from "@/lib/logger";

const logger = createLogger("fpis");

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export interface ProgramSummary {
  id: string;
  code: string;
  name: string;
  agency: string;
  programType: string;
  awardRangeMin: number | null;
  awardRangeMax: number | null;
  cycle: string;
  isActive: boolean;
  sbirEligible: boolean;
}

export interface ProgramDetail extends ProgramSummary {
  description: string;
  eligibility: string;
  gapAnalysisRole: string;
  factorImpacts: { factorCode: string; pointsOnAward: number; impactNote: string | null }[];
  openWindows: { fiscalYear: string; openDate: Date | null; closeDate: Date | null; status: string }[];
  recentAwards: { cityId: string | null; awardee: string; awardAmount: number | null; awardDate: Date }[];
}

export interface GapRecommendation {
  program: ProgramSummary;
  factorCode: string;
  pointsOnAward: number;
  impactNote: string | null;
  peerAwards: { cityId: string; awardee: string; awardDate: Date }[];
}

// ─────────────────────────────────────────────────────────
// Program Queries
// ─────────────────────────────────────────────────────────

/**
 * Get all active federal programs.
 */
export async function getPrograms(): Promise<ProgramSummary[]> {
  const prisma = await getPrisma();
  const programs = await prisma.fpisProgram.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
  });
  return programs.map(mapProgramSummary);
}

/**
 * Get a program with full details including factor impacts, windows, and awards.
 */
export async function getProgramDetail(code: string): Promise<ProgramDetail | null> {
  const prisma = await getPrisma();
  const prog = await prisma.fpisProgram.findUnique({
    where: { code },
    include: {
      factorImpacts: { orderBy: { pointsOnAward: "desc" } },
      applicationWindows: { orderBy: { openDate: "desc" }, take: 5 },
      awards: { orderBy: { awardDate: "desc" }, take: 10 },
    },
  });
  if (!prog) return null;

  return {
    ...mapProgramSummary(prog),
    description: prog.description,
    eligibility: prog.eligibility,
    gapAnalysisRole: prog.gapAnalysisRole,
    factorImpacts: prog.factorImpacts.map((fi) => ({
      factorCode: fi.factorCode,
      pointsOnAward: fi.pointsOnAward,
      impactNote: fi.impactNote,
    })),
    openWindows: prog.applicationWindows.map((w) => ({
      fiscalYear: w.fiscalYear,
      openDate: w.openDate,
      closeDate: w.closeDate,
      status: w.status,
    })),
    recentAwards: prog.awards.map((a) => ({
      cityId: a.cityId,
      awardee: a.awardee,
      awardAmount: a.awardAmount ? Number(a.awardAmount) : null,
      awardDate: a.awardDate,
    })),
  };
}

function mapProgramSummary(prog: {
  id: string;
  code: string;
  name: string;
  agency: string;
  programType: string;
  awardRangeMin: unknown;
  awardRangeMax: unknown;
  cycle: string;
  isActive: boolean;
  sbirEligible: boolean;
}): ProgramSummary {
  return {
    id: prog.id,
    code: prog.code,
    name: prog.name,
    agency: prog.agency,
    programType: prog.programType,
    awardRangeMin: prog.awardRangeMin ? Number(prog.awardRangeMin) : null,
    awardRangeMax: prog.awardRangeMax ? Number(prog.awardRangeMax) : null,
    cycle: prog.cycle,
    isActive: prog.isActive,
    sbirEligible: prog.sbirEligible,
  };
}

// ─────────────────────────────────────────────────────────
// Gap Analysis Integration
// ─────────────────────────────────────────────────────────

/**
 * Find federal programs that can address a specific factor gap.
 * Returns programs with their point impact and peer city awards.
 *
 * This is the key Gap Analysis query: city + factor gap → matching programs.
 */
export async function getGapRecommendations(
  factorCode: string,
  peerCityIds?: string[],
): Promise<GapRecommendation[]> {
  const prisma = await getPrisma();

  // Find programs that impact this factor
  const impacts = await prisma.fpisProgramFactorImpact.findMany({
    where: { factorCode },
    include: { program: true },
    orderBy: { pointsOnAward: "desc" },
  });

  const results: GapRecommendation[] = [];

  for (const impact of impacts) {
    if (!impact.program.isActive) continue;

    // Find peer city awards for this program
    let peerAwards: { cityId: string; awardee: string; awardDate: Date }[] = [];
    if (peerCityIds && peerCityIds.length > 0) {
      const awards = await prisma.fpisProgramAward.findMany({
        where: {
          programId: impact.programId,
          cityId: { in: peerCityIds },
        },
        orderBy: { awardDate: "desc" },
        take: 5,
      });
      peerAwards = awards
        .filter((a) => a.cityId !== null)
        .map((a) => ({
          cityId: a.cityId!,
          awardee: a.awardee,
          awardDate: a.awardDate,
        }));
    }

    results.push({
      program: mapProgramSummary(impact.program),
      factorCode,
      pointsOnAward: impact.pointsOnAward,
      impactNote: impact.impactNote,
      peerAwards,
    });
  }

  return results;
}

// ─────────────────────────────────────────────────────────
// VDG Grant Tracker (Internal)
// ─────────────────────────────────────────────────────────

/**
 * Get VDG grant applications and their statuses.
 * Internal use only — not exposed in public API.
 */
export async function getVdgGrantStatus() {
  const prisma = await getPrisma();
  return prisma.fpisVdgGrantTracker.findMany({
    include: { program: { select: { code: true, name: true, agency: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Get upcoming application windows (OPEN or UPCOMING status).
 */
export async function getUpcomingWindows() {
  const prisma = await getPrisma();
  return prisma.fpisApplicationWindow.findMany({
    where: { status: { in: ["OPEN", "UPCOMING"] } },
    include: { program: { select: { code: true, name: true, agency: true } } },
    orderBy: { openDate: "asc" },
  });
}
