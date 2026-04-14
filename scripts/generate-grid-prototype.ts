/**
 * Heliport/ASOS Grid Prototype Generator
 *
 * Produces per-market 5-nautical-mile grid visualizations showing:
 *   - Coverage tier per cell (full / partial / none based on ASOS proximity)
 *   - Candidate sites (heliports, airports, pre-dev facilities) plotted on grid
 *   - ASOS reference stations
 *   - Per-cell data drillable from a side panel
 *
 * From Don Berchoff's April 13 guidance: set up a grid, rate each cell,
 * basic tier = ASOS coverage only, upsell = TruWeather overlay.
 *
 * Output:
 *   private/docs/grid/index.html              — links to all market pages
 *   private/docs/grid/<market>.html           — per-market visualization
 *   private/docs/grid/data/grid_cells.json    — full cell data (all markets)
 *   private/docs/grid/data/grid_rollup.csv    — per-market summary
 *
 * Usage:
 *   npx tsx scripts/generate-grid-prototype.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { CITIES } from "../src/data/seed";

// ──────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────

// Metro bounding boxes (same as v1.4 analysis)
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
  boston:         { minLat: 42.20, maxLat: 42.50, minLng: -71.25, maxLng: -70.90 },
  tampa:          { minLat: 27.70, maxLat: 28.15, minLng: -82.70, maxLng: -82.30 },
  austin:         { minLat: 30.10, maxLat: 30.55, minLng: -97.95, maxLng: -97.55 },
  nashville:      { minLat: 35.95, maxLat: 36.30, minLng: -87.00, maxLng: -86.55 },
  columbus:       { minLat: 39.80, maxLat: 40.15, minLng: -83.15, maxLng: -82.75 },
  san_diego:      { minLat: 32.60, maxLat: 33.05, minLng: -117.30, maxLng: -116.90 },
  charlotte:      { minLat: 35.05, maxLat: 35.45, minLng: -81.00, maxLng: -80.65 },
  minneapolis:    { minLat: 44.80, maxLat: 45.15, minLng: -93.50, maxLng: -93.05 },
};

// ASOS stations (same as v1.4 analysis)
interface AsosStation { id: string; name: string; state: string; lat: number; lng: number; }
const ASOS_STATIONS: AsosStation[] = [
  { id: "MIA", name: "Miami International", state: "FL", lat: 25.7959, lng: -80.2870 },
  { id: "FLL", name: "Fort Lauderdale-Hollywood Intl", state: "FL", lat: 26.0726, lng: -80.1527 },
  { id: "OPF", name: "Miami-Opa Locka Executive", state: "FL", lat: 25.9070, lng: -80.2784 },
  { id: "TMB", name: "Miami Executive", state: "FL", lat: 25.6479, lng: -80.4328 },
  { id: "HWO", name: "North Perry (Hollywood)", state: "FL", lat: 26.0015, lng: -80.2407 },
  { id: "PBI", name: "Palm Beach International", state: "FL", lat: 26.6832, lng: -80.0956 },
  { id: "BCT", name: "Boca Raton", state: "FL", lat: 26.3785, lng: -80.1077 },
  { id: "MCO", name: "Orlando International", state: "FL", lat: 28.4312, lng: -81.3081 },
  { id: "SFB", name: "Orlando Sanford Intl", state: "FL", lat: 28.7776, lng: -81.2375 },
  { id: "ORL", name: "Orlando Executive", state: "FL", lat: 28.5455, lng: -81.3329 },
  { id: "ISM", name: "Kissimmee Gateway", state: "FL", lat: 28.2898, lng: -81.4371 },
  { id: "TPA", name: "Tampa International", state: "FL", lat: 27.9755, lng: -82.5332 },
  { id: "PIE", name: "St. Pete-Clearwater Intl", state: "FL", lat: 27.9115, lng: -82.6874 },
  { id: "TPF", name: "Peter O Knight", state: "FL", lat: 27.9155, lng: -82.4493 },
  { id: "LAL", name: "Lakeland Linder Intl", state: "FL", lat: 27.9889, lng: -82.0186 },
  { id: "DAB", name: "Daytona Beach Intl", state: "FL", lat: 29.1799, lng: -81.0581 },
  { id: "MLB", name: "Melbourne Intl", state: "FL", lat: 28.1028, lng: -80.6453 },
  { id: "VRB", name: "Vero Beach Regional", state: "FL", lat: 27.6556, lng: -80.4179 },
  { id: "LAX", name: "Los Angeles Intl", state: "CA", lat: 33.9425, lng: -118.4081 },
  { id: "BUR", name: "Hollywood Burbank", state: "CA", lat: 34.2007, lng: -118.3587 },
  { id: "LGB", name: "Long Beach", state: "CA", lat: 33.8178, lng: -118.1516 },
  { id: "SNA", name: "John Wayne / Orange County", state: "CA", lat: 33.6757, lng: -117.8683 },
  { id: "VNY", name: "Van Nuys", state: "CA", lat: 34.2098, lng: -118.4901 },
  { id: "ONT", name: "Ontario Intl", state: "CA", lat: 34.0559, lng: -117.6005 },
  { id: "SMO", name: "Santa Monica", state: "CA", lat: 34.0158, lng: -118.4513 },
  { id: "HHR", name: "Hawthorne Municipal", state: "CA", lat: 33.9228, lng: -118.3352 },
  { id: "SFO", name: "San Francisco Intl", state: "CA", lat: 37.6213, lng: -122.3790 },
  { id: "OAK", name: "Oakland Intl", state: "CA", lat: 37.7213, lng: -122.2207 },
  { id: "SJC", name: "San Jose Intl", state: "CA", lat: 37.3639, lng: -121.9289 },
  { id: "HWD", name: "Hayward Executive", state: "CA", lat: 37.6589, lng: -122.1217 },
  { id: "SAN", name: "San Diego Intl", state: "CA", lat: 32.7338, lng: -117.1933 },
  { id: "MYF", name: "Montgomery Field", state: "CA", lat: 32.8156, lng: -117.1396 },
  { id: "DFW", name: "Dallas/Fort Worth Intl", state: "TX", lat: 32.8998, lng: -97.0403 },
  { id: "DAL", name: "Dallas Love Field", state: "TX", lat: 32.8471, lng: -96.8518 },
  { id: "AFW", name: "Alliance (Fort Worth)", state: "TX", lat: 32.9874, lng: -97.3187 },
  { id: "FTW", name: "Meacham (Fort Worth)", state: "TX", lat: 32.8198, lng: -97.3624 },
  { id: "ADS", name: "Addison", state: "TX", lat: 32.9687, lng: -96.8364 },
  { id: "IAH", name: "George Bush Intercontinental", state: "TX", lat: 29.9902, lng: -95.3368 },
  { id: "HOU", name: "William P. Hobby", state: "TX", lat: 29.6454, lng: -95.2789 },
  { id: "EFD", name: "Ellington Field", state: "TX", lat: 29.6073, lng: -95.1588 },
  { id: "DWH", name: "David Wayne Hooks", state: "TX", lat: 30.0618, lng: -95.5526 },
  { id: "AUS", name: "Austin-Bergstrom Intl", state: "TX", lat: 30.1945, lng: -97.6699 },
  { id: "SAT", name: "San Antonio Intl", state: "TX", lat: 29.5337, lng: -98.4698 },
  { id: "PHX", name: "Phoenix Sky Harbor", state: "AZ", lat: 33.4373, lng: -112.0078 },
  { id: "SDL", name: "Scottsdale", state: "AZ", lat: 33.6229, lng: -111.9105 },
  { id: "DVT", name: "Phoenix Deer Valley", state: "AZ", lat: 33.6883, lng: -112.0826 },
  { id: "CHD", name: "Chandler Municipal", state: "AZ", lat: 33.2691, lng: -111.8108 },
  { id: "FFZ", name: "Falcon Field (Mesa)", state: "AZ", lat: 33.4608, lng: -111.7283 },
  { id: "IWA", name: "Phoenix-Mesa Gateway", state: "AZ", lat: 33.3078, lng: -111.6554 },
  { id: "GYR", name: "Goodyear", state: "AZ", lat: 33.4225, lng: -112.3758 },
  { id: "JFK", name: "John F. Kennedy Intl", state: "NY", lat: 40.6413, lng: -73.7781 },
  { id: "LGA", name: "LaGuardia", state: "NY", lat: 40.7769, lng: -73.8740 },
  { id: "EWR", name: "Newark Liberty Intl", state: "NJ", lat: 40.6895, lng: -74.1745 },
  { id: "TEB", name: "Teterboro", state: "NJ", lat: 40.8501, lng: -74.0608 },
  { id: "HPN", name: "Westchester County", state: "NY", lat: 41.0670, lng: -73.7076 },
  { id: "FRG", name: "Republic (Farmingdale)", state: "NY", lat: 40.7288, lng: -73.4134 },
  { id: "ISP", name: "Long Island MacArthur", state: "NY", lat: 40.7952, lng: -73.1002 },
  { id: "ORD", name: "Chicago O'Hare", state: "IL", lat: 41.9786, lng: -87.9048 },
  { id: "MDW", name: "Chicago Midway", state: "IL", lat: 41.7868, lng: -87.7522 },
  { id: "PWK", name: "Chicago Executive", state: "IL", lat: 42.1142, lng: -87.9015 },
  { id: "DPA", name: "DuPage", state: "IL", lat: 41.9078, lng: -88.2486 },
  { id: "LAS", name: "Harry Reid Intl (Las Vegas)", state: "NV", lat: 36.0840, lng: -115.1537 },
  { id: "VGT", name: "North Las Vegas", state: "NV", lat: 36.2107, lng: -115.1942 },
  { id: "HND", name: "Henderson Executive", state: "NV", lat: 35.9728, lng: -115.1344 },
  { id: "DEN", name: "Denver Intl", state: "CO", lat: 39.8561, lng: -104.6737 },
  { id: "APA", name: "Centennial", state: "CO", lat: 39.5701, lng: -104.8487 },
  { id: "BJC", name: "Rocky Mountain Metro", state: "CO", lat: 39.9088, lng: -105.1172 },
  { id: "ATL", name: "Hartsfield-Jackson Atlanta Intl", state: "GA", lat: 33.6407, lng: -84.4277 },
  { id: "PDK", name: "DeKalb-Peachtree", state: "GA", lat: 33.8756, lng: -84.3020 },
  { id: "FTY", name: "Fulton County Brown Field", state: "GA", lat: 33.7790, lng: -84.5215 },
  { id: "SEA", name: "Seattle-Tacoma Intl", state: "WA", lat: 47.4502, lng: -122.3088 },
  { id: "BFI", name: "King County Intl (Boeing Field)", state: "WA", lat: 47.5300, lng: -122.3020 },
  { id: "PAE", name: "Paine Field (Everett)", state: "WA", lat: 47.9063, lng: -122.2815 },
  { id: "BOS", name: "Boston Logan Intl", state: "MA", lat: 42.3656, lng: -71.0096 },
  { id: "BED", name: "Hanscom Field", state: "MA", lat: 42.4700, lng: -71.2890 },
  { id: "DCA", name: "Reagan National", state: "DC", lat: 38.8512, lng: -77.0402 },
  { id: "IAD", name: "Washington Dulles Intl", state: "VA", lat: 38.9531, lng: -77.4565 },
  { id: "BWI", name: "Baltimore/Washington Intl", state: "MD", lat: 39.1754, lng: -76.6684 },
  { id: "BNA", name: "Nashville Intl", state: "TN", lat: 36.1263, lng: -86.6774 },
  { id: "JWN", name: "John C. Tune", state: "TN", lat: 36.1824, lng: -86.8870 },
  { id: "CLT", name: "Charlotte Douglas Intl", state: "NC", lat: 35.2140, lng: -80.9431 },
  { id: "JQF", name: "Concord-Padgett Regional", state: "NC", lat: 35.3878, lng: -80.7091 },
  { id: "MSP", name: "Minneapolis-St. Paul Intl", state: "MN", lat: 44.8848, lng: -93.2223 },
  { id: "STP", name: "St. Paul Downtown", state: "MN", lat: 44.9345, lng: -93.0600 },
  { id: "FCM", name: "Flying Cloud (Eden Prairie)", state: "MN", lat: 44.8272, lng: -93.4570 },
  { id: "CMH", name: "John Glenn Columbus Intl", state: "OH", lat: 39.9980, lng: -82.8919 },
  { id: "LCK", name: "Rickenbacker Intl", state: "OH", lat: 39.8138, lng: -82.9278 },
];

const EARTH_RADIUS_NM = 3440.065;
const CELL_SIZE_NM = 5;

function haversineNm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_NM * Math.asin(Math.sqrt(a));
}

function nearestAsos(lat: number, lng: number) {
  let nearest = ASOS_STATIONS[0];
  let minDist = Infinity;
  for (const s of ASOS_STATIONS) {
    const d = haversineNm(lat, lng, s.lat, s.lng);
    if (d < minDist) { minDist = d; nearest = s; }
  }
  return { station: nearest, distanceNm: minDist };
}

function asosProximityCredit(distanceNm: number): number {
  if (distanceNm <= 5) return 5;
  if (distanceNm <= 10) return 2;
  return 0;
}

function coverageTier(distanceNm: number): "full" | "partial" | "none" {
  if (distanceNm <= 5) return "full";
  if (distanceNm <= 10) return "partial";
  return "none";
}

function matchMetro(lat: number, lng: number): string | null {
  for (const [id, b] of Object.entries(METRO_BOUNDS)) {
    if (lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng) return id;
  }
  return null;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuote = !inQuote;
    else if (ch === "," && !inQuote) { fields.push(cur); cur = ""; }
    else cur += ch;
  }
  fields.push(cur);
  return fields;
}

// ──────────────────────────────────────────────────────────
// Data models
// ──────────────────────────────────────────────────────────

interface Site {
  id: string;
  name: string;
  class: "heliport" | "airport" | "pre_dev";
  lat: number;
  lng: number;
  marketId: string;
  nearestAsos: string;
  distanceNm: number;
  asosCredit: number;
}

interface GridCell {
  cellId: string;
  marketId: string;
  row: number;
  col: number;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  centroidLat: number;
  centroidLng: number;
  nearestAsosId: string;
  nearestAsosDistanceNm: number;
  tier: "full" | "partial" | "none";
  centroidCredit: number;
  siteIds: string[];
}

interface MarketGrid {
  marketId: string;
  cityName: string;
  state: string;
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  centerLat: number;
  latStepDeg: number;
  lngStepDeg: number;
  rows: number;
  cols: number;
  cells: GridCell[];
  sites: Site[];
  asosInRegion: AsosStation[];
  summary: {
    totalCells: number;
    cellsWithSites: number;
    cellsFull: number;
    cellsPartial: number;
    cellsNone: number;
    avgCoverageCredit: number;
  };
}

// ──────────────────────────────────────────────────────────
// Load candidate sites from FAA NASR
// ──────────────────────────────────────────────────────────

function loadSites(): Site[] {
  const csvPath = join(process.cwd(), "data", "nasr", "APT_BASE.csv");
  if (!existsSync(csvPath)) throw new Error(`APT_BASE.csv not found at ${csvPath}`);
  const csv = readFileSync(csvPath, "utf8");
  const lines = csv.split("\n");
  const header = parseCsvLine(lines[0]);
  const col = (name: string) => header.indexOf(name);
  const SITE_TYPE_CODE = col("SITE_TYPE_CODE");
  const LAT_DECIMAL = col("LAT_DECIMAL");
  const LONG_DECIMAL = col("LONG_DECIMAL");
  const ARPT_ID = col("ARPT_ID");
  const ARPT_NAME = col("ARPT_NAME");
  const ARPT_STATUS = col("ARPT_STATUS");

  const sites: Site[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const row = parseCsvLine(lines[i]);
    if (row.length < 10) continue;
    const siteType = row[SITE_TYPE_CODE];
    if (siteType !== "H" && siteType !== "A") continue;
    if (row[ARPT_STATUS] !== "O") continue;
    const lat = parseFloat(row[LAT_DECIMAL]);
    const rawLng = parseFloat(row[LONG_DECIMAL]);
    const lng = rawLng > 0 ? -rawLng : rawLng;
    if (isNaN(lat) || isNaN(lng)) continue;
    const marketId = matchMetro(lat, lng);
    if (!marketId) continue;
    const { station, distanceNm } = nearestAsos(lat, lng);
    sites.push({
      id: row[ARPT_ID],
      name: row[ARPT_NAME],
      class: siteType === "H" ? "heliport" : "airport",
      lat,
      lng,
      marketId,
      nearestAsos: station.id,
      distanceNm: Math.round(distanceNm * 10) / 10,
      asosCredit: asosProximityCredit(distanceNm),
    });
  }

  // Add pre-dev facilities
  // Dynamic import to avoid circular dependency at top of file
  const { PRE_DEVELOPMENT_FACILITIES } = require("../src/data/pre-development-facilities");
  for (const f of PRE_DEVELOPMENT_FACILITIES) {
    if (!f.marketId) continue;
    const { station, distanceNm } = nearestAsos(f.lat, f.lng);
    sites.push({
      id: f.id,
      name: f.name,
      class: "pre_dev",
      lat: f.lat,
      lng: f.lng,
      marketId: f.marketId,
      nearestAsos: station.id,
      distanceNm: Math.round(distanceNm * 10) / 10,
      asosCredit: asosProximityCredit(distanceNm),
    });
  }

  return sites;
}

// ──────────────────────────────────────────────────────────
// Build grid for a market
// ──────────────────────────────────────────────────────────

function buildMarketGrid(marketId: string, sitesAll: Site[]): MarketGrid | null {
  const bounds = METRO_BOUNDS[marketId];
  if (!bounds) return null;
  const city = CITIES.find((c) => c.id === marketId);
  if (!city) return null;

  const centerLat = (bounds.minLat + bounds.maxLat) / 2;
  const latStepDeg = CELL_SIZE_NM / 60; // 1° lat = 60 nm
  const lngStepDeg = CELL_SIZE_NM / (60 * Math.cos((centerLat * Math.PI) / 180));

  const rows = Math.ceil((bounds.maxLat - bounds.minLat) / latStepDeg);
  const cols = Math.ceil((bounds.maxLng - bounds.minLng) / lngStepDeg);

  const marketSites = sitesAll.filter((s) => s.marketId === marketId);
  const cells: GridCell[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const minLat = bounds.minLat + r * latStepDeg;
      const maxLat = Math.min(bounds.maxLat, minLat + latStepDeg);
      const minLng = bounds.minLng + c * lngStepDeg;
      const maxLng = Math.min(bounds.maxLng, minLng + lngStepDeg);
      const centroidLat = (minLat + maxLat) / 2;
      const centroidLng = (minLng + maxLng) / 2;
      const { station, distanceNm } = nearestAsos(centroidLat, centroidLng);
      const tier = coverageTier(distanceNm);
      const credit = asosProximityCredit(distanceNm);
      const sitesInCell = marketSites.filter(
        (s) => s.lat >= minLat && s.lat <= maxLat && s.lng >= minLng && s.lng <= maxLng,
      );
      cells.push({
        cellId: `${marketId}_${r}_${c}`,
        marketId,
        row: r,
        col: c,
        minLat, maxLat, minLng, maxLng,
        centroidLat, centroidLng,
        nearestAsosId: station.id,
        nearestAsosDistanceNm: Math.round(distanceNm * 10) / 10,
        tier,
        centroidCredit: credit,
        siteIds: sitesInCell.map((s) => s.id),
      });
    }
  }

  const cellsWithSites = cells.filter((c) => c.siteIds.length > 0).length;
  const cellsFull = cells.filter((c) => c.tier === "full").length;
  const cellsPartial = cells.filter((c) => c.tier === "partial").length;
  const cellsNone = cells.filter((c) => c.tier === "none").length;
  // Weighted: only cells with sites contribute
  const cellsWithData = cells.filter((c) => c.siteIds.length > 0);
  const avgCoverageCredit = cellsWithData.length > 0
    ? cellsWithData.reduce((s, c) => s + c.centroidCredit, 0) / cellsWithData.length
    : 0;

  // Determine ASOS stations "in region" — within ~10nm of bbox for display
  const asosInRegion = ASOS_STATIONS.filter((a) => {
    // Simple check: is ASOS within bbox or within 10nm of bbox center?
    const centerLng = (bounds.minLng + bounds.maxLng) / 2;
    return haversineNm(centerLat, centerLng, a.lat, a.lng) < 30; // generous
  });

  return {
    marketId,
    cityName: city.city,
    state: city.state,
    bbox: bounds,
    centerLat,
    latStepDeg,
    lngStepDeg,
    rows,
    cols,
    cells,
    sites: marketSites,
    asosInRegion,
    summary: {
      totalCells: cells.length,
      cellsWithSites,
      cellsFull,
      cellsPartial,
      cellsNone,
      avgCoverageCredit: Math.round(avgCoverageCredit * 100) / 100,
    },
  };
}

// ──────────────────────────────────────────────────────────
// HTML visualization per market
// ──────────────────────────────────────────────────────────

function renderMarketHtml(grid: MarketGrid): string {
  const { bbox, rows, cols, latStepDeg, lngStepDeg, cells, sites, asosInRegion, summary } = grid;
  const padding = 40;
  const svgWidth = 760;
  const svgHeight = Math.min(680, Math.round(svgWidth * (rows / cols) * (latStepDeg / lngStepDeg)));
  const cellW = (svgWidth - padding * 2) / cols;
  const cellH = (svgHeight - padding * 2) / rows;

  // Project lat/lng to SVG x/y
  const lngToX = (lng: number) => padding + ((lng - bbox.minLng) / (bbox.maxLng - bbox.minLng)) * (svgWidth - padding * 2);
  const latToY = (lat: number) => padding + ((bbox.maxLat - lat) / (bbox.maxLat - bbox.minLat)) * (svgHeight - padding * 2);

  const tierColor = { full: "#16a34a", partial: "#f59e0b", none: "#ef4444" };
  const tierOpacity = { full: 0.35, partial: 0.25, none: 0.20 };

  // Render cells
  const cellsSvg = cells.map((c) => {
    const x = lngToX(c.minLng);
    const y = latToY(c.maxLat);
    const w = lngToX(c.maxLng) - x;
    const h = latToY(c.minLat) - y;
    const fill = tierColor[c.tier];
    const op = tierOpacity[c.tier];
    const title = `Cell ${c.row}/${c.col} — ${c.tier.toUpperCase()} (${c.nearestAsosDistanceNm}nm from ${c.nearestAsosId}, ${c.siteIds.length} sites)`;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" fill-opacity="${op}" stroke="#cbd5e1" stroke-width="0.5"><title>${title}</title></rect>`;
  }).join("");

  // Sites: heliport=circle, airport=square, pre_dev=triangle
  const sitesSvg = sites.map((s) => {
    const x = lngToX(s.lng);
    const y = latToY(s.lat);
    const title = `${s.name} (${s.class}) — ${s.distanceNm}nm from ${s.nearestAsos}, credit ${s.asosCredit}/5`;
    if (s.class === "heliport") {
      return `<circle cx="${x}" cy="${y}" r="3" fill="#1e40af" stroke="#fff" stroke-width="0.5"><title>${title}</title></circle>`;
    } else if (s.class === "airport") {
      return `<rect x="${x - 3}" y="${y - 3}" width="6" height="6" fill="#7c3aed" stroke="#fff" stroke-width="0.5"><title>${title}</title></rect>`;
    } else {
      return `<polygon points="${x},${y - 4} ${x - 4},${y + 3} ${x + 4},${y + 3}" fill="#ea580c" stroke="#fff" stroke-width="0.5"><title>${title}</title></polygon>`;
    }
  }).join("");

  // ASOS stations as prominent yellow stars with IDs
  // Draw stars LAST in the SVG order so they sit on top of cells and sites
  const asosSvg = asosInRegion.map((a) => {
    if (a.lat < bbox.minLat - 0.1 || a.lat > bbox.maxLat + 0.1 || a.lng < bbox.minLng - 0.1 || a.lng > bbox.maxLng + 0.1) return "";
    const x = lngToX(a.lng);
    const y = latToY(a.lat);
    if (x < padding - 20 || x > svgWidth - padding + 20 || y < padding - 20 || y > svgHeight - padding + 20) return "";
    const title = `ASOS ${a.id} — ${a.name}`;
    // 10-point star path — larger and bolder than circle-with-unicode
    const starR = 9;
    const innerR = 4;
    const points = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? starR : innerR;
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      points.push(`${x + r * Math.cos(angle)},${y + r * Math.sin(angle)}`);
    }
    return `<g>
      <polygon points="${points.join(" ")}" fill="#fbbf24" stroke="#000" stroke-width="1.5"><title>${title}</title></polygon>
      <text x="${x}" y="${y + starR + 11}" text-anchor="middle" font-size="9" font-weight="700" fill="#000" stroke="#fff" stroke-width="2.5" paint-order="stroke" pointer-events="none">${a.id}</text>
    </g>`;
  }).join("");

  // Side panel: cells with sites, ranked by credit desc
  const populatedCells = cells.filter((c) => c.siteIds.length > 0).sort((a, b) => b.centroidCredit - a.centroidCredit || b.siteIds.length - a.siteIds.length);
  const panelRows = populatedCells.slice(0, 40).map((c) => {
    const tierBadge = `<span style="font-family:monospace;font-size:10px;font-weight:700;letter-spacing:1px;color:${tierColor[c.tier]};">${c.tier.toUpperCase()}</span>`;
    return `<tr>
      <td style="font-family:monospace;font-size:11px;color:#64748b;">${c.row}/${c.col}</td>
      <td style="font-size:11px;">${c.siteIds.length}</td>
      <td style="font-size:11px;">${c.nearestAsosDistanceNm}nm</td>
      <td style="font-size:11px;">${c.centroidCredit}/5</td>
      <td>${tierBadge}</td>
    </tr>`;
  }).join("");

  // Market summary box
  const coveredPct = Math.round((summary.cellsFull / summary.totalCells) * 100);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Grid Prototype — ${grid.cityName}, ${grid.state}</title>
<style>
  body { font-family: -apple-system, 'Helvetica Neue', sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
  header { background: #0f172a; color: #fff; padding: 20px 32px; }
  header h1 { margin: 0 0 4px; font-size: 22px; }
  header .label { font-size: 10px; letter-spacing: 2px; color: #5B8DB8; font-weight: 700; margin-bottom: 6px; text-transform: uppercase; }
  header nav { margin-top: 8px; font-size: 12px; }
  header nav a { color: #94a3b8; text-decoration: none; }
  header nav a:hover { color: #fff; }
  .container { display: grid; grid-template-columns: 1fr 340px; gap: 24px; padding: 24px 32px; max-width: 1200px; margin: 0 auto; }
  .panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; }
  .summary { display: grid; grid-template-columns: 1.4fr repeat(5, 1fr); gap: 10px; margin-bottom: 16px; }
  .stat { text-align: center; padding: 10px; background: #f1f5f9; border-radius: 6px; }
  .stat.headline { background: #1e293b; color: #fff; }
  .stat.headline .stat-value { color: #fbbf24; font-size: 22px; }
  .stat.headline .stat-label { color: #94a3b8; }
  .stat-value { font-family: 'Courier New', monospace; font-size: 18px; font-weight: 700; color: #0f172a; }
  .stat-label { font-size: 9px; letter-spacing: 1px; color: #64748b; margin-top: 2px; text-transform: uppercase; }
  .svg-wrap { background: #f8fafc; border-radius: 8px; padding: 8px; overflow: auto; }
  .legend { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 12px; font-size: 11px; color: #475569; }
  .legend-item { display: flex; align-items: center; gap: 6px; }
  .legend-swatch { width: 14px; height: 14px; border: 1px solid #cbd5e1; }
  h2 { font-size: 13px; font-weight: 700; color: #0f172a; margin: 0 0 12px; letter-spacing: 0.5px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 9px; color: #64748b; letter-spacing: 1px; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 700; text-transform: uppercase; }
  td { padding: 4px 8px; border-bottom: 1px solid #f1f5f9; }
  .methodology { font-size: 11px; color: #64748b; line-height: 1.6; margin-top: 14px; padding-top: 14px; border-top: 1px solid #e2e8f0; }
</style>
</head>
<body>

<header>
  <div class="label">Grid Prototype · ASOS Coverage Analysis</div>
  <h1>${grid.cityName}, ${grid.state}</h1>
  <nav><a href="index.html">← All markets</a> · 5nm × 5nm cells · FAA NPRM Part 108 methodology</nav>
</header>

<div class="container">
  <div class="panel">
    <h2>Coverage Map</h2>
    <div class="summary">
      <div class="stat headline"><div class="stat-value">${summary.avgCoverageCredit}/5</div><div class="stat-label">Weighted Coverage Credit</div></div>
      <div class="stat"><div class="stat-value">${summary.totalCells}</div><div class="stat-label">Total Cells</div></div>
      <div class="stat"><div class="stat-value">${summary.cellsWithSites}</div><div class="stat-label">With Sites</div></div>
      <div class="stat"><div class="stat-value" style="color:#16a34a;">${summary.cellsFull}</div><div class="stat-label">Full Coverage</div></div>
      <div class="stat"><div class="stat-value" style="color:#f59e0b;">${summary.cellsPartial}</div><div class="stat-label">Partial</div></div>
      <div class="stat"><div class="stat-value" style="color:#ef4444;">${summary.cellsNone}</div><div class="stat-label">No Coverage</div></div>
    </div>
    <div class="svg-wrap">
      <svg viewBox="0 0 ${svgWidth} ${svgHeight}" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
        <rect width="${svgWidth}" height="${svgHeight}" fill="#ffffff"/>
        ${cellsSvg}
        ${sitesSvg}
        ${asosSvg}
      </svg>
    </div>
    <div class="legend">
      <div class="legend-item"><div class="legend-swatch" style="background:#16a34a;opacity:0.5;"></div> Full coverage (≤5 nm from ASOS)</div>
      <div class="legend-item"><div class="legend-swatch" style="background:#f59e0b;opacity:0.5;"></div> Partial (5–10 nm)</div>
      <div class="legend-item"><div class="legend-swatch" style="background:#ef4444;opacity:0.5;"></div> No coverage (&gt;10 nm)</div>
      <div class="legend-item">🔵 Heliport</div>
      <div class="legend-item">🟪 Airport</div>
      <div class="legend-item">🔺 Pre-development facility</div>
      <div class="legend-item">⭐ ASOS station</div>
    </div>
    <div class="methodology">
      <strong>Methodology:</strong> The metro bounding box is divided into ${rows} × ${cols} grid cells at 5 nautical miles each.
      Each cell's coverage tier is computed from the distance between its centroid and the nearest ASOS station per FAA NPRM Part 108 (pp.96–98).
      Candidate sites (${grid.sites.filter(s=>s.class==="heliport").length} heliports, ${grid.sites.filter(s=>s.class==="airport").length} airports${grid.sites.filter(s=>s.class==="pre_dev").length ? `, ${grid.sites.filter(s=>s.class==="pre_dev").length} pre-dev facilities` : ""}) are plotted by their actual coordinates.
      The weighted coverage credit shown above averages per-cell credit across cells containing at least one candidate site — the headline output of this analysis, representing ${Math.round(summary.avgCoverageCredit * 20)}% of the maximum possible ASOS proximity score.
    </div>
  </div>

  <aside class="panel">
    <h2>Cells with Candidate Sites</h2>
    <table>
      <thead><tr><th>Cell</th><th>Sites</th><th>ASOS</th><th>Credit</th><th>Tier</th></tr></thead>
      <tbody>${panelRows}</tbody>
    </table>
    ${populatedCells.length > 40 ? `<div style="font-size:10px;color:#64748b;margin-top:8px;">Showing top 40 of ${populatedCells.length} populated cells</div>` : ""}
  </aside>
</div>

</body>
</html>`;
}

function renderIndexHtml(grids: MarketGrid[]): string {
  const rows = grids
    .sort((a, b) => a.cityName.localeCompare(b.cityName))
    .map((g) => {
      const coveragePct = Math.round((g.summary.cellsFull / g.summary.totalCells) * 100);
      return `<tr>
        <td><a href="${g.marketId}.html" style="color:#2563eb;text-decoration:none;font-weight:600;">${g.cityName}, ${g.state}</a></td>
        <td style="font-family:monospace;font-size:11px;color:#64748b;">${g.rows}×${g.cols}</td>
        <td style="text-align:center;">${g.summary.totalCells}</td>
        <td style="text-align:center;">${g.summary.cellsWithSites}</td>
        <td style="text-align:center;color:#16a34a;font-weight:600;">${g.summary.cellsFull}</td>
        <td style="text-align:center;color:#f59e0b;font-weight:600;">${g.summary.cellsPartial}</td>
        <td style="text-align:center;color:#ef4444;font-weight:600;">${g.summary.cellsNone}</td>
        <td style="text-align:center;font-family:monospace;font-weight:700;">${g.summary.avgCoverageCredit}/5</td>
        <td style="text-align:center;font-family:monospace;">${coveragePct}%</td>
      </tr>`;
    }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Heliport/ASOS Grid Prototype — AirIndex</title>
<style>
  body { font-family: -apple-system, 'Helvetica Neue', sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
  header { background: #0f172a; color: #fff; padding: 32px; }
  header .label { font-size: 10px; letter-spacing: 2px; color: #5B8DB8; font-weight: 700; margin-bottom: 6px; text-transform: uppercase; }
  header h1 { margin: 0 0 4px; font-size: 26px; }
  header p { margin: 10px 0 0; color: #94a3b8; font-size: 13px; max-width: 700px; line-height: 1.6; }
  .container { max-width: 1100px; margin: 0 auto; padding: 24px 32px; }
  .panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 24px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 10px 8px; background: #f1f5f9; color: #475569; font-size: 10px; letter-spacing: 1px; font-weight: 700; text-transform: uppercase; }
  td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; }
  tr:hover td { background: #f8fafc; }
  .methodology { font-size: 12px; color: #64748b; line-height: 1.7; margin-top: 16px; padding: 16px; background: #f8fafc; border-radius: 6px; }
  .confidential { display: inline-block; font-size: 9px; letter-spacing: 2px; color: #fbbf24; border: 1px solid #fbbf24; padding: 2px 8px; border-radius: 3px; margin-top: 12px; font-weight: 700; }
</style>
</head>
<body>

<header>
  <div class="label">Prototype · Internal Review</div>
  <h1>Heliport/ASOS Grid Coverage Analysis</h1>
  <p>Each tracked market divided into 5 nautical mile cells. Each cell colored by coverage tier based on distance to nearest ASOS station per FAA NPRM Part 108 (pp.96–98). Basic layer shown; TruWeather low-altitude sensing overlay is the upsell tier, not included in this prototype.</p>
  <div class="confidential">CONFIDENTIAL — PARTNERSHIP DISCUSSION</div>
</header>

<div class="container">
  <div class="panel">
    <h2 style="margin-top:0;font-size:16px;">All Markets</h2>
    <table>
      <thead><tr>
        <th>Market</th><th>Grid</th><th>Cells</th><th>With Sites</th>
        <th style="color:#16a34a;">Full</th><th style="color:#f59e0b;">Partial</th><th style="color:#ef4444;">None</th>
        <th>Avg Credit</th><th>Full %</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="methodology">
      <strong>Columns:</strong> Grid = rows × columns; Cells = total grid cells in the metro bbox; With Sites = cells containing at least one heliport, airport, or pre-development facility; Full/Partial/None = cells by coverage tier (centroid-based); Avg Credit = average ASOS proximity credit across cells containing candidate sites (0–5 scale); Full % = share of all cells with centroid within 5nm of an ASOS.
      <br><br>
      <strong>Click any market</strong> to see the full grid visualization with candidate sites plotted, per-cell drill-down, and ASOS reference points.
    </div>
  </div>
</div>

</body>
</html>`;
}

// ──────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────

async function main() {
  console.log("Loading candidate sites from FAA NASR...");
  const sites = loadSites();
  console.log(`  ${sites.length} sites across ${new Set(sites.map(s => s.marketId)).size} markets`);

  console.log("\nGenerating grids...");
  const grids: MarketGrid[] = [];
  for (const marketId of Object.keys(METRO_BOUNDS)) {
    const grid = buildMarketGrid(marketId, sites);
    if (grid) grids.push(grid);
  }

  // Output directories
  const outDir = "private/docs/grid";
  const dataDir = join(outDir, "data");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

  // Per-market HTMLs
  for (const g of grids) {
    writeFileSync(join(outDir, `${g.marketId}.html`), renderMarketHtml(g));
  }
  console.log(`  Wrote ${grids.length} per-market HTMLs`);

  // Index
  writeFileSync(join(outDir, "index.html"), renderIndexHtml(grids));
  console.log(`  Wrote index.html`);

  // Data
  writeFileSync(
    join(dataDir, "grid_cells.json"),
    JSON.stringify({ generated: new Date().toISOString(), grids: grids.map(g => ({
      marketId: g.marketId, cityName: g.cityName, rows: g.rows, cols: g.cols,
      summary: g.summary, cells: g.cells,
    })) }, null, 2),
  );

  const csvRows = grids.map(g => `${g.marketId},${g.cityName},${g.state},${g.rows},${g.cols},${g.summary.totalCells},${g.summary.cellsWithSites},${g.summary.cellsFull},${g.summary.cellsPartial},${g.summary.cellsNone},${g.summary.avgCoverageCredit}`);
  writeFileSync(
    join(dataDir, "grid_rollup.csv"),
    "market_id,city,state,rows,cols,total_cells,cells_with_sites,cells_full,cells_partial,cells_none,avg_coverage_credit\n" + csvRows.join("\n"),
  );

  console.log(`\n[ok] Grid prototype generated for ${grids.length} markets`);
  console.log(`     Open: ${outDir}/index.html`);

  // Print summary
  console.log("\n=== SUMMARY ===");
  console.log(`${"Market".padEnd(18)}${"Cells".padStart(8)}${"Sites".padStart(8)}${"Full".padStart(6)}${"Partial".padStart(9)}${"None".padStart(6)}${"Avg".padStart(7)}`);
  console.log("-".repeat(62));
  for (const g of grids.sort((a, b) => a.cityName.localeCompare(b.cityName))) {
    console.log(
      `${g.cityName.padEnd(18)}${String(g.summary.totalCells).padStart(8)}${String(g.summary.cellsWithSites).padStart(8)}${String(g.summary.cellsFull).padStart(6)}${String(g.summary.cellsPartial).padStart(9)}${String(g.summary.cellsNone).padStart(6)}${g.summary.avgCoverageCredit.toFixed(2).padStart(7)}`
    );
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
