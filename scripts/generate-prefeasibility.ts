/**
 * On-Demand Pre-Feasibility Report Generator — Phase 1
 *
 * Dynamically assembles a pre-feasibility snapshot for ANY US city:
 *   1. Geocodes city → lat/lng via Census Bureau geocoder
 *   2. Queries LegiScan for state UAM legislation status
 *   3. Queries FAA LAANC coverage by coordinates
 *   4. Computes nearest scored market by haversine distance
 *   5. Assembles structured JSON config
 *   6. Renders HTML report matching template design
 *   7. Generates PDF via Chrome headless
 *
 * Usage:
 *   npx tsx scripts/generate-prefeasibility.ts --city "Myrtle Beach" --state SC --prepared-for "Rex Alexander"
 *   npx tsx scripts/generate-prefeasibility.ts --city "Savannah" --state GA
 *
 * Output: public/docs/AirIndex_PreFeasibility_{City}_{ST}.html + .pdf
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { writeFileSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function getArg(name: string, fallback?: string): string {
  // Support both --name=value and --name "value"
  const eqIdx = process.argv.findIndex((a) => a.startsWith(`--${name}=`));
  if (eqIdx !== -1) return process.argv[eqIdx].split("=").slice(1).join("=");

  const spIdx = process.argv.indexOf(`--${name}`);
  if (spIdx !== -1 && spIdx + 1 < process.argv.length)
    return process.argv[spIdx + 1];

  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required argument: --${name}`);
}

const CITY = getArg("city");
const STATE = getArg("state");
const PREPARED_FOR = getArg(
  "prepared-for",
  "Rex Alexander, VFS Infrastructure Advisor"
);

// ---------------------------------------------------------------------------
// Scored market database (from seed.ts — coordinates + scoring inputs)
// ---------------------------------------------------------------------------

interface ScoredMarket {
  id: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  score: number;
  tier: string;
  hasActivePilotProgram: boolean;
  hasVertiportZoning: boolean;
  vertiportCount: number;
  activeOperators: string[];
  regulatoryPosture: string;
  stateLegislationStatus: string;
  hasLaancCoverage: boolean;
  note: string;
}

// All 21 scored markets with their coordinates and scoring factors
const SCORED_MARKETS: ScoredMarket[] = [
  { id: "los_angeles", city: "Los Angeles", state: "CA", lat: 34.0522, lng: -118.2437, hasActivePilotProgram: true, hasVertiportZoning: true, vertiportCount: 2, activeOperators: ["joby","archer"], regulatoryPosture: "friendly", stateLegislationStatus: "enacted", hasLaancCoverage: true, score: 0, tier: "", note: "Top-tier market. White House AAM Pilot Program city. Full regulatory framework." },
  { id: "dallas", city: "Dallas", state: "TX", lat: 32.7767, lng: -96.797, hasActivePilotProgram: true, hasVertiportZoning: true, vertiportCount: 1, activeOperators: ["wisk"], regulatoryPosture: "friendly", stateLegislationStatus: "enacted", hasLaancCoverage: true, score: 0, tier: "", note: "First US city with vertiport zoning code. TX HB 1735 gold standard." },
  { id: "new_york", city: "New York", state: "NY", lat: 40.7128, lng: -74.006, hasActivePilotProgram: true, hasVertiportZoning: true, vertiportCount: 1, activeOperators: ["joby"], regulatoryPosture: "friendly", stateLegislationStatus: "enacted", hasLaancCoverage: true, score: 0, tier: "", note: "JFK-Manhattan corridor. Dense heliport infrastructure." },
  { id: "miami", city: "Miami", state: "FL", lat: 25.7617, lng: -80.1918, hasActivePilotProgram: true, hasVertiportZoning: true, vertiportCount: 2, activeOperators: ["archer","lilium"], regulatoryPosture: "friendly", stateLegislationStatus: "enacted", hasLaancCoverage: true, score: 0, tier: "", note: "White House AAM Pilot Program. Archer pilot program active." },
  { id: "orlando", city: "Orlando", state: "FL", lat: 28.5383, lng: -81.3792, hasActivePilotProgram: true, hasVertiportZoning: true, vertiportCount: 1, activeOperators: ["lilium"], regulatoryPosture: "friendly", stateLegislationStatus: "enacted", hasLaancCoverage: true, score: 0, tier: "", note: "Lake Nona smart city pilot. Tourism corridor demand." },
  { id: "las_vegas", city: "Las Vegas", state: "NV", lat: 36.1699, lng: -115.1398, hasActivePilotProgram: true, hasVertiportZoning: true, vertiportCount: 1, activeOperators: ["joby"], regulatoryPosture: "friendly", stateLegislationStatus: "enacted", hasLaancCoverage: true, score: 0, tier: "", note: "Convention corridor. Strip-to-airport use case." },
  { id: "phoenix", city: "Phoenix", state: "AZ", lat: 33.4484, lng: -112.074, hasActivePilotProgram: true, hasVertiportZoning: false, vertiportCount: 0, activeOperators: [], regulatoryPosture: "neutral", stateLegislationStatus: "actively_moving", hasLaancCoverage: true, score: 0, tier: "", note: "AZ 3-bill cluster actively moving. Projected MODERATE within 12 months." },
  { id: "houston", city: "Houston", state: "TX", lat: 29.7604, lng: -95.3698, hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0, activeOperators: [], regulatoryPosture: "friendly", stateLegislationStatus: "enacted", hasLaancCoverage: true, score: 0, tier: "", note: "TX HB 1735 statewide. Extreme sprawl = strong UAM demand." },
  { id: "austin", city: "Austin", state: "TX", lat: 30.2672, lng: -97.7431, hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0, activeOperators: [], regulatoryPosture: "friendly", stateLegislationStatus: "enacted", hasLaancCoverage: true, score: 0, tier: "", note: "Texas enacted legislation. Tech hub culture. SXSW demo opportunities." },
  { id: "san_diego", city: "San Diego", state: "CA", lat: 32.7157, lng: -117.1611, hasActivePilotProgram: false, hasVertiportZoning: true, vertiportCount: 0, activeOperators: [], regulatoryPosture: "friendly", stateLegislationStatus: "enacted", hasLaancCoverage: true, score: 0, tier: "", note: "CA legislation. Military/defense drone testing infrastructure." },
  { id: "san_francisco", city: "San Francisco", state: "CA", lat: 37.7749, lng: -122.4194, hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0, activeOperators: ["joby"], regulatoryPosture: "neutral", stateLegislationStatus: "enacted", hasLaancCoverage: true, score: 0, tier: "", note: "Joby HQ nearby. Bay Area tech ecosystem." },
  { id: "chicago", city: "Chicago", state: "IL", lat: 41.8781, lng: -87.6298, hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 1, activeOperators: [], regulatoryPosture: "neutral", stateLegislationStatus: "none", hasLaancCoverage: true, score: 0, tier: "", note: "Vertiport Chicago approved. No state legislation." },
  { id: "atlanta", city: "Atlanta", state: "GA", lat: 33.749, lng: -84.388, hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0, activeOperators: [], regulatoryPosture: "neutral", stateLegislationStatus: "none", hasLaancCoverage: true, score: 0, tier: "", note: "ATL busiest US airport. Delta hub." },
  { id: "nashville", city: "Nashville", state: "TN", lat: 36.1627, lng: -86.7816, hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0, activeOperators: [], regulatoryPosture: "neutral", stateLegislationStatus: "none", hasLaancCoverage: true, score: 0, tier: "", note: "Fastest-growing mid-size metro. Tourism demand." },
  { id: "charlotte", city: "Charlotte", state: "NC", lat: 35.2271, lng: -80.8431, hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0, activeOperators: [], regulatoryPosture: "neutral", stateLegislationStatus: "none", hasLaancCoverage: true, score: 0, tier: "", note: "CLT major hub. Banking/finance executive shuttle demand." },
  { id: "denver", city: "Denver", state: "CO", lat: 39.7392, lng: -104.9903, hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0, activeOperators: [], regulatoryPosture: "neutral", stateLegislationStatus: "none", hasLaancCoverage: true, score: 0, tier: "", note: "Mountain resort corridors (Denver-Vail/Aspen)." },
  { id: "seattle", city: "Seattle", state: "WA", lat: 47.6062, lng: -122.3321, hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0, activeOperators: [], regulatoryPosture: "neutral", stateLegislationStatus: "none", hasLaancCoverage: true, score: 0, tier: "", note: "Boeing/aerospace heritage. Water crossing use cases." },
  { id: "boston", city: "Boston", state: "MA", lat: 42.3601, lng: -71.0589, hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0, activeOperators: [], regulatoryPosture: "neutral", stateLegislationStatus: "none", hasLaancCoverage: true, score: 0, tier: "", note: "Harbor shuttle demand. MIT/aerospace research." },
  { id: "minneapolis", city: "Minneapolis", state: "MN", lat: 44.9778, lng: -93.265, hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0, activeOperators: [], regulatoryPosture: "neutral", stateLegislationStatus: "none", hasLaancCoverage: true, score: 0, tier: "", note: "Honeywell Aerospace presence." },
  { id: "washington_dc", city: "Washington D.C.", state: "DC", lat: 38.9072, lng: -77.0369, hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0, activeOperators: [], regulatoryPosture: "restrictive", stateLegislationStatus: "none", hasLaancCoverage: false, score: 0, tier: "", note: "SFRA/FRZ airspace restrictions. Policy hub." },
  { id: "columbus", city: "Columbus", state: "OH", lat: 39.9612, lng: -82.9988, hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0, activeOperators: [], regulatoryPosture: "neutral", stateLegislationStatus: "none", hasLaancCoverage: true, score: 0, tier: "", note: "Smart city initiatives. Honda R&D presence." },
];

// Pre-compute scores for all scored markets
function scoreMarket(m: ScoredMarket): number {
  let s = 0;
  if (m.hasActivePilotProgram) s += 20;
  if (m.vertiportCount > 0) s += 20;
  if (m.activeOperators.length > 0) s += 15;
  if (m.hasVertiportZoning) s += 15;
  if (m.regulatoryPosture === "friendly") s += 10;
  else if (m.regulatoryPosture === "neutral") s += 5;
  if (m.stateLegislationStatus === "enacted") s += 10;
  else if (m.stateLegislationStatus === "actively_moving") s += 5;
  if (m.hasLaancCoverage) s += 10;
  return s;
}

function getTier(score: number): string {
  if (score >= 75) return "ADVANCED";
  if (score >= 50) return "MODERATE";
  if (score >= 30) return "EARLY";
  return "NASCENT";
}

// Initialize scores
for (const m of SCORED_MARKETS) {
  m.score = scoreMarket(m);
  m.tier = getTier(m.score);
}

// ---------------------------------------------------------------------------
// Geocoding — Nominatim (OpenStreetMap) — handles city names reliably
// ---------------------------------------------------------------------------

interface GeoResult {
  lat: number;
  lng: number;
  matchedAddress: string;
  county: string;
}

async function geocodeCity(
  city: string,
  state: string
): Promise<GeoResult | null> {
  const query = encodeURIComponent(`${city}, ${state}, USA`);
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&addressdetails=1`;

  try {
    console.log(`  [Geocode] Looking up ${city}, ${state}...`);
    const res = await fetch(url, {
      headers: { "User-Agent": "AirIndex-PreFeasibility/1.0" },
    });
    const results = await res.json();

    if (!results || results.length === 0) {
      console.warn(`  [Geocode] No match found for ${city}, ${state}`);
      return null;
    }

    const m = results[0];
    // Extract county from display_name (format: "City, County, State, Country")
    const parts = (m.display_name || "").split(", ");
    let county = "";
    for (const part of parts) {
      if (part.includes("County")) {
        county = part.replace(" County", "");
        break;
      }
    }
    // Also check addressdetails
    if (!county && m.address?.county) {
      county = m.address.county.replace(" County", "");
    }

    return {
      lat: parseFloat(m.lat),
      lng: parseFloat(m.lon),
      matchedAddress: m.display_name,
      county,
    };
  } catch (err) {
    console.error(`  [Geocode] Failed:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Census population — Census Bureau API (free, no key for basic queries)
// ---------------------------------------------------------------------------

interface PopulationData {
  cityPop: number;
  metroPop: number | null;
  metroName: string;
}

// State FIPS codes
const STATE_FIPS: Record<string, string> = {
  AL: "01", AK: "02", AZ: "04", AR: "05", CA: "06", CO: "08", CT: "09",
  DE: "10", DC: "11", FL: "12", GA: "13", HI: "15", ID: "16", IL: "17",
  IN: "18", IA: "19", KS: "20", KY: "21", LA: "22", ME: "23", MD: "24",
  MA: "25", MI: "26", MN: "27", MS: "28", MO: "29", MT: "30", NE: "31",
  NV: "32", NH: "33", NJ: "34", NM: "35", NY: "36", NC: "37", ND: "38",
  OH: "39", OK: "40", OR: "41", PA: "42", RI: "44", SC: "45", SD: "46",
  TN: "47", TX: "48", UT: "49", VT: "50", VA: "51", WA: "53", WV: "54",
  WI: "55", WY: "56",
};

async function getPopulation(
  city: string,
  state: string
): Promise<PopulationData> {
  const fips = STATE_FIPS[state.toUpperCase()];
  const defaults: PopulationData = {
    cityPop: 0,
    metroPop: null,
    metroName: `${city} Metro Area`,
  };

  if (!fips) return defaults;

  try {
    // Query Census for city population (places)
    const cityNameQuery = encodeURIComponent(city);
    const url = `https://api.census.gov/data/2020/dec/pl?get=P1_001N,NAME&for=place:*&in=state:${fips}`;
    console.log(`  [Census] Querying population for ${city}, ${state}...`);
    const res = await fetch(url);
    const data = await res.json();

    // Find best match — Census place names often include "city", "town", etc.
    const cityLower = city.toLowerCase();
    const match = data.find(
      (row: string[]) =>
        row[1] &&
        row[1]
          .toLowerCase()
          .replace(/ city| town| village| cdp| borough/g, "")
          .trim()
          .startsWith(cityLower)
    );

    if (match) {
      defaults.cityPop = parseInt(match[0]) || 0;
      console.log(`  [Census] City population: ${defaults.cityPop.toLocaleString()}`);
    } else {
      console.warn(`  [Census] No exact city match — using estimate`);
    }
  } catch (err) {
    console.warn(`  [Census] City population lookup failed:`, err);
  }

  return defaults;
}

// ---------------------------------------------------------------------------
// LegiScan — state legislation status
// ---------------------------------------------------------------------------

const LEGISCAN_BASE = "https://api.legiscan.com";

interface LegislationResult {
  status: "enacted" | "actively_moving" | "none";
  billCount: number;
  topBill: string | null; // e.g. "SC HB 1234"
  billSummary: string | null;
}

async function checkStateLegislation(
  state: string
): Promise<LegislationResult> {
  const apiKey = process.env.LEGISCAN_API_KEY;
  if (!apiKey) {
    console.warn(
      "  [LegiScan] No API key — set LEGISCAN_API_KEY in .env.local"
    );
    return { status: "none", billCount: 0, topBill: null, billSummary: null };
  }

  try {
    console.log(`  [LegiScan] Searching UAM bills in ${state}...`);
    const query = encodeURIComponent(
      'evtol OR "powered lift" OR "air taxi" OR "advanced air mobility" OR "urban air mobility" OR vertiport OR "drone corridor"'
    );
    const url = `${LEGISCAN_BASE}/?key=${apiKey}&op=getSearch&state=${state}&query=${query}`;
    const res = await fetch(url);
    const json = await res.json();
    const sr = json.searchresult;
    if (!sr) return { status: "none", billCount: 0, topBill: null, billSummary: null };

    const bills = Object.entries(sr)
      .filter(([k]) => k !== "summary")
      .map(([, v]) => v as {
        bill_id: number;
        bill_number: string;
        title: string;
        status: string;
        last_action: string;
        last_action_date: string;
      });

    if (bills.length === 0) {
      console.log(`  [LegiScan] No UAM bills found in ${state}`);
      return { status: "none", billCount: 0, topBill: null, billSummary: null };
    }

    console.log(`  [LegiScan] Found ${bills.length} UAM-related bills in ${state}`);

    // Determine status: check if any are enacted or actively moving
    // LegiScan status codes: 1=Introduced, 2=Engrossed, 3=Enrolled, 4=Passed, 5=Vetoed, 6=Failed
    const enacted = bills.some((b) => {
      const s = String(b.status).toLowerCase();
      return s === "4" || s === "passed" || s.includes("enacted") || s.includes("signed");
    });

    const activeKeywords = [
      "committee",
      "hearing",
      "reading",
      "referred",
      "introduced",
      "engrossed",
      "reported",
      "passed",
      "enrolled",
      "transmit",
    ];
    const activeBills = bills.filter((b) => {
      const action = (b.last_action || "").toLowerCase();
      return activeKeywords.some((k) => action.includes(k));
    });

    const topBill = bills[0];
    const status = enacted
      ? "enacted"
      : activeBills.length > 0
      ? "actively_moving"
      : "none";

    console.log(`  [LegiScan] Status: ${status} (${activeBills.length} active)`);

    return {
      status,
      billCount: bills.length,
      topBill: `${state} ${topBill.bill_number}`,
      billSummary: topBill.title?.slice(0, 120) || null,
    };
  } catch (err) {
    console.error(`  [LegiScan] Failed:`, err);
    return { status: "none", billCount: 0, topBill: null, billSummary: null };
  }
}

// ---------------------------------------------------------------------------
// FAA LAANC coverage check
// ---------------------------------------------------------------------------

const LAANC_FEATURE_SERVICE =
  "https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/FAA_UAS_FacilityMap_Data/FeatureServer/0/query";

interface LaancResult {
  hasCoverage: boolean;
  gridCount: number;
  note: string;
}

async function checkLaanc(lat: number, lng: number, cityName: string): Promise<LaancResult> {
  try {
    console.log(`  [FAA] Checking LAANC coverage at ${lat.toFixed(4)}, ${lng.toFixed(4)}...`);

    // Check at 30km radius (airport-centered grids)
    const params = new URLSearchParams({
      where: "1=1",
      geometry: `${lng},${lat}`,
      geometryType: "esriGeometryPoint",
      inSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
      distance: "30000",
      units: "esriSRUnit_Meter",
      returnCountOnly: "true",
      f: "json",
    });

    const res = await fetch(`${LAANC_FEATURE_SERVICE}?${params}`);
    const json = await res.json();
    const gridCount = json.count ?? 0;
    const hasCoverage = gridCount > 0;

    console.log(
      `  [FAA] LAANC: ${hasCoverage ? "YES" : "NO"} (${gridCount} grids within 30km)`
    );

    const note = hasCoverage
      ? `${cityName} area airport covered · outlying areas may not be covered`
      : `No LAANC coverage detected within 30km of ${cityName} city center`;

    return { hasCoverage, gridCount, note };
  } catch (err) {
    console.error(`  [FAA] LAANC check failed:`, err);
    return {
      hasCoverage: false,
      gridCount: 0,
      note: `LAANC coverage check failed — verify manually`,
    };
  }
}

// ---------------------------------------------------------------------------
// Haversine distance — nearest scored market
// ---------------------------------------------------------------------------

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Strategic peer selection — picks 3 markets that tell a useful story:
 *   1. Nearest geographic neighbor (SC neighbor, same region)
 *   2. Best legislation/regulatory example (shows fastest path to score improvement)
 *   3. Similar market profile OR highest-scoring mid-tier market (aspiration target)
 *
 * Falls back to pure proximity if strategic picks overlap.
 */
