import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { runIngestion } from "@/lib/ingestion";
import { rateLimit } from "@/lib/rate-limit";

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

  return null;
}

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
  const denied = authorize(request);
  if (denied) return denied;
  return startIngestion();
}

// Keep POST for manual triggers
export async function POST(request: NextRequest) {
  const denied = authorize(request);
  if (denied) return denied;
  return startIngestion();
}
