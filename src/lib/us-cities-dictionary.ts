/**
 * US Metro Dictionary — curated list of ~100 US cities (population >200K)
 * used for extracting city mentions from free text during auto-discovery.
 *
 * This is NOT the list of tracked AirIndex markets. It is a reference
 * dictionary for NLP city name extraction from filings and legislation.
 *
 * Precision safeguard: city names are only matched when UAM keywords
 * co-occur in the same text, preventing false positives from common words.
 */

import { CITIES } from "@/data/seed";

export interface MetroEntry {
  city: string;
  state: string;
  aliases?: string[]; // airport codes, abbreviations, alternate names
}

// Top US metros by population (excludes cities already tracked in seed.ts)
// Sorted by rough population descending for priority
const RAW_METROS: MetroEntry[] = [
  // 500K+ metros not already tracked
  { city: "San Antonio", state: "TX", aliases: ["SAT"] },
  { city: "San Jose", state: "CA", aliases: ["SJC"] },
  { city: "Jacksonville", state: "FL", aliases: ["JAX"] },
  { city: "Indianapolis", state: "IN", aliases: ["IND", "Indy"] },
  { city: "Columbus", state: "OH", aliases: ["CMH"] }, // keep in case not yet in tracked
  { city: "Fort Worth", state: "TX", aliases: ["DFW"] },
  { city: "Milwaukee", state: "WI", aliases: ["MKE"] },
  { city: "Memphis", state: "TN", aliases: ["MEM"] },
  { city: "Baltimore", state: "MD", aliases: ["BWI"] },
  { city: "Louisville", state: "KY", aliases: ["SDF"] },
  { city: "Portland", state: "OR", aliases: ["PDX"] },
  { city: "Oklahoma City", state: "OK", aliases: ["OKC"] },
  { city: "Las Vegas", state: "NV", aliases: ["LAS"] },
  { city: "Tucson", state: "AZ", aliases: ["TUS"] },
  { city: "Albuquerque", state: "NM", aliases: ["ABQ"] },
  { city: "Sacramento", state: "CA", aliases: ["SMF"] },
  { city: "Kansas City", state: "MO", aliases: ["MCI"] },
  { city: "Mesa", state: "AZ" },
  { city: "Raleigh", state: "NC", aliases: ["RDU"] },
  { city: "Omaha", state: "NE", aliases: ["OMA"] },
  { city: "Colorado Springs", state: "CO", aliases: ["COS"] },
  { city: "Virginia Beach", state: "VA" },
  { city: "Tampa", state: "FL", aliases: ["TPA"] },
  { city: "New Orleans", state: "LA", aliases: ["MSY", "NOLA"] },
  { city: "Cleveland", state: "OH", aliases: ["CLE"] },
  { city: "Honolulu", state: "HI", aliases: ["HNL"] },
  { city: "Pittsburgh", state: "PA", aliases: ["PIT"] },
  { city: "Cincinnati", state: "OH", aliases: ["CVG"] },
  { city: "St. Louis", state: "MO", aliases: ["STL", "Saint Louis"] },
  { city: "Orlando", state: "FL", aliases: ["MCO"] },
  { city: "Salt Lake City", state: "UT", aliases: ["SLC"] },
  { city: "Detroit", state: "MI", aliases: ["DTW"] },
  { city: "Richmond", state: "VA", aliases: ["RIC"] },
  { city: "Boise", state: "ID", aliases: ["BOI"] },
  { city: "Des Moines", state: "IA", aliases: ["DSM"] },
  { city: "Birmingham", state: "AL", aliases: ["BHM"] },
  { city: "Anchorage", state: "AK", aliases: ["ANC"] },
  { city: "Tulsa", state: "OK", aliases: ["TUL"] },
  { city: "Wichita", state: "KS", aliases: ["ICT"] },
  { city: "Lexington", state: "KY", aliases: ["LEX"] },
  { city: "Bakersfield", state: "CA" },
  { city: "Fresno", state: "CA", aliases: ["FAT"] },
  { city: "Stockton", state: "CA" },
  { city: "Riverside", state: "CA" },
  { city: "St. Petersburg", state: "FL", aliases: ["Saint Petersburg"] },
  { city: "Norfolk", state: "VA", aliases: ["ORF"] },
  { city: "Buffalo", state: "NY", aliases: ["BUF"] },
  { city: "Rochester", state: "NY" },
  { city: "Reno", state: "NV", aliases: ["RNO"] },
  { city: "Hartford", state: "CT", aliases: ["BDL"] },
  { city: "Providence", state: "RI", aliases: ["PVD"] },
  { city: "Charleston", state: "SC", aliases: ["CHS"] },
  { city: "Savannah", state: "GA", aliases: ["SAV"] },
  { city: "Dayton", state: "OH", aliases: ["DAY"] },
  { city: "Akron", state: "OH", aliases: ["CAK"] },
  { city: "Springfield", state: "OH" },
  { city: "Fort Lauderdale", state: "FL", aliases: ["FLL"] },
  { city: "Aurora", state: "CO" },
  { city: "Chandler", state: "AZ" },
  { city: "Tempe", state: "AZ" },
  { city: "Scottsdale", state: "AZ" },
  { city: "Durham", state: "NC" },
  { city: "Madison", state: "WI" },
  { city: "Knoxville", state: "TN" },
  { city: "Little Rock", state: "AR", aliases: ["LIT"] },
  { city: "Baton Rouge", state: "LA", aliases: ["BTR"] },
  { city: "Grand Rapids", state: "MI", aliases: ["GRR"] },
];

