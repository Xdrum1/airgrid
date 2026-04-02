/**
 * MCS Runtime — Market Context Store query module.
 *
 * Provides state context, regional clusters, and peer group
 * lookups for Gap Analysis and market comparison features.
 */

import { createLogger } from "@/lib/logger";

const logger = createLogger("mcs");

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

// ─────────────────────────────────────────────────────────
// State Context
// ─────────────────────────────────────────────────────────

export interface StateContext {
  stateCode: string;
  stateName: string;
  legislationStatus: string;
  enforcementPosture: string;
  enforcementNote: string | null;
  dotAamEngagement: string;
  dotAamNote: string | null;
  aamOfficeEstablished: boolean;
  keyLegislation: string | null;
}

/**
 * Get state-level AAM context for a given state code.
 */
export async function getStateContext(stateCode: string): Promise<StateContext | null> {
  const prisma = await getPrisma();
  const ctx = await prisma.mcsStateContext.findUnique({
    where: { stateCode: stateCode.toUpperCase() },
  });
  if (!ctx) return null;
  return {
    stateCode: ctx.stateCode,
    stateName: ctx.stateName,
    legislationStatus: ctx.legislationStatus,
    enforcementPosture: ctx.enforcementPosture,
    enforcementNote: ctx.enforcementNote,
    dotAamEngagement: ctx.dotAamEngagement,
    dotAamNote: ctx.dotAamNote,
    aamOfficeEstablished: ctx.aamOfficeEstablished,
    keyLegislation: ctx.keyLegislation,
  };
}

/**
 * Get all state contexts, ordered by legislation status.
 */
export async function getAllStateContexts(): Promise<StateContext[]> {
  const prisma = await getPrisma();
  const states = await prisma.mcsStateContext.findMany({
    orderBy: { stateCode: "asc" },
  });
  return states.map((s) => ({
    stateCode: s.stateCode,
    stateName: s.stateName,
    legislationStatus: s.legislationStatus,
    enforcementPosture: s.enforcementPosture,
    enforcementNote: s.enforcementNote,
    dotAamEngagement: s.dotAamEngagement,
    dotAamNote: s.dotAamNote,
    aamOfficeEstablished: s.aamOfficeEstablished,
    keyLegislation: s.keyLegislation,
  }));
}

// ─────────────────────────────────────────────────────────
// Regional Clusters
// ─────────────────────────────────────────────────────────

export interface RegionalCluster {
  id: string;
  name: string;
  description: string | null;
  marketIds: string[];
  corridorRelevance: string | null;
}

/**
 * Get all regional clusters, or filter to those containing a specific market.
 */
export async function getRegionalClusters(marketId?: string): Promise<RegionalCluster[]> {
  const prisma = await getPrisma();
  const clusters = await prisma.mcsRegionalCluster.findMany({
    orderBy: { name: "asc" },
  });

  const result = clusters.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    marketIds: c.marketIds,
    corridorRelevance: c.corridorRelevance,
  }));

  if (marketId) {
    return result.filter((c) => c.marketIds.includes(marketId));
  }
  return result;
}

// ─────────────────────────────────────────────────────────
// Peer Groups
// ─────────────────────────────────────────────────────────

export interface PeerGroup {
  marketId: string;
  peerMarketIds: string[];
  groupingBasis: string;
  notes: string | null;
}

/**
 * Get peer groups for a specific market. Returns groups by all bases
 * (SAME_TIER, SAME_STATE, SIMILAR_PROFILE, REGIONAL).
 */
export async function getPeerGroups(marketId: string): Promise<PeerGroup[]> {
  const prisma = await getPrisma();
  const groups = await prisma.mcsPeerGroup.findMany({
    where: { marketId },
    orderBy: { groupingBasis: "asc" },
  });
  return groups.map((g) => ({
    marketId: g.marketId,
    peerMarketIds: g.peerMarketIds,
    groupingBasis: g.groupingBasis,
    notes: g.notes,
  }));
}

/**
 * Get peer market IDs for a specific grouping basis.
 */
export async function getPeerMarketIds(
  marketId: string,
  basis: "SAME_TIER" | "SAME_STATE" | "SIMILAR_PROFILE" | "REGIONAL",
): Promise<string[]> {
  const prisma = await getPrisma();
  const group = await prisma.mcsPeerGroup.findUnique({
    where: { marketId_groupingBasis: { marketId, groupingBasis: basis } },
  });
  return group?.peerMarketIds ?? [];
}