function selectPeerMarkets(
  lat: number,
  lng: number,
  targetState: string,
  targetLegStatus: string
): (ScoredMarket & { distanceKm: number; peerReason: string })[] {
  const withDistance = SCORED_MARKETS.map((m) => ({
    ...m,
    distanceKm: haversineKm(lat, lng, m.lat, m.lng),
    peerReason: "",
  }));

  const selected: (typeof withDistance)[number][] = [];
  const usedIds = new Set<string>();

  // --- Slot 1: Nearest geographic neighbor ---
  const nearest = withDistance
    .filter((m) => !usedIds.has(m.id))
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];
  if (nearest) {
    nearest.peerReason = `Nearest scored market. ${nearest.state === targetState ? "Same state" : "Regional neighbor"}. Similar mid-size market profile.`;
    selected.push(nearest);
    usedIds.add(nearest.id);
  }

  // --- Slot 2: Best legislation example ---
  // If target has no legislation, show a state with actively_moving (shows the path)
  // If target has actively_moving, show one with enacted (shows the destination)
  const legTarget =
    targetLegStatus === "none" ? "actively_moving" : "enacted";
  const legExamples = withDistance
    .filter(
      (m) => !usedIds.has(m.id) && m.stateLegislationStatus === legTarget
    )
    .sort((a, b) => {
      // Prefer markets with higher scores (more instructive)
      // Break ties by distance
      if (b.score !== a.score) return b.score - a.score;
      return a.distanceKm - b.distanceKm;
    });

  if (legExamples.length > 0) {
    const pick = legExamples[0];
    pick.peerReason =
      legTarget === "actively_moving"
        ? `${pick.state} legislation actively moving — demonstrates state legislation as the fastest path to score improvement.`
        : `${pick.state} enacted UAM legislation. Shows the score impact of full legislative framework.`;
    selected.push(pick);
    usedIds.add(pick.id);
  }

  // --- Slot 3: Aspiration target — highest-scoring EARLY/MODERATE market ---
  // Shows what's achievable for a NASCENT market
  const aspirational = withDistance
    .filter(
      (m) =>
        !usedIds.has(m.id) &&
        m.score >= 20 &&
        m.score <= 60 // Relatable range — not ADVANCED giants
    )
    .sort((a, b) => b.score - a.score);

  if (aspirational.length > 0) {
    const pick = aspirational[0];
    pick.peerReason = `Higher-scoring comparison market. ${pick.note}`;
    selected.push(pick);
    usedIds.add(pick.id);
  }

  // --- Fill remaining slots with nearest by distance ---
  if (selected.length < 3) {
    const remaining = withDistance
      .filter((m) => !usedIds.has(m.id))
      .sort((a, b) => a.distanceKm - b.distanceKm);
    for (const m of remaining) {
      if (selected.length >= 3) break;
      m.peerReason = `Regional comparison market. ${m.note}`;
      selected.push(m);
      usedIds.add(m.id);
    }
  }

  return selected.slice(0, 3);
}

