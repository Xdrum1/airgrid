/**
 * Causal narrative — the "why" and "so what" for a market's score.
 *
 * Threads together live scoring breakdown, forward signals, market watch,
 * and recent score history into a structured answer:
 *   - What's pulling the score down (weakest factor vs its max weight)
 *   - What's most moveable in the near term (highest realistic point gain)
 *   - What to watch (near-term forward signals with decision windows)
 *   - What just happened (most recent score movement)
 *
 * Server-side. Pro-gated at the API layer.
 */
import type { City, ScoreBreakdown } from "@/types";
import { calculateReadinessScoreFromFkb, SCORE_WEIGHTS } from "@/lib/scoring";
import { getForwardSignals } from "@/lib/forward-signals";
import { createLogger } from "@/lib/logger";

const logger = createLogger("causal-narrative");

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

// Human-readable labels for ScoreBreakdown keys. Kept local so the narrative
// can use "State Legislation" without depending on UI label resolution.
const FACTOR_LABEL: Record<keyof ScoreBreakdown, string> = {
  activePilotProgram: "Active Pilot Program",
  approvedVertiport: "Approved Vertiport",
  activeOperatorPresence: "Active Operator Presence",
  vertiportZoning: "Vertiport Zoning",
  regulatoryPosture: "Regulatory Posture",
  stateLegislation: "State Legislation",
  weatherInfrastructure: "Weather Intelligence Coverage",
};

export interface CausalNarrative {
  cityId: string;
  currentScore: number;
  weakestFactor: {
    key: keyof ScoreBreakdown;
    label: string;
    currentPoints: number;
    maxPoints: number;
    gap: number;
  } | null;
  mostMoveableFactor: {
    key: keyof ScoreBreakdown;
    label: string;
    potentialGain: number;
    rationale: string;
  } | null;
  nearTermSignals: Array<{
    description: string;
    windowLabel: string;
    confidence: "high" | "medium" | "low";
    pointsIfRealized: number;
    direction: "positive" | "negative" | "neutral";
    factor: string | null;
  }>;
  recentChange: {
    from: number;
    to: number;
    delta: number;
    capturedAt: string;
    triggeringEventId: string | null;
  } | null;
  marketWatch: {
    status: string;
    outlook: string;
    setAt: string;
  } | null;
  summary: string;
}

export async function getCausalNarrative(city: City): Promise<CausalNarrative | null> {
  try {
    const prisma = await getPrisma();
    const { score, breakdown } = await calculateReadinessScoreFromFkb(city);

    // --- Weakest factor: biggest gap between current and max ---
    const factors = (Object.keys(SCORE_WEIGHTS) as (keyof ScoreBreakdown)[]).map((key) => {
      const current = breakdown[key] ?? 0;
      const max = SCORE_WEIGHTS[key];
      return { key, label: FACTOR_LABEL[key], currentPoints: current, maxPoints: max, gap: max - current };
    });
    const weakest = factors
      .filter((f) => f.gap > 0)
      .sort((a, b) => b.gap - a.gap)[0] ?? null;

    // --- Most moveable: weakest factor where a realistic change recovers points ---
    // For binary factors, the full gap is the gain. For graduated factors
    // (state legislation, weather), partial gains are possible — we surface
    // the full-restore case as the "potential" with a rationale.
    const mostMoveable = weakest
      ? {
          key: weakest.key,
          label: weakest.label,
          potentialGain: weakest.gap,
          rationale: graduatedFactorRationale(weakest.key, weakest.gap, city),
        }
      : null;

    // --- Near-term forward signals ---
    const forward = await getForwardSignals(city.id);
    const nearTermSignals = forward.near
      .filter((s) => s.scoreImpact.direction !== "neutral" || s.confidence === "high")
      .slice(0, 5)
      .map((s) => ({
        description: s.description,
        windowLabel: s.windowLabel,
        confidence: s.confidence,
        pointsIfRealized: s.scoreImpact.pointsIfRealized,
        direction: s.scoreImpact.direction,
        factor: s.scoreImpact.factor ? FACTOR_LABEL[s.scoreImpact.factor] : null,
      }));

    // --- Recent score change: last snapshot pair with a delta ---
    const snapshots = await prisma.scoreSnapshot.findMany({
      where: { cityId: city.id },
      orderBy: { capturedAt: "desc" },
      take: 30,
    });
    let recentChange: CausalNarrative["recentChange"] = null;
    for (let i = 0; i < snapshots.length - 1; i++) {
      const newer = snapshots[i];
      const older = snapshots[i + 1];
      if (newer.score !== older.score) {
        recentChange = {
          from: older.score,
          to: newer.score,
          delta: newer.score - older.score,
          capturedAt: newer.capturedAt.toISOString().slice(0, 10),
          triggeringEventId: newer.triggeringEventId,
        };
        break;
      }
    }

    // --- Current market watch ---
    const watch = await prisma.marketWatch.findFirst({ where: { cityId: city.id } });

    // --- One-line summary ---
    const summary = buildSummary({
      score,
      weakest,
      mostMoveable,
      nearTermCount: nearTermSignals.length,
      recentChange,
      watchStatus: watch?.watchStatus ?? null,
    });

    return {
      cityId: city.id,
      currentScore: score,
      weakestFactor: weakest
        ? {
            key: weakest.key,
            label: weakest.label,
            currentPoints: weakest.currentPoints,
            maxPoints: weakest.maxPoints,
            gap: weakest.gap,
          }
        : null,
      mostMoveableFactor: mostMoveable,
      nearTermSignals,
      recentChange,
      marketWatch: watch
        ? {
            status: watch.watchStatus,
            outlook: watch.outlook,
            setAt: (watch.publishedAt ?? watch.updatedAt).toISOString().slice(0, 10),
          }
        : null,
      summary,
    };
  } catch (err) {
    logger.error("getCausalNarrative failed", { cityId: city.id, err });
    return null;
  }
}

