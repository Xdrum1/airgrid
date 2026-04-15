/**
 * Regulations.gov API Integration
 *
 * Searches FAA dockets mentioning UAM/powered-lift/vertiport terms.
 * Catches rulemaking in draft/comment phase (6-12 months before Federal Register publication).
 * Enriches: Regulatory Posture (10%).
 *
 * API: https://api.regulations.gov/v4
 * Requires: REGULATIONS_GOV_API_KEY env var (free, register at api.data.gov)
 */

import { createLogger } from "@/lib/logger";

const logger = createLogger("regulations-api");

const REGULATIONS_BASE = "https://api.regulations.gov/v4";

const SEARCH_TERMS = [
  "advanced air mobility",
  "urban air mobility",
  "powered lift",
  "vertiport",
  "eVTOL",
];

// Filter to FAA-related agencies
const AGENCY_FILTER = "FAA";

export interface RegulationDocument {
  id: string;
  type: string;
  attributes: {
    agencyId: string;
    title: string;
    docketId: string;
    documentType: string;       // "Proposed Rule", "Rule", "Notice", "Other"
    postedDate: string;
    commentEndDate?: string;
    highlightedContent?: string;
  };
  links: {
    self: string;
  };
}

interface RegulationsSearchResult {
  data: RegulationDocument[];
  meta: {
    hasNextPage: boolean;
    totalElements: number;
  };
}

/**
 * Search regulations.gov for FAA dockets related to UAM/AAM.
 * Returns deduplicated results across all search terms.
 */
export async function searchRegulations(
  options: {
    limit?: number;         // per-term limit, default 25
    postedAfter?: string;   // ISO date, e.g., "2024-01-01"
  } = {},
): Promise<RegulationDocument[]> {
  const apiKey = process.env.REGULATIONS_GOV_API_KEY;
  if (!apiKey) {
    logger.warn("REGULATIONS_GOV_API_KEY not set — skipping regulations.gov ingestion");
    return [];
  }

  const { limit = 25, postedAfter } = options;
  const seen = new Set<string>();
  const results: RegulationDocument[] = [];

  for (const term of SEARCH_TERMS) {
    try {
      const params = new URLSearchParams({
        "filter[searchTerm]": term,
        "filter[agencyId]": AGENCY_FILTER,
        "page[size]": String(limit),
        "sort": "-postedDate",
        "api_key": apiKey,
      });

      if (postedAfter) {
        params.set("filter[postedDate][ge]", postedAfter);
      }

      const url = `${REGULATIONS_BASE}/documents?${params}`;
      const res = await fetch(url, {
        headers: { Accept: "application/vnd.api+json" },
      });

      if (!res.ok) {
        const bodySnippet = await res.text().then((t) => t.slice(0, 300)).catch(() => "(body unreadable)");
        logger.error(
          `Regulations.gov API error: status=${res.status} for term "${term}". Body: ${bodySnippet}`,
        );
        continue;
      }

      const data: RegulationsSearchResult = await res.json();
      for (const doc of data.data ?? []) {
        if (!seen.has(doc.id)) {
          seen.add(doc.id);
          results.push(doc);
        }
      }

      logger.info(`Regulations.gov: "${term}" returned ${data.data?.length ?? 0} documents`);
    } catch (err) {
      logger.error(`Regulations.gov fetch failed for "${term}":`, err);
    }
  }

  logger.info(`Regulations.gov total: ${results.length} unique documents across ${SEARCH_TERMS.length} terms`);
  return results;
}

/**
 * Convert a regulations.gov document to FeedItem shape for the classification pipeline.
 */
export function regulationToFeedItem(doc: RegulationDocument) {
  const attrs = doc.attributes;
  return {
    source: "regulations_gov" as const,
    title: attrs.title,
    url: `https://www.regulations.gov/document/${doc.id}`,
    publishedAt: attrs.postedDate,
    summary: `${attrs.documentType} — Docket ${attrs.docketId} (${attrs.agencyId})${attrs.commentEndDate ? `. Comment period ends ${attrs.commentEndDate}` : ""}`,
  };
}