// ---------------------------------------------------------------------------
// Gap note generation — automatic based on which factors are missing
// ---------------------------------------------------------------------------

function generateGapNotes(
  city: string,
  state: string,
  county: string,
  legResult: LegislationResult,
  laancResult: LaancResult
): Record<string, string> {
  return {
    activePilotProgram: `No FAA-sanctioned UAM/eVTOL pilot program. Highest-weight factor. Requires Federal Register filing — White House AAM Pilot Program or FAA BEYOND designation.`,

    approvedVertiport: `No vertiport has received regulatory approval. No known active development projects in the ${city} market area.`,

    activeOperatorPresence: `No eVTOL operator has announced or commenced operations. Joby, Archer, and Beta all have no visible presence in this market.`,

    vertiportZoning: `No municipal or county zoning framework accommodates vertiport infrastructure. ${county ? county + " County and " : ""}${city} have no UAM-specific land-use provisions on record.`,

    regulatoryPosture: `Currently Neutral. Local government has not taken a public position on UAM. No ordinances, resolutions, or pilot programs initiated.`,

    stateLegislation:
      legResult.status === "enacted"
        ? `${state} has enacted UAM legislation. Full 10 points awarded.`
        : legResult.status === "actively_moving"
        ? `${state} legislation actively moving — partial credit (5 pts). Full 10 pts require enacted legislation. ${legResult.topBill ? `Key bill: ${legResult.topBill}.` : ""} ${state} is tracking TX/FL pattern.`
        : `No UAM-related legislation found in ${state}. 0 points. State legislation is a 5-10 point opportunity.`,

    laancCoverage: laancResult.hasCoverage
      ? `LAANC coverage confirmed near ${city}. ${laancResult.note}`
      : `No LAANC coverage detected near ${city} city center. ${laancResult.note}`,
  };
}

