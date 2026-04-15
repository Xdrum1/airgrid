import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPrecedentsForCity, getPrecedentsForCityByFactor } from "@/lib/rpl-precedents";
import { CITIES_MAP } from "@/data/seed";
import { rateLimit } from "@/lib/rate-limit";
import { getUserTier } from "@/lib/billing";
import { hasProAccess } from "@/lib/billing-shared";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cityId: string }> },
) {
  const { cityId } = await params;

  const rl = await rateLimit(`internal:precedents:${cityId}`, 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  if (!CITIES_MAP[cityId]) {
    return NextResponse.json({ precedents: [] }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ precedents: [], gated: true });
  }
  const tier = await getUserTier(session.user.id);
  if (!hasProAccess(tier)) {
    return NextResponse.json({ precedents: [], gated: true });
  }

  const [precedents, byFactor] = await Promise.all([
    getPrecedentsForCity(cityId),
    getPrecedentsForCityByFactor(cityId),
  ]);
  return NextResponse.json({ precedents, byFactor });
}
