import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getClientIp, authorizeCron } from "@/lib/admin-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { alertCronFailure } from "@/lib/cron-alerts";

// -------------------------------------------------------
// POST — Admin-triggered auto-review (batch)
// -------------------------------------------------------

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  // Rate limit: 10 per 10 minutes per IP (higher for batch approach)
  const ip = getClientIp(request);
  const rl = await rateLimit(`auto-review:${ip}`, 10, 10 * 60 * 1000);
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

  const maxOverrides = Math.min(body.maxOverrides ?? 5, 10);
  const dryRun = body.dryRun ?? false;
  const fetchSource = body.fetchSource ?? true;

  return runBatch({ maxOverrides, dryRun, fetchSource });
}

// -------------------------------------------------------
// GET — Cron-triggered auto-review (batch of 5)
// -------------------------------------------------------

export async function GET(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;

  return runBatch({
    maxOverrides: 5,
    dryRun: false,
    fetchSource: true,
  });
}

// -------------------------------------------------------
// Batch runner — processes a small batch and returns JSON
// -------------------------------------------------------

async function runBatch(options: {
  maxOverrides: number;
  dryRun: boolean;
  fetchSource: boolean;
}): Promise<NextResponse> {
  try {
    const { runAutoReview } = await import("@/lib/auto-reviewer");
    const summary = await runAutoReview(options);

    // Count remaining pending overrides
    const { getPendingOverrides } = await import("@/lib/admin");
    const pending = await getPendingOverrides();
    const remaining = Math.max(0, pending.length - summary.processed);

    return NextResponse.json({
      success: true,
      ...summary,
      remaining,
    });
  } catch (err) {
    console.error("[API /auto-review] Error:", err);
    await alertCronFailure("auto-review", err);

    return NextResponse.json(
      {
        success: false,
        error: "Auto-review failed — check server logs",
      },
      { status: 500 }
    );
  }
}