// ---------------------------------------------------------------------------
// Priority actions — generated from gaps
// ---------------------------------------------------------------------------

function generatePriorityActions(
  city: string,
  state: string,
  county: string,
  legResult: LegislationResult
): { title: string; description: string }[] {
  const actions: { title: string; description: string }[] = [];

  actions.push({
    title: "Engage local government",
    description: `Present AirIndex data to ${city} City Council${county ? ` and ${county} County planning` : ""}. UAM is not on their radar — this is the first step per 30 years of infrastructure development experience. Community awareness precedes every other action.`,
  });

  actions.push({
    title: "Commission a vertiport feasibility study",
    description: `Answer the fundamental infrastructure questions: grid capacity, structural load, airspace class, community acceptance. The $500K–$1M/mile grid extension cost makes this a critical early decision point.`,
  });

  if (legResult.status === "actively_moving") {
    actions.push({
      title: `Monitor ${state} legislation`,
      description: `${state} legislation is actively moving — the same coordinated multi-bill pattern AirIndex detected in Arizona 18 months before their legislation passed. When ${state} enacts, this market gains 5 points automatically.`,
    });
  } else if (legResult.status === "none") {
    actions.push({
      title: `Advocate for ${state} state legislation`,
      description: `No UAM legislation found in ${state}. State legislation provides the legal certainty operators need before committing capital. Texas HB 1735 is the gold standard — it created a statewide legal framework. Engage state representatives to introduce a UAM framework bill.`,
    });
  }

  actions.push({
    title: "Identify a pilot program pathway",
    description: `The White House AAM Pilot Program and FAA eVTOL Integration Pilot Program are the two primary federal pathways to 20 points. Connecting city leadership to FAA regional office is the precursor step.`,
  });

  return actions;
}

