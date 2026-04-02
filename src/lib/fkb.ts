/**
 * FKB Runtime — Factor Knowledge Base query and update module.
 *
 * Reads factor scores, enriches with RPL evidence, and provides
 * functions to refresh scores from RPL document data.
 *
 * The key integration: RPL documents flow into FKB via factor mappings
 * and city associations. This module aggregates RPL evidence per
 * market/factor and updates FkbFactorScore.signalCount + confidence.
 */

import { createLogger } from "@/lib/logger";

const logger = createLogger("fkb");

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export interface FactorEvidence {
  factorCode: string;
  marketId: string;
  documentCount: number;
  primaryCount: number;
  highSignificance: number;
  mediumSignificance: number;
  positiveMomentum: number;
  negativeMomentum: number;
  latestDocDate: Date | null;
  latestDocTitle: string | null;
}

export interface FkbRefreshResult {
  factorsUpdated: number;
  confidenceUpgrades: number;
  confidenceDowngrades: number;
  totalSignals: number;
}

// ─────────────────────────────────────────────────────────
// Query RPL evidence per market/factor
// ─────────────────────────────────────────────────────────

/**
 * Aggregate RPL document evidence for a specific market and factor.
 * Joins RplDocument → RplDocumentFactorMapping → RplDocumentCityAssociation.
 */
export async function getFactorEvidence(
  marketId: string,
  factorCode: string,
): Promise<FactorEvidence> {
  const prisma = await getPrisma();

  const docs = await prisma.rplDocumentFactorMapping.findMany({
    where: { factorCode },
    include: {
      document: {
        include: {
          cityAssociations: { where: { cityId: marketId } },
        },
      },
    },
  });

  // Filter to documents that are active and associated with this market
  const relevant = docs.filter(
    (d) => d.document.isActive && d.document.cityAssociations.length > 0,
  );

  const primaryCount = relevant.filter((d) => d.mappingType === "PRIMARY").length;

  const highSig = relevant.filter((d) => d.document.significance === "HIGH").length;
  const medSig = relevant.filter((d) => d.document.significance === "MEDIUM").length;
  const posMom = relevant.filter((d) => d.document.momentumDirection === "POS").length;
  const negMom = relevant.filter((d) => d.document.momentumDirection === "NEG").length;

  // Find latest document
  let latestDocDate: Date | null = null;
  let latestDocTitle: string | null = null;
  if (relevant.length > 0) {
    const sorted = relevant.sort(
      (a, b) => b.document.publishedDate.getTime() - a.document.publishedDate.getTime(),
    );
    latestDocDate = sorted[0].document.publishedDate;
    latestDocTitle = sorted[0].document.shortTitle ?? sorted[0].document.title;
  }

  return {
    factorCode,
    marketId,
    documentCount: relevant.length,
    primaryCount,
    highSignificance: highSig,
    mediumSignificance: medSig,
    positiveMomentum: posMom,
    negativeMomentum: negMom,
    latestDocDate,
    latestDocTitle,
  };
}

/**
 * Get all RPL evidence for a market across all factors.
 */
export async function getAllFactorEvidence(
  marketId: string,
): Promise<FactorEvidence[]> {
  const codes = ["OPR", "LEG", "VRT", "REG", "PLT", "ZON", "WTH"];
  return Promise.all(codes.map((code) => getFactorEvidence(marketId, code)));
}

// ─────────────────────────────────────────────────────────
// Confidence assessment from RPL evidence
// ─────────────────────────────────────────────────────────

/**
 * Determine confidence level based on RPL document coverage.
 * More structured evidence = higher confidence.
 */
