import { NextRequest, NextResponse } from "next/server";
import { sendWeeklyDigests } from "@/lib/notifications";

function authorize(request: NextRequest): NextResponse | null {
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

  return null; // authorized
}

// Vercel crons send GET requests
export async function GET(request: NextRequest) {
  const denied = authorize(request);
  if (denied) return denied;

  try {
    const result = await sendWeeklyDigests();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[API /digest] Error:", err);
    return NextResponse.json(
      { success: false, error: "Digest send failed" },
      { status: 500 }
    );
  }
}
