import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MARKET_COUNT } from "@/data/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [
      latestSnapshot,
      latestIngestionRun,
      latestClassification,
      latestAutoReview,
      pendingReviewCount,
      snapshotCount,
      changelogCounts,
      classificationCount,
      recentIngestionRuns,
    ] = await Promise.all([
      // Last snapshot run
      prisma.scoreSnapshot.findFirst({
        orderBy: { capturedAt: "desc" },
        select: { capturedAt: true },
      }),
      // Last ingestion run (from new IngestionRun table)
      prisma.ingestionRun.findFirst({
        orderBy: { startedAt: "desc" },
      }),
      // Last NLP classification
      prisma.classificationResult.findFirst({
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, modelUsed: true },
      }),
      // Last auto-review run
      prisma.autoReviewResult.findFirst({
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, decision: true },
      }),
      // Pending overrides needing review
      prisma.scoringOverride.count({
        where: { confidence: "needs_review", supersededAt: null },
      }),
      // Total snapshots captured
      prisma.scoreSnapshot.count(),
      // Changelog counts by type
      prisma.changelogEntry.groupBy({
        by: ["changeType"],
        _count: true,
      }),
      // Total classifications
      prisma.classificationResult.count(),
      // Last 7 ingestion runs for trend
      prisma.ingestionRun.findMany({
        orderBy: { startedAt: "desc" },
        take: 7,
      }),
    ]);

    // Build source volume map from changelog
    const sourceVolume: Record<string, number> = {};
    for (const entry of changelogCounts) {
      sourceVolume[entry.changeType] = entry._count;
    }

    return NextResponse.json({
      pipelines: {
        snapshot: {
          lastRun: latestSnapshot?.capturedAt ?? null,
          schedule: "Daily 06:00 UTC",
          totalRuns: Math.floor(snapshotCount / MARKET_COUNT),
        },
        ingestion: {
          lastRun: latestIngestionRun?.completedAt ?? latestIngestionRun?.startedAt ?? null,
          schedule: "Daily 06:00 UTC",
          lastRunDetails: latestIngestionRun
            ? {
                newRecords: latestIngestionRun.newRecords,
                updatedRecords: latestIngestionRun.updatedRecords,
                unchangedCount: latestIngestionRun.unchangedCount,
                totalRecords: latestIngestionRun.totalRecords,
                overridesCreated: latestIngestionRun.overridesCreated,
                overridesApplied: latestIngestionRun.overridesApplied,
                scoreChanges: latestIngestionRun.scoreChanges,
                error: latestIngestionRun.error,
                alertSent: latestIngestionRun.alertSent,
              }
            : null,
        },
        classification: {
          lastRun: latestClassification?.createdAt ?? null,
          model: latestClassification?.modelUsed ?? null,
          totalClassified: classificationCount,
        },
        autoReview: {
          lastRun: latestAutoReview?.createdAt ?? null,
          schedule: "Daily 08:00 UTC",
        },
      },
      dataVolume: sourceVolume,
      pendingReviews: pendingReviewCount,
      recentRuns: recentIngestionRuns.map((r) => ({
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        newRecords: r.newRecords,
        error: r.error,
        alertSent: r.alertSent,
      })),
      queriedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[API /pipeline-health] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch pipeline health" },
      { status: 500 }
    );
  }
}
