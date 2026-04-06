/**
 * FAA OE/AAA (Obstruction Evaluation / Airport Airspace Analysis) REST API client.
 *
 * Public endpoints — no auth required. Returns XML parsed to typed objects.
 * API guide: https://oeaaa.faa.gov → FAQ & Resources → OE3A Library → Web Services Guide (Dec 2025)
 *
 * Working endpoints (as of Apr 2026):
 *   - NRA by state/year:   /services/caseList/NRA/{year}?state={ST}&region={REG}
 *   - NRA by date range:   /services/caseList/date/NRA?start={date}&end={date}
 *   - CIRC by state:       /services/caseList/circ/{state}
 *   - Individual case:     /services/case/{ASN}
 *   - ASN list:            /services/asnList/NRA/{year}?region={REG}
 *
 * OE endpoints timeout as of Apr 2026. Circle search returns 404.
 * Max 8,000 rows per query.
 */

import { XMLParser } from "fast-xml-parser";

const BASE = "https://oeaaa.faa.gov/oeaaa/services";
const TIMEOUT_MS = 60_000; // 60s — NRA date range can take 20s+
const LOG_PREFIX = "[OE/AAA]";

// FAA geography region IDs (required for caseList queries)
const STATE_TO_REGION: Record<string, string> = {
  // ASO — Southern Region
  FL: "ASO", GA: "ASO", NC: "ASO", SC: "ASO", TN: "ASO", AL: "ASO", KY: "ASO", MS: "ASO", PR: "ASO", VI: "ASO",
  // ASW — Southwest Region
  TX: "ASW", NM: "ASW", OK: "ASW", AR: "ASW", LA: "ASW",
  // AWP — Western-Pacific Region
  CA: "AWP", AZ: "AWP", NV: "AWP", HI: "AWP", GU: "AWP",
  // AEA — Eastern Region
  NY: "AEA", NJ: "AEA", PA: "AEA", VA: "AEA", WV: "AEA", MD: "AEA", DE: "AEA", DC: "AEA",
  // ANE — New England Region
  MA: "ANE", CT: "ANE", ME: "ANE", NH: "ANE", RI: "ANE", VT: "ANE",
  // AGL — Great Lakes Region
  IL: "AGL", OH: "AGL", MI: "AGL", IN: "AGL", WI: "AGL", MN: "AGL",
  // ACE — Central Region
  MO: "ACE", KS: "ACE", NE: "ACE", IA: "ACE",
  // ANM — Northwest Mountain Region
  WA: "ANM", OR: "ANM", CO: "ANM", UT: "ANM", ID: "ANM", MT: "ANM", WY: "ANM",
  // AAL — Alaskan Region
  AK: "AAL",
};

// ── Types ──────────────────────────────────────────────────

export interface OeaaaCase {
  caseId: string;
  asn: string;
  caseType: "OE" | "NRA";
  statusCode: string;
  nearestAirportName: string;
  nearestCity: string;
  nearestState: string;
  lat: number;
  lng: number;
  structureType: string;
  structureDescription: string;
  aglHeight: number | null;
  amslHeight: number | null;
  filingDate: string | null;       // ISO date
  determinationDate: string | null;
  expirationDate: string | null;
  year: number;
  raw: Record<string, unknown>;
}

// ── XML Parser ─────────────────────────────────────────────

const parser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,    // Keep everything as strings — we parse numbers ourselves
  isArray: (_name, jpath) => {
    // Ensure case lists are always arrays even if only one result
    return jpath === "caseList.OECase" || jpath === "caseList.NRACase" || jpath === "caseData.OECase" || jpath === "caseData.NRACase";
  },
});

function parseNum(val: unknown): number | null {
  if (val === undefined || val === null || val === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function parseDate(val: unknown): string | null {
  if (!val || val === "") return null;
  const s = String(val);
  // OE/AAA dates come as ISO or "yyyy-MM-dd" — extract just the date part
  const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function mapCase(raw: Record<string, unknown>): OeaaaCase {
  const asn = String(raw.asn ?? "");
  const caseType = asn.endsWith("-NRA") || raw.caseType === "NRA" ? "NRA" as const : "OE" as const;
  const yearMatch = asn.match(/^(\d{4})-/);

  return {
    caseId: String(raw.caseId ?? raw.id ?? ""),
    asn,
    caseType,
    statusCode: String(raw.statusCode ?? ""),
    nearestAirportName: String(raw.nearestAirportName ?? ""),
    nearestCity: String(raw.nearestCity ?? ""),
    nearestState: String(raw.nearestState ?? ""),
    lat: Number(raw.latitude ?? 0),
    lng: Number(raw.longitude ?? 0),
    structureType: String(raw.structureType ?? ""),
    structureDescription: String(raw.structureDescription ?? ""),
    aglHeight: parseNum(raw.aglStructureHeight),
    amslHeight: parseNum(raw.amslOverallHeightProposed ?? raw.amslOverallHeightDet),
    filingDate: parseDate(raw.createdDate ?? raw.dateEntered ?? raw.receivedDate),
    determinationDate: parseDate(raw.dateCompleted),
    expirationDate: parseDate(raw.expirationDate),
    year: yearMatch ? parseInt(yearMatch[1]) : parseInt(String(raw.year ?? "0")),
    raw,
  };
}

function parseCaseListXml(xml: string): OeaaaCase[] {
  try {
    const parsed = parser.parse(xml);
    // Response shape: <caseList><OECase>...</OECase>...</caseList>
    //            or:  <caseList><NRACase>...</NRACase>...</caseList>
    //            or:  <caseData><OECase>...</caseData> (single case)
    const root = parsed.caseList ?? parsed.caseData ?? parsed;
    const oeCases = root.OECase ?? [];
    const nraCases = root.NRACase ?? [];
    const all = [...(Array.isArray(oeCases) ? oeCases : [oeCases]), ...(Array.isArray(nraCases) ? nraCases : [nraCases])];
    return all.filter((c: Record<string, unknown>) => c.asn).map(mapCase);
  } catch (err) {
    console.error(`${LOG_PREFIX} XML parse error:`, err);
    return [];
  }
}

// ── Fetch helpers ──────────────────────────────────────────

async function fetchXml(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      console.error(`${LOG_PREFIX} HTTP ${res.status} for ${url}`);
      return null;
    }

    const text = await res.text();
    // Check for maintenance page
    if (text.includes("Maintenance Notification")) {
      console.error(`${LOG_PREFIX} Maintenance page returned for ${url}`);
      return null;
    }
    return text;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("abort")) {
      console.error(`${LOG_PREFIX} Timeout (${TIMEOUT_MS / 1000}s) for ${url}`);
    } else {
      console.error(`${LOG_PREFIX} Fetch error for ${url}:`, msg);
    }
    return null;
  }
}

