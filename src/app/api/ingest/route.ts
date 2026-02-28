import { NextRequest, NextResponse } from "next/server";
import { runIngestion } from "@/lib/ingestion";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
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

  const rl = rateLimit("ingest", 4, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate limited — try again later" },
      { status: 429 }
    );
  }

  try {
    const { diff, meta } = await runIngestion();
    return NextResponse.json({
      success: true,
      newCount: diff.newRecords.length,
      updatedCount: diff.updatedRecords.length,
      unchangedCount: diff.unchangedCount,
      meta,
    });
  } catch (err) {
    console.error("[API /ingest] Error:", err);
    return NextResponse.json(
      { success: false, error: "Ingestion failed" },
      { status: 500 }
    );
  }
}
