/**
 * Obstruction Environment Score (OES)
 *
 * Quantifies the physical and airflow constraints surrounding a heliport/vertiport
 * based on building proximity, approach surface penetrations, dimensional zone
 * intrusions, and prevailing wind interactions.
 *
 * 0-100 scale, four tiers: LOW (0-19), MODERATE (20-44), ELEVATED (45-69), CRITICAL (70-100)
 * Higher score = more constrained environment.
 *
 * Stage 2: heuristic, based on OSM building heights + NASR pad data + climatological wind.
 * Stage 3 (future): validated with site-level wind measurement data (TruWeather).
 */

export interface Building {
  name: string;
  heightM: number;
  heightFt: number;
  x: number; // meters relative to pad
  y: number;
  w: number; // footprint width meters
  d: number; // footprint depth meters
  lat?: number;
  lng?: number;
}

export interface FacilityAirflowData {
  facilityId: string;
  facilityName: string;
  city: string;
  lat: number;
  lng: number;
  padFt: string;
  surface: string;
  windDir: string;
  windDeg: number;
  approach: string;
  padElevFt: number;
  tloFt: number;
  olFt: number;
  fato15D: number;
  fato2D: number;
  saFt: number;
  buildings: Building[];
  totalBuildingsInRadius: number;
}

export interface OESBreakdown {
  pen81Count: number;
  pen81Score: number;
  inFato2D: number;
  inFato15D: number;
  fatoScore: number;
  inWindPath: number;
  tallestInWindPathFt: number;
  windScore: number;
  worstRatio: number;
  worstRatioBldg: string | null;
  ratioScore: number;
  totalScore: number;
  tier: "LOW" | "MODERATE" | "ELEVATED" | "CRITICAL";
  tierColor: string;
}

export interface BuildingStatus {
  name: string;
  heightFt: number;
  distM: number;
  penetrates81: boolean;
  inFato2D: boolean;
  inFato15D: boolean;
  inWindPath: boolean;
  status: "penetration" | "fato_2d" | "fato_15d" | "wind_path" | "clear";
}

export function computeOES(data: FacilityAirflowData): OESBreakdown {
  const { padElevFt, fato2D, fato15D, windDeg, buildings } = data;
  const windRad = windDeg * Math.PI / 180;

  // 1. 8:1 Approach Surface Penetrations (0-25 pts)
  let pen81 = 0;
  for (const b of buildings) {
    const dist = Math.sqrt(b.x * b.x + b.y * b.y);
    const surfaceFt = padElevFt + (dist * 3.28084) / 8;
    if (b.heightFt > surfaceFt) pen81++;
  }
  const pen81Score = Math.min(25, pen81 * 8);

  // 2. FATO Zone Intrusions (0-25 pts)
  const fato2Rm = fato2D / 2 / 3.28084;
  const fato15Rm = fato15D / 2 / 3.28084;
  let inFato2 = 0, inFato15 = 0;
  for (const b of buildings) {
    const dist = Math.sqrt(b.x * b.x + b.y * b.y);
    const edge = dist - Math.max(b.w, b.d) / 2;
    if (edge < fato2Rm) inFato2++;
    if (edge < fato15Rm) inFato15++;
  }
  const fatoScore = Math.min(25, inFato2 * 6 + inFato15 * 3);

  // 3. Wind Path Obstructions (0-25 pts)
  let inWindPath = 0;
  let tallestInPath = 0;
  for (const b of buildings) {
    const bAngle = Math.atan2(b.x, -b.y) * 180 / Math.PI;
    const bDeg = (bAngle + 360) % 360;
    const diff = Math.abs(bDeg - windDeg);
    const wrap = diff > 180 ? 360 - diff : diff;
    if (wrap < 40 && b.heightFt > 50) {
      inWindPath++;
      tallestInPath = Math.max(tallestInPath, b.heightFt);
    }
  }
  const windScore = Math.min(25, inWindPath * 7 + (tallestInPath > 100 ? 5 : 0));

  // 4. Height-to-Distance Ratio (0-25 pts)
  let worstRatio = 0;
  let worstBldg: string | null = null;
  for (const b of buildings) {
    const dist = Math.sqrt(b.x * b.x + b.y * b.y);
    if (dist < 10) continue;
    const ratio = b.heightFt / (dist * 3.28084);
    if (ratio > worstRatio) {
      worstRatio = ratio;
      worstBldg = b.name;
    }
  }
  const ratioScore = Math.min(25, Math.round(worstRatio * 50));

  const totalScore = Math.min(100, pen81Score + fatoScore + windScore + ratioScore);

  let tier: OESBreakdown["tier"];
  if (totalScore >= 70) tier = "CRITICAL";
  else if (totalScore >= 45) tier = "ELEVATED";
  else if (totalScore >= 20) tier = "MODERATE";
  else tier = "LOW";

  const tierColor = tier === "CRITICAL" ? "#ef4444" : tier === "ELEVATED" ? "#f59e0b" : tier === "MODERATE" ? "#3b82f6" : "#10b981";

  return {
    pen81Count: pen81,
    pen81Score,
    inFato2D: inFato2,
    inFato15D: inFato15,
    fatoScore,
    inWindPath,
    tallestInWindPathFt: Math.round(tallestInPath),
    windScore,
    worstRatio: Math.round(worstRatio * 100) / 100,
    worstRatioBldg: worstBldg,
    ratioScore,
    totalScore,
    tier,
    tierColor,
  };
}

