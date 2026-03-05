import { NextRequest, NextResponse } from "next/server";
import { sendWeeklyDigests } from "@/lib/notifications";
import { authorizeCron } from "@/lib/admin-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { alertCronFailure } from "@/lib/cron-alerts";

// Vercel crons send GET requests
export async function GET(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;

  const rl = await rateLimit("cron:digest", 2, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: "Rate limited" }, { status: 429 });
  }

  try {
    const result = await sendWeeklyDigests();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[API /digest] Error:", err);
    await alertCronFailure("digest", err);
    return NextResponse.json(
      { success: false, error: "Digest send failed" },
      { status: 500 }
    );
  }
}
