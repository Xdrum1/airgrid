import { NextRequest, NextResponse } from "next/server";
import { runIngestion } from "@/lib/ingestion";

export async function GET(request: NextRequest) {
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
    console.error("[API /ingest] Cron error:", err);
    return NextResponse.json(
      { success: false, error: "Ingestion failed" },
      { status: 500 }
    );
  }
}

export async function POST() {
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
