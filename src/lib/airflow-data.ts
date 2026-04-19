/**
 * Airflow data loader — reads building height data from data/buildings/
 * and constructs FacilityAirflowData for the OES scoring engine.
 */
import { existsSync, readFileSync } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import {
  PREVAILING_WINDS,
  type FacilityAirflowData,
  type Building,
} from "./obstruction-score";

interface BuildingJson {
  facilityId: string;
  facilityName: string;
  lat: number;
  lng: number;
  buildingCount: number;
  buildings: Array<{
    name: string | null;
    heightM: number;
    heightFt: number;
    lat: number;
    lng: number;
    distanceM: number;
    bearing: number;
  }>;
}

export async function loadAirflowData(siteId: string): Promise<FacilityAirflowData | null> {
  const heliport = await prisma.heliport.findUnique({ where: { id: siteId } });
  if (!heliport) return null;

  const padL = heliport.padLengthFt ?? 50;
  const padW = heliport.padWidthFt ?? 50;
  const controlling = Math.min(padL, padW);
  const ol = Math.round(controlling * 1.2 * 10) / 10;
  const fato15D = Math.round(ol * 1.5 * 10) / 10;
  const fato2D = Math.round(ol * 2.0 * 10) / 10;
  const saFt = Math.round(ol * 0.28 * 10) / 10;

  const wind = PREVAILING_WINDS[heliport.cityId ?? ""] ?? { dir: "N", deg: 0 };

  // Load building data from JSON if available
  const jsonPath = path.join(process.cwd(), "data", "buildings", `${siteId}.json`);
  let buildings: Building[] = [];
  let totalInRadius = 0;

  if (existsSync(jsonPath)) {
    const raw: BuildingJson = JSON.parse(readFileSync(jsonPath, "utf-8"));
    totalInRadius = raw.buildingCount;
    buildings = raw.buildings
      .filter(b => b.heightM > 0)
      .map(b => {
        const dLat = (b.lat - heliport.lat) * 111320;
        const dLng = (b.lng - heliport.lng) * 111320 * Math.cos(heliport.lat * Math.PI / 180);
        return {
          name: b.name ?? "unnamed",
          heightM: b.heightM,
          heightFt: b.heightFt,
          x: Math.round(dLng),
          y: Math.round(-dLat),
          w: 40,
          d: 30,
          lat: b.lat,
          lng: b.lng,
        };
      });
  }

  // Load approach corridors from pre-parsed JSON
  let approach = "Unspecified";
  try {
    const corridorPath = path.join(process.cwd(), "data", "approach-corridors.json");
    if (existsSync(corridorPath)) {
      const corridors = JSON.parse(readFileSync(corridorPath, "utf-8")) as Array<{
        facilityId: string;
        corridors: Array<{ fromDeg: number; toDeg: number; label: string }>;
      }>;
      const match = corridors.find(c => c.facilityId === siteId);
      if (match && match.corridors.length > 0) {
        approach = match.corridors.map(c => c.label).join(" | ");
      }
    }
  } catch {
    // silently skip
  }

  return {
    facilityId: siteId,
    facilityName: heliport.facilityName,
    city: `${heliport.city}, ${heliport.state}`,
    lat: heliport.lat,
    lng: heliport.lng,
    padFt: `${padL}×${padW}`,
    surface: heliport.surfaceType ?? "Unknown",
    windDir: wind.dir,
    windDeg: wind.deg,
    approach,
    padElevFt: heliport.elevation ?? 0,
    tloFt: controlling,
    olFt: ol,
    fato15D,
    fato2D,
    saFt,
    buildings,
    totalBuildingsInRadius: totalInRadius,
  };
}
