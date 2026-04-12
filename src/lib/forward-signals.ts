/**
 * Forward Signals — predictive intelligence layer.
 *
 * Aggregates predictive components from across the platform into a single
 * structured API that any report (One Market Monday, Pulse, gap analysis,
 * snapshot PDFs) can call to surface predictive language.
 *
 * Sources:
 *   - ClassificationResult (pipeline events with decision windows)
 *   - ScoringOverride (pending = latent predictions awaiting promotion)
 *   - MarketWatch (POSITIVE/NEGATIVE/DEVELOPING + IMPROVING/STABLE/DETERIORATING)
 *   - PreDevelopmentFacility (status pipeline with implicit timeline)
 *   - Score snapshots (velocity / momentum)
 *
 * Output: ForwardSignalReport with near-term (≤60d), medium-term (60-180d),
 * and long-term (>180d) signals, each with score impact, confidence, and
 * decision window.
 */

import type { ScoreBreakdown } from "@/types";
import { getPreDevFacilitiesForMarket } from "@/data/pre-development-facilities";
import { getCitiesWithOverrides } from "@/data/seed";
import { calculateReadinessScore, SCORE_WEIGHTS } from "@/lib/scoring";
import { createLogger } from "@/lib/logger";

const logger = createLogger("forward-signals");

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

// ─────────────────────────────────────────────────────────
// Event Type → Decision Window Map
// ─────────────────────────────────────────────────────────

/**
 * For each ClassificationResult.eventType, the typical resolution window
 * (in days from the classification date) and score impact characteristics.
 *
 * Sources for windows:
 *   - FAA corridor filings: 60-90 days based on standard aeronautical study cycle
 *   - State legislation introduced: ~120-180 days (depends on session)
 *   - Operator events: highly variable, no reliable window
 */
export interface EventTypeProfile {
  /** Days after classification when decision/follow-on typically arrives */
  windowMinDays: number | null;
  windowMaxDays: number | null;
  /** Whether the event itself triggers a score change, or only a future event will */
  isImmediateImpact: boolean;
  /** Score factor most likely affected */
  factor: keyof ScoreBreakdown | null;
  /** Typical score impact if event materializes */
  typicalPointImpact: number;
  /** Direction of impact */
  direction: "positive" | "negative" | "neutral";
  /** Human label for the decision window */
  windowLabel: string;
  description: string;
}

export const EVENT_TYPE_PROFILES: Record<string, EventTypeProfile> = {
  faa_corridor_filing: {
    windowMinDays: 60,
    windowMaxDays: 90,
    isImmediateImpact: false,
    factor: "approvedVertiport",
    typicalPointImpact: 0, // validation event — confirms existing score
    direction: "neutral",
    windowLabel: "60-90 days from filing",
    description: "FAA aeronautical study cycle for corridor or facility determination",
  },
  state_legislation_signed: {
    windowMinDays: 0,
    windowMaxDays: 0,
    isImmediateImpact: true,
    factor: "stateLegislation",
    typicalPointImpact: 20,
    direction: "positive",
    windowLabel: "immediate",
    description: "Bill enacted into law — score impact realized at signing",
  },
  state_legislation_failed: {
    windowMinDays: 0,
    windowMaxDays: 0,
    isImmediateImpact: true,
    factor: "stateLegislation",
    typicalPointImpact: 10,
    direction: "negative",
    windowLabel: "immediate",
    description: "Bill failed in committee or floor vote — partial credit removed",
  },
  state_legislation_introduced: {
    windowMinDays: 30,
    windowMaxDays: 180,
    isImmediateImpact: false,
    factor: "stateLegislation",
    typicalPointImpact: 10,
    direction: "positive",
    windowLabel: "current legislative session",
    description: "Bill introduced — outcome depends on session calendar",
  },
  vertiport_zoning_approved: {
    windowMinDays: 0,
    windowMaxDays: 0,
    isImmediateImpact: true,
    factor: "vertiportZoning",
    typicalPointImpact: 15,
    direction: "positive",
    windowLabel: "immediate",
    description: "Local vertiport zoning ordinance adopted",
  },
  operator_market_expansion: {
    windowMinDays: 30,
    windowMaxDays: 180,
    isImmediateImpact: false,
    factor: "activeOperatorPresence",
    typicalPointImpact: 5,
    direction: "positive",
    windowLabel: "30-180 days for operational follow-up",
    description: "Operator announcement — follow-on operational events typically follow",
  },
  regulatory_posture_change: {
    windowMinDays: 30,
    windowMaxDays: 90,
    isImmediateImpact: false,
    factor: "regulatoryPosture",
    typicalPointImpact: 5,
    direction: "positive",
    windowLabel: "30-90 days",
    description: "Regulatory posture shift — typically follows executive order or task force",
  },
  pilot_program_launched: {
    windowMinDays: 0,
    windowMaxDays: 30,
    isImmediateImpact: false,
    factor: "activePilotProgram",
    typicalPointImpact: 15,
    direction: "positive",
    windowLabel: "30 days for formalization",
    description: "Pilot program announced — formal launch typically within 30 days",
  },
};

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export type ForwardSignalSource =
  | "pending_classification"
  | "awaiting_decision"
  | "pipeline_event"
  | "facility_milestone"
  | "watch_trajectory";

