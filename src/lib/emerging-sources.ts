/**
 * Emerging Markets — Ingestion Adapters
 *
 * Phase 1: DOE ARPA-E (via USAspending.gov) + ClinicalTrials.gov
 * Phase 2: Federal Register (drone/hydrogen/AV) + LegiScan + NHTSA
 * Each adapter returns normalized EmergingRawRecord[] for classification.
 */

import { createLogger } from "@/lib/logger";

const log = createLogger("emerging-sources");

// -------------------------------------------------------
// Types
// -------------------------------------------------------

export interface EmergingRawRecord {
  sourceId: string;
  source: string;
  title: string;
  url: string;
  date: string;
  summary: string;
  raw: Record<string, unknown>;
}

const DELAY_MS = 500;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// -------------------------------------------------------
// DOE ARPA-E (via USAspending.gov API)
// -------------------------------------------------------

const USASPENDING_URL = "https://api.usaspending.gov/api/v2/search/spending_by_award/";

// Energy/infrastructure keywords relevant to emerging markets
const ARPA_E_KEYWORDS = [
  "nuclear", "microreactor", "small modular reactor",
  "hydrogen", "fuel cell", "electrolysis",
  "geothermal", "enhanced geothermal",
  "drone", "unmanned", "autonomous vehicle",
  "advanced air mobility", "eVTOL",
  "energy storage", "grid modernization",
];

export async function fetchArpaEAwards(daysBack: number = 365): Promise<EmergingRawRecord[]> {
  const records: EmergingRawRecord[] = [];
  const since = new Date(Date.now() - daysBack * 86400000);
  const sinceStr = since.toISOString().slice(0, 10);

  try {
    let page = 1;
    const limit = 50;
    let hasNext = true;

    while (hasNext && page <= 5) {
      const body = {
        filters: {
          keywords: ["ARPA-E"],
          time_period: [{ start_date: sinceStr, end_date: new Date().toISOString().slice(0, 10) }],
          award_type_codes: ["02", "03", "04", "05"], // grants and cooperative agreements
        },
        fields: [
          "Award ID",
          "Recipient Name",
          "Description",
          "Start Date",
          "Award Amount",
          "awarding_agency_name",
          "awarding_sub_agency_name",
          "generated_internal_id",
        ],
        limit,
        page,
        sort: "Start Date",
        order: "desc",
      };

      const res = await fetch(USASPENDING_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        log.warn(`USAspending API error: ${res.status}`);
        break;
      }

      const data = await res.json();
      const results = data.results ?? [];

      for (const r of results) {
        const awardId = r["Award ID"] ?? r.generated_internal_id ?? `arpa_${page}_${records.length}`;
        const description = r["Description"] ?? "";
        const title = `${r["Recipient Name"] ?? "Unknown"} — ${description.slice(0, 120)}`;

        records.push({
          sourceId: String(awardId),
          source: "doe_arpa_e",
          title: title.slice(0, 300),
          url: `https://www.usaspending.gov/award/${r.generated_internal_id ?? awardId}`,
          date: r["Start Date"] ?? sinceStr,
          summary: description.slice(0, 500),
          raw: r,
        });
      }

      hasNext = data.page_metadata?.hasNext ?? false;
      page++;

      if (hasNext) await delay(DELAY_MS);
    }

    log.info(`ARPA-E: fetched ${records.length} awards`);
  } catch (err) {
    log.error("ARPA-E fetch failed:", err);
  }

  return records;
}

// -------------------------------------------------------
// ClinicalTrials.gov API v2
// -------------------------------------------------------

const CT_BASE = "https://clinicaltrials.gov/api/v2/studies";

// Search terms covering emerging infrastructure-adjacent research
const CT_SEARCH_TERMS = [
  "eVTOL OR urban air mobility OR advanced air mobility",
  "small modular reactor OR nuclear microreactor",
  "hydrogen fueling infrastructure",
  "autonomous vehicle infrastructure",
  "humanoid robot deployment",
  "longevity intervention OR biological age",
  "spatial computing OR mixed reality headset",
];