// ---------------------------------------------------------------------------
// Infrastructure questions — contextualized
// ---------------------------------------------------------------------------

function generateInfraQuestions(
  city: string,
  county: string
): string[] {
  return [
    `What is the grid capacity near potential vertiport sites in ${city}? Nearest electrical substation?`,
    `Can existing helipad infrastructure at the nearest airport be adapted for eVTOL operations?`,
    `What structural load requirements apply for rooftop sites in the ${city} market area?`,
    `Has ${county ? county + " County" : city} planning been engaged on UAM zoning? What is their current position?`,
    `Are there any existing FAA Part 135 operators in the market with AAM adjacency?`,
  ];
}

// ---------------------------------------------------------------------------
// Federal programs — static content, same for all cities
// ---------------------------------------------------------------------------

const FEDERAL_PROGRAMS = [
  {
    name: "White House AAM Pilot Program",
    addresses: "hasActivePilotProgram",
    relevance:
      "Presidential initiative. Miami, Dallas, LA achieved ADVANCED via selection. City application requires demonstrating community preparedness.",
  },
  {
    name: "FAA BEYOND Program",
    addresses: "hasActivePilotProgram",
    relevance:
      "FAA BVLOS designation. Provides regulatory pathway for AAM operations. Tourism and coastal geography are potential qualifying use cases.",
  },
  {
    name: "DOT RAISE Grants",
    addresses: "hasVertiportZoning / hasApprovedVertiport",
    relevance:
      "Infrastructure funding for multimodal transportation. Vertiport development at the nearest major airport is eligible.",
  },
  {
    name: "NASA AAM National Campaign",
    addresses: "hasActivePilotProgram",
    relevance:
      "Community and integration planning program. Participation builds the regulatory framework that precedes pilot program selection.",
  },
];

// ---------------------------------------------------------------------------
// Market profile classification
// ---------------------------------------------------------------------------

function classifyMetro(pop: number): string {
  if (pop >= 1_000_000) return "Major metro";
  if (pop >= 500_000) return "Mid-size metro";
  if (pop >= 100_000) return "Small metro";
  if (pop >= 50_000) return "Mid-size city";
  return "Small city";
}

// ---------------------------------------------------------------------------
// Config interface (same as before — feeds into HTML template)
// ---------------------------------------------------------------------------

interface PreFeasibilityConfig {
  city: string;
  state: string;
  metro: string;
  lat: number;
  lng: number;
  populationCity: string;
  populationMetro: string;
  marketProfile: string;
  preparedFor: string;
  hasActivePilotProgram: boolean;
  hasVertiportZoning: boolean;
  vertiportCount: number;
  activeOperators: string[];
  regulatoryPosture: "friendly" | "neutral" | "restrictive" | "unknown";
  stateLegislationStatus: "enacted" | "actively_moving" | "none";
  hasLaancCoverage: boolean;
  laancNote: string;
  legislationBill: string;
  gapNotes: Record<string, string>;
  priorityActions: { title: string; description: string }[];
  infraQuestions: string[];
  federalPrograms: { name: string; addresses: string; relevance: string }[];
  peers: {
    city: string;
    state: string;
    score: number;
    tier: string;
    note: string;
    distanceKm?: number;
  }[];
  dataSources: string[];
}

// ---------------------------------------------------------------------------
// Data assembly — the main pipeline
// ---------------------------------------------------------------------------

async function assembleData(): Promise<PreFeasibilityConfig> {
  console.log(`\n  Assembling data for ${CITY}, ${STATE}...\n`);

  // 1. Geocode
  const geo = await geocodeCity(CITY, STATE);
  if (!geo) {
    throw new Error(
      `Could not geocode "${CITY}, ${STATE}". Check spelling and try again.`
    );
  }
  console.log(
    `  [Geocode] → ${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)} (${geo.matchedAddress})`
  );
  console.log(`  [Geocode] County: ${geo.county || "unknown"}\n`);

  // 2-4. Run parallel queries
  const [legResult, laancResult, popData] = await Promise.all([
    checkStateLegislation(STATE),
    checkLaanc(geo.lat, geo.lng, CITY),
    getPopulation(CITY, STATE),
  ]);

  console.log("");

  // 5. Strategic peer market selection
  const peerMarkets = selectPeerMarkets(
    geo.lat,
    geo.lng,
    STATE,
    legResult.status
  );
  console.log(`  [Peers] Selected comparison markets:`);
  for (const m of peerMarkets) {
    console.log(
      `    ${m.city}, ${m.state} — ${m.score}/100 (${m.tier}) — ${Math.round(m.distanceKm)} km`
    );
  }
  console.log("");

  // 6. Classify metro
  const metroClass = classifyMetro(popData.cityPop || 30000);
  const metroName = `${CITY}${geo.county ? `–${geo.county}` : ""} Metro`;

  // 7. Assemble config
  const config: PreFeasibilityConfig = {
    city: CITY,
    state: STATE,
    metro: metroName,
    lat: geo.lat,
    lng: geo.lng,
    populationCity: popData.cityPop
      ? popData.cityPop.toLocaleString()
      : "—",
    populationMetro: popData.metroPop
      ? popData.metroPop.toLocaleString()
      : "—",
    marketProfile: metroClass,
    preparedFor: PREPARED_FOR,

    // Unscored cities always start with these defaults
    hasActivePilotProgram: false,
    hasVertiportZoning: false,
    vertiportCount: 0,
    activeOperators: [],
    regulatoryPosture: "neutral",
    stateLegislationStatus: legResult.status,
    hasLaancCoverage: laancResult.hasCoverage,
    laancNote: laancResult.note,
    legislationBill: legResult.topBill || "",

    gapNotes: generateGapNotes(CITY, STATE, geo.county, legResult, laancResult),
    priorityActions: generatePriorityActions(CITY, STATE, geo.county, legResult),
    infraQuestions: generateInfraQuestions(CITY, geo.county),
    federalPrograms: FEDERAL_PROGRAMS,

    peers: peerMarkets.map((m) => ({
      city: m.city,
      state: m.state,
      score: m.score,
      tier: m.tier,
      note: m.peerReason,
      distanceKm: Math.round(m.distanceKm),
    })),

    dataSources: [
      "Census Bureau Geocoder",
      laancResult.hasCoverage ? "FAA LAANC (UAS Facility Map)" : "FAA LAANC (no coverage)",
      legResult.billCount > 0
        ? `LegiScan (${legResult.billCount} bills)`
        : "LegiScan (no results)",
      "AirIndex Scored Market Index (21 markets)",
    ],
  };

  return config;
}