function graduatedFactorRationale(
  key: keyof ScoreBreakdown,
  gap: number,
  city: City,
): string {
  if (key === "stateLegislation") {
    const status = city.stateLegislationStatus ?? "none";
    if (status === "none") return `No tracked bill in ${city.state}. A bill reaching enacted status would add ${gap} pts.`;
    if (status === "actively_moving") return `A bill is in late stages in ${city.state}; enactment adds +${gap} pts.`;
    return `${gap} pts available from legislative progress.`;
  }
  if (key === "weatherInfrastructure") {
    return `Deploying AAM-grade weather sensor coverage would add ${gap} pts.`;
  }
  if (key === "activePilotProgram") return `A sanctioned pilot program in ${city.city} would add ${gap} pts.`;
  if (key === "approvedVertiport") return `A permitted vertiport would add ${gap} pts.`;
  if (key === "activeOperatorPresence") return `An operator announcement targeting ${city.city} would add ${gap} pts.`;
  if (key === "vertiportZoning") return `Local zoning code permitting vertiports would add ${gap} pts.`;
  if (key === "regulatoryPosture") return `Favorable local government signals toward UAM would add ${gap} pts.`;
  return `${gap} pts available.`;
}

function buildSummary(input: {
  score: number;
  weakest: { label: string; gap: number } | null;
  mostMoveable: { label: string; potentialGain: number } | null;
  nearTermCount: number;
  recentChange: CausalNarrative["recentChange"];
  watchStatus: string | null;
}): string {
  const parts: string[] = [];
  parts.push(`Score: ${input.score}.`);
  if (input.weakest) {
    parts.push(`Weakest factor: ${input.weakest.label} (−${input.weakest.gap} pts vs max).`);
  }
  if (input.recentChange) {
    const sign = input.recentChange.delta > 0 ? "+" : "";
    parts.push(`Recent move: ${input.recentChange.from} → ${input.recentChange.to} (${sign}${input.recentChange.delta}) on ${input.recentChange.capturedAt}.`);
  }
  if (input.watchStatus && input.watchStatus !== "STABLE") {
    parts.push(`Watch status: ${input.watchStatus.replace(/_/g, " ").toLowerCase()}.`);
  }
  if (input.nearTermCount > 0) {
    parts.push(`${input.nearTermCount} near-term signal${input.nearTermCount === 1 ? "" : "s"} being tracked.`);
  }
  return parts.join(" ");
}
