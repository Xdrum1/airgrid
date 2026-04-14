import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCausalNarrative } from "@/lib/causal-narrative";
import { getCitiesWithOverrides } from "@/data/seed";
import { CITIES_MAP } from "@/data/seed";
import { rateLimit } from "@/lib/rate-limit";
import { getUserTier } from "@/lib/billing";
import { hasProAccess } from "@/lib/billing-shared";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cityId: string }> },
) {
  const { cityId } = await params;

  const rl = await rateLimit(`internal:causal:${cityId}`, 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  if (!CITIES_MAP[cityId]) {
    return NextResponse.json({ narrative: null }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ narrative: null, gated: true });
  }
  const tier = await getUserTier(session.user.id);
  if (!hasProAccess(tier)) {
    return NextResponse.json({ narrative: null, gated: true });
  }

  const cities = await getCitiesWithOverrides();
  const city = cities.find((c) => c.id === cityId);
  if (!city) return NextResponse.json({ narrative: null }, { status: 404 });

  const narrative = await getCausalNarrative(city);
  return NextResponse.json({ narrative });
}