export type ForwardSignalCategory = "regulatory" | "operator" | "infrastructure" | "weather";

export interface ForwardSignal {
  id: string;
  type: ForwardSignalSource;
  category: ForwardSignalCategory;
  /** Plain-English description of what's predicted */
  description: string;
  /** Decision window — when this signal is expected to resolve */
  windowLabel: string;
  /** Earliest expected resolution date, if computable */
  earliestDate: Date | null;
  /** Latest expected resolution date, if computable */
  latestDate: Date | null;
  /** Confidence in this prediction */
  confidence: "high" | "medium" | "low";
  confidenceReason: string;
  /** Score impact if realized */
  scoreImpact: {
    factor: keyof ScoreBreakdown | null;
    pointsIfRealized: number;
    direction: "positive" | "negative" | "neutral";
  };
  /** Provenance */
  sourceRecordId?: string;
  sourceUrl?: string;
  classifiedAt?: Date;
}

export interface ForwardSignalReport {
  cityId: string;
  generatedAt: Date;
  marketWatch: { status: string; outlook: string; setAt: Date } | null;
  signals: ForwardSignal[];
  /** Signals expected to resolve within 60 days */
  near: ForwardSignal[];
  /** Signals expected 60-180 days */
  medium: ForwardSignal[];
  /** Signals >180 days or with unknown timing */
  long: ForwardSignal[];
  /** Aggregate predicted score change in next 30 days (sum of high-confidence signals) */
  expectedScoreChange30d: { delta: number; confidence: "high" | "medium" | "low" } | null;
  /** Signal velocity context */
  velocity: {
    signalsLast30d: number;
    signalsLast90d: number;
    rankNational: number | null;
    accelerating: boolean;
  };
}

// ─────────────────────────────────────────────────────────
// Builders
// ─────────────────────────────────────────────────────────

