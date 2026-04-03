import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { authorizeCron } from "@/lib/admin-helpers";
import { alertCronFailure } from "@/lib/cron-alerts";

export const maxDuration = 120;

/**
 * Phase 2: Classify unclassified emerging market records.
 * Processes a small batch per invocation to stay within Amplify's 30s Lambda timeout.
 * The cron workflow calls this endpoint repeatedly until all records are classified.
 */
const BATCH_SIZE = 15; // matches classifier batch size

async function runClassification(): Promise<Response> {
  try {
    const { classifyEmergingRecords } = await import("@/lib/emerging-classifier");
    const { prisma } = await import("@/lib/prisma");

    // Find unclassified records (marketName = "Unclassified")
    const unclassified = await prisma.emergingMarketSignal.findMany({
      where: { marketName: "Unclassified" },
      orderBy: { ingestedAt: "asc" },
      take: BATCH_SIZE,
    });

    if (unclassified.length === 0) {
      return NextResponse.json({
        success: true,
        classified: 0,
        remaining: 0,
      });
    }

    // Convert DB records to the format the classifier expects
    const rawRecords = unclassified.map((r) => ({
      sourceId: r.sourceId,
      source: r.source,
      title: r.title,
      url: r.url,
      date: r.classifiedAt.toISOString().slice(0, 10),
      summary: r.title, // title is our best summary for these records
      raw: r.raw as Record<string, unknown>,
    }));

    // Classify
    const { classifications, rawResponse, promptVersion, modelUsed } =
      await classifyEmergingRecords(rawRecords);

    // Update records with classification results + audit trail
    let updated = 0;
    let relevant = 0;

    for (const record of unclassified) {
      const classification = classifications.find((c) => c.sourceId === record.sourceId);
      if (!classification) continue;

      const isRelevant = classification.relevant;
      if (isRelevant) relevant++;

      try {
        await prisma.emergingMarketSignal.update({
          where: { id: record.id },
          data: {
            marketName: classification.marketName,
            relevant: isRelevant,
            signalType: classification.signalType,
            momentum: classification.momentum,
            confidence: classification.confidence,
            classifiedAt: new Date(),
            // Audit trail — same discipline as AirIndex ClassificationResult
            promptVersion,
            modelUsed,
            rawClassification: rawResponse,
          },
        });
        updated++;
      } catch (err) {
        console.error(`[emerging-classify] Failed to update ${record.sourceId}:`, err);
      }
    }

    // Check how many remain
    const remaining = await prisma.emergingMarketSignal.count({
      where: { marketName: "Unclassified" },
    });

    console.log(`[emerging-classify] Classified ${updated} records (${relevant} relevant), ${remaining} remaining`);

    return NextResponse.json({
      success: true,
      classified: updated,
      relevant,
      remaining,
    });
  } catch (err) {
    console.error("[emerging-classify] Error:", err);
    await alertCronFailure("emerging-classify", err);
    return NextResponse.json(
      { success: false, error: "Classification failed — check server logs" },
      { status: 500 }
    );
  }
}

async function startClassification(): Promise<Response> {
  const rl = await rateLimit("emerging-classify", 20, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate limited — try again later" },
      { status: 429 }
    );
  }
  return runClassification();
}

export async function GET(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  return startClassification();
}

export async function POST(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  return startClassification();
}