// UAM keywords that must co-occur with a city name for a valid match
const UAM_COOCCURRENCE = /evtol|vtol|powered.lift|vertiport|air.taxi|air.mobility|urban.air|advanced.air|aam\b|uas\b|unmanned.aircraft|drone.(?:airspace|corridor|delivery|integration|operations)|eipp|pilot.program/i;

// Build tracked city set from seed data for filtering
const TRACKED_CITIES = new Set(CITIES.map((c) => `${c.city.toLowerCase()}|${c.state.toLowerCase()}`));

// Filter out metros that are already tracked
export const US_METROS: MetroEntry[] = RAW_METROS.filter(
  (m) => !TRACKED_CITIES.has(`${m.city.toLowerCase()}|${m.state.toLowerCase()}`)
);

// Pre-compile regex patterns for each metro
const METRO_PATTERNS: { entry: MetroEntry; pattern: RegExp }[] = US_METROS.map((m) => {
  const names = [m.city, ...(m.aliases ?? [])];
  // Escape regex special chars and join with alternation
  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return {
    entry: m,
    pattern: new RegExp(`\\b(?:${escaped.join("|")})\\b`, "i"),
  };
});

/**
 * Extract city mentions from text, requiring UAM keyword co-occurrence.
 * Returns deduplicated array of { city, state } matches.
 */
export function extractCityMentions(
  text: string
): { city: string; state: string }[] {
  // Short-circuit: text must contain UAM keywords
  if (!UAM_COOCCURRENCE.test(text)) return [];

  const matches: { city: string; state: string }[] = [];
  const seen = new Set<string>();

  for (const { entry, pattern } of METRO_PATTERNS) {
    if (pattern.test(text)) {
      const key = `${entry.city}|${entry.state}`;
      if (!seen.has(key)) {
        seen.add(key);
        matches.push({ city: entry.city, state: entry.state });
      }
    }
  }

  return matches;
}

/**
 * Check if a specific state has any tracked cities in our market list.
 */
export function isUntrackedState(stateAbbrev: string): boolean {
  const tracked = CITIES.some(
    (c) => c.state.toUpperCase() === stateAbbrev.toUpperCase()
  );
  return !tracked;
}
