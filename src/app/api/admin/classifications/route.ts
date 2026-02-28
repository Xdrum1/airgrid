import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRecentClassifications } from "@/lib/admin";

const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL;

export async function GET(request: NextRequest) {
  if (!ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = await auth();
  if (session?.user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = Math.min(Math.max(Number(limitParam ?? 50), 1), 200);
    const data = await getRecentClassifications(limit);
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[admin/classifications] GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch classifications" },
      { status: 500 }
    );
  }
}
