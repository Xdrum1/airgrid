import { NextRequest, NextResponse } from "next/server";

const PASSPHRASE = process.env.SITE_PASSPHRASE || "airindex2026";

export async function POST(request: NextRequest) {
  const { passphrase } = await request.json();

  if (passphrase === PASSPHRASE) {
    const response = NextResponse.json({ ok: true });
    response.cookies.set("airindex-access", "granted", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return response;
  }

  return NextResponse.json({ error: "Invalid passphrase" }, { status: 401 });
}
