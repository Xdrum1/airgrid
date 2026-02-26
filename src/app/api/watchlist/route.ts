import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
} from "@/lib/watchlist";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    const cityIds = await getWatchlist(session.user.id);
    return NextResponse.json({ cityIds });
  } catch (err) {
    console.error("[API /watchlist GET] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch watchlist" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { cityId } = body;
    if (typeof cityId !== "string" || !cityId) {
      return NextResponse.json(
        { error: "Invalid cityId" },
        { status: 400 }
      );
    }

    const cityIds = await addToWatchlist(session.user.id, cityId);
    return NextResponse.json({ cityIds });
  } catch (err) {
    console.error("[API /watchlist POST] Error:", err);
    return NextResponse.json(
      { error: "Failed to add to watchlist" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { cityId } = body;
    if (typeof cityId !== "string" || !cityId) {
      return NextResponse.json(
        { error: "Invalid cityId" },
        { status: 400 }
      );
    }

    const cityIds = await removeFromWatchlist(session.user.id, cityId);
    return NextResponse.json({ cityIds });
  } catch (err) {
    console.error("[API /watchlist DELETE] Error:", err);
    return NextResponse.json(
      { error: "Failed to remove from watchlist" },
      { status: 500 }
    );
  }
}
