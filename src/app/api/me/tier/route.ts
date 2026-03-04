import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserTier } from "@/lib/billing";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/admin-helpers";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`me-tier:${ip}`, 30, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const tier = await getUserTier(session.user.id);
  return NextResponse.json({ tier });
}
