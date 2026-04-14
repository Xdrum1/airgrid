/**
 * FAA & Federal Data Sources
 *
 * Live APIs used for automated data ingestion:
 *   Federal Register:               https://www.federalregister.gov/api/v1
 *   LegiScan (state bills):         https://api.legiscan.com
 *   SEC EDGAR (public operators):   https://data.sec.gov/api
 *   Congress.gov (federal bills):   https://api.congress.gov/v3    (see congress-api.ts)
 *   Regulations.gov (FAA dockets):  https://api.regulations.gov/v4 (see regulations-api.ts)
 */

const FEDERAL_REGISTER_BASE = "https://www.federalregister.gov/api/v1";
const LEGISCAN_BASE = "https://api.legiscan.com";

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
  '"powered lift"',
  '"advanced air mobility"',
  "vertiport",
  '"unmanned aircraft system"',
  "eIPP",
  '"integration pilot program"',
  '"urban air mobility"',
  "SFAR",
  '"eVTOL Integration Pilot Program"',
  "2025-17844", // FAA eVTOL/AAM Integration Pilot Program RFP docket
];

async function fetchFederalRegisterTerm(
  term: string,
  startDate: string,
  endDate: string
): Promise<FederalFiling[]> {
  const allResults: FederalFiling[] = [];
  let page = 1;
  const perPage = 50; // max allowed by Federal Register API
  const maxPages = 10; // safety cap: 500 results per term

  try {
    while (page <= maxPages) {
      const params = new URLSearchParams({
        "conditions[term]": term,
        "conditions[publication_date][gte]": startDate,
        "conditions[publication_date][lte]": endDate,
        per_page: String(perPage),
        page: String(page),
        order: "newest",
      });

      const url = `${FEDERAL_REGISTER_BASE}/documents.json?${params}`;
      const res = await fetch(url);
      const json = await res.json();
      const results = json.results ?? [];
      allResults.push(...results);

      // Stop if we got fewer than a full page (no more results)
      if (results.length < perPage) break;
      page++;
      // Rate limit: small delay between pages to avoid Federal Register API throttling
      await new Promise((r) => setTimeout(r, 300));
    }
  } catch {
    // Return whatever we collected so far
  }
  return allResults;
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

    // Only exclude obvious noise — trust the API search terms for relevance
    const NOISE = /safety zone|marine mammal|coast guard|fisheries|wildlife/i;
    const filtered = merged.filter((f) => !NOISE.test(f.title));

    // Sort newest first
    filtered.sort((a, b) => b.publication_date.localeCompare(a.publication_date));

    console.log(`[FederalRegister] ${merged.length} total → ${filtered.length} after noise filter`);
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
    const url = `${LEGISCAN_BASE}/?key=${apiKey}&op=getSearch&state=${state}&query=evtol+OR+%22powered+lift%22+OR+%22air+taxi%22+OR+%22advanced+air+mobility%22+OR+%22urban+air+mobility%22+OR+%22unmanned+aircraft+system%22+OR+vertiport+OR+%22drone+airspace%22+OR+%22drone+corridor%22+OR+%22drone+delivery%22`;
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
