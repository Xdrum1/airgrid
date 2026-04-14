/**
 * ASOS Proximity Analysis — applies Don Berchoff's 5nm rule to AirIndex heliports.
 *
 * Methodology (from April 13, 2026 TruWeather call):
 *   - FAA NPRM Part 108 pages 96-98 establishes 5 nautical miles as the
 *     standard relevancy radius for ASOS weather observations.
 *   - Within 5nm of an ASOS: full weather credit (5 pts)
 *   - Within 5-10nm of an ASOS: partial credit (2-3 pts)
 *   - Outside 10nm: no credit
 *   - Urban canyon effects not yet modeled (deferred for Phase 2)
 *
 * Data sources:
 *   - Heliport table (FAA NASR 5010, already ingested, 5,647 records)
 *   - ASOS station list (curated: NWS/FAA primary commercial ASOS stations)
 *
 * Output:
 *   - Per-heliport: distance to nearest ASOS, tier (within_5nm / within_10nm / outside)
 *   - Per-market: rollup showing % of heliports qualifying for credit
 *   - CSV export for inclusion in the updated TruWeather brief
 *
 * Usage:
 *   npx tsx scripts/analyze-asos-proximity.ts                    # summary
 *   npx tsx scripts/analyze-asos-proximity.ts --csv output.csv   # export per-heliport
 *   npx tsx scripts/analyze-asos-proximity.ts --market miami     # drill into one market
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";

const prisma = new PrismaClient();

// ── ASOS station list (primary US commercial service stations) ──
// Source: NWS ASOS network. Using ICAO → lat/lng for the ~265 most reliable
// ASOS-equipped airports across the 25 AirIndex markets' states. This is a
// curated first-pass set; full NWS ASOS list (~900 stations) can be substituted
// in a later iteration.
interface AsosStation {
  id: string;       // FAA/ICAO identifier
  name: string;
  state: string;
  lat: number;
  lng: number;
}

const ASOS_STATIONS: AsosStation[] = [
  // ── Florida ──
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

  // ── California ──
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

  // ── Texas ──
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

  // ── Arizona ──
  { id: "PHX", name: "Phoenix Sky Harbor", state: "AZ", lat: 33.4373, lng: -112.0078 },
  { id: "SDL", name: "Scottsdale", state: "AZ", lat: 33.6229, lng: -111.9105 },
  { id: "DVT", name: "Phoenix Deer Valley", state: "AZ", lat: 33.6883, lng: -112.0826 },
  { id: "CHD", name: "Chandler Municipal", state: "AZ", lat: 33.2691, lng: -111.8108 },
  { id: "FFZ", name: "Falcon Field (Mesa)", state: "AZ", lat: 33.4608, lng: -111.7283 },
  { id: "IWA", name: "Phoenix-Mesa Gateway", state: "AZ", lat: 33.3078, lng: -111.6554 },
  { id: "GYR", name: "Goodyear", state: "AZ", lat: 33.4225, lng: -112.3758 },

  // ── New York / NJ ──
  { id: "JFK", name: "John F. Kennedy Intl", state: "NY", lat: 40.6413, lng: -73.7781 },
  { id: "LGA", name: "LaGuardia", state: "NY", lat: 40.7769, lng: -73.8740 },
  { id: "EWR", name: "Newark Liberty Intl", state: "NJ", lat: 40.6895, lng: -74.1745 },
  { id: "TEB", name: "Teterboro", state: "NJ", lat: 40.8501, lng: -74.0608 },
  { id: "HPN", name: "Westchester County", state: "NY", lat: 41.0670, lng: -73.7076 },
  { id: "FRG", name: "Republic (Farmingdale)", state: "NY", lat: 40.7288, lng: -73.4134 },
  { id: "ISP", name: "Long Island MacArthur", state: "NY", lat: 40.7952, lng: -73.1002 },

  // ── Illinois ──
  { id: "ORD", name: "Chicago O'Hare", state: "IL", lat: 41.9786, lng: -87.9048 },
  { id: "MDW", name: "Chicago Midway", state: "IL", lat: 41.7868, lng: -87.7522 },
  { id: "PWK", name: "Chicago Executive", state: "IL", lat: 42.1142, lng: -87.9015 },
  { id: "DPA", name: "DuPage", state: "IL", lat: 41.9078, lng: -88.2486 },

  // ── Nevada ──
  { id: "LAS", name: "Harry Reid Intl (Las Vegas)", state: "NV", lat: 36.0840, lng: -115.1537 },
  { id: "VGT", name: "North Las Vegas", state: "NV", lat: 36.2107, lng: -115.1942 },
  { id: "HND", name: "Henderson Executive", state: "NV", lat: 35.9728, lng: -115.1344 },

  // ── Colorado ──
  { id: "DEN", name: "Denver Intl", state: "CO", lat: 39.8561, lng: -104.6737 },
  { id: "APA", name: "Centennial", state: "CO", lat: 39.5701, lng: -104.8487 },
  { id: "BJC", name: "Rocky Mountain Metro", state: "CO", lat: 39.9088, lng: -105.1172 },

  // ── Georgia ──
  { id: "ATL", name: "Hartsfield-Jackson Atlanta Intl", state: "GA", lat: 33.6407, lng: -84.4277 },
  { id: "PDK", name: "DeKalb-Peachtree", state: "GA", lat: 33.8756, lng: -84.3020 },
  { id: "FTY", name: "Fulton County Brown Field", state: "GA", lat: 33.7790, lng: -84.5215 },

  // ── Washington ──
  { id: "SEA", name: "Seattle-Tacoma Intl", state: "WA", lat: 47.4502, lng: -122.3088 },
  { id: "BFI", name: "King County Intl (Boeing Field)", state: "WA", lat: 47.5300, lng: -122.3020 },
  { id: "PAE", name: "Paine Field (Everett)", state: "WA", lat: 47.9063, lng: -122.2815 },

  // ── Massachusetts ──
  { id: "BOS", name: "Boston Logan Intl", state: "MA", lat: 42.3656, lng: -71.0096 },
  { id: "BED", name: "Hanscom Field", state: "MA", lat: 42.4700, lng: -71.2890 },

  // ── D.C. area ──
  { id: "DCA", name: "Reagan National", state: "DC", lat: 38.8512, lng: -77.0402 },
  { id: "IAD", name: "Washington Dulles Intl", state: "VA", lat: 38.9531, lng: -77.4565 },
  { id: "BWI", name: "Baltimore/Washington Intl", state: "MD", lat: 39.1754, lng: -76.6684 },

  // ── Tennessee ──
  { id: "BNA", name: "Nashville Intl", state: "TN", lat: 36.1263, lng: -86.6774 },
  { id: "JWN", name: "John C. Tune", state: "TN", lat: 36.1824, lng: -86.8870 },

  // ── North Carolina ──
  { id: "CLT", name: "Charlotte Douglas Intl", state: "NC", lat: 35.2140, lng: -80.9431 },
  { id: "JQF", name: "Concord-Padgett Regional", state: "NC", lat: 35.3878, lng: -80.7091 },

  // ── Minnesota ──
  { id: "MSP", name: "Minneapolis-St. Paul Intl", state: "MN", lat: 44.8848, lng: -93.2223 },
  { id: "STP", name: "St. Paul Downtown", state: "MN", lat: 44.9345, lng: -93.0600 },
  { id: "FCM", name: "Flying Cloud (Eden Prairie)", state: "MN", lat: 44.8272, lng: -93.4570 },

  // ── Ohio ──
  { id: "CMH", name: "John Glenn Columbus Intl", state: "OH", lat: 39.9980, lng: -82.8919 },
  { id: "LCK", name: "Rickenbacker Intl", state: "OH", lat: 39.8138, lng: -82.9278 },

  // ── Michigan ──
  { id: "DTW", name: "Detroit Metropolitan", state: "MI", lat: 42.2124, lng: -83.3534 },
  { id: "PTK", name: "Oakland County Intl", state: "MI", lat: 42.6655, lng: -83.4201 },
];

// ── Haversine distance in nautical miles ──
const EARTH_RADIUS_NM = 3440.065;

function haversineNm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_NM * Math.asin(Math.sqrt(a));
}

function nearestAsos(lat: number, lng: number): { station: AsosStation; distanceNm: number } {
  let nearest: AsosStation = ASOS_STATIONS[0];
  let minDist = Infinity;
  for (const s of ASOS_STATIONS) {
    const d = haversineNm(lat, lng, s.lat, s.lng);
    if (d < minDist) {
      minDist = d;
      nearest = s;
    }
  }
  return { station: nearest, distanceNm: minDist };
}

function proximityTier(distanceNm: number): {
  tier: "within_5nm" | "within_10nm" | "outside";
  weatherCredit: number;
} {
  if (distanceNm <= 5) return { tier: "within_5nm", weatherCredit: 5 };
  if (distanceNm <= 10) return { tier: "within_10nm", weatherCredit: 2 };
  return { tier: "outside", weatherCredit: 0 };
}

async function main() {
  const args = process.argv.slice(2);
  const csvIdx = args.indexOf("--csv");
  const csvPath = csvIdx >= 0 ? args[csvIdx + 1] : null;
  const marketIdx = args.indexOf("--market");
  const marketFilter = marketIdx >= 0 ? args[marketIdx + 1] : null;

  console.log("=== ASOS Proximity Analysis ===");
  console.log(`ASOS stations in reference set: ${ASOS_STATIONS.length}`);
  console.log(`Methodology: 5nm rule (FAA NPRM Part 108 pp.96-98)`);
  console.log(`  within 5nm  → 5/5 weather credit (full)`);
  console.log(`  within 10nm → 2/5 weather credit (partial)`);
  console.log(`  outside     → 0/5 weather credit`);
  console.log("");

  // Fetch all heliports in tracked markets
  const where = marketFilter
    ? { cityId: marketFilter }
    : { cityId: { not: null } };

  const heliports = await prisma.heliport.findMany({
    where,
    orderBy: [{ cityId: "asc" }, { facilityName: "asc" }],
  });

  console.log(`Analyzing ${heliports.length} heliports across ${new Set(heliports.map((h) => h.cityId)).size} tracked markets\n`);

  // Compute proximity for each
  interface Row {
    heliportId: string;
    facilityName: string;
    city: string;
    state: string;
    marketId: string;
    lat: number;
    lng: number;
    nearestAsos: string;
    nearestAsosName: string;
    distanceNm: number;
    tier: string;
    weatherCredit: number;
  }

  const rows: Row[] = [];
  for (const h of heliports) {
    const { station, distanceNm } = nearestAsos(h.lat, h.lng);
    const { tier, weatherCredit } = proximityTier(distanceNm);
    rows.push({
      heliportId: h.id,
      facilityName: h.facilityName,
      city: h.city,
      state: h.state,
      marketId: h.cityId!,
      lat: h.lat,
      lng: h.lng,
      nearestAsos: station.id,
      nearestAsosName: station.name,
      distanceNm: Math.round(distanceNm * 10) / 10,
      tier,
      weatherCredit,
    });
  }

  // Market rollup
  const byMarket = new Map<string, Row[]>();
  for (const r of rows) {
    const list = byMarket.get(r.marketId) ?? [];
    list.push(r);
    byMarket.set(r.marketId, list);
  }

  console.log("=== MARKET ROLLUP ===");
  console.log(
    `${"Market".padEnd(18)}${"Total".padStart(8)}${"≤5nm".padStart(8)}${"5-10nm".padStart(8)}${">10nm".padStart(8)}${"Avg Credit".padStart(14)}${"Rollup".padStart(10)}`,
  );
  console.log("-".repeat(74));

  const marketRollups: { marketId: string; avgCredit: number; fullPct: number; rollupCredit: number }[] = [];
  for (const [marketId, marketRows] of [...byMarket.entries()].sort()) {
    const total = marketRows.length;
    const within5 = marketRows.filter((r) => r.tier === "within_5nm").length;
    const within10 = marketRows.filter((r) => r.tier === "within_10nm").length;
    const outside = marketRows.filter((r) => r.tier === "outside").length;
    const avgCredit = marketRows.reduce((s, r) => s + r.weatherCredit, 0) / total;
    const fullPct = Math.round((within5 / total) * 100);

    // Market rollup methodology: average per-heliport weather credit, rounded
    const rollupCredit = Math.round(avgCredit);

    marketRollups.push({ marketId, avgCredit, fullPct, rollupCredit });
    console.log(
      `${marketId.padEnd(18)}${String(total).padStart(8)}${String(within5).padStart(8)}${String(within10).padStart(8)}${String(outside).padStart(8)}${avgCredit.toFixed(2).padStart(14)}${(rollupCredit + "/5").padStart(10)}`,
    );
  }

  // Overall stats
  const total = rows.length;
  const within5 = rows.filter((r) => r.tier === "within_5nm").length;
  const within10 = rows.filter((r) => r.tier === "within_10nm").length;
  const outside = rows.filter((r) => r.tier === "outside").length;
  const overallAvg = rows.reduce((s, r) => s + r.weatherCredit, 0) / total;

  console.log("-".repeat(74));
  console.log(
    `${"ALL TRACKED".padEnd(18)}${String(total).padStart(8)}${String(within5).padStart(8)}${String(within10).padStart(8)}${String(outside).padStart(8)}${overallAvg.toFixed(2).padStart(14)}${Math.round(overallAvg).toString().padStart(9)}/5`,
  );

  console.log("\n=== COMPARISON TO CURRENT SCORING ===");
  console.log("Current scoring assigns 5/10 (partial) to 24 markets and 0/10 to 1.");
  console.log("Under 5nm rule, each market's weather credit reflects actual ASOS proximity");
  console.log("of its heliport inventory. Markets with poor proximity coverage would lose credit;");
  console.log("markets with dense airport coverage maintain it.\n");

  // Markets that would change under the new rule
  console.log("=== MARKETS WHERE SCORE WOULD CHANGE ===");
  for (const m of marketRollups) {
    // Current = 5/10 partial for all markets except DC (0/10)
    const currentCredit = m.marketId === "washington_dc" ? 0 : 5;
    // New rule: use market rollup credit × 2 (since factor is 10pts but we're using 5pt scale for ASOS-only)
    // Actually — need to map rollup back to 10pt scale.
    // Simplification: rollup 5/5 → 10/10, rollup 2/5 → 5/10, rollup 0/5 → 0/10
    const newCredit =
      m.rollupCredit >= 4 ? 10 : m.rollupCredit >= 2 ? 5 : 0;
    const delta = newCredit - currentCredit;
    if (delta !== 0) {
      const sign = delta > 0 ? "+" : "";
      console.log(
        `  ${m.marketId.padEnd(18)} current ${currentCredit}/10 → new ${newCredit}/10 (${sign}${delta})`,
      );
    }
  }

  // CSV export
  if (csvPath) {
    const header = "heliport_id,facility_name,city,state,market_id,lat,lng,nearest_asos,nearest_asos_name,distance_nm,tier,weather_credit\n";
    const body = rows
      .map(
        (r) =>
          `${r.heliportId},"${r.facilityName.replace(/"/g, '""')}","${r.city}",${r.state},${r.marketId},${r.lat},${r.lng},${r.nearestAsos},"${r.nearestAsosName}",${r.distanceNm},${r.tier},${r.weatherCredit}`,
      )
      .join("\n");
    writeFileSync(csvPath, header + body);
    console.log(`\n[ok] CSV exported to ${csvPath} (${rows.length} rows)`);
  }

  // Market filter drill-down
  if (marketFilter) {
    console.log(`\n=== ${marketFilter.toUpperCase()} HELIPORT DETAIL ===`);
    console.log(
      `${"ID".padEnd(8)}${"Facility".padEnd(40)}${"Nearest ASOS".padEnd(20)}${"Dist (nm)".padStart(11)}${"Tier".padStart(15)}${"Credit".padStart(9)}`,
    );
    console.log("-".repeat(103));
    for (const r of rows) {
      console.log(
        `${r.heliportId.padEnd(8)}${r.facilityName.slice(0, 38).padEnd(40)}${r.nearestAsos.padEnd(20)}${r.distanceNm.toFixed(1).padStart(11)}${r.tier.padStart(15)}${(r.weatherCredit + "/5").padStart(9)}`,
      );
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
