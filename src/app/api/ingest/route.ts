import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { authorizeCron } from "@/lib/admin-helpers";
import { alertCronFailure } from "@/lib/cron-alerts";

// Max execution time for serverless — Amplify Lambda default is 60s
export const maxDuration = 120;

// Fire-and-forget ingestion. Amplify Hosting's gateway has a 30s integration
// timeout and does not honor SSE keepalives reliably; the underlying Lambda
// keeps running to maxDuration regardless of whether the gateway disconnected,
// so we ack the trigger immediately and let the work continue. The cron action
// parses the SSE-style body as a successful trigger; downstream verification
// happens via the IngestionRun table (and rescue paths catch anything cut off
// before completion).
function fireAndForgetIngestion(): Response {
  void (async () => {
    try {
      const { runIngestion } = await import("@/lib/ingestion");
      const { diff, meta } = await runIngestion();
      console.log(
        `[API /ingest] Complete: ${diff.newRecords.length} new, ${diff.updatedRecords.length} updated, ${diff.unchangedCount} unchanged, sources: ${meta.sources.join(", ")}, fetchCounts: ${JSON.stringify(meta.fetchCounts)}, fetchErrors: ${JSON.stringify(meta.fetchErrors)}`
      );
    } catch (err) {
      console.error("[API /ingest] Ingestion error:", err);
      await alertCronFailure("ingest", err);
    }
  })();

  const body =
    'data: {"status":"started"}\n\n' +
    'data: {"status":"complete","async":true}\n\n';
  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
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

  return fireAndForgetIngestion();
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