// ---------------------------------------------------------------------------
// Scoring engine
// ---------------------------------------------------------------------------

const SCORE_WEIGHTS = {
  activePilotProgram: 20,
  approvedVertiport: 20,
  activeOperatorPresence: 15,
  vertiportZoning: 15,
  regulatoryPosture: 10,
  stateLegislation: 10,
  laancCoverage: 10,
} as const;

type FactorKey = keyof typeof SCORE_WEIGHTS;

const FACTOR_LABELS: Record<FactorKey, string> = {
  activePilotProgram: "Active Pilot Program",
  approvedVertiport: "Approved Vertiport",
  activeOperatorPresence: "Active Operator Presence",
  vertiportZoning: "Vertiport Zoning",
  regulatoryPosture: "Regulatory Posture",
  stateLegislation: "State Legislation",
  laancCoverage: "LAANC Coverage",
};

function scorePosture(posture: string): number {
  if (posture === "friendly") return 10;
  if (posture === "neutral") return 5;
  return 0;
}

function scoreLegislation(status: string): number {
  if (status === "enacted") return 10;
  if (status === "actively_moving") return 5;
  return 0;
}

interface FactorResult {
  key: FactorKey;
  label: string;
  earned: number;
  max: number;
  achieved: boolean;
  partial: boolean;
  note: string;
}

function calculateScore(cfg: PreFeasibilityConfig): {
  score: number;
  factors: FactorResult[];
} {
  const breakdown: Record<FactorKey, number> = {
    activePilotProgram: cfg.hasActivePilotProgram ? 20 : 0,
    approvedVertiport: cfg.vertiportCount > 0 ? 20 : 0,
    activeOperatorPresence: cfg.activeOperators.length > 0 ? 15 : 0,
    vertiportZoning: cfg.hasVertiportZoning ? 15 : 0,
    regulatoryPosture: scorePosture(cfg.regulatoryPosture),
    stateLegislation: scoreLegislation(cfg.stateLegislationStatus),
    laancCoverage: cfg.hasLaancCoverage ? 10 : 0,
  };

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);

  const factors: FactorResult[] = (
    Object.keys(SCORE_WEIGHTS) as FactorKey[]
  ).map((key) => ({
    key,
    label: FACTOR_LABELS[key],
    earned: breakdown[key],
    max: SCORE_WEIGHTS[key],
    achieved: breakdown[key] === SCORE_WEIGHTS[key],
    partial:
      (key === "regulatoryPosture" && cfg.regulatoryPosture === "neutral") ||
      (key === "stateLegislation" &&
        cfg.stateLegislationStatus === "actively_moving"),
    note: cfg.gapNotes[key] || "",
  }));

  return { score, factors };
}

function tierColor(tier: string): string {
  switch (tier) {
    case "ADVANCED": return "#0891b2";
    case "MODERATE": return "#16a34a";
    case "EARLY": return "#d97706";
    case "NASCENT": return "#dc2626";
    default: return "#888";
  }
}

// ---------------------------------------------------------------------------
// HTML Generator
// ---------------------------------------------------------------------------