export async function fetchClinicalTrials(daysBack: number = 365): Promise<EmergingRawRecord[]> {
  const records: EmergingRawRecord[] = [];
  const since = new Date(Date.now() - daysBack * 86400000);
  const sinceStr = since.toISOString().slice(0, 10);
  const seen = new Set<string>();

  for (const term of CT_SEARCH_TERMS) {
    try {
      let pageToken: string | undefined;
      let pages = 0;

      do {
        const params = new URLSearchParams({
          "query.term": term,
          "filter.advanced": `AREA[LastUpdatePostDate]RANGE[${sinceStr},MAX]`,
          pageSize: "50",
          countTotal: "true",
          fields: "NCTId,BriefTitle,OfficialTitle,BriefSummary,OverallStatus,StartDate,LastUpdatePostDate,LeadSponsorName,Condition",
        });

        if (pageToken) params.set("pageToken", pageToken);

        const res = await fetch(`${CT_BASE}?${params}`);

        if (!res.ok) {
          log.warn(`ClinicalTrials API error for "${term}": ${res.status}`);
          break;
        }

        const data = await res.json();
        const studies = data.studies ?? [];

        for (const study of studies) {
          const proto = study.protocolSection ?? {};
          const idMod = proto.identificationModule ?? {};
          const statusMod = proto.statusModule ?? {};
          const descMod = proto.descriptionModule ?? {};
          const sponsorMod = proto.sponsorCollaboratorsModule ?? {};

          const nctId = idMod.nctId;
          if (!nctId || seen.has(nctId)) continue;
          seen.add(nctId);

          records.push({
            sourceId: nctId,
            source: "clinicaltrials_gov",
            title: (idMod.briefTitle ?? idMod.officialTitle ?? "Untitled").slice(0, 300),
            url: `https://clinicaltrials.gov/study/${nctId}`,
            date: statusMod.lastUpdateSubmitDate ?? statusMod.startDateStruct?.date ?? sinceStr,
            summary: (descMod.briefSummary ?? "").slice(0, 500),
            raw: {
              nctId,
              status: statusMod.overallStatus,
              sponsor: sponsorMod.leadSponsor?.name,
              conditions: proto.conditionsModule?.conditions,
            },
          });
        }

        pageToken = data.nextPageToken;
        pages++;

        if (pageToken) await delay(DELAY_MS);
      } while (pageToken && pages < 3); // max 3 pages per term
    } catch (err) {
      log.error(`ClinicalTrials fetch failed for "${term}":`, err);
    }
  }

  log.info(`ClinicalTrials: fetched ${records.length} studies`);
  return records;
}

// ═══════════════════════════════════════════════════════════
// Phase 2 — Commercial Drone, Hydrogen Fueling, Autonomous Vehicle
// Uses shared Federal Register + LegiScan adapters with market-specific terms
// ═══════════════════════════════════════════════════════════

const FEDERAL_REGISTER_BASE = "https://www.federalregister.gov/api/v1";
const LEGISCAN_BASE = "https://api.legiscan.com";

/**
 * Shared Federal Register search — fetches documents matching a set of terms.
 * Same pagination logic as faa-api.ts but returns EmergingRawRecord[].
 */
async function fetchFederalRegisterForMarket(
  terms: string[],
  marketSource: string,
  daysBack: number,
): Promise<EmergingRawRecord[]> {
  const records: EmergingRawRecord[] = [];
  const seen = new Set<string>();
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - daysBack * 86400000).toISOString().slice(0, 10);

  for (const term of terms) {
    try {
      let page = 1;
      const perPage = 50;

      while (page <= 5) {
        const params = new URLSearchParams({
          "conditions[term]": term,
          "conditions[publication_date][gte]": startDate,
          "conditions[publication_date][lte]": endDate,
          per_page: String(perPage),
          page: String(page),
          order: "newest",
        });

        const res = await fetch(`${FEDERAL_REGISTER_BASE}/documents.json?${params}`);
        if (!res.ok) break;

        const json = await res.json();
        const results = json.results ?? [];

        for (const r of results) {
          const docNum = r.document_number;
          if (!docNum || seen.has(docNum)) continue;
          seen.add(docNum);

          records.push({
            sourceId: docNum,
            source: marketSource,
            title: (r.title ?? "Untitled").slice(0, 300),
            url: r.html_url ?? `https://www.federalregister.gov/d/${docNum}`,
            date: r.publication_date ?? startDate,
            summary: (r.abstract ?? "").slice(0, 500),
            raw: { document_number: docNum, type: r.type, agencies: r.agencies },
          });
        }

        if (results.length < perPage) break;
        page++;
        await delay(DELAY_MS);
      }
    } catch (err) {
      log.error(`Federal Register fetch failed for "${term}":`, err);
    }
  }

  // Filter obvious noise
  const NOISE = /safety zone|marine mammal|coast guard|fisheries|wildlife/i;
  const filtered = records.filter((r) => !NOISE.test(r.title));

  log.info(`FedReg (${marketSource}): ${records.length} raw → ${filtered.length} after noise filter`);
  return filtered;
}

