import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Only serve to requests from our own domain
  const referer = req.headers.get("referer") ?? "";
  const origin = req.headers.get("origin") ?? "";
  const allowed = ["airindex.io", "localhost"];
  const isAllowed = allowed.some((d) => referer.includes(d) || origin.includes(d));

  if (!isAllowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    token: process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "",
  });
}
