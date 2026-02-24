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

export async function fetchFederalRegisterUAM(
  daysBack: number = 30
): Promise<FederalFiling[]> {
  try {
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - daysBack * 86400000)
      .toISOString()
      .split("T")[0];

    const params = new URLSearchParams({
      "conditions[term]": "urban air mobility OR eVTOL OR vertiport OR air taxi",
      "conditions[publication_date][gte]": startDate,
      "conditions[publication_date][lte]": endDate,
      per_page: "20",
      order: "newest",
    });

    const url = `${FEDERAL_REGISTER_BASE}/documents.json?${params}`;
    console.log("[FederalRegister] Fetching:", url);

    const res = await fetch(url);
    const json = await res.json();
    return json.results ?? [];
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
    const url = `${LEGISCAN_BASE}/?key=${apiKey}&op=getSearch&state=${state}&query=urban+air+mobility+evtol+drone+vertiport`;
    const res = await fetch(url);
    const json = await res.json();
    return json.searchresult?.results ?? [];
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

const OPERATOR_CIKS: Record<string, string> = {
  op_joby: "0001823652",    // Joby Aviation CIK
  op_archer: "0001819989",  // Archer Aviation CIK
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
          primaryDescription: recentFilings.primaryDescription[i],
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