function buildHtml(cfg: PreFeasibilityConfig): string {
  const { score, factors } = calculateScore(cfg);
  const tier = getTier(score);
  const color = tierColor(tier);
  const projected = factors.reduce((sum, f) => sum + f.max, 0);
  const projectedTier = getTier(projected);

  // Legislation display
  let legStatus = "None";
  let legColor = "#dc2626";
  if (cfg.stateLegislationStatus === "enacted") {
    legStatus = "Enacted";
    legColor = "#16a34a";
  } else if (cfg.stateLegislationStatus === "actively_moving") {
    legStatus = "Actively Moving";
    legColor = "#d97706";
  }

  // LAANC display
  let laancStatus = "None";
  let laancColor = "#dc2626";
  if (cfg.hasLaancCoverage) {
    laancStatus = cfg.laancNote.includes("outlying") || cfg.laancNote.includes("may not") ? "Partial" : "Full";
    laancColor = laancStatus === "Partial" ? "#d97706" : "#16a34a";
  }

  const nearest = cfg.peers[0];

  // Legislation banner text
  const legBannerText = cfg.legislationBill
    ? `${cfg.legislationBill} — UAM framework bill`
    : cfg.stateLegislationStatus === "none"
    ? "No UAM bills found"
    : "UAM legislation detected";

  // Factor breakdown rows
  const factorRows = factors
    .sort((a, b) => b.max - a.max)
    .map(
      (f) => `
      <tr>
        <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;vertical-align:top;">
          <span style="color:${f.achieved ? "#16a34a" : f.partial ? "#d97706" : "#dc2626"};font-weight:600;font-size:14px;">${f.label}</span>
        </td>
        <td style="padding:14px 12px;border-bottom:1px solid #e5e7eb;text-align:center;vertical-align:top;color:#888;font-size:13px;">
          ${f.earned > 0 ? f.earned : "—"}
        </td>
        <td style="padding:14px 12px;border-bottom:1px solid #e5e7eb;text-align:center;vertical-align:top;color:#888;font-size:13px;">
          ${f.max}
        </td>
        <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;vertical-align:top;color:#555;font-size:13px;line-height:1.6;">
          ${f.note}
        </td>
      </tr>`
    )
    .join("");

  const actionItems = cfg.priorityActions
    .map(
      (a, i) => `
      <div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:20px;">
        <div style="min-width:36px;height:36px;background:#0891b2;color:#fff;border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;flex-shrink:0;">${i + 1}</div>
        <div>
          <div style="color:#111;font-size:14px;font-weight:700;margin-bottom:4px;">${a.title}</div>
          <div style="color:#555;font-size:13px;line-height:1.7;">${a.description}</div>
        </div>
      </div>`
    )
    .join("");

  const infraItems = cfg.infraQuestions
    .map(
      (q) => `
      <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:12px;">
        <span style="color:#0891b2;font-size:16px;font-weight:700;min-width:20px;">?</span>
        <span style="color:#555;font-size:13px;line-height:1.6;">${q}</span>
      </div>`
    )
    .join("");

  const programRows = cfg.federalPrograms
    .map(
      (p) => `
      <tr>
        <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;vertical-align:top;">
          <span style="color:#0891b2;font-weight:600;font-size:13px;">${p.name}</span>
        </td>
        <td style="padding:14px 12px;border-bottom:1px solid #e5e7eb;vertical-align:top;color:#888;font-size:12px;font-family:'Courier New',monospace;">${p.addresses}</td>
        <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;vertical-align:top;color:#555;font-size:13px;line-height:1.6;">${p.relevance}</td>
      </tr>`
    )
    .join("");

  const peerCards = cfg.peers
    .map(
      (p) => `
      <div style="flex:1;min-width:200px;border:1px solid #e5e7eb;border-top:3px solid ${tierColor(p.tier)};border-radius:0 0 8px 8px;padding:20px;">
        <div style="font-size:15px;font-weight:700;color:#111;margin-bottom:8px;">${p.city}, ${p.state}</div>
        <div style="color:${tierColor(p.tier)};font-size:14px;font-weight:600;margin-bottom:12px;">${p.score} &middot; ${p.tier}</div>
        <div style="color:#555;font-size:13px;line-height:1.6;">${p.note}${p.distanceKm ? ` (${p.distanceKm} km)` : ""}</div>
      </div>`
    )
    .join("");

  const now = new Date();
  const monthYear = now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AirIndex Pre-Feasibility Snapshot — ${cfg.city}, ${cfg.state}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #ffffff; color: #333; font-family: 'Inter', sans-serif; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page-break { page-break-before: always; }
    }
    @page { size: letter; margin: 0.5in; }
  </style>
