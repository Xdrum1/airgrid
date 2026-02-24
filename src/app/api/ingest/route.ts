import { NextResponse } from "next/server";
import { runIngestion } from "@/lib/ingestion";

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
