/**
 * FAA NASR 5010 Heliport Ingestion Script
 *
 * Downloads the FAA NASR APT_BASE.csv, filters heliports, geocodes to
 * AirIndex metro areas, and loads into the Heliport table.
 *
 * Usage: npx tsx scripts/ingest-heliports.ts [--dry-run]
 *
 * Data source: FAA NASR 28-Day Subscription (APT CSV segment)
 */

import { PrismaClient } from "@prisma/client";
import { existsSync, mkdirSync } from "fs";
import { readFile } from "fs/promises";
import { execSync } from "child_process";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import path from "path";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

// ── Metro area bounding boxes ─────────────────────────────────────
const METRO_BOUNDS: Record<string, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
  los_angeles:    { minLat: 33.60, maxLat: 34.35, minLng: -118.70, maxLng: -117.65 },
  new_york:       { minLat: 40.45, maxLat: 41.00, minLng: -74.30, maxLng: -73.65 },
  dallas:         { minLat: 32.55, maxLat: 33.10, minLng: -97.40, maxLng: -96.50 },
  miami:          { minLat: 25.55, maxLat: 26.10, minLng: -80.50, maxLng: -80.05 },
  orlando:        { minLat: 28.20, maxLat: 28.80, minLng: -81.60, maxLng: -81.00 },
  las_vegas:      { minLat: 35.90, maxLat: 36.35, minLng: -115.40, maxLng: -114.90 },
  chicago:        { minLat: 41.60, maxLat: 42.10, minLng: -88.00, maxLng: -87.50 },
  houston:        { minLat: 29.50, maxLat: 30.10, minLng: -95.80, maxLng: -95.00 },
  san_francisco:  { minLat: 37.20, maxLat: 37.90, minLng: -122.55, maxLng: -121.80 },
  denver:         { minLat: 39.50, maxLat: 39.95, minLng: -105.20, maxLng: -104.70 },
  phoenix:        { minLat: 33.20, maxLat: 33.75, minLng: -112.30, maxLng: -111.70 },
  atlanta:        { minLat: 33.55, maxLat: 34.00, minLng: -84.60, maxLng: -84.15 },
  seattle:        { minLat: 47.35, maxLat: 47.80, minLng: -122.50, maxLng: -122.10 },
  washington_dc:  { minLat: 38.70, maxLat: 39.10, minLng: -77.25, maxLng: -76.85 },
  boston:          { minLat: 42.20, maxLat: 42.50, minLng: -71.25, maxLng: -70.90 },
  tampa:          { minLat: 27.70, maxLat: 28.15, minLng: -82.70, maxLng: -82.30 },
  austin:         { minLat: 30.10, maxLat: 30.55, minLng: -97.95, maxLng: -97.55 },
  nashville:      { minLat: 35.95, maxLat: 36.30, minLng: -87.00, maxLng: -86.55 },
  detroit:        { minLat: 42.15, maxLat: 42.55, minLng: -83.35, maxLng: -82.85 },
  columbus:       { minLat: 39.80, maxLat: 40.15, minLng: -83.15, maxLng: -82.75 },
  san_diego:      { minLat: 32.60, maxLat: 33.05, minLng: -117.30, maxLng: -116.90 },
  charlotte:      { minLat: 35.05, maxLat: 35.45, minLng: -81.00, maxLng: -80.65 },
  minneapolis:    { minLat: 44.80, maxLat: 45.15, minLng: -93.50, maxLng: -93.05 },
};

function matchMetro(lat: number, lng: number): string | null {
  for (const [cityId, bounds] of Object.entries(METRO_BOUNDS)) {
    if (lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng) {
      return cityId;
    }
  }
  return null;
}

// ── CSV parser (handles quoted fields with commas) ────────────────
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

// ── Download data ─────────────────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), "data", "nasr");
const CSV_FILE = path.join(DATA_DIR, "APT_BASE.csv");
const RWY_FILE = path.join(DATA_DIR, "APT_RWY.csv");

