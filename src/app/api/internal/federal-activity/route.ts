import { NextRequest, NextResponse } from "next/server";
import { searchCongressBills, getTrackedBills } from "@/lib/congress-api";
import { searchRegulations } from "@/lib/regulations-api";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const rl = await rateLimit("internal:federal-activity", 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const [congressBills, trackedBills, regulations] = await Promise.all([
    searchCongressBills().catch(() => []),
    Promise.resolve(getTrackedBills()),
    searchRegulations({ limit: 15, postedAfter: "2024-01-01" }).catch(() => []),
  ]);

  // If live Congress data is available, use it; otherwise fall back to curated list
  const hasLiveCongressData = congressBills.length > 0;

  return NextResponse.json({
    congress: {
      bills: hasLiveCongressData ? congressBills : [],
      tracked: trackedBills,
      isLive: hasLiveCongressData,
    },
    regulations: regulations.map((doc) => ({
      id: doc.id,
      title: doc.attributes.title,
      documentType: doc.attributes.documentType,
      docketId: doc.attributes.docketId,
      agencyId: doc.attributes.agencyId,
      postedDate: doc.attributes.postedDate,
      commentEndDate: doc.attributes.commentEndDate ?? null,
      url: `https://www.regulations.gov/document/${doc.id}`,
    })),
    fetchedAt: new Date().toISOString(),
  });
}
