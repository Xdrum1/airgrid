import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserTier } from "@/lib/billing";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const tier = await getUserTier(session.user.id);
  return NextResponse.json({ tier });
}
