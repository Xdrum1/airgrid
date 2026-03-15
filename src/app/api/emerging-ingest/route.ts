import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { authorizeCron } from "@/lib/admin-helpers";
import { alertCronFailure } from "@/lib/cron-alerts";

export const maxDuration = 120;

function streamIngestion(): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode("data: {\"status\":\"started\"}\n\n"));

      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode("data: {\"status\":\"running\"}\n\n"));
        } catch {
          clearInterval(keepalive);
        }
      }, 10_000);

      try {
        // Lazy imports to avoid cold start timeout
        const { fetchArpaEAwards, fetchClinicalTrials } = await import("@/lib/emerging-sources");
        const { classifyEmergingRecords } = await import("@/lib/emerging-classifier");
        const { prisma } = await import("@/lib/prisma");

        // 1. Fetch from sources
        const arpaRecords = await fetchArpaEAwards(90);
        controller.enqueue(encoder.encode(`data: {"status":"fetched","source":"doe_arpa_e","count":${arpaRecords.length}}\n\n`));

        await new Promise((r) => setTimeout(r, 500));

        const ctRecords = await fetchClinicalTrials(90);
        controller.enqueue(encoder.encode(`data: {"status":"fetched","source":"clinicaltrials_gov","count":${ctRecords.length}}\n\n`));

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

        controller.enqueue(encoder.encode(`data: {"status":"deduped","total":${allRecords.length},"new":${newRecords.length},"existing":${existingIds.size}}\n\n`));

        if (newRecords.length === 0) {
          clearInterval(keepalive);
          controller.enqueue(encoder.encode(`data: {"status":"complete","success":true,"new":0,"classified":0,"relevant":0}\n\n`));
          controller.close();
          return;
        }

        // 3. Classify new records
        const classifications = await classifyEmergingRecords(newRecords);

        // 4. Persist to EmergingMarketSignal
        const now = new Date();
        let persisted = 0;
        let relevant = 0;

        for (const record of newRecords) {
          const classification = classifications.find((c) => c.sourceId === record.sourceId);

          const isRelevant = classification?.relevant ?? false;
          if (isRelevant) relevant++;

          try {
            await prisma.emergingMarketSignal.create({
              data: {
                marketName: classification?.marketName ?? "Other",
                sourceId: record.sourceId,
                title: record.title,
                url: record.url,
                source: record.source,
                relevant: isRelevant,
                signalType: classification?.signalType ?? "other",
                momentum: classification?.momentum ?? "neutral",
                raw: record.raw as Record<string, string | number | boolean | null>,
                classifiedAt: now,
              },
            });
            persisted++;
          } catch (err) {
            // Skip duplicates (unique constraint), log others
            const msg = String(err);
            if (!msg.includes("Unique constraint")) {
              console.error(`[emerging-ingest] Failed to persist ${record.sourceId}:`, err);
            }
          }
        }

        clearInterval(keepalive);

        const result = JSON.stringify({
          status: "complete",
          success: true,
          new: newRecords.length,
          classified: classifications.length,
          relevant,
          persisted,
          sources: {
            doe_arpa_e: arpaRecords.length,
            clinicaltrials_gov: ctRecords.length,
          },
        });

        console.log(`[emerging-ingest] Complete: ${persisted} persisted, ${relevant} relevant, ${newRecords.length} new`);

        controller.enqueue(encoder.encode(`data: ${result}\n\n`));
        controller.close();
      } catch (err) {
        clearInterval(keepalive);
        console.error("[emerging-ingest] Error:", err);
        await alertCronFailure("emerging-ingest", err);

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ status: "error", success: false, error: String(err) })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

async function startIngestion(): Promise<Response> {
  const rl = await rateLimit("emerging-ingest", 4, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate limited — try again later" },
      { status: 429 }
    );
  }
  return streamIngestion();
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
