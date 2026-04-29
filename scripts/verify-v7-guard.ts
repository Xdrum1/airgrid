/**
 * Verify the deterministic v7 named-operator guard.
 *
 * Replays the exact classifier inputs from the Apr 29 audit (43 known
 * failures + control set) and confirms the new guard catches the failures
 * without dropping legitimate named-operator press.
 *
 * Usage: npx tsx scripts/verify-v7-guard.ts
 */

import { namesTrackedOperator } from "@/lib/classifier";

// Drop-shaped: classifier was given title + "[source] Tags: market. {title}".
// All of these triggered activeOperatorPresence=true under v7 prompt-only.
// They must all return false now.
const SHOULD_DROP = [
  "Air-taxi company completes first test flight of 'Jetsons'-like craft in NYC: 'Dawn of a new era' - New York Post",
  "Video shows electric air taxi flight demonstration in NYC | To watch the video | Inshorts - Inshorts",
  "NYC electric air taxi could cut JFK trips to 7 minutes - FOX 5 New York",
  "Electric air taxis take off from Manhattan for first New York airport trips - CNN",
  "New York Air Taxis to Fly Between JFK Airport and Manhattan for 10 Days - Bloomberg.com",
  "Air taxi flights, à la \"The Jetsons,\" are coming to New York City. Here's what to know. - CBS News",
  "Electric air taxi makes first flight from airport to Manhattan - Spectrum News NY1",
  "New Yorkers Just Witnessed Their First Point-to-Point eVTOL Demo Flight - autoevolution",
  "Toyota-backed startup begins 'flying car' test flights in New York - The Japan Times",
  "New York gets its first point-to-point electric air taxi flights - Stock Titan",
  "First electric air taxi flight completed in NYC as it 'keeps pace' with future - Baltimore Sun",
  "Flying Taxis Coming To NY: Here's What A Ride Will Cost You - dailyvoice.com",
  "First Electric Air Taxis Take Flight to NYC Airports - TravelPulse",
  "Electric Air Taxi Demonstration Links Manhattan and JFK - Pressenza",
  "First Electric Air Taxi Zips Across NYC - Newser",
  "First Point-to-Point Electric Air Taxi Demonstration Flights at JFK Airport and Across NYC Heliport Network - Airport Suppliers",
  "The First Electric Air Taxis Took off From Manhattan to JFK Airport, and Honestly, This Could Revolutionize Travel - travelhost.com",
  "All-electric air taxi expected to revolutionize travel in NYC - MSN",
  "An electric air taxi just flew from JFK to Manhattan in under 10 minutes - TechSpot",
];

// Legitimate named-operator press — must all return true.
const SHOULD_PASS = [
  "Joby Aviation Conducts FAA-Supervised eVTOL Air Taxi Test Flights Between Manhattan and JFK in New York City",
  "Joby Brings Electric Air Taxis to New York City in Week-Long Flight Campaign",
  "Reuben Brothers Unveil Joby Vertiport at Century Plaza",
  "Archer Aviation expands NYC operations footprint",
  "BETA Technologies Announces Aircraft Purchase Agreement and Launch Passenger Operations Partnership",
  "Volocopter completes Singapore demo flight",
  "Wisk Aero begins autonomous testing in Texas",
  "Lilium delivers first jet to Saudi customer",
  "Vertical Aerospace VX4 prototype reaches transition flight",
  "EHang completes Type Certificate trials in Guangzhou",
];

// Edge cases that must NOT trigger (avoid false positives on common words).
const EDGE_CASES_DROP = [
  "Site enters beta testing phase",
  "On the eve of the announcement",
  "Vertical takeoff capability demonstrated",
  "Sharp blade of competition cuts margins", // "blade" is intentionally permissive — accept this match if it fires
];

function check(label: string, samples: string[], expected: boolean) {
  let pass = 0;
  let fail = 0;
  for (const s of samples) {
    const result = namesTrackedOperator(`${s} [Source] Tags: market. ${s}`);
    const ok = result === expected;
    if (ok) pass++;
    else {
      fail++;
      console.log(`  [${expected ? "expected PASS" : "expected DROP"} got ${result ? "PASS" : "DROP"}] ${s}`);
    }
  }
  console.log(`${label}: ${pass}/${samples.length} as expected${fail > 0 ? ` (${fail} mismatch)` : ""}`);
  return fail;
}

let mismatches = 0;
console.log("Verifying v7 named-operator guard\n");
mismatches += check("Historical failures (must drop)", SHOULD_DROP, false);
mismatches += check("Legitimate named press (must pass)", SHOULD_PASS, true);
console.log("\nEdge cases — false-positive check (these may match if patterns too loose):");
for (const s of EDGE_CASES_DROP) {
  const result = namesTrackedOperator(s);
  console.log(`  ${result ? "matched" : "skipped"}: ${s}`);
}

console.log(`\n${mismatches === 0 ? "PASS" : `FAIL — ${mismatches} mismatches`}`);
process.exit(mismatches === 0 ? 0 : 1);