function classifySignalCategory(eventType: string): ForwardSignalCategory {
  if (eventType.startsWith("state_legislation") || eventType.includes("regulatory")) return "regulatory";
  if (eventType.startsWith("operator") || eventType.includes("pilot_program")) return "operator";
  if (eventType.includes("vertiport") || eventType.includes("corridor") || eventType.includes("faa")) return "infrastructure";
  if (eventType.includes("weather")) return "weather";
  return "infrastructure";
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function bucketize(signal: ForwardSignal): "near" | "medium" | "long" {
  // Bucket by EARLIEST expected resolution — when the signal could first land
  const dateForBucketing = signal.earliestDate ?? signal.latestDate;
  if (!dateForBucketing) return "long";
  const daysOut = Math.floor((dateForBucketing.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (daysOut < 0) return "near"; // overdue → urgent near-term
  if (daysOut <= 60) return "near";
  if (daysOut <= 180) return "medium";
  return "long";
}

// ─────────────────────────────────────────────────────────
// Main API
// ─────────────────────────────────────────────────────────

/**
 * Log forward signals as PredictionRecord entries. Idempotent on (cityId, signalId).
 * Each call upserts predictions so the scorecard reflects current state.
 *
 * Called optionally by report generators when they want predictions tracked.
 */
export async function logPredictions(
  cityId: string,
  report: ForwardSignalReport,
  reportContext: string,
): Promise<void> {
  const prisma = await getPrisma();
  for (const s of report.signals) {
    try {
      await prisma.predictionRecord.upsert({
        where: { id: `${cityId}_${s.id}` },
        create: {
          id: `${cityId}_${s.id}`,
          cityId,
          signalId: s.id,
          signalType: s.type,
          category: s.category,
          description: s.description,
          predictedFactor: s.scoreImpact.factor,
          predictedDelta: s.scoreImpact.pointsIfRealized,
          predictedDirection: s.scoreImpact.direction,
          confidence: s.confidence,
          earliestExpected: s.earliestDate,
          latestExpected: s.latestDate,
          windowLabel: s.windowLabel,
          sourceRecordId: s.sourceRecordId,
          sourceUrl: s.sourceUrl,
          reportContext,
        },
        update: {
          // Refresh prediction details if signal still active (not validated/invalidated)
          description: s.description,
          confidence: s.confidence,
          earliestExpected: s.earliestDate,
          latestExpected: s.latestDate,
          windowLabel: s.windowLabel,
        },
      });
    } catch (err) {
      logger.error("Failed to log prediction", { cityId, signalId: s.id, err });
    }
  }
}

/**
 * Get the forward signal report for a market.
 * Aggregates from classifier, overrides, market watch, and facility tracker.
 */
export async function getForwardSignals(cityId: string): Promise<ForwardSignalReport> {
  const prisma = await getPrisma();
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Fetch city's current breakdown so we can check whether a factor already
  // has full credit (in which case future events on that factor are validation
  // only, not score-moving).
  const allCities = await getCitiesWithOverrides();
  const city = allCities.find((c) => c.id === cityId);
  const breakdown = city ? calculateReadinessScore(city).breakdown : null;
  const hasFullCredit = (factor: keyof ScoreBreakdown | null): boolean => {
    if (!factor || !breakdown) return false;
    return breakdown[factor] >= SCORE_WEIGHTS[factor];
  };

  // ── 1. Recent high/medium-confidence classifications with future decision windows ──
  const recentClassifications = await prisma.classificationResult.findMany({
    where: {
      affectedCities: { has: cityId },
      createdAt: { gte: ninetyDaysAgo },
      confidence: { in: ["high", "medium"] },
    },
    orderBy: { createdAt: "desc" },
  });

  const signals: ForwardSignal[] = [];

  // Group classifications by event type, then keep most recent + summarize counts
  const byEventType = new Map<string, typeof recentClassifications>();
  for (const c of recentClassifications) {
    const profile = EVENT_TYPE_PROFILES[c.eventType];
    if (!profile) continue;
    if (profile.isImmediateImpact) continue; // already realized — not forward-looking
    const list = byEventType.get(c.eventType) ?? [];
    list.push(c);
    byEventType.set(c.eventType, list);
  }

  for (const [eventType, classifications] of byEventType.entries()) {
    const profile = EVENT_TYPE_PROFILES[eventType]!;
    // Use the most recent classification as the timing anchor
    const mostRecent = classifications[0];
    const count = classifications.length;
    const highCount = classifications.filter((c) => c.confidence === "high").length;

    const earliestDate = profile.windowMinDays !== null
      ? addDays(mostRecent.createdAt, profile.windowMinDays)
      : null;
    const latestDate = profile.windowMaxDays !== null
      ? addDays(mostRecent.createdAt, profile.windowMaxDays)
      : null;

    const description = count > 1
      ? `${count} ${eventType.replace(/_/g, " ")} events tracked (${highCount} high confidence). ${profile.description}.`
      : `${eventType.replace(/_/g, " ")} — ${profile.description}`;

    // Confidence rolls up to highest available
    const aggConfidence: "high" | "medium" | "low" = highCount > 0
      ? "high"
      : classifications.some((c) => c.confidence === "medium") ? "medium" : "low";

    // City-context: if this market already has full credit on the affected
    // factor, the event would be a validation event (no score change).
    const alreadyMaxed = hasFullCredit(profile.factor);
    const effectivePoints = alreadyMaxed ? 0 : profile.typicalPointImpact;
    const effectiveDirection = alreadyMaxed ? "neutral" : profile.direction;
    const validationNote = alreadyMaxed
      ? ` Validation event only — ${cityId} already has full credit on ${profile.factor}.`
      : "";

    signals.push({
      id: `cls_${eventType}`,
      type: "awaiting_decision",
      category: classifySignalCategory(eventType),
      description: description + validationNote,
      windowLabel: profile.windowLabel,
      earliestDate,
      latestDate,
      confidence: aggConfidence,
      confidenceReason: count > 1
        ? `${count} events classified in last 90d, most recent ${mostRecent.createdAt.toISOString().slice(0, 10)}`
        : `Classified ${mostRecent.confidence} confidence on ${mostRecent.createdAt.toISOString().slice(0, 10)}`,
      scoreImpact: {
        factor: profile.factor,
        pointsIfRealized: effectivePoints,
        direction: effectiveDirection,
      },
      sourceRecordId: mostRecent.recordId,
      classifiedAt: mostRecent.createdAt,
    });
  }

  // ── 2. Pending overrides (classifier said something but it hasn't been promoted) ──
  const pendingOverrides = await prisma.scoringOverride.findMany({
    where: {
      cityId,
      appliedAt: null,
      supersededAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  for (const o of pendingOverrides) {
    signals.push({
      id: `pend_${o.id}`,
      type: "pending_classification",
      category: "regulatory", // most pending overrides are regulatory; refine later
      description: `Pending data point: ${o.field} = ${JSON.stringify(o.value)} (awaiting verification)`,
      windowLabel: "awaiting analyst review",
      earliestDate: null,
      latestDate: null,
      confidence: o.confidence as "high" | "medium" | "low",
      confidenceReason: `Classifier output not yet promoted — ${o.confidence} confidence`,
      scoreImpact: {
        factor: null,
        pointsIfRealized: 0,
        direction: "neutral",
      },
      sourceRecordId: o.sourceRecordId ?? undefined,
    });
  }

  // ── 3. Pre-development facility milestones ──
  const facilities = getPreDevFacilitiesForMarket(cityId);
  for (const f of facilities) {
    if (f.status === "faa_registered") continue; // graduated

    let windowLabel: string;
    let earliestDate: Date | null = null;
    let latestDate: Date | null = null;
    let confidence: "high" | "medium" | "low" = "medium";

    if (f.status === "occupancy_pending" && f.expectedOperationalDate) {
      windowLabel = `expected operational ${f.expectedOperationalDate}`;
      // Parse "2026" or "2026-Q3" etc — best effort
      if (/^\d{4}$/.test(f.expectedOperationalDate)) {
        latestDate = new Date(`${f.expectedOperationalDate}-12-31`);
        earliestDate = new Date(`${f.expectedOperationalDate}-06-01`);
      }
      confidence = "high";
    } else if (f.status === "under_construction" && f.expectedOperationalDate) {
      windowLabel = `under construction; operational target ${f.expectedOperationalDate}`;
      if (/^\d{4}-\d{2}$/.test(f.expectedOperationalDate)) {
        latestDate = new Date(`${f.expectedOperationalDate}-28`);
      }
      confidence = "high";
    } else if (f.status === "permitting") {
      windowLabel = "permits in process — typical 4-6 months";
      confidence = "medium";
    } else if (f.status === "announced") {
      windowLabel = "announced; no firm timeline";
      confidence = "low";
    } else {
      windowLabel = "status unknown";
      confidence = "low";
    }

    signals.push({
      id: `fac_${f.id}`,
      type: "facility_milestone",
      category: "infrastructure",
      description: `${f.name} (${f.status.replace(/_/g, " ")}) — ${f.developer}`,
      windowLabel,
      earliestDate,
      latestDate,
      confidence,
      confidenceReason: f.status === "occupancy_pending"
        ? "Facility built; awaiting final permits"
        : f.status === "under_construction"
        ? "Construction active; operational target on record"
        : f.status === "announced"
        ? "Public announcement only — no permit filings on record"
        : "Status uncertain",
      scoreImpact: {
        factor: "approvedVertiport",
        pointsIfRealized: 0, // most pre-dev facilities don't change score (already credited)
        direction: "neutral",
      },
      sourceUrl: f.primarySourceUrl,
    });
  }

  // ── 4. MarketWatch trajectory ──
  const watch = await prisma.marketWatch.findFirst({ where: { cityId } });
  if (watch && watch.outlook !== "STABLE") {
    signals.push({
      id: `watch_${watch.id}`,
      type: "watch_trajectory",
      category: "infrastructure",
      description: watch.watchStatus === "POSITIVE_WATCH"
        ? "Market shows positive momentum across recent signals; watch flagged improving"
        : watch.watchStatus === "NEGATIVE_WATCH"
        ? "Market shows negative momentum; watch flagged deteriorating"
        : "Market under active development",
      windowLabel: "next 90 days",
      earliestDate: null,
      latestDate: addDays(watch.publishedAt ?? now, 90),
      confidence: "medium",
      confidenceReason: "MarketWatch outlook based on 30-day signal aggregation; track record limited (system deployed Apr 2026)",
      scoreImpact: {
        factor: null,
        pointsIfRealized: 0,
        direction: watch.outlook === "IMPROVING" ? "positive" : watch.outlook === "DETERIORATING" ? "negative" : "neutral",
      },
    });
  }

  // ── 5. Velocity context ──
  const all30dEvents = await prisma.classificationResult.count({
    where: {
      affectedCities: { has: cityId },
      createdAt: { gte: thirtyDaysAgo },
    },
  });
  const all90dEvents = await prisma.classificationResult.count({
    where: {
      affectedCities: { has: cityId },
      createdAt: { gte: ninetyDaysAgo },
    },
  });
  // Acceleration: > 1/3 of 90d events in last 30d → recent activity is concentrated
  const accelerating = all30dEvents > all90dEvents / 3;

  // National rank (simplistic: count cities with more 30d events)
  const allEvents30d = await prisma.classificationResult.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: { affectedCities: true },
  });
  const cityCount: Record<string, number> = {};
  allEvents30d.forEach((c) => {
    c.affectedCities.forEach((cid) => {
      if (cid !== "__unresolved__") cityCount[cid] = (cityCount[cid] || 0) + 1;
    });
  });
  const ranked = Object.entries(cityCount).sort((a, b) => b[1] - a[1]);
  const rank = ranked.findIndex(([cid]) => cid === cityId) + 1;

  // ── 6. Aggregate expected score change (high-confidence near-term only) ──
  const nearHighConfidence = signals.filter(
    (s) => s.confidence === "high" && bucketize(s) === "near" && s.scoreImpact.direction !== "neutral",
  );
  const expectedDelta = nearHighConfidence.reduce((sum, s) => {
    const sign = s.scoreImpact.direction === "positive" ? 1 : -1;
    return sum + sign * s.scoreImpact.pointsIfRealized;
  }, 0);

  // ── 7. Bucket and assemble ──
  const near = signals.filter((s) => bucketize(s) === "near");
  const medium = signals.filter((s) => bucketize(s) === "medium");
  const long = signals.filter((s) => bucketize(s) === "long");

  return {
    cityId,
    generatedAt: now,
    marketWatch: watch
      ? { status: watch.watchStatus, outlook: watch.outlook, setAt: watch.publishedAt ?? watch.createdAt }
      : null,
    signals,
    near,
    medium,
    long,
    expectedScoreChange30d: nearHighConfidence.length > 0
      ? {
          delta: expectedDelta,
          confidence: nearHighConfidence.every((s) => s.confidence === "high") ? "high" : "medium",
        }
      : null,
    velocity: {
      signalsLast30d: all30dEvents,
      signalsLast90d: all90dEvents,
      rankNational: rank > 0 ? rank : null,
      accelerating,
    },
  };
}

// ─────────────────────────────────────────────────────────
// Helpers for report rendering
// ─────────────────────────────────────────────────────────

/**
 * Render a forward signal as a single-sentence narrative line.
 * Used to generate predictive language in reports.
 */
export function renderSignalNarrative(signal: ForwardSignal): string {
  const impact = signal.scoreImpact.pointsIfRealized > 0
    ? ` (${signal.scoreImpact.direction === "positive" ? "+" : "-"}${signal.scoreImpact.pointsIfRealized} points if realized)`
    : "";
  return `${signal.description} — ${signal.windowLabel}${impact}`;
}

/**
 * Get a one-sentence forecast summary for a market.
 * Used as the closing predictive line in reports.
 */
export function getForecastSummary(report: ForwardSignalReport): string {
  const nearCount = report.near.length;
  const watchPhrase = report.marketWatch
    ? `${report.marketWatch.status.replace("_", " ").toLowerCase()} / ${report.marketWatch.outlook.toLowerCase()}`
    : "stable";

  if (report.expectedScoreChange30d && report.expectedScoreChange30d.delta !== 0) {
    const sign = report.expectedScoreChange30d.delta > 0 ? "+" : "";
    return `Platform forecast: expected score change of ${sign}${report.expectedScoreChange30d.delta} points within 30 days (${report.expectedScoreChange30d.confidence} confidence). MarketWatch: ${watchPhrase}. ${nearCount} near-term signal${nearCount === 1 ? "" : "s"} tracked.`;
  }

  if (nearCount === 0 && report.medium.length === 0 && report.long.length === 0) {
    return `Platform forecast: no forward signals tracked for this market.`;
  }

  if (nearCount === 0) {
    return `Platform forecast: no score change expected in the next 30 days. MarketWatch: ${watchPhrase}. ${report.medium.length} medium-term signal${report.medium.length === 1 ? "" : "s"} (60-180 days) pending resolution.`;
  }

  return `Platform forecast: ${nearCount} near-term signal${nearCount === 1 ? "" : "s"} expected to resolve within 60 days. MarketWatch: ${watchPhrase}. No high-confidence score change predicted in the next 30 days.`;
}
