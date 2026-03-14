import { NextRequest, NextResponse } from "next/server";
import { authorizeCron } from "@/lib/admin-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { alertCronFailure } from "@/lib/cron-alerts";
import { sendAlertNotifications, sendMonthlySummaries } from "@/lib/alert-notifications";

export async function GET(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;

  const rl = await rateLimit("cron:alert-notify", 2, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: "Rate limited" }, { status: 429 });
  }

  try {
    // Daily: score change + watch list alerts
    const { scoreAlertsSent, watchlistAlertsSent } = await sendAlertNotifications();

    // Monthly: send summary on the 1st of each month
    let monthlySent = 0;
    const today = new Date();
    if (today.getUTCDate() === 1) {
      monthlySent = await sendMonthlySummaries();
    }

    return NextResponse.json({
      success: true,
      scoreAlertsSent,
      watchlistAlertsSent,
      monthlySent,
    });
  } catch (err) {
    console.error("[API /alert-notify] Error:", err);
    await alertCronFailure("alert-notify", err);
    return NextResponse.json(
      { success: false, error: "Alert notification failed" },
      { status: 500 }
    );
  }
}
