import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { runIngestion } from "@/lib/ingestion";
import { rateLimit } from "@/lib/rate-limit";
import { authorizeCron } from "@/lib/admin-helpers";

async function startIngestion(): Promise<NextResponse> {
  const rl = await rateLimit("ingest", 4, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate limited — try again later" },
      { status: 429 }
    );
  }

  // Run ingestion after response is sent — avoids gateway timeout
  after(async () => {
    try {
      const { diff, meta } = await runIngestion();
      console.log(
        `[API /ingest] Complete: ${diff.newRecords.length} new, ${diff.updatedRecords.length} updated, ${diff.unchangedCount} unchanged, sources: ${meta.sources.join(", ")}`
      );
    } catch (err) {
      console.error("[API /ingest] Ingestion error:", err);
    }
  });

  return NextResponse.json({ success: true, message: "Ingestion started" });
}

// Crons send GET requests
export async function GET(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  return startIngestion();
}

// Keep POST for manual triggers
export async function POST(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  return startIngestion();
}
