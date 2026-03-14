import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getClientIp, authorizeCron } from "@/lib/admin-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { alertCronFailure } from "@/lib/cron-alerts";

// Extend Lambda timeout for AI processing
export const maxDuration = 120;

// -------------------------------------------------------
// POST — Admin-triggered auto-review (streaming to avoid gateway timeout)
// -------------------------------------------------------

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  // Rate limit: 3 per 10 minutes per IP
  const ip = getClientIp(request);
  const rl = await rateLimit(`auto-review:${ip}`, 3, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  let body: { maxOverrides?: number; dryRun?: boolean; fetchSource?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine — use defaults
  }

  const maxOverrides = Math.min(body.maxOverrides ?? 20, 50);
  const dryRun = body.dryRun ?? false;
  const fetchSource = body.fetchSource ?? true;

  return streamAutoReview({ maxOverrides, dryRun, fetchSource });
}

// -------------------------------------------------------
// GET — Cron-triggered auto-review (streaming to avoid gateway timeout)
// -------------------------------------------------------

export async function GET(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;

  return streamAutoReview({
    maxOverrides: 20,
    dryRun: false,
    fetchSource: true,
  });
}

// -------------------------------------------------------
// Streaming wrapper — keeps Amplify gateway alive
// -------------------------------------------------------

function streamAutoReview(options: {
  maxOverrides: number;
  dryRun: boolean;
  fetchSource: boolean;
}): Response {
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
        const { runAutoReview } = await import("@/lib/auto-reviewer");
        const summary = await runAutoReview(options);
        clearInterval(keepalive);

        const result = JSON.stringify({
          status: "complete",
          success: true,
          ...summary,
        });

        controller.enqueue(encoder.encode(`data: ${result}\n\n`));
        controller.close();
      } catch (err) {
        clearInterval(keepalive);
        console.error("[API /auto-review] Error:", err);
        await alertCronFailure("auto-review", err);

        const error = JSON.stringify({
          status: "error",
          success: false,
          error: err instanceof Error ? err.message : String(err),
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
