/**
 * Seed script — hydrates Corridor + CorridorStatusHistory tables from seed data.
 *
 * Usage: npx tsx prisma/seed-corridors.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Inline seed data to avoid ts-node path alias issues
const CORRIDORS = [
  {
    id: "cor_lax_dtla",
    name: "LAX – DTLA",
    status: "proposed",
    cityId: "los_angeles",
    operatorId: "op_joby",
    startPoint: { lat: 33.9425, lng: -118.408, label: "LAX Adjacent" },
    endPoint: { lat: 34.0407, lng: -118.2468, label: "DTLA" },
    distanceKm: 22,
    estimatedFlightMinutes: 12,
    maxAltitudeFt: 1500,
    notes: "Primary Joby launch corridor connecting LAX to downtown LA.",
    lastUpdated: "2025-02-01",
  },
  {
    id: "cor_lax_santamonica",
    name: "LAX – Santa Monica",
    status: "proposed",
    cityId: "los_angeles",
    operatorId: "op_archer",
    startPoint: { lat: 33.9425, lng: -118.408, label: "LAX Adjacent" },
    endPoint: { lat: 34.0195, lng: -118.4912, label: "Santa Monica" },
    distanceKm: 10,
    estimatedFlightMinutes: 6,
    maxAltitudeFt: 1000,
    notes: "Short coastal corridor for Archer Midnight operations.",
    lastUpdated: "2025-02-01",
  },
  {
    id: "cor_dfw_downtown",
    name: "DFW – Downtown Dallas",
    status: "authorized",
    cityId: "dallas",
    operatorId: "op_wisk",
    startPoint: { lat: 32.8998, lng: -97.0403, label: "DFW Vertiport" },
    endPoint: { lat: 32.7767, lng: -96.797, label: "Downtown Dallas" },
    distanceKm: 18,
    estimatedFlightMinutes: 10,
    maxAltitudeFt: 1500,
    altitudeMinFt: 500,
    faaAuthNumber: "FAA-UAM-2025-0042",
    effectiveDate: "2025-06-15",
    expirationDate: "2027-06-15",
    clearedOperators: ["op_wisk"],
    notes: "First authorized UAM corridor in Texas under HB 1735.",
    lastUpdated: "2025-02-01",
  },
  {
    id: "cor_jfk_manhattan",
    name: "JFK – Manhattan",
    status: "proposed",
    cityId: "new_york",
    operatorId: "op_blade",
    startPoint: { lat: 40.6413, lng: -73.7781, label: "JFK Airport" },
    endPoint: { lat: 40.7012, lng: -74.009, label: "Manhattan Heliport" },
    waypoints: [{ lat: 40.6101, lng: -73.8448 }],
    distanceKm: 24,
    estimatedFlightMinutes: 14,
    maxAltitudeFt: 2000,
    notes: "Routing via Jamaica Bay to minimize overflown population.",
    lastUpdated: "2025-02-01",
  },
  {
    id: "cor_mco_lakenona",
    name: "MCO – Lake Nona",
    status: "proposed",
    cityId: "orlando",
    startPoint: { lat: 28.4312, lng: -81.308, label: "MCO Airport" },
    endPoint: { lat: 28.3747, lng: -81.2186, label: "Lake Nona" },
    distanceKm: 8,
    estimatedFlightMinutes: 5,
    maxAltitudeFt: 800,
    notes: "Short connector from Orlando airport to smart city district.",
    lastUpdated: "2025-02-01",
  },
  {
    id: "cor_las_convention",
    name: "LAS – Convention Center",
    status: "proposed",
    cityId: "las_vegas",
    startPoint: { lat: 36.084, lng: -115.1537, label: "LAS Airport" },
    endPoint: { lat: 36.1311, lng: -115.1526, label: "LVCC Rooftop" },
    distanceKm: 6,
    estimatedFlightMinutes: 4,
    maxAltitudeFt: 800,
    notes: "Airport to convention center shuttle corridor.",
    lastUpdated: "2025-02-01",
  },
] as const;

async function main() {
  console.log("[seed-corridors] Starting corridor seed...");

  for (const c of CORRIDORS) {
    const data = {
      name: c.name,
      status: c.status,
      cityId: c.cityId,
      operatorId: c.operatorId ?? null,
      startPointLat: c.startPoint.lat,
      startPointLng: c.startPoint.lng,
      startPointLabel: c.startPoint.label,
      endPointLat: c.endPoint.lat,
      endPointLng: c.endPoint.lng,
      endPointLabel: c.endPoint.label,
      waypoints: "waypoints" in c ? (c.waypoints as unknown as object) : undefined,
      distanceKm: c.distanceKm,
      estimatedFlightMinutes: c.estimatedFlightMinutes,
      maxAltitudeFt: c.maxAltitudeFt,
      altitudeMinFt: "altitudeMinFt" in c ? (c as { altitudeMinFt: number }).altitudeMinFt : null,
      faaAuthNumber: "faaAuthNumber" in c ? (c as { faaAuthNumber: string }).faaAuthNumber : null,
      effectiveDate: "effectiveDate" in c ? (c as { effectiveDate: string }).effectiveDate : null,
      expirationDate: "expirationDate" in c ? (c as { expirationDate: string }).expirationDate : null,
      clearedOperators: "clearedOperators" in c ? [...(c as { clearedOperators: readonly string[] }).clearedOperators] : [],
      notes: c.notes ?? null,
      lastUpdated: new Date(c.lastUpdated),
    };

    await prisma.corridor.upsert({
      where: { id: c.id },
      update: data,
      create: { id: c.id, ...data },
    });

    // Create initial status history entry if none exists
    const historyCount = await prisma.corridorStatusHistory.count({
      where: { corridorId: c.id },
    });

    if (historyCount === 0) {
      await prisma.corridorStatusHistory.create({
        data: {
          corridorId: c.id,
          fromStatus: null,
          toStatus: c.status,
          reason: "Initial seed data",
          changedAt: new Date(c.lastUpdated),
        },
      });
    }

    console.log(`  ✓ ${c.id} (${c.name})`);
  }

  console.log(`[seed-corridors] Done — ${CORRIDORS.length} corridors seeded.`);
}

main()
  .catch((e) => {
    console.error("[seed-corridors] Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
