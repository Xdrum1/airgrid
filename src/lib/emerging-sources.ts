/**
 * Emerging Markets — Ingestion Adapters
 *
 * Phase 1: DOE ARPA-E (via USAspending.gov) + ClinicalTrials.gov
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

    await delay(DELAY_MS);
  }

  log.info(`ClinicalTrials: fetched ${records.length} studies`);
  return records;
}