/**
 * Shared LegiScan search — returns bills matching market-specific queries.
 */
async function fetchLegiScanForMarket(
  query: string,
  marketSource: string,
): Promise<EmergingRawRecord[]> {
  const apiKey = process.env.LEGISCAN_API_KEY;
  if (!apiKey) return [];

  const records: EmergingRawRecord[] = [];

  // Search all states (state=ALL)
  try {
    const url = `${LEGISCAN_BASE}/?key=${apiKey}&op=getSearch&state=ALL&query=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) {
      log.warn(`LegiScan API error for ${marketSource}: ${res.status}`);
      return [];
    }

    const json = await res.json();
    const sr = json.searchresult;
    if (!sr) return [];

    const bills = Object.entries(sr)
      .filter(([k]) => k !== "summary")
      .map(([, v]) => v as {
        bill_id: number;
        bill_number: string;
        title: string;
        description: string;
        state: string;
        url: string;
        last_action_date: string;
      });

    for (const bill of bills) {
      records.push({
        sourceId: `legiscan_${bill.bill_id}`,
        source: marketSource,
        title: `[${bill.state}] ${bill.bill_number}: ${bill.title}`.slice(0, 300),
        url: bill.url,
        date: bill.last_action_date ?? new Date().toISOString().slice(0, 10),
        summary: (bill.description ?? bill.title).slice(0, 500),
        raw: { bill_id: bill.bill_id, state: bill.state, bill_number: bill.bill_number },
      });
    }

    log.info(`LegiScan (${marketSource}): ${records.length} bills`);
  } catch (err) {
    log.error(`LegiScan fetch failed for ${marketSource}:`, err);
  }

  return records;
}

// -------------------------------------------------------
// Commercial Drone Infrastructure
// Shared Federal Register + FAA adapters per architecture decision
// -------------------------------------------------------

const DRONE_FR_TERMS = [
  '"unmanned aircraft system"',
  '"drone delivery"',
  '"drone corridor"',
  '"beyond visual line of sight"',
  "BVLOS",
  '"UAS integration"',
  '"remote identification"',
  '"drone infrastructure"',
  '"Part 107"',
  '"Part 108"',
];

const DRONE_LEGISCAN_QUERY = 'drone OR "unmanned aircraft" OR "UAS" OR "BVLOS" OR "drone delivery" OR "drone corridor"';

export async function fetchDroneSignals(daysBack: number = 90): Promise<EmergingRawRecord[]> {
  const [frRecords, lsRecords] = await Promise.all([
    fetchFederalRegisterForMarket(DRONE_FR_TERMS, "fed_reg_drone", daysBack),
    fetchLegiScanForMarket(DRONE_LEGISCAN_QUERY, "legiscan_drone"),
  ]);

  const all = [...frRecords, ...lsRecords];
  log.info(`Commercial Drone: ${all.length} total (${frRecords.length} FedReg, ${lsRecords.length} LegiScan)`);
  return all;
}

// -------------------------------------------------------
// Hydrogen Fueling Infrastructure
// DOE (via USAspending), FERC (via Federal Register), LegiScan
// -------------------------------------------------------

const HYDROGEN_FR_TERMS = [
  '"hydrogen fueling"',
  '"hydrogen infrastructure"',
  '"hydrogen hub"',
  '"clean hydrogen"',
  '"fuel cell"',
  '"electrolysis"',
  '"hydrogen pipeline"',
  '"FERC hydrogen"',
  '"hydrogen production tax credit"',
  '"45V"', // IRA hydrogen production tax credit section
];

const HYDROGEN_LEGISCAN_QUERY = '"hydrogen fuel" OR "hydrogen infrastructure" OR "hydrogen hub" OR "clean hydrogen" OR "fuel cell infrastructure"';

export async function fetchHydrogenSignals(daysBack: number = 90): Promise<EmergingRawRecord[]> {
  const [frRecords, lsRecords] = await Promise.all([
    fetchFederalRegisterForMarket(HYDROGEN_FR_TERMS, "fed_reg_hydrogen", daysBack),
    fetchLegiScanForMarket(HYDROGEN_LEGISCAN_QUERY, "legiscan_hydrogen"),
  ]);

  const all = [...frRecords, ...lsRecords];
  log.info(`Hydrogen Fueling: ${all.length} total (${frRecords.length} FedReg, ${lsRecords.length} LegiScan)`);
  return all;
}

// -------------------------------------------------------
// Autonomous Vehicle Infrastructure
// NHTSA (via Federal Register), LegiScan, SEC EDGAR
// -------------------------------------------------------

const AV_FR_TERMS = [
  '"autonomous vehicle"',
  '"self-driving"',
  '"automated driving system"',
  "NHTSA autonomous",
  '"connected vehicle"',
  '"vehicle-to-infrastructure"',
  '"V2X"',
  '"AV corridor"',
  '"autonomous vehicle testing"',
  '"ADS-equipped vehicle"',
  '"FMVSS exemption"',
];

const AV_LEGISCAN_QUERY = '"autonomous vehicle" OR "self-driving" OR "automated driving" OR "connected vehicle" OR "AV testing" OR "AV corridor"';

// SEC EDGAR: AV-relevant public companies
const AV_SEC_CIKS: Record<string, string> = {
  waymo_alphabet: "0001652044",  // Alphabet (Waymo parent)
  cruise_gm: "0001467858",       // General Motors (Cruise parent)
  aurora: "0001828723",          // Aurora Innovation
  mobileye: "0001900119",       // Mobileye
  tusimple: "0001810997",       // TuSimple
};

async function fetchAvSecFilings(daysBack: number): Promise<EmergingRawRecord[]> {
  const records: EmergingRawRecord[] = [];
  const since = new Date(Date.now() - daysBack * 86400000);

  for (const [name, cik] of Object.entries(AV_SEC_CIKS)) {
    try {
      const url = `https://data.sec.gov/submissions/CIK${cik.padStart(10, "0")}.json`;
      const res = await fetch(url, {
        headers: { "User-Agent": "AirIndex/1.0 (support@airindex.io)" },
      });
      if (!res.ok) continue;

      const data = await res.json();
      const filings = data.filings?.recent;
      if (!filings) continue;

      const forms = filings.form ?? [];
      const dates = filings.filingDate ?? [];
      const accessions = filings.accessionNumber ?? [];
      const descriptions = filings.primaryDocDescription ?? [];

      for (let i = 0; i < forms.length && i < 20; i++) {
        const filingDate = new Date(dates[i]);
        if (filingDate < since) break;

        // Only relevant filing types
        const form = forms[i];
        if (!["8-K", "10-K", "10-Q", "S-1", "DEF 14A"].includes(form)) continue;

        const accession = accessions[i]?.replace(/-/g, "");
        records.push({
          sourceId: `sec_av_${cik}_${accessions[i]}`,
          source: "sec_edgar_av",
          title: `[${name}] ${form}: ${descriptions[i] ?? "SEC Filing"}`.slice(0, 300),
          url: `https://www.sec.gov/Archives/edgar/data/${cik}/${accession}`,
          date: dates[i],
          summary: `${data.name ?? name} — ${form} filed ${dates[i]}. ${descriptions[i] ?? ""}`.slice(0, 500),
          raw: { cik, form, filingDate: dates[i], accession: accessions[i] },
        });
      }

      await delay(DELAY_MS); // SEC rate limit: 10 req/sec
    } catch (err) {
      log.error(`SEC fetch failed for ${name}:`, err);
    }
  }

  log.info(`SEC EDGAR (AV): ${records.length} filings`);
  return records;
}

