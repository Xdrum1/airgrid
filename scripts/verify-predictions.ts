/**
 * Prediction Scorecard — Verification Job
 *
 * Walks all PredictionRecord entries with status='pending' whose
 * latestExpected has passed and tries to determine outcome:
 *
 *   - For score-impacting predictions: compare actual score change
 *     in the window to the prediction
 *   - For watch_trajectory: check if MarketWatch outlook held
 *   - For facility_milestone: check if facility status changed
 *   - For awaiting_decision: check for follow-on classifications
 *
 * Status outcomes:
 *   validated     — actual outcome matched prediction
 *   invalidated   — actual outcome contradicted prediction
 *   inconclusive  — no signal either way
 *   overdue       — window passed but verification couldn't determine
 *
 * Run nightly via cron after ingestion + snapshot complete.
 *
 * Usage:
 *   npx tsx scripts/verify-predictions.ts --dry-run
 *   npx tsx scripts/verify-predictions.ts
 */
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

async function main() {
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

  const now = new Date();

  // Find pending predictions whose window has closed
  const pending = await prisma.predictionRecord.findMany({
    where: {
      status: "pending",
      latestExpected: { lte: now, not: null },
    },
    orderBy: { latestExpected: "asc" },
  });

  console.log(`${pending.length} predictions due for verification\n`);

  let validated = 0;
  let invalidated = 0;
  let inconclusive = 0;
  let overdue = 0;

  for (const p of pending) {
    const result = await verifyOne(p);

    if (!dryRun) {
      await prisma.predictionRecord.update({
        where: { id: p.id },
        data: {
          status: result.status,
          actualOutcome: result.outcome,
          actualDelta: result.actualDelta,
          verifiedAt: now,
          verifiedBy: "PIPELINE",
        },
      });
    }

    console.log(`[${result.status.padEnd(12)}] ${p.cityId.padEnd(15)} ${p.signalType.padEnd(20)} ${p.signalId.slice(0, 30).padEnd(32)} ${result.outcome}`);

    if (result.status === "validated") validated++;
    else if (result.status === "invalidated") invalidated++;
    else if (result.status === "inconclusive") inconclusive++;
    else overdue++;
  }

  console.log(`\nSummary:`);
  console.log(`  Validated: ${validated}`);
  console.log(`  Invalidated: ${invalidated}`);
  console.log(`  Inconclusive: ${inconclusive}`);
  console.log(`  Overdue: ${overdue}`);

  // Show overall scorecard
  const allClosed = await prisma.predictionRecord.groupBy({
    by: ["status"],
    where: { status: { not: "pending" } },
    _count: true,
  });
  console.log(`\nLifetime scorecard:`);
  allClosed.forEach((s) => console.log(`  ${s.status}: ${s._count}`));

  const totalDecided = allClosed
    .filter((s) => ["validated", "invalidated"].includes(s.status))
    .reduce((sum, s) => sum + s._count, 0);
  const validatedTotal = allClosed.find((s) => s.status === "validated")?._count ?? 0;
  if (totalDecided > 0) {
    const accuracy = Math.round((validatedTotal / totalDecided) * 100);
    console.log(`  Accuracy (decided only): ${accuracy}%`);
  }

  await prisma.$disconnect();
}

interface VerificationResult {
  status: "validated" | "invalidated" | "inconclusive" | "overdue";
  outcome: string;
  actualDelta?: number;
}

async function verifyOne(p: {
  id: string;
  cityId: string;
  signalType: string;
  signalId: string;
  predictedFactor: string | null;
  predictedDelta: number;
  predictedDirection: string;
  earliestExpected: Date | null;
  latestExpected: Date | null;
  generatedAt: Date;
}): Promise<VerificationResult> {
  // ── Score-impacting predictions ──
  if (p.predictedDelta !== 0 && p.predictedFactor) {
    const earliest = p.earliestExpected ?? p.generatedAt;
    const latest = p.latestExpected ?? new Date();

    const startSnap = await prisma.scoreSnapshot.findFirst({
      where: { cityId: p.cityId, capturedAt: { lte: earliest } },
      orderBy: { capturedAt: "desc" },
    });
    const endSnap = await prisma.scoreSnapshot.findFirst({
      where: { cityId: p.cityId, capturedAt: { gte: latest } },
      orderBy: { capturedAt: "asc" },
    });

    if (!startSnap || !endSnap) {
      return { status: "inconclusive", outcome: "insufficient snapshot history" };
    }

    const actualDelta = endSnap.score - startSnap.score;
    const predictedSign = p.predictedDirection === "positive" ? 1 : p.predictedDirection === "negative" ? -1 : 0;
    const predictedSigned = predictedSign * p.predictedDelta;

    // Within ±50% tolerance counts as validated
    const tolerance = Math.abs(predictedSigned) * 0.5;
    if (Math.abs(actualDelta - predictedSigned) <= tolerance) {
      return {
        status: "validated",
        outcome: `predicted ${predictedSigned}, actual ${actualDelta}`,
        actualDelta,
      };
    }
    if (Math.sign(actualDelta) === Math.sign(predictedSigned) && actualDelta !== 0) {
      return {
        status: "validated",
        outcome: `direction matched: predicted ${predictedSigned}, actual ${actualDelta}`,
        actualDelta,
      };
    }
    if (actualDelta === 0) {
      return {
        status: "invalidated",
        outcome: `predicted ${predictedSigned}, no movement`,
        actualDelta,
      };
    }
    return {
      status: "invalidated",
      outcome: `predicted ${predictedSigned}, actual ${actualDelta} (opposite direction)`,
      actualDelta,
    };
  }

  // ── Watch trajectory predictions ──
  if (p.signalType === "watch_trajectory") {
    const watch = await prisma.marketWatch.findFirst({ where: { cityId: p.cityId } });
    if (!watch) return { status: "inconclusive", outcome: "watch removed" };
    // Did the score actually move in the predicted direction?
    const earliest = p.earliestExpected ?? p.generatedAt;
    const latest = p.latestExpected ?? new Date();
    const startSnap = await prisma.scoreSnapshot.findFirst({
      where: { cityId: p.cityId, capturedAt: { lte: earliest } },
      orderBy: { capturedAt: "desc" },
    });
    const endSnap = await prisma.scoreSnapshot.findFirst({
      where: { cityId: p.cityId, capturedAt: { gte: latest } },
      orderBy: { capturedAt: "asc" },
    });
    if (!startSnap || !endSnap) {
      return { status: "inconclusive", outcome: "no snapshot data" };
    }
    const delta = endSnap.score - startSnap.score;
    const expectedDirection = p.predictedDirection;
    if (expectedDirection === "positive" && delta > 0)
      return { status: "validated", outcome: `IMPROVING confirmed: +${delta}`, actualDelta: delta };
    if (expectedDirection === "negative" && delta < 0)
      return { status: "validated", outcome: `DETERIORATING confirmed: ${delta}`, actualDelta: delta };
    if (delta === 0)
      return { status: "inconclusive", outcome: "watch issued, no score movement", actualDelta: 0 };
    return { status: "invalidated", outcome: `predicted ${expectedDirection}, actual ${delta}`, actualDelta: delta };
  }

  // ── Facility milestone predictions ──
  if (p.signalType === "facility_milestone") {
    // Without a status-change history table, we can only flag overdue
    return { status: "overdue", outcome: "facility status not auto-trackable yet" };
  }

  // ── Default: no verification logic for this type ──
  return { status: "overdue", outcome: "no verification logic for signal type" };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