// ── Public API ─────────────────────────────────────────────

/**
 * Fetch NRA cases for a state and year.
 * Endpoint: /services/caseList/NRA/{year}?state={ST}&region={REG}
 */
export async function fetchNraCasesByState(state: string, year: number): Promise<OeaaaCase[]> {
  const region = STATE_TO_REGION[state];
  if (!region) {
    console.error(`${LOG_PREFIX} Unknown region for state: ${state}`);
    return [];
  }
  const url = `${BASE}/caseList/NRA/${year}?state=${state}&region=${region}`;
  console.log(`${LOG_PREFIX} Fetching NRA cases: ${state} ${year}...`);
  const xml = await fetchXml(url);
  if (!xml) return [];
  const cases = parseCaseListXml(xml);
  console.log(`${LOG_PREFIX}   ${cases.length} cases returned`);
  return cases;
}

/**
 * Fetch NRA cases by date range (determined dates).
 * Endpoint: /services/caseList/date/NRA?start={date}&end={date}
 * NOTE: Slow (~20s). Use state-based queries when possible.
 */
export async function fetchNraCasesByDateRange(start: string, end: string): Promise<OeaaaCase[]> {
  const url = `${BASE}/caseList/date/NRA?start=${start}&end=${end}`;
  console.log(`${LOG_PREFIX} Fetching NRA cases: ${start} to ${end}...`);
  const xml = await fetchXml(url);
  if (!xml) return [];
  const cases = parseCaseListXml(xml);
  console.log(`${LOG_PREFIX}   ${cases.length} cases returned`);
  return cases;
}

/**
 * Fetch CIRC cases for a state (circularized cases soliciting public input).
 * Endpoint: /services/caseList/circ/{state}
 */
export async function fetchCircCasesByState(state: string): Promise<OeaaaCase[]> {
  const url = `${BASE}/caseList/circ/${state}`;
  console.log(`${LOG_PREFIX} Fetching CIRC cases: ${state}...`);
  const xml = await fetchXml(url);
  if (!xml) return [];
  const cases = parseCaseListXml(xml);
  console.log(`${LOG_PREFIX}   ${cases.length} cases returned`);
  return cases;
}

/**
 * Fetch a single case by its Aeronautical Study Number.
 * Endpoint: /services/case/{ASN}
 */
export async function fetchCaseByAsn(asn: string): Promise<OeaaaCase | null> {
  const url = `${BASE}/case/${asn}`;
  const xml = await fetchXml(url);
  if (!xml) return null;
  const cases = parseCaseListXml(xml);
  return cases[0] ?? null;
}

/**
 * Fetch ASN list for a region and year (lighter than full case data).
 * Endpoint: /services/asnList/NRA/{year}?region={REG}
 */
export async function fetchNraAsnsByRegion(region: string, year: number): Promise<string[]> {
  const url = `${BASE}/asnList/NRA/${year}?region=${region}`;
  console.log(`${LOG_PREFIX} Fetching ASN list: ${region} ${year}...`);
  const xml = await fetchXml(url);
  if (!xml) return [];
  try {
    const parsed = parser.parse(xml);
    const list = parsed.asnList?.asn ?? [];
    const asns = Array.isArray(list) ? list.map(String) : [String(list)];
    console.log(`${LOG_PREFIX}   ${asns.length} ASNs returned`);
    return asns;
  } catch {
    return [];
  }
}

/** Get the FAA region code for a state. */
export function getRegionForState(state: string): string | undefined {
  return STATE_TO_REGION[state];
}

/** All state codes that map to our tracked markets. */
export const TRACKED_STATES = [
  "CA", "TX", "FL", "AZ", "NY", "IL", "NV", "NC", "GA",
  "CO", "TN", "WA", "MA", "OH", "MN", "DC", "UT",
];
