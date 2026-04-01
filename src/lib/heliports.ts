import { createLogger } from "@/lib/logger";

const logger = createLogger("heliports");

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

// -------------------------------------------------------
// In-memory cache (5min TTL — heliport data is near-static)
// -------------------------------------------------------

let cachedGeoJSON: GeoJSON.FeatureCollection | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60_000;

/**
 * Returns all operational heliports as a GeoJSON FeatureCollection.
 * Cached in-memory for 5 minutes.
 */
export async function getHeliportsGeoJSON(): Promise<GeoJSON.FeatureCollection> {
  if (cachedGeoJSON && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedGeoJSON;
  }

  const prisma = await getPrisma();

  const [heliports, complianceRecords] = await Promise.all([
    prisma.heliport.findMany({
      where: { statusCode: "O" },
      select: {
        id: true,
        facilityName: true,
        city: true,
        state: true,
        lat: true,
        lng: true,
        useType: true,
        ownershipType: true,
        elevation: true,
        cityId: true,
      },
    }),
    prisma.heliportCompliance.findMany({
      select: {
        facilityId: true,
        complianceStatus: true,
        complianceScore: true,
        siteType: true,
        q5EvtolViability: true,
      },
    }),
  ]);

  // Build compliance lookup by facility ID
  const complianceMap = new Map(complianceRecords.map((c) => [c.facilityId, c]));

  const features: GeoJSON.Feature[] = heliports.map((h) => {
    const compliance = complianceMap.get(h.id);
    return {
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [h.lng, h.lat],
      },
      properties: {
        id: h.id,
        facilityName: h.facilityName,
        city: h.city,
        state: h.state,
        useType: h.useType,
        ownershipType: h.ownershipType,
        elevation: h.elevation,
        cityId: h.cityId,
        complianceStatus: compliance?.complianceStatus ?? "unknown",
        complianceScore: compliance?.complianceScore ?? 0,
        siteType: compliance?.siteType ?? "unknown",
        evtolViability: compliance?.q5EvtolViability ?? "unknown",
      },
    };
  });

  const geojson: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features,
  };

  cachedGeoJSON = geojson;
  cacheTimestamp = Date.now();
  logger.info(`Cached ${features.length} heliport features`);

  return geojson;
}
