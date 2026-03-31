/**
 * FKB Phase 5 — Migrate existing ScoringOverrides into FKB Override workflow
 *
 * Migrates applied, high-confidence overrides from the legacy
 * ScoringOverride table into FkbScoreOverride with full audit trail.
 *
 * Usage:
 *   npx tsx scripts/seed-fkb-overrides.ts
 *   npx tsx scripts/seed-fkb-overrides.ts --dry-run
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

// Map legacy field names → FKB factor codes
const FIELD_TO_CODE: Record<string, string> = {
  hasActivePilotProgram: "PLT",
  hasVertiportZoning: "ZON",
  approvedVertiport: "VRT",
  activeOperatorPresence: "OPR",
  regulatoryPosture: "REG",
  hasStateLegislation: "LEG",
  stateLegislationStatus: "LEG",
  weatherInfraLevel: "WTH",
};

async function main() {
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

  // Get factor ID map
  const factors = await prisma.fkbFactor.findMany({ select: { id: true, code: true } });
  const factorCodeToId = new Map(factors.map(f => [f.code, f.id]));

  // Fetch applied overrides (high confidence, with a resolved city)
  const legacyOverrides = await prisma.scoringOverride.findMany({
    where: {
      confidence: "high",
      appliedAt: { not: null },
      cityId: { not: "__unresolved__" },
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`Found ${legacyOverrides.length} applied high-confidence overrides to migrate.\n`);

  if (legacyOverrides.length === 0) {
    console.log("No overrides to migrate. This is expected if the auto-reviewer has been conservative.");

    // Also show stats on all overrides for context
    const total = await prisma.scoringOverride.count();
    const byConfidence = await prisma.scoringOverride.groupBy({
      by: ["confidence"],
      _count: true,
    });
    const applied = await prisma.scoringOverride.count({ where: { appliedAt: { not: null } } });
    const unresolved = await prisma.scoringOverride.count({ where: { cityId: "__unresolved__" } });

    console.log("\n═══ Legacy Override Stats ═══");
    console.log(`  Total: ${total}`);
    console.log(`  Applied: ${applied}`);
    console.log(`  Unresolved city: ${unresolved}`);
    console.log(`  By confidence:`);
    for (const row of byConfidence) {
      console.log(`    ${row.confidence}: ${row._count}`);
    }
    return;
  }

  console.log("═══ Migrating Overrides ═══\n");

  let migrated = 0;
  let skipped = 0;

  for (const override of legacyOverrides) {
    const factorCode = FIELD_TO_CODE[override.field];
    if (!factorCode) {
      console.log(`  ⚠ Unknown field: ${override.field} — skipping`);
      skipped++;
      continue;
    }

    const factorId = factorCodeToId.get(factorCode);
    if (!factorId) {
      console.log(`  ⚠ Factor code ${factorCode} not in FKB — skipping`);
      skipped++;
      continue;
    }

    // Find the corresponding FkbFactorScore
    const factorScore = await prisma.fkbFactorScore.findUnique({
      where: {
        factorId_marketId_methodologyVersion: {
          factorId,
          marketId: override.cityId,
          methodologyVersion: "v1.3",
        },
      },
    });

    if (!factorScore) {
      console.log(`  ⚠ No FKB score for ${override.cityId}/${factorCode} — skipping`);
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`  [dry] ${override.cityId} / ${factorCode}: "${override.reason.slice(0, 60)}..."`);
    } else {
      // Check if already migrated
      const existing = await prisma.fkbScoreOverride.findFirst({
        where: {
          factorScoreId: factorScore.id,
          overrideReason: { contains: override.reason.slice(0, 50) },
        },
      });

      if (existing) {
        console.log(`  ○ ${override.cityId} / ${factorCode} (already migrated)`);
        skipped++;
        continue;
      }

      // Determine override direction and score values
      const originalScore = Number(factorScore.score);
      // For boolean fields, the override value is true/false
      // For graduated fields, it's the new level
      // We'll estimate the override score based on the field type
      let overrideScore = originalScore;
      if (typeof override.value === "boolean" && override.value === true) {
        // Factor was toggled ON — override to full weight
        const weight = await prisma.fkbFactorWeight.findFirst({
          where: { factorId, methodologyVersion: "v1.3", effectiveTo: null },
        });
        overrideScore = weight ? Number(weight.weightPct) : originalScore;
      } else if (typeof override.value === "string") {
        // Graduated factor — map level to score
        if (override.value === "friendly") overrideScore = 10;
        else if (override.value === "neutral") overrideScore = 5;
        else if (override.value === "enacted") overrideScore = 20;
        else if (override.value === "actively_moving") overrideScore = 10;
        else if (override.value === "full") overrideScore = 10;
        else if (override.value === "partial") overrideScore = 5;
      }

      await prisma.fkbScoreOverride.create({
        data: {
          factorScoreId: factorScore.id,
          originalScore: originalScore,
          overrideScore: overrideScore,
          overrideReason: override.reason,
          evidenceUrl: override.sourceUrl ?? null,
          overrideType: overrideScore > originalScore ? "UPWARD" : "DOWNWARD",
          overrideConfidence: "HIGH",
          analystName: "Pipeline Auto-Reviewer",
          reviewedBy: null,
          expiresAt: null,
        },
      });

      // Mark the FKB score as having an override
      await prisma.fkbFactorScore.update({
        where: { id: factorScore.id },
        data: { hasOverride: true },
      });

      console.log(`  ✓ ${override.cityId} / ${factorCode}: ${originalScore} → ${overrideScore} (${overrideScore > originalScore ? "UPWARD" : "DOWNWARD"})`);
      migrated++;
    }
  }

  console.log(`\n${migrated} overrides migrated, ${skipped} skipped.\n`);

  // Summary
  const totalFkbOverrides = await prisma.fkbScoreOverride.count();
  const scoresWithOverrides = await prisma.fkbFactorScore.count({ where: { hasOverride: true } });
  console.log("═══ FKB Override Summary ═══");
  console.log(`  Total FKB overrides: ${totalFkbOverrides}`);
  console.log(`  Factor scores with overrides: ${scoresWithOverrides} / 147`);
}

main()
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
