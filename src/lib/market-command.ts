/**
 * Market Command — client-side utilities for deriving constraint/trigger
 * from City breakdown data. No API calls needed.
 */
import type { City, ScoreBreakdown } from "@/types";
import { SCORE_WEIGHTS } from "@/lib/scoring";

const FACTOR_LABELS: Record<keyof ScoreBreakdown, string> = {
  stateLegislation: "No enacted AAM legislation",
  activePilotProgram: "No active pilot program",
  approvedVertiport: "No approved vertiport",
  activeOperatorPresence: "No operator presence",
  vertiportZoning: "No vertiport zoning",
  regulatoryPosture: "Restrictive regulatory posture",
  weatherInfrastructure: "No weather infrastructure",
};

const FACTOR_PARTIAL_LABELS: Record<string, string> = {
  regulatoryPosture: "Neutral regulatory posture",
  stateLegislation: "Legislation moving, not enacted",
  weatherInfrastructure: "Partial weather coverage",
};

const TRIGGER_LABELS: Record<keyof ScoreBreakdown, string> = {
  stateLegislation: "Legislation enacted",
  activePilotProgram: "Pilot program launched",
  approvedVertiport: "Vertiport approved",
  activeOperatorPresence: "Operator commits",
  vertiportZoning: "Zoning adopted",
  regulatoryPosture: "Posture shifts friendly",
  weatherInfrastructure: "Weather sensing deployed",
};

export interface MarketConstraint {
  factor: keyof ScoreBreakdown;
  label: string;
  gap: number; // points missing
  weight: number; // max points
}

export interface MarketTrigger {
  factor: keyof ScoreBreakdown;
  label: string;
  potentialGain: number;
}

/**
 * Returns the primary constraint — the highest-weight factor with the biggest gap.
 */
export function getPrimaryConstraint(city: City): MarketConstraint | null {
  const breakdown = city.breakdown;
  if (!breakdown) return null;

  const factors = Object.entries(SCORE_WEIGHTS) as [keyof ScoreBreakdown, number][];

  let worst: MarketConstraint | null = null;

  for (const [key, max] of factors) {
    const earned = breakdown[key] ?? 0;
    const gap = max - earned;
    if (gap <= 0) continue;

    // Pick highest gap, break ties by weight
    if (!worst || gap > worst.gap || (gap === worst.gap && max > worst.weight)) {
      const isPartial = earned > 0 && earned < max;
      const label = isPartial
        ? (FACTOR_PARTIAL_LABELS[key] ?? FACTOR_LABELS[key])
        : FACTOR_LABELS[key];
      worst = { factor: key, label, gap, weight: max };
    }
  }

  return worst;
}

/**
 * Returns the next likely trigger — the easiest factor to move (smallest gap, highest impact).
 */
export function getNextTrigger(city: City): MarketTrigger | null {
  const breakdown = city.breakdown;
  if (!breakdown) return null;

  const factors = Object.entries(SCORE_WEIGHTS) as [keyof ScoreBreakdown, number][];

  // Find factors with gaps, sorted by potential gain desc then gap asc (most moveable)
  const gaps = factors
    .map(([key, max]) => ({
      key,
      max,
      earned: breakdown[key] ?? 0,
      gap: max - (breakdown[key] ?? 0),
    }))
    .filter((f) => f.gap > 0)
    .sort((a, b) => {
      // Prefer highest potential gain
      if (b.gap !== a.gap) return b.gap - a.gap;
      // Then prefer binary factors (one action = full points)
      const aBinary = a.max === a.gap ? 1 : 0;
      const bBinary = b.max === b.gap ? 1 : 0;
      return bBinary - aBinary;
    });

  if (gaps.length === 0) return null;

  const top = gaps[0];
  return {
    factor: top.key,
    label: TRIGGER_LABELS[top.key],
    potentialGain: top.gap,
  };
}

/**
 * Short constraint string for city card (e.g., "No legislation · +20 pts available")
 */
export function getConstraintLine(city: City): string | null {
  const c = getPrimaryConstraint(city);
  if (!c) return null;
  return `${c.label} · +${c.gap} pts`;
}
