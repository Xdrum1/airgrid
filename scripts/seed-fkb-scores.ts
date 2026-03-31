/**
 * FKB Phase 4 — Seed Factor Scores with Confidence
 *
 * Computes per-factor, per-market scores from existing seed.ts data
 * and assigns confidence levels based on source coverage.
 *
 * 21 markets × 7 active factors = 147 factor score records
 *
 * Usage:
 *   npx tsx scripts/seed-fkb-scores.ts
 *   npx tsx scripts/seed-fkb-scores.ts --dry-run
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

// Import from the actual codebase
import { CITIES } from "../src/data/seed";
import { calculateReadinessScore, SCORE_WEIGHTS } from "../src/lib/scoring";

const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

// Map scoring.ts keys → FKB factor codes
const KEY_TO_CODE: Record<string, string> = {
  activeOperatorPresence: "OPR",
  stateLegislation: "LEG",
  approvedVertiport: "VRT",
  regulatoryPosture: "REG",
  activePilotProgram: "PLT",
  vertiportZoning: "ZON",
  weatherInfrastructure: "WTH",
};

// Determine confidence based on available evidence
function assessConfidence(
  city: (typeof CITIES)[0],
  factorKey: string,
  factorScore: number,
  maxScore: number,
): { confidence: string; reasons: { reason: string; impact: string }[] } {
  const reasons: { reason: string; impact: string }[] = [];

  // Has explicit source citation?
  const hasSource = !!city.scoreSources?.[factorKey as keyof typeof city.scoreSources];
  // Has sub-indicators?
  const subInds = city.subIndicators?.[factorKey as keyof typeof city.subIndicators];
  const hasSubIndicators = subInds && subInds.length > 0;

  if (hasSource && hasSubIndicators) {
    reasons.push({ reason: "Source citation and sub-indicators present", impact: "positive" });
  } else if (hasSource) {
    reasons.push({ reason: "Source citation present", impact: "positive" });
  } else if (hasSubIndicators) {
    reasons.push({ reason: "Sub-indicators present but no source citation", impact: "neutral" });
  } else {
    reasons.push({ reason: "No source citation or sub-indicators", impact: "negative" });
  }

  // Score extremes are more confident
  if (factorScore === maxScore) {
    reasons.push({ reason: "Factor fully achieved", impact: "positive" });
  } else if (factorScore === 0) {
    reasons.push({ reason: "Factor not achieved — absence is easier to verify", impact: "positive" });
  } else {
    reasons.push({ reason: "Partial/graduated score — requires judgment", impact: "negative" });
  }

  // Determine overall confidence
  const positives = reasons.filter(r => r.impact === "positive").length;
  const negatives = reasons.filter(r => r.impact === "negative").length;

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

async function main() {
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

  // Look up factor IDs by code
  const factors = await prisma.fkbFactor.findMany({
    where: { retired: false },
    select: { id: true, code: true },
  });
  const factorMap = new Map(factors.map((f) => [f.code, f.id]));

  if (factorMap.size !== 7) {
    console.error(`ERROR: Expected 7 active factors, found ${factorMap.size}. Run seed-fkb.ts first.`);
    process.exit(1);
  }

  // Verify markets exist
  const marketCount = await prisma.market.count();
  if (marketCount === 0) {
    console.error("ERROR: No markets found. Run seed-fkb.ts first.");
    process.exit(1);
  }

  console.log(`═══ FKB Factor Scores — ${CITIES.length} markets × ${factorMap.size} factors ═══\n`);

  const METHODOLOGY_VERSION = "v1.3";
  let created = 0;
  let skipped = 0;

  const summaryRows: { market: string; score: number; confidence: Record<string, string> }[] = [];

  for (const city of CITIES) {
    const { score, breakdown } = calculateReadinessScore(city);
    const confidences: Record<string, string> = {};

    for (const [key, value] of Object.entries(breakdown)) {
      const code = KEY_TO_CODE[key];
      if (!code) continue;

      const factorId = factorMap.get(code);
      if (!factorId) continue;

      const max = SCORE_WEIGHTS[key as keyof typeof SCORE_WEIGHTS];
      const normalized = max > 0 ? (value / max) * 100 : 0;
      const { confidence, reasons } = assessConfidence(city, key, value, max);
      confidences[code] = confidence;

      // Count signals (rough: how many sub-indicators + sources exist)
      const subInds = city.subIndicators?.[key as keyof typeof city.subIndicators];
      const hasSource = city.scoreSources?.[key as keyof typeof city.scoreSources];
      const signalCount = (subInds?.length ?? 0) + (hasSource ? 1 : 0);

      if (dryRun) {
        console.log(`  [dry] ${city.id} / ${code}: ${value}/${max} (${confidence}) signals=${signalCount}`);
      } else {
        // Upsert based on unique constraint
        const existing = await prisma.fkbFactorScore.findUnique({
          where: {
            factorId_marketId_methodologyVersion: {
              factorId,
              marketId: city.id,
              methodologyVersion: METHODOLOGY_VERSION,
            },
          },
        });

        if (existing) {
          skipped++;
        } else {
          await prisma.fkbFactorScore.create({
            data: {
              factorId,
              marketId: city.id,
              score: value,
              scoreNormalized: normalized,
              methodologyVersion: METHODOLOGY_VERSION,
              confidence,
              confidenceReasons: reasons,
              signalCount,
              hasOverride: false,
            },
          });
          created++;
        }
      }
    }

    summaryRows.push({ market: `${city.city}, ${city.state}`, score, confidence: confidences });
    if (!dryRun) {
      console.log(`  ✓ ${city.city}, ${city.state} — ${score}/100`);
    }
  }

  console.log(`\n${created} factor scores created, ${skipped} skipped (already exist).\n`);

  // ── Confidence Summary ──
  console.log("═══ Confidence Distribution ═══");
  const allConfidences = summaryRows.flatMap(r => Object.values(r.confidence));
  const high = allConfidences.filter(c => c === "HIGH").length;
  const medium = allConfidences.filter(c => c === "MEDIUM").length;
  const low = allConfidences.filter(c => c === "LOW").length;
  console.log(`  HIGH:   ${high} (${((high / allConfidences.length) * 100).toFixed(0)}%)`);
  console.log(`  MEDIUM: ${medium} (${((medium / allConfidences.length) * 100).toFixed(0)}%)`);
  console.log(`  LOW:    ${low} (${((low / allConfidences.length) * 100).toFixed(0)}%)`);
  console.log(`  Total:  ${allConfidences.length} factor scores\n`);

  // ── Top markets by confidence ──
  console.log("═══ Markets by Score + Confidence ═══");
  const sorted = [...summaryRows].sort((a, b) => b.score - a.score);
  console.log("┌──────────────────────────┬───────┬───────────────────────────────────────────┐");
  console.log("│ Market                   │ Score │ Confidence (OPR LEG VRT REG PLT ZON WTH)  │");
  console.log("├──────────────────────────┼───────┼───────────────────────────────────────────┤");
  for (const r of sorted.slice(0, 10)) {
    const market = r.market.padEnd(24);
    const score = String(r.score).padStart(3);
    const conf = ["OPR", "LEG", "VRT", "REG", "PLT", "ZON", "WTH"]
      .map(c => (r.confidence[c] ?? "?")[0])
      .join("   ");
    console.log(`│ ${market} │  ${score}  │ ${conf.padEnd(41)}│`);
  }
  console.log("└──────────────────────────┴───────┴───────────────────────────────────────────┘");
  console.log("  H=HIGH  M=MEDIUM  L=LOW\n");
}

main()
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
