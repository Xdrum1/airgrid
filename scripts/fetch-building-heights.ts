/**
 * Fetch building heights from OpenStreetMap Overpass API
 * for RiskIndex demo facilities.
 *
 * Usage: npx tsx scripts/fetch-building-heights.ts
 *
 * Outputs JSON files to data/buildings/[facilityId].json
 */
import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

const OUT_DIR = path.join(process.cwd(), "data", "buildings");
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

interface FacilityQuery {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusM: number;
  prevailingWind: { direction: string; degFrom: number };
  approachCorridors?: { label: string; degFrom: number; degTo: number }[];
}

const FACILITIES: FacilityQuery[] = [
  {
    id: "75CL",
    name: "Ronald Reagan UCLA Medical Center",
    lat: 34.0661,
    lng: -118.4469,
    radiusM: 500,
    prevailingWind: { direction: "WSW", degFrom: 247 },
  },
  {
    id: "25FA",
    name: "Jackson Memorial Hospital",
    lat: 25.7906,
    lng: -80.2101,
    radiusM: 500,
    prevailingWind: { direction: "ESE", degFrom: 112 },
    approachCorridors: [
      { label: "Primary (330-110 CW)", degFrom: 330, degTo: 110 },
    ],
  },
  {
    id: "CA46",
    name: "Cedars-Sinai Medical Center",
    lat: 34.0751,
    lng: -118.3803,
    radiusM: 500,
    prevailingWind: { direction: "WSW", degFrom: 247 },
  },
];

interface Building {
  id: number;
  name: string | null;
  heightM: number;
  heightFt: number;
  levels: number | null;
  lat: number;
  lng: number;
  distanceM: number;
  bearing: number;
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) - Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

async function fetchBuildings(fac: FacilityQuery): Promise<Building[]> {
  const query = `[out:json][timeout:30];(way["building"]["height"](around:${fac.radiusM},${fac.lat},${fac.lng});way["building"]["building:levels"](around:${fac.radiusM},${fac.lat},${fac.lng}););out center;`;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) throw new Error(`Overpass API error: ${res.status}`);
  const data = await res.json();

  const buildings: Building[] = [];
  for (const el of data.elements || []) {
    const tags = el.tags || {};
    const center = el.center || {};
    if (!center.lat || !center.lon) continue;

    const h = tags.height ? parseFloat(String(tags.height).replace(/\s*m$/, "")) : null;
    const levels = tags["building:levels"] ? parseInt(tags["building:levels"]) : null;
    const heightM = h ?? (levels ? levels * 3 : 0);
    if (heightM <= 0) continue;

    buildings.push({
      id: el.id,
      name: tags.name || null,
      heightM: Math.round(heightM * 10) / 10,
      heightFt: Math.round(heightM * 3.28084),
      levels,
      lat: center.lat,
      lng: center.lon,
      distanceM: Math.round(haversineM(fac.lat, fac.lng, center.lat, center.lon)),
      bearing: Math.round(bearing(fac.lat, fac.lng, center.lat, center.lon)),
    });
  }

  return buildings.sort((a, b) => b.heightM - a.heightM);
}

async function main() {
  for (const fac of FACILITIES) {
    console.log(`\n=== ${fac.name} (${fac.id}) ===`);
    try {
      const buildings = await fetchBuildings(fac);
      console.log(`  ${buildings.length} buildings with height data`);

      // Stats
      const above30m = buildings.filter(b => b.heightM >= 30);
      const above50m = buildings.filter(b => b.heightM >= 50);
      const tallest = buildings[0];
      console.log(`  Above 30m (100ft): ${above30m.length}`);
      console.log(`  Above 50m (164ft): ${above50m.length}`);
      if (tallest) console.log(`  Tallest: ${tallest.name || "unnamed"} — ${tallest.heightM}m (${tallest.heightFt}ft) at ${tallest.distanceM}m, bearing ${tallest.bearing}°`);

      // Check wind alignment
      const windAligned = buildings.filter(b => {
        const diff = Math.abs(b.bearing - fac.prevailingWind.degFrom);
        const wrap = diff > 180 ? 360 - diff : diff;
        return wrap < 45 && b.heightM >= 20;
      });
      console.log(`  Buildings in prevailing wind path (${fac.prevailingWind.direction} ±45°, >20m): ${windAligned.length}`);

      const output = {
        facilityId: fac.id,
        facilityName: fac.name,
        lat: fac.lat,
        lng: fac.lng,
        radiusM: fac.radiusM,
        prevailingWind: fac.prevailingWind,
        approachCorridors: fac.approachCorridors || null,
        fetchedAt: new Date().toISOString(),
        buildingCount: buildings.length,
        above30m: above30m.length,
        above50m: above50m.length,
        tallestHeightFt: tallest?.heightFt || 0,
        buildings,
      };

      const outPath = path.join(OUT_DIR, `${fac.id}.json`);
      writeFileSync(outPath, JSON.stringify(output, null, 2));
      console.log(`  Written to ${outPath}`);

      // Rate limit for Overpass
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.error(`  Error: ${err}`);
    }
  }

  console.log("\nDone.");
}

main();
