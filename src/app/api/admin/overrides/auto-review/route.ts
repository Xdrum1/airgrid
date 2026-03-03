import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getClientIp } from "@/lib/admin-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { runAutoReview } from "@/lib/auto-reviewer";

// -------------------------------------------------------
// POST — Admin-triggered auto-review
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

  try {
    const summary = await runAutoReview({ maxOverrides, dryRun, fetchSource });
    return NextResponse.json({ success: true, ...summary });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

// -------------------------------------------------------
// GET — Cron-triggered auto-review
// -------------------------------------------------------

function authorizeCron(request: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { success: false, error: "CRON_SECRET not configured" },
      { status: 401 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  return null;
}

export async function GET(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;

  try {
    const summary = await runAutoReview({
      maxOverrides: 20,
      dryRun: false,
      fetchSource: true,
    });
    return NextResponse.json({ success: true, ...summary });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
