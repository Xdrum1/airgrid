import { NextRequest, NextResponse } from "next/server";
import { getChangelogEntries } from "@/lib/changelog";
import type { ChangeType } from "@/types";

export async function GET(request: NextRequest) {
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") ?? 50), 1), 500);
  const type = request.nextUrl.searchParams.get("type") as ChangeType | null;

  try {
    const data = await getChangelogEntries({
      limit,
      changeType: type ?? undefined,
    });
    return NextResponse.json({
      data,
      count: data.length,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[API /changelog] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch changelog", data: [], count: 0 },
      { status: 500 }
    );
  }
}
