/**
 * OID Runtime — Operator Intelligence Database query module.
 *
 * Provides operator profiles, market presence, deployment stages,
 * certifications, financing, and vertiport commitments.
 * Feeds OPR factor scoring and operator detail pages.
 */

import { createLogger } from "@/lib/logger";

const logger = createLogger("oid");

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export interface OperatorProfile {
  id: string;
  name: string;
  shortName: string;
  ticker: string | null;
  entityType: string;
  vehicleType: string | null;
  hqCity: string | null;
  hqCountry: string;
  foundedYear: number | null;
  website: string | null;
  isActive: boolean;
  inactiveReason: string | null;
  acquiredBy: string | null;
}

export interface MarketPresence {
  operatorId: string;
  operatorName: string;
  cityId: string;
  deploymentStage: string;
  stageScore: number;
  confidence: string;
  routeAnnounced: boolean;
  vertiportCommitted: boolean;
  lastSignalAt: Date | null;
}

export interface OperatorEvent {
  id: string;
  operatorId: string;
  cityId: string | null;
  eventType: string;
  eventDate: Date;
  headline: string;
  sourceName: string;
  sourceUrl: string | null;
  isVerified: boolean;
}

// ─────────────────────────────────────────────────────────
// Operator Queries
// ─────────────────────────────────────────────────────────

/**
 * Get all active operators, ordered by name.
 */
export async function getOperators(includeInactive = false): Promise<OperatorProfile[]> {
  const prisma = await getPrisma();
  const operators = await prisma.oidOperator.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { shortName: "asc" },
  });
  return operators.map(mapOperator);
}

/**
 * Get a single operator by ID.
 */
export async function getOperatorById(id: string): Promise<OperatorProfile | null> {
  const prisma = await getPrisma();
  const op = await prisma.oidOperator.findUnique({ where: { id } });
  return op ? mapOperator(op) : null;
}

function mapOperator(op: {
  id: string;
  name: string;
  shortName: string;
  ticker: string | null;
  entityType: string;
  vehicleType: string | null;
  hqCity: string | null;
  hqCountry: string;
  foundedYear: number | null;
  website: string | null;
  isActive: boolean;
  inactiveReason: string | null;
  acquiredBy: string | null;
}): OperatorProfile {
  return {
    id: op.id,
    name: op.name,
    shortName: op.shortName,
    ticker: op.ticker,
    entityType: op.entityType,
    vehicleType: op.vehicleType,
    hqCity: op.hqCity,
    hqCountry: op.hqCountry,
    foundedYear: op.foundedYear,
    website: op.website,
    isActive: op.isActive,
    inactiveReason: op.inactiveReason,
    acquiredBy: op.acquiredBy,
  };
}

// ─────────────────────────────────────────────────────────
// Market Presence
// ─────────────────────────────────────────────────────────

/**
 * Get all operator presences for a given market.
 * Returns operators sorted by stage score (highest deployment stage first).
 */
export async function getMarketPresence(cityId: string): Promise<MarketPresence[]> {
  const prisma = await getPrisma();
  const presences = await prisma.oidOperatorMarketPresence.findMany({
    where: { cityId, isActive: true },
    include: { operator: { select: { shortName: true } } },
    orderBy: { stageScore: "desc" },
  });
  return presences.map((p) => ({
    operatorId: p.operatorId,
    operatorName: p.operator.shortName,
    cityId: p.cityId,
    deploymentStage: p.deploymentStage,
    stageScore: p.stageScore,
    confidence: p.confidence,
    routeAnnounced: p.routeAnnounced,
    vertiportCommitted: p.vertiportCommitted,
    lastSignalAt: p.lastSignalAt,
  }));
}

/**
 * Compute OPR factor score for a market using OID data.
 * Top-3 operators' stage scores averaged, capped at 20.
 */
export async function computeOprScore(cityId: string): Promise<{
  score: number;
  operatorCount: number;
  topStage: string | null;
}> {
  const presences = await getMarketPresence(cityId);
  if (presences.length === 0) {
    return { score: 0, operatorCount: 0, topStage: null };
  }

  // Top 3 by stage score
  const top3 = presences.slice(0, 3);
  const avgScore = top3.reduce((sum, p) => sum + p.stageScore, 0) / top3.length;
  // Cap at 20 (OPR max weight)
  const score = Math.min(20, Math.round(avgScore));

  return {
    score,
    operatorCount: presences.length,
    topStage: presences[0].deploymentStage,
  };
}

// ─────────────────────────────────────────────────────────
// Events
// ─────────────────────────────────────────────────────────

/**
 * Get recent operator events for a market or operator.
 */
export async function getOperatorEvents(opts: {
  operatorId?: string;
  cityId?: string;
  limit?: number;
}): Promise<OperatorEvent[]> {
  const prisma = await getPrisma();
  const events = await prisma.oidOperatorEvent.findMany({
    where: {
      ...(opts.operatorId && { operatorId: opts.operatorId }),
      ...(opts.cityId && { cityId: opts.cityId }),
    },
    orderBy: { eventDate: "desc" },
    take: opts.limit ?? 20,
  });
  return events.map((e) => ({
    id: e.id,
    operatorId: e.operatorId,
    cityId: e.cityId,
    eventType: e.eventType,
    eventDate: e.eventDate,
    headline: e.headline,
    sourceName: e.sourceName,
    sourceUrl: e.sourceUrl,
    isVerified: e.isVerified,
  }));
}

// ─────────────────────────────────────────────────────────
// Certifications & Financing
// ─────────────────────────────────────────────────────────

/**
 * Get certifications for an operator.
 */
export async function getOperatorCertifications(operatorId: string) {
  const prisma = await getPrisma();
  return prisma.oidOperatorCertification.findMany({
    where: { operatorId, isActive: true },
    orderBy: { issuedDate: "desc" },
  });
}

/**
 * Get financing history for an operator.
 */
export async function getOperatorFinancing(operatorId: string) {
  const prisma = await getPrisma();
  return prisma.oidOperatorFinancing.findMany({
    where: { operatorId },
    orderBy: { announcedDate: "desc" },
  });
}

/**
 * Get vertiport commitments for a market.
 */
export async function getVertiportCommitments(cityId: string) {
  const prisma = await getPrisma();
  return prisma.oidVertiportCommitment.findMany({
    where: { cityId, isActive: true },
    include: { operator: { select: { shortName: true } } },
    orderBy: { announcedDate: "desc" },
  });
}