export function getBuildingStatuses(data: FacilityAirflowData): BuildingStatus[] {
  const { padElevFt, fato2D, fato15D, windDeg } = data;

  return data.buildings.map(b => {
    const dist = Math.sqrt(b.x * b.x + b.y * b.y);
    const surfaceFt = padElevFt + (dist * 3.28084) / 8;
    const penetrates81 = b.heightFt > surfaceFt;
    const edge = dist - Math.max(b.w, b.d) / 2;
    const inF2 = edge < fato2D / 2 / 3.28084;
    const inF15 = edge < fato15D / 2 / 3.28084;

    const bAngle = Math.atan2(b.x, -b.y) * 180 / Math.PI;
    const bDeg = (bAngle + 360) % 360;
    const diff = Math.abs(bDeg - windDeg);
    const wrap = diff > 180 ? 360 - diff : diff;
    const inWind = wrap < 40 && b.heightFt > 50;

    let status: BuildingStatus["status"] = "clear";
    if (penetrates81) status = "penetration";
    else if (inF2) status = "fato_2d";
    else if (inF15) status = "fato_15d";
    else if (inWind) status = "wind_path";

    return {
      name: b.name,
      heightFt: b.heightFt,
      distM: Math.round(dist),
      penetrates81,
      inFato2D: inF2,
      inFato15D: inF15,
      inWindPath: inWind,
      status,
    };
  });
}

// Prevailing wind data (climatological, well-documented)
export const PREVAILING_WINDS: Record<string, { dir: string; deg: number }> = {
  miami: { dir: "ESE", deg: 112 },
  los_angeles: { dir: "WSW", deg: 247 },
  dallas: { dir: "SSE", deg: 157 },
  orlando: { dir: "ESE", deg: 120 },
  tampa: { dir: "ESE", deg: 120 },
  houston: { dir: "SSE", deg: 157 },
  san_francisco: { dir: "WNW", deg: 292 },
  phoenix: { dir: "WSW", deg: 247 },
  atlanta: { dir: "NW", deg: 315 },
  new_york: { dir: "NW", deg: 315 },
  chicago: { dir: "WSW", deg: 247 },
  las_vegas: { dir: "SSW", deg: 202 },
  denver: { dir: "S", deg: 180 },
  seattle: { dir: "SSW", deg: 202 },
  boston: { dir: "WSW", deg: 247 },
  charlotte: { dir: "SW", deg: 225 },
  nashville: { dir: "S", deg: 180 },
  austin: { dir: "SSE", deg: 157 },
  san_diego: { dir: "WNW", deg: 292 },
  detroit: { dir: "WSW", deg: 247 },
  columbus: { dir: "WSW", deg: 247 },
  minneapolis: { dir: "NW", deg: 315 },
  washington_dc: { dir: "NW", deg: 315 },
};
