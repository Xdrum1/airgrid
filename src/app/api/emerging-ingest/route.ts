import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { authorizeCron } from "@/lib/admin-helpers";
import { alertCronFailure } from "@/lib/cron-alerts";

export const maxDuration = 120;

/**
 * Phase 1: Fetch + deduplicate + persist raw records (no classification).
 * Classification happens in /api/emerging-classify (Phase 2).
 *
 * Designed to complete within Amplify's 30s Lambda timeout:
 * - Both sources fetched in parallel (~10-15s)
 * - Dedup + persist (~2-3s)
 */
async function runIngestion(): Promise<Response> {
  try {
    const { fetchArpaEAwards, fetchClinicalTrials } = await import("@/lib/emerging-sources");
    const { prisma } = await import("@/lib/prisma");

    // 1. Fetch from both sources in parallel
    const [arpaRecords, ctRecords] = await Promise.all([
      fetchArpaEAwards(90),
      fetchClinicalTrials(90),
    ]);

    const allRecords = [...arpaRecords, ...ctRecords];

    // 2. Deduplicate against existing records
    const existingIds = new Set(
      (
        await prisma.emergingMarketSignal.findMany({
          where: {
            source: { in: ["doe_arpa_e", "clinicaltrials_gov"] },
            sourceId: { in: allRecords.map((r) => r.sourceId) },
          },
          select: { sourceId: true, source: true },
        })
      ).map((r) => `${r.source}:${r.sourceId}`)
    );

    const newRecords = allRecords.filter((r) => !existingIds.has(`${r.source}:${r.sourceId}`));

    if (newRecords.length === 0) {
      return NextResponse.json({
        success: true,
        new: 0,
        persisted: 0,
        sources: {
          doe_arpa_e: arpaRecords.length,
          clinicaltrials_gov: ctRecords.length,
        },
      });
    }

    // 3. Persist raw records WITHOUT classification (classified = false defaults)
    const now = new Date();
    let persisted = 0;

    for (const record of newRecords) {
      try {
        await prisma.emergingMarketSignal.create({
          data: {
            marketName: "Unclassified",
            sourceId: record.sourceId,
            title: record.title,
            url: record.url,
            source: record.source,
            relevant: false,
            signalType: "other",
            momentum: "neutral",
            raw: record.raw as Record<string, string | number | boolean | null>,
            classifiedAt: now,
          },
        });
        persisted++;
      } catch (err) {
        const msg = String(err);
        if (!msg.includes("Unique constraint")) {
          console.error(`[emerging-ingest] Failed to persist ${record.sourceId}:`, err);
        }
      }
    }

    console.log(`[emerging-ingest] Complete: ${persisted} persisted, ${newRecords.length} new (${arpaRecords.length} ARPA-E, ${ctRecords.length} CT)`);

    return NextResponse.json({
      success: true,
      new: newRecords.length,
      persisted,
      sources: {
        doe_arpa_e: arpaRecords.length,
        clinicaltrials_gov: ctRecords.length,
      },
    });
  } catch (err) {
    console.error("[emerging-ingest] Error:", err);
    await alertCronFailure("emerging-ingest", err);
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}

async function startIngestion(): Promise<Response> {
  const rl = await rateLimit("emerging-ingest", 4, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate limited — try again later" },
      { status: 429 }
    );
  }
  return runIngestion();
}

export async function GET(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  return startIngestion();
}

export async function POST(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  return startIngestion();
}
