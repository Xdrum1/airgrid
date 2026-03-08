import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getClientIp } from "@/lib/admin-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { publishMarketWatch, unpublishMarketWatch } from "@/lib/market-watch";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`admin-watch-publish:${ip}`, 10, 5 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { cityId, action } = body as { cityId: string; action: "publish" | "unpublish" };

    if (!cityId || !action) {
      return NextResponse.json(
        { error: "Missing cityId or action" },
        { status: 400 }
      );
    }

    if (action === "publish") {
      const watch = await publishMarketWatch(cityId);
      return NextResponse.json({ ok: true, watch });
    }

    if (action === "unpublish") {
      const watch = await unpublishMarketWatch(cityId);
      return NextResponse.json({ ok: true, watch });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[admin/market-watch/publish] error:", err);
    return NextResponse.json({ error: "Failed to update publish status" }, { status: 500 });
  }
}