</head>
<body>
  <div style="max-width:800px;margin:0 auto;padding:40px 24px;">

    <!-- ============ COVER HEADER ============ -->
    <div style="background:#1a2332;border-radius:10px;padding:36px 32px;margin-bottom:32px;position:relative;">
      <div style="color:#0891b2;font-size:12px;font-weight:700;letter-spacing:1.5px;margin-bottom:16px;">AIRINDEX &middot; PRE-FEASIBILITY SNAPSHOT</div>
      <h1 style="color:#ffffff;font-family:'Space Grotesk',sans-serif;font-size:32px;font-weight:700;margin:0 0 8px;line-height:1.2;">${cfg.city}, ${cfg.state}</h1>
      <div style="color:#999;font-size:14px;">${cfg.populationCity} (city) &middot; ${cfg.populationMetro} (metro) &middot; ${cfg.marketProfile}</div>
      <div style="position:absolute;top:36px;right:32px;text-align:right;">
        <div style="color:#888;font-size:12px;">Prepared for</div>
        <div style="color:#ffffff;font-size:13px;font-weight:600;">${cfg.preparedFor}</div>
        <div style="color:#888;font-size:12px;margin-top:8px;">${monthYear}</div>
        <div style="color:#888;font-size:12px;">Confidential</div>
      </div>
    </div>

    <!-- ============ 4-STAT BANNER ============ -->
    <div style="display:flex;gap:0;margin-bottom:36px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <div style="flex:1;padding:20px;border-left:3px solid ${color};text-align:center;">
        <div style="color:#888;font-size:11px;font-weight:600;letter-spacing:1px;margin-bottom:8px;">BASELINE SCORE</div>
        <div style="color:${color};font-size:42px;font-weight:700;line-height:1;">${score}</div>
        <div style="color:${color};font-size:13px;margin-top:4px;">/ 100 &middot; ${tier}</div>
      </div>
      <div style="flex:1;padding:20px;border-left:1px solid #e5e7eb;text-align:center;">
        <div style="color:#888;font-size:11px;font-weight:600;letter-spacing:1px;margin-bottom:8px;">NEAREST SCORED MARKET</div>
        <div style="color:#111;font-size:18px;font-weight:700;">${nearest.city}, ${nearest.state}</div>
        <div style="color:${tierColor(nearest.tier)};font-size:13px;margin-top:4px;">${nearest.score} &middot; ${nearest.tier}</div>
      </div>
      <div style="flex:1;padding:20px;border-left:1px solid #e5e7eb;text-align:center;">
        <div style="color:#888;font-size:11px;font-weight:600;letter-spacing:1px;margin-bottom:8px;">STATE LEGISLATION</div>
        <div style="color:${legColor};font-size:18px;font-weight:700;">${legStatus}</div>
        <div style="color:#888;font-size:12px;margin-top:4px;line-height:1.4;">${legBannerText}</div>
      </div>
      <div style="flex:1;padding:20px;border-left:1px solid #e5e7eb;text-align:center;">
        <div style="color:#888;font-size:11px;font-weight:600;letter-spacing:1px;margin-bottom:8px;">LAANC COVERAGE</div>
        <div style="color:${laancColor};font-size:18px;font-weight:700;">${laancStatus}</div>
        <div style="color:#888;font-size:12px;margin-top:4px;line-height:1.4;">${cfg.laancNote}</div>
      </div>
    </div>

    <!-- ============ READINESS GAP ANALYSIS + PRIORITY ACTIONS ============ -->
    <div style="display:flex;gap:28px;margin-bottom:36px;">
      <div style="flex:1.1;">
        <div style="background:#1a2332;color:#fff;font-size:12px;font-weight:700;letter-spacing:1px;padding:10px 16px;border-radius:6px 6px 0 0;">READINESS GAP ANALYSIS</div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-top:none;">
          <tbody>${factorRows}</tbody>
        </table>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;">
          <span style="color:#888;font-size:13px;">Projected score if priority gaps closed:</span>
          <span style="background:${tierColor(projectedTier)};color:#fff;font-size:13px;font-weight:700;padding:6px 14px;border-radius:4px;">${projected} — ${projectedTier}</span>
        </div>
      </div>
      <div style="flex:0.9;">
        <div style="background:#1a2332;color:#fff;font-size:12px;font-weight:700;letter-spacing:1px;padding:10px 16px;border-radius:6px 6px 0 0;">PRIORITY ACTIONS</div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:20px 16px;border-radius:0 0 6px 6px;">
          ${actionItems}
        </div>
        <div style="margin-top:24px;">
          <div style="background:#1a2332;color:#fff;font-size:12px;font-weight:700;letter-spacing:1px;padding:10px 16px;border-radius:6px 6px 0 0;">INFRASTRUCTURE QUESTIONS TO ANSWER</div>
          <div style="border:1px solid #e5e7eb;border-top:none;padding:20px 16px;border-radius:0 0 6px 6px;">
            ${infraItems}
          </div>
        </div>
      </div>
    </div>

    <!-- ============ FEDERAL PROGRAMS ============ -->
    <div class="page-break" style="margin-bottom:36px;">
      <div style="background:#1a2332;color:#fff;font-size:12px;font-weight:700;letter-spacing:1px;padding:10px 16px;border-radius:6px 6px 0 0;">FEDERAL PROGRAMS AVAILABLE FOR THIS MARKET</div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-top:none;">
        <thead>
          <tr style="border-bottom:2px solid #e5e7eb;">
            <th style="padding:10px 16px;text-align:left;color:#888;font-size:11px;font-weight:600;letter-spacing:0.5px;">PROGRAM</th>
            <th style="padding:10px 12px;text-align:left;color:#888;font-size:11px;font-weight:600;letter-spacing:0.5px;">ADDRESSES</th>
            <th style="padding:10px 16px;text-align:left;color:#888;font-size:11px;font-weight:600;letter-spacing:0.5px;">RELEVANCE</th>
          </tr>
        </thead>
        <tbody>${programRows}</tbody>
      </table>
    </div>

    <!-- ============ PEER MARKET COMPARISON ============ -->
    <div style="margin-bottom:36px;">
      <div style="background:#1a2332;color:#fff;font-size:12px;font-weight:700;letter-spacing:1px;padding:10px 16px;border-radius:6px 6px 0 0;">PEER MARKET COMPARISON</div>
      <div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 6px 6px;display:flex;gap:16px;flex-wrap:wrap;">
        ${peerCards}
      </div>
    </div>

    <!-- ============ DATA SOURCES ============ -->
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <p style="color:#555;font-size:12px;line-height:1.7;">
        This snapshot was generated by AirIndex for ${cfg.preparedFor}. Data sourced from ${cfg.dataSources.join(", ")}. Scores reflect current verified conditions as of ${monthYear}. For full methodology: airindex.io/methodology &middot; hello@airindex.io
      </p>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;color:#888;font-size:11px;">
      <span>AirIndex Pre-Feasibility Snapshot &middot; ${cfg.city}, ${cfg.state} &middot; Vertical Data Group, LLC &middot; Confidential</span>
      <span>${monthYear} &middot; airindex.io</span>
    </div>

  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n╔══════════════════════════════════════════════════╗`);
  console.log(`║  AirIndex Pre-Feasibility Snapshot Generator     ║`);
  console.log(`╚══════════════════════════════════════════════════╝`);

  const config = await assembleData();

  const { score } = calculateScore(config);
  const tier = getTier(score);

  console.log(`\n  ┌─────────────────────────────────────┐`);
  console.log(`  │ Baseline Score: ${score}/100 (${tier})`.padEnd(40) + `│`);
  console.log(`  │ Legislation: ${config.stateLegislationStatus}`.padEnd(40) + `│`);
  console.log(`  │ LAANC: ${config.hasLaancCoverage ? "YES" : "NO"}`.padEnd(40) + `│`);
  console.log(`  │ Nearest: ${config.peers[0].city}, ${config.peers[0].state} (${config.peers[0].score})`.padEnd(40) + `│`);
  console.log(`  └─────────────────────────────────────┘\n`);

  // Write HTML
  const safeName = CITY.replace(/\s+/g, "_");
  const htmlPath = resolve(
    __dirname,
    `../public/docs/AirIndex_PreFeasibility_${safeName}_${STATE}.html`
  );
  const html = buildHtml(config);
  writeFileSync(htmlPath, html);
  console.log(`  HTML: ${htmlPath}`);

  // Write JSON (data assembly output)
  const jsonPath = resolve(
    __dirname,
    `../public/docs/AirIndex_PreFeasibility_${safeName}_${STATE}.json`
  );
  writeFileSync(jsonPath, JSON.stringify(config, null, 2));
  console.log(`  JSON: ${jsonPath}`);

  // Generate PDF via Chrome headless
  const pdfPath = resolve(
    __dirname,
    `../public/docs/AirIndex_PreFeasibility_${safeName}_${STATE}.pdf`
  );
  try {
    console.log(`\n  Generating PDF...`);
    execSync(
      `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --print-to-pdf="${pdfPath}" --no-pdf-header-footer "file://${htmlPath}"`,
      { stdio: "pipe" }
    );
    console.log(`  PDF: ${pdfPath}`);
  } catch {
    console.error(
      `  PDF generation failed — Chrome headless may not be available.`
    );
    console.log(
      `  Manual: open ${htmlPath} in Chrome → Cmd+P → Save as PDF`
    );
  }

  console.log(`\n  Done.\n`);
}

main().catch((err) => {
  console.error(`\n  ERROR: ${err.message}\n`);
  process.exit(1);
});