async function ensureData(): Promise<string> {
  if (existsSync(CSV_FILE)) {
    console.log("APT_BASE.csv already exists, skipping download");
    return CSV_FILE;
  }

  mkdirSync(DATA_DIR, { recursive: true });

  // Find current NASR subscription page
  const indexUrl = "https://www.faa.gov/air_traffic/flight_info/aeronav/aero_data/NASR_Subscription/";
  console.log("Fetching NASR subscription page...");
  const indexRes = await fetch(indexUrl);
  const indexHtml = await indexRes.text();

  // Find the APT CSV zip link
  const csvMatch = indexHtml.match(/href="([^"]*APT_CSV\.zip)"/);
  if (!csvMatch) {
    throw new Error("Could not find APT CSV download link on FAA page");
  }

  const csvUrl = csvMatch[1];
  const zipPath = path.join(DATA_DIR, "apt_csv.zip");

  console.log(`Downloading ${csvUrl}...`);
  const zipRes = await fetch(csvUrl);
  if (!zipRes.ok) throw new Error(`Download failed: ${zipRes.status}`);

  const fileStream = createWriteStream(zipPath);
  // @ts-expect-error Node stream type mismatch
  await pipeline(zipRes.body!, fileStream);

  console.log("Extracting APT_BASE.csv...");
  execSync(`unzip -o -j "${zipPath}" "APT_BASE.csv" -d "${DATA_DIR}"`, { stdio: "pipe" });

  if (!existsSync(CSV_FILE)) {
    throw new Error("APT_BASE.csv not found after extraction");
  }

  console.log("Download complete");
  return CSV_FILE;
}

// ── Main ──────────────────────────────────────────────────────────

interface HeliportRecord {
  id: string;
  facilityName: string;
  city: string;
  state: string;
  county: string;
  ownershipType: string;
  useType: string;
  lat: number;
  lng: number;
  elevation: number | null;
  statusCode: string;
  padLengthFt: number | null;
  padWidthFt: number | null;
  surfaceType: string | null;
  surfaceCondition: string | null;
  activationDate: string | null;
  lastInfoResponse: string | null;
  lastInspection: string | null;
  positionSrcDate: string | null;
  elevationSrcDate: string | null;
}

interface RwyRecord {
  arptId: string;
  rwyLen: number | null;
  rwyWidth: number | null;
  surfaceType: string | null;
  condition: string | null;
}

async function loadRwyDimensions(): Promise<Map<string, RwyRecord>> {
  const map = new Map<string, RwyRecord>();
  if (!existsSync(RWY_FILE)) {
    console.log("APT_RWY.csv not found — skipping pad dimensions");
    return map;
  }
  const content = await readFile(RWY_FILE, "utf-8");
  const lines = content.split("\n");
  const header = parseCSVLine(lines[0]);
  const col = (name: string) => header.indexOf(name);

  const iSiteType = col("SITE_TYPE_CODE");
  const iArptId = col("ARPT_ID");
  const iLen = col("RWY_LEN");
  const iWidth = col("RWY_WIDTH");
  const iSurface = col("SURFACE_TYPE_CODE");
  const iCond = col("COND");

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const fields = parseCSVLine(line);
    if (fields[iSiteType] !== "H") continue;

    const arptId = fields[iArptId];
    const rwyLen = parseInt(fields[iLen]);
    const rwyWidth = parseInt(fields[iWidth]);

    // Keep the first pad per facility (H1 is primary)
    if (!map.has(arptId)) {
      map.set(arptId, {
        arptId,
        rwyLen: isNaN(rwyLen) ? null : rwyLen,
        rwyWidth: isNaN(rwyWidth) ? null : rwyWidth,
        surfaceType: fields[iSurface] || null,
        condition: fields[iCond] || null,
      });
    }
  }

  console.log(`Loaded pad dimensions for ${map.size} heliports from APT_RWY.csv`);
  return map;
}