function assessConfidenceFromEvidence(
  evidence: FactorEvidence,
  currentConfidence: string,
): { confidence: string; reasons: { reason: string; impact: string }[] } {
  const reasons: { reason: string; impact: string }[] = [];

  // Document coverage
  if (evidence.documentCount === 0) {
    reasons.push({ reason: "No RPL documents for this factor/market", impact: "negative" });
  } else if (evidence.primaryCount >= 3) {
    reasons.push({ reason: `${evidence.primaryCount} primary RPL documents`, impact: "positive" });
  } else if (evidence.documentCount >= 1) {
    reasons.push({ reason: `${evidence.documentCount} RPL document(s)`, impact: "neutral" });
  }

  // Significance distribution
  if (evidence.highSignificance >= 2) {
    reasons.push({ reason: `${evidence.highSignificance} high-significance documents`, impact: "positive" });
  } else if (evidence.highSignificance >= 1) {
    reasons.push({ reason: "At least one high-significance document", impact: "neutral" });
  }

  // Momentum coherence (positive signals should outnumber negative)
  if (evidence.positiveMomentum > 0 && evidence.negativeMomentum === 0) {
    reasons.push({ reason: "Uniformly positive momentum", impact: "positive" });
  } else if (evidence.negativeMomentum > evidence.positiveMomentum) {
    reasons.push({ reason: "Negative momentum outweighs positive", impact: "negative" });
  }

  // Recency
  if (evidence.latestDocDate) {
    const daysSince = (Date.now() - evidence.latestDocDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince <= 90) {
      reasons.push({ reason: "Evidence within last 90 days", impact: "positive" });
    } else if (daysSince > 365) {
      reasons.push({ reason: "Most recent evidence over 1 year old", impact: "negative" });
    }
  }

  const positives = reasons.filter((r) => r.impact === "positive").length;
  const negatives = reasons.filter((r) => r.impact === "negative").length;

  let confidence: string;
  if (positives >= 2 && negatives === 0) {
    confidence = "HIGH";
  } else if (negatives >= 2) {
    confidence = "LOW";
  } else {
    confidence = "MEDIUM";
  }

  return { confidence, reasons };
}

// ─────────────────────────────────────────────────────────
// Refresh FKB scores from RPL evidence
// ─────────────────────────────────────────────────────────

/**
 * Update FkbFactorScore signal counts and confidence for a specific market
 * based on current RPL document evidence. Called after RPL writes.
 */
export async function refreshMarketScores(marketId: string): Promise<FkbRefreshResult> {
  const prisma = await getPrisma();
  const result: FkbRefreshResult = {
    factorsUpdated: 0,
    confidenceUpgrades: 0,
    confidenceDowngrades: 0,
    totalSignals: 0,
  };

  const evidenceList = await getAllFactorEvidence(marketId);

  // Look up factor IDs
  const factors = await prisma.fkbFactor.findMany({
    where: { retired: false },
    select: { id: true, code: true },
  });
  const factorMap = new Map(factors.map((f) => [f.code, f.id]));

  for (const evidence of evidenceList) {
    const factorId = factorMap.get(evidence.factorCode);
    if (!factorId) continue;

    result.totalSignals += evidence.documentCount;

    // Find existing FKB score
    const existing = await prisma.fkbFactorScore.findUnique({
      where: {
        factorId_marketId_methodologyVersion: {
          factorId,
          marketId,
          methodologyVersion: "v1.3",
        },
      },
    });

    if (!existing) continue;

    const { confidence: newConfidence, reasons } = assessConfidenceFromEvidence(
      evidence,
      existing.confidence,
    );

    // Track confidence changes
    const confidenceRank = { LOW: 0, MEDIUM: 1, HIGH: 2 };
    const oldRank = confidenceRank[existing.confidence as keyof typeof confidenceRank] ?? 1;
    const newRank = confidenceRank[newConfidence as keyof typeof confidenceRank] ?? 1;
    if (newRank > oldRank) result.confidenceUpgrades++;
    if (newRank < oldRank) result.confidenceDowngrades++;

    // Update if signal count or confidence changed
    if (existing.signalCount !== evidence.documentCount || existing.confidence !== newConfidence) {
      await prisma.fkbFactorScore.update({
        where: { id: existing.id },
        data: {
          signalCount: evidence.documentCount,
          confidence: newConfidence,
          confidenceReasons: reasons,
        },
      });
      result.factorsUpdated++;
    }
  }

  return result;
}

/**
 * Refresh FKB scores for ALL markets. Called by snapshot cron or manually.
 */
export async function refreshAllMarketScores(): Promise<FkbRefreshResult> {
  const prisma = await getPrisma();
  const markets = await prisma.market.findMany({ select: { id: true } });

  const totals: FkbRefreshResult = {
    factorsUpdated: 0,
    confidenceUpgrades: 0,
    confidenceDowngrades: 0,
    totalSignals: 0,
  };

  for (const market of markets) {
    const result = await refreshMarketScores(market.id);
    totals.factorsUpdated += result.factorsUpdated;
    totals.confidenceUpgrades += result.confidenceUpgrades;
    totals.confidenceDowngrades += result.confidenceDowngrades;
    totals.totalSignals += result.totalSignals;
  }

  logger.info(
    `FKB refresh: ${totals.factorsUpdated} factors updated, ` +
    `${totals.confidenceUpgrades} confidence upgrades, ` +
    `${totals.confidenceDowngrades} downgrades, ` +
    `${totals.totalSignals} total RPL signals`,
  );

  return totals;
}