export async function fetchAvSignals(daysBack: number = 90): Promise<EmergingRawRecord[]> {
  const [frRecords, lsRecords, secRecords] = await Promise.all([
    fetchFederalRegisterForMarket(AV_FR_TERMS, "fed_reg_av", daysBack),
    fetchLegiScanForMarket(AV_LEGISCAN_QUERY, "legiscan_av"),
    fetchAvSecFilings(daysBack),
  ]);

  const all = [...frRecords, ...lsRecords, ...secRecords];
  log.info(`Autonomous Vehicle: ${all.length} total (${frRecords.length} FedReg, ${lsRecords.length} LegiScan, ${secRecords.length} SEC)`);
  return all;
}

// -------------------------------------------------------
// Hydrogen-Electric Aviation (Market 11, added Apr 15 2026)
//
// Distinct from Hydrogen Fueling — this is aircraft propulsion,
// FAA type certification, regional airport hydrogen supply, utility
// partnerships for airport-based H2, regional airline procurement.
// Buyer set is different (regional carriers, airport authorities,
// hydrogen suppliers, infrastructure investors) from the AirIndex
// eVTOL/UAM audience.
//
// Sources:
//   - Federal Register: FAA aircraft certification + DOT aviation-hydrogen
//   - LegiScan: state-level aviation-hydrogen airport infrastructure
//   - USAspending: DOE aviation-scoped hydrogen grants (ZeroAvia, Universal
//     Hydrogen, etc. recipients)
// -------------------------------------------------------

