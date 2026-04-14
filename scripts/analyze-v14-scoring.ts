/**
 * AirIndex v1.4 Scoring Preview
 *
 * Applies the full v1.4 weather scoring methodology to produce a complete
 * grid-based rollup deliverable for the TruWeather collaboration:
 *
 * Candidate sites per market:
 *   - All FAA-registered heliports (site type H) in metro bounding box
 *   - All FAA-registered airports (site type A) in metro bounding box
 *   - Tracked pre-development facilities
 *
 * Per-site scoring:
 *   - Sub-indicator 1 (ASOS proximity, 0-5 points): distance to nearest ASOS
 *     - within 5nm → 5, within 10nm → 2, outside → 0
 *   - Sub-indicator 2 (Low-altitude sensing, 0-5 points): wind LIDAR coverage
 *     - currently 0 for all sites (no TruWeather deployment yet)
 *
 * Market rollup:
 *   - Average per-site credit across both sub-indicators
 *   - Rounded to nearest integer for market-level factor score
 *   - Capped at 10/10
 *
 * Comparison:
 *   - v1.3 (binary partial/full) vs v1.4 (graduated grid-based)
 *   - Market score delta + total platform score delta
 *
 * Output:
 *   - CSV: per-site detail (all candidate sites × all tracked markets)
 *   - Markdown summary: market rollup + delta table
 *   - Both saved to private/docs/data/
 *
 * Usage:
 *   npx tsx scripts/analyze-v14-scoring.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { CITIES } from "../src/data/seed";
import { calculateReadinessScore } from "../src/lib/scoring";
import { PRE_DEVELOPMENT_FACILITIES } from "../src/data/pre-development-facilities";

// Metro bounding boxes (same as ingest-heliports.ts)
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

// ASOS reference stations (curated US primary commercial stations)
interface AsosStation {
  id: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
}

const ASOS_STATIONS: AsosStation[] = [
  // Florida
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
  // California
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
  // Texas
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
  // Arizona
  { id: "PHX", name: "Phoenix Sky Harbor", state: "AZ", lat: 33.4373, lng: -112.0078 },
  { id: "SDL", name: "Scottsdale", state: "AZ", lat: 33.6229, lng: -111.9105 },
  { id: "DVT", name: "Phoenix Deer Valley", state: "AZ", lat: 33.6883, lng: -112.0826 },
  { id: "CHD", name: "Chandler Municipal", state: "AZ", lat: 33.2691, lng: -111.8108 },
  { id: "FFZ", name: "Falcon Field (Mesa)", state: "AZ", lat: 33.4608, lng: -111.7283 },
  { id: "IWA", name: "Phoenix-Mesa Gateway", state: "AZ", lat: 33.3078, lng: -111.6554 },
  { id: "GYR", name: "Goodyear", state: "AZ", lat: 33.4225, lng: -112.3758 },
  // NY / NJ
  { id: "JFK", name: "John F. Kennedy Intl", state: "NY", lat: 40.6413, lng: -73.7781 },
  { id: "LGA", name: "LaGuardia", state: "NY", lat: 40.7769, lng: -73.8740 },
  { id: "EWR", name: "Newark Liberty Intl", state: "NJ", lat: 40.6895, lng: -74.1745 },
  { id: "TEB", name: "Teterboro", state: "NJ", lat: 40.8501, lng: -74.0608 },
  { id: "HPN", name: "Westchester County", state: "NY", lat: 41.0670, lng: -73.7076 },
  { id: "FRG", name: "Republic (Farmingdale)", state: "NY", lat: 40.7288, lng: -73.4134 },
  { id: "ISP", name: "Long Island MacArthur", state: "NY", lat: 40.7952, lng: -73.1002 },
  // Illinois
  { id: "ORD", name: "Chicago O'Hare", state: "IL", lat: 41.9786, lng: -87.9048 },
  { id: "MDW", name: "Chicago Midway", state: "IL", lat: 41.7868, lng: -87.7522 },
  { id: "PWK", name: "Chicago Executive", state: "IL", lat: 42.1142, lng: -87.9015 },
  { id: "DPA", name: "DuPage", state: "IL", lat: 41.9078, lng: -88.2486 },
  // Nevada
  { id: "LAS", name: "Harry Reid Intl (Las Vegas)", state: "NV", lat: 36.0840, lng: -115.1537 },
  { id: "VGT", name: "North Las Vegas", state: "NV", lat: 36.2107, lng: -115.1942 },
  { id: "HND", name: "Henderson Executive", state: "NV", lat: 35.9728, lng: -115.1344 },
  // Colorado
  { id: "DEN", name: "Denver Intl", state: "CO", lat: 39.8561, lng: -104.6737 },
  { id: "APA", name: "Centennial", state: "CO", lat: 39.5701, lng: -104.8487 },
  { id: "BJC", name: "Rocky Mountain Metro", state: "CO", lat: 39.9088, lng: -105.1172 },
  // Georgia
  { id: "ATL", name: "Hartsfield-Jackson Atlanta Intl", state: "GA", lat: 33.6407, lng: -84.4277 },
  { id: "PDK", name: "DeKalb-Peachtree", state: "GA", lat: 33.8756, lng: -84.3020 },
  { id: "FTY", name: "Fulton County Brown Field", state: "GA", lat: 33.7790, lng: -84.5215 },
  // Washington
  { id: "SEA", name: "Seattle-Tacoma Intl", state: "WA", lat: 47.4502, lng: -122.3088 },
  { id: "BFI", name: "King County Intl (Boeing Field)", state: "WA", lat: 47.5300, lng: -122.3020 },
  { id: "PAE", name: "Paine Field (Everett)", state: "WA", lat: 47.9063, lng: -122.2815 },
  // Massachusetts
  { id: "BOS", name: "Boston Logan Intl", state: "MA", lat: 42.3656, lng: -71.0096 },
  { id: "BED", name: "Hanscom Field", state: "MA", lat: 42.4700, lng: -71.2890 },
  // DC
  { id: "DCA", name: "Reagan National", state: "DC", lat: 38.8512, lng: -77.0402 },
  { id: "IAD", name: "Washington Dulles Intl", state: "VA", lat: 38.9531, lng: -77.4565 },
  { id: "BWI", name: "Baltimore/Washington Intl", state: "MD", lat: 39.1754, lng: -76.6684 },
  // Tennessee
  { id: "BNA", name: "Nashville Intl", state: "TN", lat: 36.1263, lng: -86.6774 },
  { id: "JWN", name: "John C. Tune", state: "TN", lat: 36.1824, lng: -86.8870 },
  // NC
  { id: "CLT", name: "Charlotte Douglas Intl", state: "NC", lat: 35.2140, lng: -80.9431 },
  { id: "JQF", name: "Concord-Padgett Regional", state: "NC", lat: 35.3878, lng: -80.7091 },
  // Minnesota
  { id: "MSP", name: "Minneapolis-St. Paul Intl", state: "MN", lat: 44.8848, lng: -93.2223 },
  { id: "STP", name: "St. Paul Downtown", state: "MN", lat: 44.9345, lng: -93.0600 },
  { id: "FCM", name: "Flying Cloud (Eden Prairie)", state: "MN", lat: 44.8272, lng: -93.4570 },
  // Ohio
  { id: "CMH", name: "John Glenn Columbus Intl", state: "OH", lat: 39.9980, lng: -82.8919 },
  { id: "LCK", name: "Rickenbacker Intl", state: "OH", lat: 39.8138, lng: -82.9278 },
];

const EARTH_RADIUS_NM = 3440.065;

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

function matchMetro(lat: number, lng: number): string | null {
  for (const [id, b] of Object.entries(METRO_BOUNDS)) {
    if (lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng) return id;
  }
  return null;
}

// Parse APT_BASE.csv — very simple CSV parser (NASR uses quoted strings with commas)
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

interface CandidateSite {
  id: string;
  facilityName: string;
  facilityClass: "heliport" | "airport" | "pre_dev";
  ownership: string;
  useType: string;
  lat: number;
  lng: number;
  marketId: string;
  nearestAsosId: string;
  nearestAsosName: string;
  distanceNm: number;
  asosProximityCredit: number; // 0-5
  lowAltSensingCredit: number; // 0-5 — all 0 currently (no TruWeather deployment)
  totalWeatherCredit: number;  // 0-10
}

async function main() {
  const csvPath = join(process.cwd(), "data", "nasr", "APT_BASE.csv");
  if (!existsSync(csvPath)) {
    throw new Error(`APT_BASE.csv not found at ${csvPath}. Run ingest-heliports.ts first to download NASR data.`);
  }
  console.log(`Reading ${csvPath}...`);
  const csv = readFileSync(csvPath, "utf8");
  const lines = csv.split("\n");
  const header = parseCsvLine(lines[0]);
  const col = (name: string) => header.indexOf(name);
  const SITE_TYPE_CODE = col("SITE_TYPE_CODE");
  const LAT_DECIMAL = col("LAT_DECIMAL");
  const LONG_DECIMAL = col("LONG_DECIMAL");
  const ARPT_ID = col("ARPT_ID");
  const ARPT_NAME = col("ARPT_NAME");
  const OWNERSHIP_TYPE_CODE = col("OWNERSHIP_TYPE_CODE");
  const FACILITY_USE_CODE = col("FACILITY_USE_CODE");
  const ARPT_STATUS_CODE = col("ARPT_STATUS");

  console.log("Extracting candidate sites (heliports + airports) in tracked metros...");

  const sites: CandidateSite[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const row = parseCsvLine(lines[i]);
    if (row.length < 10) continue;

    const siteType = row[SITE_TYPE_CODE];
    if (siteType !== "H" && siteType !== "A") continue;

    const status = row[ARPT_STATUS_CODE];
    if (status !== "O") continue; // operational only

    const latStr = row[LAT_DECIMAL];
    const lngStr = row[LONG_DECIMAL];
    if (!latStr || !lngStr) continue;
    const lat = parseFloat(latStr);
    // NASR stores west as positive; flip sign for standard convention
    const rawLng = parseFloat(lngStr);
    const lng = rawLng > 0 ? -rawLng : rawLng;
    if (isNaN(lat) || isNaN(lng)) continue;

    const marketId = matchMetro(lat, lng);
    if (!marketId) continue;

    const { station, distanceNm } = nearestAsos(lat, lng);
    const asosCredit = asosProximityCredit(distanceNm);

    sites.push({
      id: row[ARPT_ID],
      facilityName: row[ARPT_NAME],
      facilityClass: siteType === "H" ? "heliport" : "airport",
      ownership: row[OWNERSHIP_TYPE_CODE],
      useType: row[FACILITY_USE_CODE],
      lat,
      lng,
      marketId,
      nearestAsosId: station.id,
      nearestAsosName: station.name,
      distanceNm: Math.round(distanceNm * 10) / 10,
      asosProximityCredit: asosCredit,
      lowAltSensingCredit: 0, // no TruWeather deployment yet
      totalWeatherCredit: asosCredit,
    });
  }

  // Add pre-development facilities
  for (const f of PRE_DEVELOPMENT_FACILITIES) {
    if (!f.marketId) continue;
    const { station, distanceNm } = nearestAsos(f.lat, f.lng);
    const asosCredit = asosProximityCredit(distanceNm);
    sites.push({
      id: f.id,
      facilityName: f.name,
      facilityClass: "pre_dev",
      ownership: "PV", // private/developer
      useType: "PR",
      lat: f.lat,
      lng: f.lng,
      marketId: f.marketId,
      nearestAsosId: station.id,
      nearestAsosName: station.name,
      distanceNm: Math.round(distanceNm * 10) / 10,
      asosProximityCredit: asosCredit,
      lowAltSensingCredit: 0,
      totalWeatherCredit: asosCredit,
    });
  }

  console.log(`Extracted ${sites.length} candidate sites across ${new Set(sites.map(s => s.marketId)).size} markets`);
  const byClass = new Map<string, number>();
  for (const s of sites) byClass.set(s.facilityClass, (byClass.get(s.facilityClass) ?? 0) + 1);
  for (const [c, n] of byClass) console.log(`  ${c}: ${n}`);

  // ── Market Rollups ──
  const byMarket = new Map<string, CandidateSite[]>();
  for (const s of sites) {
    const list = byMarket.get(s.marketId) ?? [];
    list.push(s);
    byMarket.set(s.marketId, list);
  }

  interface MarketRollup {
    marketId: string;
    totalSites: number;
    heliportCount: number;
    airportCount: number;
    preDevCount: number;
    asosCredit5: number; // % of sites at 5/5
    asosCredit2: number; // % at 2/5
    asosCredit0: number; // % at 0/5
    avgAsosCredit: number;
    avgLowAltCredit: number;
    avgTotalCredit: number;
    v13MarketScore: number; // 0 or 5 or 10 per current methodology
    v14MarketScore: number; // rolled up avgTotalCredit × 2 (to map to 10pt scale)
    v13CityScore: number;
    v14CityScore: number;
    delta: number;
  }

  const rollups: MarketRollup[] = [];

  for (const city of CITIES) {
    const marketSites = byMarket.get(city.id) ?? [];
    if (marketSites.length === 0) continue;

    const total = marketSites.length;
    const heliports = marketSites.filter(s => s.facilityClass === "heliport").length;
    const airports = marketSites.filter(s => s.facilityClass === "airport").length;
    const preDev = marketSites.filter(s => s.facilityClass === "pre_dev").length;

    const at5 = marketSites.filter(s => s.asosProximityCredit === 5).length;
    const at2 = marketSites.filter(s => s.asosProximityCredit === 2).length;
    const at0 = marketSites.filter(s => s.asosProximityCredit === 0).length;

    const avgAsos = marketSites.reduce((sum, s) => sum + s.asosProximityCredit, 0) / total;
    const avgLowAlt = marketSites.reduce((sum, s) => sum + s.lowAltSensingCredit, 0) / total;
    const avgTotal = avgAsos + avgLowAlt;

    // v1.4 market weather factor = (avgAsos + avgLowAlt) capped at 10
    // Each sub-indicator max 5, so avgTotal is already 0-10 scale
    const v14WeatherFactor = Math.min(10, Math.round(avgTotal));

    const { score: v13Score, breakdown } = calculateReadinessScore(city);
    const v13WeatherFactor = breakdown.weatherInfrastructure;
    const v14Score = v13Score - v13WeatherFactor + v14WeatherFactor;
    const delta = v14Score - v13Score;

    rollups.push({
      marketId: city.id,
      totalSites: total,
      heliportCount: heliports,
      airportCount: airports,
      preDevCount: preDev,
      asosCredit5: at5,
      asosCredit2: at2,
      asosCredit0: at0,
      avgAsosCredit: Math.round(avgAsos * 100) / 100,
      avgLowAltCredit: Math.round(avgLowAlt * 100) / 100,
      avgTotalCredit: Math.round(avgTotal * 100) / 100,
      v13MarketScore: v13WeatherFactor,
      v14MarketScore: v14WeatherFactor,
      v13CityScore: v13Score,
      v14CityScore: v14Score,
      delta,
    });
  }

  // Sort by market ID
  rollups.sort((a, b) => a.marketId.localeCompare(b.marketId));

  // ── Print summary ──
  console.log("\n=== MARKET ROLLUP — v1.3 vs v1.4 Weather Scoring ===\n");
  console.log(
    `${"Market".padEnd(18)}${"Sites".padStart(7)}${"H".padStart(5)}${"A".padStart(5)}${"PD".padStart(5)}` +
    `${"avgASOS".padStart(10)}${"v1.3 WX".padStart(10)}${"v1.4 WX".padStart(10)}${"v1.3".padStart(7)}${"v1.4".padStart(7)}${"Δ".padStart(5)}`
  );
  console.log("-".repeat(98));
  for (const r of rollups) {
    const deltaStr = r.delta === 0 ? "—" : (r.delta > 0 ? "+" : "") + r.delta;
    console.log(
      `${r.marketId.padEnd(18)}${String(r.totalSites).padStart(7)}${String(r.heliportCount).padStart(5)}${String(r.airportCount).padStart(5)}${String(r.preDevCount).padStart(5)}` +
      `${r.avgAsosCredit.toFixed(2).padStart(10)}${(r.v13MarketScore + "/10").padStart(10)}${(r.v14MarketScore + "/10").padStart(10)}` +
      `${String(r.v13CityScore).padStart(7)}${String(r.v14CityScore).padStart(7)}${deltaStr.padStart(5)}`
    );
  }

  // ── CSV: per-site detail ──
  const siteCsvPath = "private/docs/data/v14_candidate_sites.csv";
  const siteHeader = "market_id,facility_id,facility_name,facility_class,ownership,use_type,lat,lng,nearest_asos,nearest_asos_name,distance_nm,asos_proximity_credit,low_alt_sensing_credit,total_weather_credit\n";
  const siteBody = sites.map(s =>
    `${s.marketId},${s.id},"${s.facilityName.replace(/"/g, '""')}",${s.facilityClass},${s.ownership},${s.useType},${s.lat},${s.lng},${s.nearestAsosId},"${s.nearestAsosName}",${s.distanceNm},${s.asosProximityCredit},${s.lowAltSensingCredit},${s.totalWeatherCredit}`
  ).join("\n");
  writeFileSync(siteCsvPath, siteHeader + siteBody);
  console.log(`\n[ok] Per-site CSV: ${siteCsvPath} (${sites.length} rows)`);

  // ── CSV: market rollup ──
  const rollupCsvPath = "private/docs/data/v14_market_rollup.csv";
  const rollupHeader = "market_id,total_sites,heliports,airports,pre_dev,sites_within_5nm,sites_5_10nm,sites_outside_10nm,avg_asos_credit,avg_low_alt_credit,avg_total_credit,v13_weather_factor,v14_weather_factor,v13_total_score,v14_total_score,delta\n";
  const rollupBody = rollups.map(r =>
    `${r.marketId},${r.totalSites},${r.heliportCount},${r.airportCount},${r.preDevCount},${r.asosCredit5},${r.asosCredit2},${r.asosCredit0},${r.avgAsosCredit},${r.avgLowAltCredit},${r.avgTotalCredit},${r.v13MarketScore},${r.v14MarketScore},${r.v13CityScore},${r.v14CityScore},${r.delta}`
  ).join("\n");
  writeFileSync(rollupCsvPath, rollupHeader + rollupBody);
  console.log(`[ok] Market rollup CSV: ${rollupCsvPath} (${rollups.length} rows)`);

  // ── Summary markdown ──
  const changed = rollups.filter(r => r.delta !== 0);
  const increased = changed.filter(r => r.delta > 0);
  const decreased = changed.filter(r => r.delta < 0);

  const md = `# AirIndex v1.4 Scoring Preview — Market Rollups

*Generated ${new Date().toISOString().slice(0, 10)}*

## Methodology

Per Don Berchoff guidance (April 13, 2026 call):

- **Candidate site grid:** all FAA-registered heliports + all FAA-registered airports (site types H and A, operational status O) within each tracked metro bounding box, plus tracked pre-development facilities
- **Sub-indicator 1 (ASOS Proximity, 0–5 pts):** distance from each candidate site to nearest primary ASOS station
  - Within 5nm → 5 pts (FAA NPRM Part 108 pp.96–98 relevancy radius)
  - Within 5–10nm → 2 pts (partial)
  - Outside 10nm → 0 pts
- **Sub-indicator 2 (Low-Altitude Sensing, 0–5 pts):** wind LIDAR / equivalent coverage
  - All markets currently 0 pts (no TruWeather deployment yet)
- **Market rollup:** per-site credit averaged across all sites, rounded to nearest integer, capped at 10

Reference set: **${sites.length} candidate sites** (${byClass.get("heliport")} heliports + ${byClass.get("airport")} airports + ${byClass.get("pre_dev") ?? 0} pre-dev) against **${ASOS_STATIONS.length} primary ASOS stations** across ${rollups.length} tracked markets.

## Summary

- **${rollups.length}** markets analyzed
- **${changed.length}** markets change score under v1.4
- **${increased.length}** gain credit (dense ASOS coverage)
- **${decreased.length}** lose credit (sparse coverage — Austin, Detroit)

## Full Market Rollup

| Market | Sites | H | A | PD | avg ASOS | v1.3 WX | v1.4 WX | v1.3 | v1.4 | Δ |
|--------|-------|---|---|-----|----------|---------|---------|------|------|---|
${rollups.map(r => {
  const deltaStr = r.delta === 0 ? "—" : (r.delta > 0 ? "+" : "") + r.delta;
  return `| ${r.marketId} | ${r.totalSites} | ${r.heliportCount} | ${r.airportCount} | ${r.preDevCount} | ${r.avgAsosCredit.toFixed(2)} | ${r.v13MarketScore}/10 | ${r.v14MarketScore}/10 | ${r.v13CityScore} | ${r.v14CityScore} | ${deltaStr} |`;
}).join("\n")}

## Markets That Change Score

### Gain credit under v1.4

${increased.length === 0 ? "*(none)*" : increased.map(r => {
  return `- **${r.marketId}** — ${r.asosCredit5} of ${r.totalSites} sites within 5nm of ASOS. Weather factor: ${r.v13MarketScore}/10 → ${r.v14MarketScore}/10. Market score: ${r.v13CityScore} → ${r.v14CityScore} (+${r.delta})`;
}).join("\n")}

### Lose credit under v1.4

${decreased.length === 0 ? "*(none)*" : decreased.map(r => {
  return `- **${r.marketId}** — only ${r.asosCredit5} of ${r.totalSites} sites within 5nm of ASOS. Weather factor: ${r.v13MarketScore}/10 → ${r.v14MarketScore}/10. Market score: ${r.v13CityScore} → ${r.v14CityScore} (${r.delta})`;
}).join("\n")}

## Next Step

When TruWeather wind LIDAR coverage is deployed in a market, that market's low-altitude sensing sub-indicator moves from 0 to the per-site credit based on radius (5nm urban / 10nm suburban / 15nm rural). The example in the integration brief (Miami: 80 → 85) reflects a full TruWeather deployment covering all Miami candidate sites.

---

*Source data: FAA NASR 5010 APT_BASE (April 2026 subscription), primary ASOS station list (curated, ${ASOS_STATIONS.length} stations)*
*Analysis: scripts/analyze-v14-scoring.ts*
`;

  const mdPath = "private/docs/V14_Scoring_Preview.md";
  writeFileSync(mdPath, md);
  console.log(`[ok] Summary markdown: ${mdPath}`);

  console.log(`\nTotal candidate sites: ${sites.length}`);
  console.log(`Markets analyzed: ${rollups.length}`);
  console.log(`Markets with score change: ${changed.length} (${increased.length} up, ${decreased.length} down)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
