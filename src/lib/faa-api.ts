/**
 * FAA & Federal Data Sources
 *
 * These are the public APIs we'll wire up for automated data ingestion.
 * Currently stubbed — each function returns the shape of data we expect.
 *
 * LIVE APIS:
 *   FAA LAANC / UAS Facility Maps:  https://uas-faa.opendata.arcgis.com
 *   Federal Register:               https://www.federalregister.gov/api/v1
 *   LegiScan (state bills):         https://api.legiscan.com
 *   SEC EDGAR (public operators):   https://data.sec.gov/api
 */

const FAA_BASE = "https://uas-faa.opendata.arcgis.com";
const FEDERAL_REGISTER_BASE = "https://www.federalregister.gov/api/v1";
const LEGISCAN_BASE = "https://api.legiscan.com";

// -------------------------------------------------------
// FAA: LAANC Coverage Check
// Check if a lat/lng coordinate has LAANC coverage
// -------------------------------------------------------
export async function checkLaancCoverage(lat: number, lng: number): Promise<boolean> {
  try {
    // FAA UAS Facility Maps ArcGIS endpoint
    const url = `${FAA_BASE}/datasets/faa::uas-facility-maps/api/explore`;
    // TODO: implement real spatial query
    // For now returning true for all — will implement in Sprint 2
    console.log(`[FAA] Checking LAANC coverage for ${lat}, ${lng}`);
    return true;
  } catch (err) {
    console.error("[FAA] LAANC check failed:", err);
    return false;
  }
}

// -------------------------------------------------------
// Federal Register: UAM-related filings
// -------------------------------------------------------
export interface FederalFiling {
  document_number: string;
  title: string;
  abstract: string;
  publication_date: string;
  html_url: string;
  type: string;
}

// The Federal Register API doesn't support OR queries reliably.
// We run parallel searches per term and merge/deduplicate.
const UAM_SEARCH_TERMS = [
  "eVTOL",
  "powered-lift",
  '"advanced air mobility"',
  "vertiport",
  '"unmanned aircraft system"',
];

async function fetchFederalRegisterTerm(
  term: string,
  startDate: string,
  endDate: string
): Promise<FederalFiling[]> {
  try {
    const params = new URLSearchParams({
      "conditions[term]": term,
      "conditions[publication_date][gte]": startDate,
      "conditions[publication_date][lte]": endDate,
      per_page: "20",
      order: "newest",
    });

    const url = `${FEDERAL_REGISTER_BASE}/documents.json?${params}`;
    const res = await fetch(url);
    const json = await res.json();
    return json.results ?? [];
  } catch {
    return [];
  }
}

export async function fetchFederalRegisterUAM(
  daysBack: number = 730
): Promise<FederalFiling[]> {
  try {
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - daysBack * 86400000)
      .toISOString()
      .split("T")[0];

    console.log(`[FederalRegister] Fetching ${UAM_SEARCH_TERMS.length} terms from ${startDate} to ${endDate}`);

    const results = await Promise.all(
      UAM_SEARCH_TERMS.map((term) => fetchFederalRegisterTerm(term, startDate, endDate))
    );

    // Merge and deduplicate by document_number
    const seen = new Set<string>();
    const merged: FederalFiling[] = [];
    for (const batch of results) {
      for (const filing of batch) {
        if (!seen.has(filing.document_number)) {
          seen.add(filing.document_number);
          merged.push(filing);
        }
      }
    }

    // Filter out irrelevant results that slipped through broad search terms.
    // Keep filings whose title OR abstract mentions UAM-related keywords.
    const UAM_KEYWORDS = /evtol|vtol|powered.lift|vertiport|air.taxi|air.mobility|unmanned.aircraft|drone|uas\b|aam\b|airworthiness|airspace|pilot.cert|flight.restrict|special.condition|beyond.visual/i;
    const NOISE = /safety zone|marine mammal|coast guard/i;
    const filtered = merged.filter(
      (f) =>
        (UAM_KEYWORDS.test(f.title) || UAM_KEYWORDS.test(f.abstract || "")) &&
        !NOISE.test(f.title)
    );

    // Sort newest first
    filtered.sort((a, b) => b.publication_date.localeCompare(a.publication_date));

    console.log(`[FederalRegister] ${merged.length} total → ${filtered.length} relevant filings`);
    return filtered;
  } catch (err) {
    console.error("[FederalRegister] Fetch failed:", err);
    return [];
  }
}

// -------------------------------------------------------
// LegiScan: State-level UAM bills
// Requires API key — set LEGISCAN_API_KEY in .env.local
// -------------------------------------------------------
export interface StateBill {
  bill_id: number;
  bill_number: string;
  title: string;
  description: string;
  status: string;
  state: string;
  url: string;
  last_action: string;
  last_action_date: string;
}

export async function fetchStateBills(state: string): Promise<StateBill[]> {
  const apiKey = process.env.LEGISCAN_API_KEY;
  if (!apiKey) {
    console.warn("[LegiScan] No API key — set LEGISCAN_API_KEY in .env.local");
    return [];
  }

  try {
    const url = `${LEGISCAN_BASE}/?key=${apiKey}&op=getSearch&state=${state}&query=drone+OR+evtol+OR+%22air+mobility%22+OR+vertiport`;
    const res = await fetch(url);
    const json = await res.json();
    const sr = json.searchresult;
    if (!sr) return [];
    // LegiScan returns results as numbered keys, not an array
    return Object.entries(sr)
      .filter(([k]) => k !== "summary")
      .map(([, v]) => v as StateBill);
  } catch (err) {
    console.error("[LegiScan] Fetch failed:", err);
    return [];
  }
}

// -------------------------------------------------------
// SEC EDGAR: Public operator filings (Joby, Archer, etc)
// -------------------------------------------------------
export interface SecFiling {
  accessionNo: string;
  filingDate: string;
  form: string;
  primaryDocument: string;
  primaryDescription: string;
}

export const OPERATOR_CIKS: Record<string, string> = {
  op_joby: "0001819848",    // Joby Aviation CIK
  op_archer: "0001824502",  // Archer Aviation CIK
  op_blade: "0001779128",   // Blade Air Mobility CIK
};

export async function fetchOperatorFilings(
  operatorId: string,
  formType: string = "8-K"
): Promise<SecFiling[]> {
  const cik = OPERATOR_CIKS[operatorId];
  if (!cik) return [];

  try {
    const url = `https://data.sec.gov/submissions/CIK${cik}.json`;
    const res = await fetch(url, {
      headers: { "User-Agent": "AirIndex contact@airindex.io" },
    });
    const json = await res.json();

    const recentFilings = json.filings?.recent;
    if (!recentFilings) return [];

    const filtered: SecFiling[] = [];
    for (let i = 0; i < recentFilings.accessionNumber.length; i++) {
      if (recentFilings.form[i] === formType) {
        filtered.push({
          accessionNo: recentFilings.accessionNumber[i],
          filingDate: recentFilings.filingDate[i],
          form: recentFilings.form[i],
          primaryDocument: recentFilings.primaryDocument[i],
          primaryDescription: recentFilings.primaryDocDescription?.[i] ?? recentFilings.primaryDescription?.[i] ?? "",
        });
        if (filtered.length >= 10) break;
      }
    }
    return filtered;
  } catch (err) {
    console.error("[EDGAR] Fetch failed:", err);
    return [];
  }
}