const H2AV_FR_TERMS = [
  '"hydrogen aircraft"',
  '"hydrogen-electric aircraft"',
  '"hydrogen propulsion"',
  '"hydrogen powered aviation"',
  '"hydrogen fuel cell aircraft"',
  '"ZeroAvia"',
  '"Universal Hydrogen"',
  '"airport hydrogen"',
  '"aviation hydrogen"',
  '"hydrogen supplemental type certificate"',
  '"hydrogen regional aircraft"',
];

const H2AV_LEGISCAN_QUERY =
  '"hydrogen aviation" OR "hydrogen aircraft" OR "aviation hydrogen" OR "airport hydrogen" OR ("hydrogen" AND "airport")';

// Public / near-public hydrogen-electric aviation operators tracked via
// SEC EDGAR. Universal Hydrogen is private; ZeroAvia is private. We track
// any that are public or likely to go public soon. Empty for now; add CIKs
// when H2 operators have SEC filings.
const H2AV_SEC_CIKS: Record<string, string> = {};

async function fetchH2AvSecFilings(daysBack: number): Promise<EmergingRawRecord[]> {
  const records: EmergingRawRecord[] = [];
  if (Object.keys(H2AV_SEC_CIKS).length === 0) return records;
  const since = new Date(Date.now() - daysBack * 86400000);

  for (const [name, cik] of Object.entries(H2AV_SEC_CIKS)) {
    try {
      const url = `https://data.sec.gov/submissions/CIK${cik.padStart(10, "0")}.json`;
      const res = await fetch(url, {
        headers: { "User-Agent": "AirIndex/1.0 (support@airindex.io)" },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const filings = data.filings?.recent;
      if (!filings) continue;

      const forms = filings.form ?? [];
      const dates = filings.filingDate ?? [];
      const accessions = filings.accessionNumber ?? [];
      const primaryDescs = filings.primaryDocDescription ?? [];
      const primaryDocs = filings.primaryDocument ?? [];

      for (let i = 0; i < forms.length; i++) {
        if (!["8-K", "10-K", "10-Q", "S-1", "S-4"].includes(forms[i])) continue;
        const filingDate = new Date(dates[i]);
        if (filingDate < since) break;
        const accession = (accessions[i] ?? "").replace(/-/g, "");
        records.push({
          sourceId: accessions[i],
          source: "sec_edgar_h2av",
          title: `${name} ${forms[i]}: ${primaryDescs[i] ?? "Filing"}`,
          url: `https://www.sec.gov/Archives/edgar/data/${cik}/${accession}/${primaryDocs[i] ?? ""}`,
          date: dates[i],
          summary: primaryDescs[i] ?? forms[i],
          raw: { name, cik, form: forms[i] } as Record<string, unknown>,
        });
      }
      await delay(DELAY_MS);
    } catch (err) {
      log.error(`SEC EDGAR (H2Av) fetch failed for ${name}:`, err);
    }
  }

  log.info(`SEC EDGAR (H2Av): ${records.length} filings`);
  return records;
}

export async function fetchH2AviationSignals(daysBack: number = 90): Promise<EmergingRawRecord[]> {
  const [frRecords, lsRecords, secRecords] = await Promise.all([
    fetchFederalRegisterForMarket(H2AV_FR_TERMS, "fed_reg_h2av", daysBack),
    fetchLegiScanForMarket(H2AV_LEGISCAN_QUERY, "legiscan_h2av"),
    fetchH2AvSecFilings(daysBack),
  ]);

  const all = [...frRecords, ...lsRecords, ...secRecords];
  log.info(`Hydrogen-Electric Aviation: ${all.length} total (${frRecords.length} FedReg, ${lsRecords.length} LegiScan, ${secRecords.length} SEC)`);
  return all;
}
