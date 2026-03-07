import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [
      latestSnapshot,
      latestChangelog,
      latestClassification,
      latestAutoReview,
      pendingReviewCount,
      snapshotCount,
      changelogCounts,
      classificationCount,
    ] = await Promise.all([
      // Last snapshot run
      prisma.scoreSnapshot.findFirst({
        orderBy: { capturedAt: "desc" },
        select: { capturedAt: true },
      }),
      // Last changelog entry (proxy for last ingestion that found new data)
      prisma.changelogEntry.findFirst({
        orderBy: { timestamp: "desc" },
        select: { timestamp: true, changeType: true },
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
          totalRuns: Math.floor(snapshotCount / 20), // 20 cities per run
        },
        ingestion: {
          lastRun: latestChangelog?.timestamp ?? null,
          schedule: "Daily 06:00 UTC",
        },
        classification: {
          lastRun: latestClassification?.createdAt ?? null,
          model: latestClassification?.modelUsed ?? null,
          totalClassified: classificationCount,
        },
        autoReview: {
          lastRun: latestAutoReview?.createdAt ?? null,
          schedule: "Weekly Mon 08:00 UTC",
        },
      },
      dataVolume: sourceVolume,
      pendingReviews: pendingReviewCount,
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