async function main() {
  console.log("=== FAA NASR 5010 Heliport Ingestion ===");
  if (DRY_RUN) console.log("(DRY RUN — no database writes)\n");

  const csvPath = await ensureData();
  const rwyDims = await loadRwyDimensions();
  const content = await readFile(csvPath, "utf-8");
  const lines = content.split("\n");

  // Parse header
  const header = parseCSVLine(lines[0]);
  const col = (name: string) => header.indexOf(name);

  const iSiteType = col("SITE_TYPE_CODE");
  const iArptId = col("ARPT_ID");
  const iCity = col("CITY");
  const iState = col("STATE_CODE");
  const iCounty = col("COUNTY_NAME");
  const iName = col("ARPT_NAME");
  const iOwnership = col("OWNERSHIP_TYPE_CODE");
  const iUse = col("FACILITY_USE_CODE");
  const iLatDec = col("LAT_DECIMAL");
  const iLngDec = col("LONG_DECIMAL");
  const iElev = col("ELEV");
  const iStatus = col("ARPT_STATUS");
  const iActivation = col("ACTIVATION_DATE");
  const iLastInfo = col("LAST_INFO_RESPONSE");
  const iLastInspection = col("LAST_INSPECTION");
  const iPosSrcDate = col("POSITION_SRC_DATE");
  const iElevSrcDate = col("ELEVATION_SRC_DATE");

  console.log(`Parsing ${(lines.length - 1).toLocaleString()} APT records...`);

  const heliports: HeliportRecord[] = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCSVLine(line);
    if (fields[iSiteType] !== "H") continue; // H = Heliport

    const lat = parseFloat(fields[iLatDec]);
    const lng = parseFloat(fields[iLngDec]);

    if (isNaN(lat) || isNaN(lng)) {
      skipped++;
      continue;
    }

    // LONG_DECIMAL in NASR is positive for West; negate for standard convention
    const lngNormalized = lng > 0 ? -lng : lng;

    const elev = parseFloat(fields[iElev]);
    const rwy = rwyDims.get(fields[iArptId]);

    heliports.push({
      id: fields[iArptId],
      facilityName: fields[iName],
      city: fields[iCity],
      state: fields[iState],
      county: fields[iCounty],
      ownershipType: fields[iOwnership] || "PR",
      useType: fields[iUse] || "PR",
      lat,
      lng: lngNormalized,
      elevation: isNaN(elev) ? null : elev,
      statusCode: fields[iStatus] || "O",
      padLengthFt: rwy?.rwyLen ?? null,
      padWidthFt: rwy?.rwyWidth ?? null,
      surfaceType: rwy?.surfaceType ?? null,
      surfaceCondition: rwy?.condition ?? null,
      activationDate: fields[iActivation] || null,
      lastInfoResponse: fields[iLastInfo] || null,
      lastInspection: fields[iLastInspection] || null,
      positionSrcDate: fields[iPosSrcDate] || null,
      elevationSrcDate: fields[iElevSrcDate] || null,
    });
  }

  console.log(`Found ${heliports.length.toLocaleString()} heliports (${skipped} parse errors)`);

  // Filter to operational only
  const operational = heliports.filter((h) => h.statusCode === "O");
  console.log(`Operational: ${operational.length.toLocaleString()}`);

  // Geocode to metros
  const metroCounts: Record<string, { total: number; publicUse: number; facilities: HeliportRecord[] }> = {};
  let matched = 0;

  for (const h of operational) {
    const cityId = matchMetro(h.lat, h.lng);
    if (cityId) {
      matched++;
      if (!metroCounts[cityId]) metroCounts[cityId] = { total: 0, publicUse: 0, facilities: [] };
      metroCounts[cityId].total++;
      if (h.useType === "PU") metroCounts[cityId].publicUse++;
      metroCounts[cityId].facilities.push(h);
    }
  }

  console.log(`\nMatched ${matched} heliports to ${Object.keys(metroCounts).length} tracked metros:\n`);
  const sorted = Object.entries(metroCounts).sort((a, b) => b[1].total - a[1].total);
  for (const [cityId, counts] of sorted) {
    console.log(`  ${cityId.padEnd(18)} ${String(counts.total).padStart(4)} total  ${String(counts.publicUse).padStart(3)} public-use`);
  }

  // Output seed.ts format
  console.log("\n=== SEED DATA (heliportCount / heliportPublicCount) ===");
  for (const [cityId, counts] of sorted) {
    console.log(`  ${cityId}: { heliportCount: ${counts.total}, heliportPublicCount: ${counts.publicUse} },`);
  }

  if (DRY_RUN) {
    console.log("\n(Dry run — skipping database writes)");
    await prisma.$disconnect();
    return;
  }

  // Write to database
  console.log(`\nWriting ${operational.length.toLocaleString()} heliports to database...`);
  await prisma.heliport.deleteMany();

  const BATCH_SIZE = 500;
  let written = 0;
  for (let i = 0; i < operational.length; i += BATCH_SIZE) {
    const batch = operational.slice(i, i + BATCH_SIZE);
    await prisma.heliport.createMany({
      data: batch.map((h) => ({
        id: h.id,
        facilityName: h.facilityName,
        city: h.city,
        state: h.state,
        county: h.county,
        ownershipType: h.ownershipType,
        useType: h.useType,
        lat: h.lat,
        lng: h.lng,
        elevation: h.elevation,
        statusCode: h.statusCode,
        cityId: matchMetro(h.lat, h.lng),
        padLengthFt: h.padLengthFt,
        padWidthFt: h.padWidthFt,
        surfaceType: h.surfaceType,
        surfaceCondition: h.surfaceCondition,
        activationDate: h.activationDate,
        lastInfoResponse: h.lastInfoResponse,
        lastInspection: h.lastInspection,
        positionSrcDate: h.positionSrcDate,
        elevationSrcDate: h.elevationSrcDate,
      })),
      skipDuplicates: true,
    });
    written += batch.length;
    if (written % 2000 === 0 || i + BATCH_SIZE >= operational.length) {
      console.log(`  ${written.toLocaleString()} / ${operational.length.toLocaleString()}`);
    }
  }

  console.log("\nDone.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  prisma.$disconnect();
  process.exit(1);
});
