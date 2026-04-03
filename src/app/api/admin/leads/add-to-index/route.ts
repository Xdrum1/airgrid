import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { invalidateCitiesCache } from "@/data/seed";

/**
 * POST /api/admin/leads/add-to-index
 *
 * One-click approval: promote a MarketLead to a live tracked market.
 * Creates Market record, updates lead status to "added", and
 * invalidates the cities cache so the new market appears immediately.
 */
export async function POST(request: NextRequest) {
  const rl = await rateLimit("admin-lead-add", 10, 5 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { leadId } = body as { leadId: string };

    if (!leadId) {
      return NextResponse.json({ error: "Missing leadId" }, { status: 400 });
    }

    // Fetch the lead
    const lead = await prisma.marketLead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (lead.status === "added") {
      return NextResponse.json({ error: "Lead already added to index" }, { status: 400 });
    }

    if (lead.city === "Unknown" || lead.city.includes("(")) {
      return NextResponse.json(
        { error: "Cannot add lead with unresolved city name. Update the city name first." },
        { status: 400 }
      );
    }

    // Generate a city ID from the city name
    const cityId = lead.city
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    // Check if market already exists
    const existing = await prisma.market.findUnique({ where: { id: cityId } });
    if (existing) {
      // Market exists — just link the lead
      await prisma.marketLead.update({
        where: { id: leadId },
        data: { status: "added", addedAsCityId: cityId },
      });
      return NextResponse.json({
        ok: true,
        cityId,
        message: `Market "${lead.city}" already exists. Lead marked as added.`,
        created: false,
      });
    }

    // Create the Market record
    // Use approximate coordinates — can be refined later
    const coords = getCityCoords(lead.city, lead.state);

    await prisma.market.create({
      data: {
        id: cityId,
        city: lead.city,
        state: lead.state,
        country: lead.country,
        lat: coords.lat,
        lng: coords.lng,
        isActive: true,
      },
    });

    // Initialize FKB factor scores for the new market (all starting at 0)
    const factors = await prisma.fkbFactor.findMany({
      where: { retired: false },
      select: { id: true, code: true },
    });

    for (const factor of factors) {
      await prisma.fkbFactorScore.create({
        data: {
          factorId: factor.id,
          marketId: cityId,
          score: 0,
          scoreNormalized: 0,
          methodologyVersion: "v1.3",
          confidence: "LOW",
          confidenceReasons: [{ reason: "New market — no data yet", impact: "negative" }],
          signalCount: 0,
          hasOverride: false,
        },
      }).catch(() => {
        // May already exist if someone ran the seed script
      });
    }

    // Update the lead
    await prisma.marketLead.update({
      where: { id: leadId },
      data: { status: "added", addedAsCityId: cityId },
    });

    // Invalidate cache so the market appears on the dashboard
    invalidateCitiesCache();

    console.log(`[admin/leads] Added ${lead.city}, ${lead.state} to index as "${cityId}"`);

    return NextResponse.json({
      ok: true,
      cityId,
      message: `${lead.city}, ${lead.state} added to AirIndex. Market will appear on next dashboard load.`,
      created: true,
    });
  } catch (err) {
    console.error("[admin/leads/add-to-index] Error:", err);
    return NextResponse.json({ error: "Failed to add market" }, { status: 500 });
  }
}

/**
 * Approximate coordinates for US cities.
 * Used for initial Market creation — can be refined later.
 */
function getCityCoords(city: string, state: string): { lat: number; lng: number } {
  const key = `${city.toLowerCase()}_${state.toLowerCase()}`;
  const coords: Record<string, { lat: number; lng: number }> = {
    "cincinnati_oh": { lat: 39.1031, lng: -84.5120 },
    "tampa_fl": { lat: 27.9506, lng: -82.4572 },
    "san antonio_tx": { lat: 29.4241, lng: -98.4936 },
    "albuquerque_nm": { lat: 35.0844, lng: -106.6504 },
    "salt lake city_ut": { lat: 40.7608, lng: -111.8910 },
    "oklahoma city_ok": { lat: 35.4676, lng: -97.5164 },
    "oakland_ca": { lat: 37.8044, lng: -122.2712 },
    "dayton_oh": { lat: 39.7589, lng: -84.1916 },
    "johns creek_ga": { lat: 34.0289, lng: -84.1988 },
    "louisville_ky": { lat: 38.2527, lng: -85.7585 },
    "pittsburgh_pa": { lat: 40.4406, lng: -79.9959 },
    "richmond_va": { lat: 37.5407, lng: -77.4360 },
    "kansas city_mo": { lat: 39.0997, lng: -94.5786 },
    "indianapolis_in": { lat: 39.7684, lng: -86.1581 },
    "milwaukee_wi": { lat: 43.0389, lng: -87.9065 },
    "new orleans_la": { lat: 29.9511, lng: -90.0715 },
    "raleigh_nc": { lat: 35.7796, lng: -78.6382 },
    "portland_or": { lat: 45.5152, lng: -122.6784 },
    "memphis_tn": { lat: 35.1495, lng: -90.0490 },
    "jacksonville_fl": { lat: 30.3322, lng: -81.6557 },
  };
  return coords[key] ?? { lat: 39.8283, lng: -98.5795 }; // US center as fallback
}
