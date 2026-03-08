import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getClientIp } from "@/lib/admin-helpers";
import { rateLimit } from "@/lib/rate-limit";
import {
  getAllMarketWatchesAdmin,
  updateMarketWatch,
  getWatchHistory,
  getPendingSuggestions,
  WATCH_STATUSES,
  OUTLOOKS,
} from "@/lib/market-watch";
import type { WatchStatus, Outlook } from "@/lib/market-watch";

// -------------------------------------------------------
// GET — List all market watches + suggestions (admin)
// -------------------------------------------------------

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`admin-watch-get:${ip}`, 30, 5 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const [watches, suggestions] = await Promise.all([
      getAllMarketWatchesAdmin(),
      getPendingSuggestions(),
    ]);
    return NextResponse.json({ data: watches, suggestions });
  } catch (err) {
    console.error("[admin/market-watch] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch watches" }, { status: 500 });
  }
}

// -------------------------------------------------------
// POST — Update watch status/outlook for a city
// -------------------------------------------------------

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`admin-watch-post:${ip}`, 10, 5 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { cityId, watchStatus, outlook, analystNote, reason, publish } = body as {
      cityId: string;
      watchStatus: string;
      outlook: string;
      analystNote?: string;
      reason: string;
      publish?: boolean;
    };

    if (!cityId || !watchStatus || !outlook || !reason) {
      return NextResponse.json(
        { error: "Missing required fields: cityId, watchStatus, outlook, reason" },
        { status: 400 }
      );
    }

    if (!WATCH_STATUSES.includes(watchStatus as WatchStatus)) {
      return NextResponse.json(
        { error: `Invalid watchStatus. Must be one of: ${WATCH_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    if (!OUTLOOKS.includes(outlook as Outlook)) {
      return NextResponse.json(
        { error: `Invalid outlook. Must be one of: ${OUTLOOKS.join(", ")}` },
        { status: 400 }
      );
    }

    if (reason.length < 10) {
      return NextResponse.json(
        { error: "Reason must be at least 10 characters" },
        { status: 400 }
      );
    }

    if (analystNote && analystNote.length > 2000) {
      return NextResponse.json(
        { error: "Analyst note must be under 2000 characters" },
        { status: 400 }
      );
    }

    const watch = await updateMarketWatch({
      cityId,
      watchStatus: watchStatus as WatchStatus,
      outlook: outlook as Outlook,
      analystNote: analystNote || null,
      reason,
      publish,
    });

    return NextResponse.json({ ok: true, watch });
  } catch (err) {
    console.error("[admin/market-watch] POST error:", err);
    return NextResponse.json({ error: "Failed to update watch" }, { status: 500 });
  }
}
