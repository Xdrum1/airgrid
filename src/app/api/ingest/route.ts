import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { authorizeCron } from "@/lib/admin-helpers";
import { alertCronFailure } from "@/lib/cron-alerts";

// Max execution time for serverless — Amplify Lambda default is 60s
export const maxDuration = 120;

function streamIngestion(): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial keepalive immediately
      controller.enqueue(encoder.encode("data: {\"status\":\"started\"}\n\n"));

      // Send keepalive pings every 10s to prevent gateway timeout
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode("data: {\"status\":\"running\"}\n\n"));
        } catch {
          clearInterval(keepalive);
        }
      }, 10_000);

      try {
        // Lazy-import ingestion to reduce cold start time — the heavy module
        // tree (classifier, rules engine, market leads) loads after the stream
        // has started, preventing Amplify's 30s gateway integration timeout.
        const { runIngestion } = await import("@/lib/ingestion");
        const { diff, meta } = await runIngestion();
        clearInterval(keepalive);

        const result = JSON.stringify({
          status: "complete",
          success: true,
          newRecords: diff.newRecords.length,
          updatedRecords: diff.updatedRecords.length,
          unchangedCount: diff.unchangedCount,
          sources: meta.sources,
        });

        console.log(
          `[API /ingest] Complete: ${diff.newRecords.length} new, ${diff.updatedRecords.length} updated, ${diff.unchangedCount} unchanged, sources: ${meta.sources.join(", ")}`
        );

        controller.enqueue(encoder.encode(`data: ${result}\n\n`));
        controller.close();
      } catch (err) {
        clearInterval(keepalive);
        console.error("[API /ingest] Ingestion error:", err);
        await alertCronFailure("ingest", err);

        const error = JSON.stringify({
          status: "error",
          success: false,
          error: String(err),
        });
        controller.enqueue(encoder.encode(`data: ${error}\n\n`));
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
  const rl = await rateLimit("ingest", 4, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate limited — try again later" },
      { status: 429 }
    );
  }

  return streamIngestion();
}

// Crons send GET requests
export async function GET(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;

  // Deep warmup: load the full module tree without running ingestion.
  // This prevents cold-start timeouts on the real call.
  if (request.nextUrl.searchParams.get("warmup") === "true") {
    await import("@/lib/ingestion");
    return NextResponse.json({ status: "warm" });
  }

  return startIngestion();
}

// Keep POST for manual triggers
export async function POST(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  return startIngestion();
}
