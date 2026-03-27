/**
 * Congress.gov API Integration
 *
 * Searches for bills mentioning AAM/UAM/eVTOL/vertiport/powered-lift.
 * Results feed into the existing Haiku classification pipeline as FeedItems.
 * Enriches: Legislation (20%), Regulatory Posture (10%).
 *
 * API: https://api.congress.gov/v3
 * Rate limit: 1000 req/hr
 * Requires: CONGRESS_API_KEY env var (free, register at api.congress.gov)
 */

import { createLogger } from "@/lib/logger";

const logger = createLogger("congress-api");

const CONGRESS_BASE = "https://api.congress.gov/v3";

const SEARCH_TERMS = [
  "advanced air mobility",
  "urban air mobility",
  "eVTOL",
  "vertiport",
  "powered lift",
];

export interface CongressBill {
  congress: number;
  billType: string;
  billNumber: number;
  title: string;
  introducedDate: string;
  latestAction: {
    actionDate: string;
    text: string;
  };
  url: string;
  policyArea?: { name: string };
}

interface CongressSearchResult {
  bills: CongressBill[];
  pagination: {
    count: number;
    next?: string;
  };
}

/**
 * Search Congress.gov for bills matching UAM-related terms.
 * Returns deduplicated results across all search terms.
 */
export async function searchCongressBills(
  options: {
    congress?: number;      // e.g., 119 for current
    limit?: number;         // per-term limit, default 25
  } = {},
): Promise<CongressBill[]> {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) {
    logger.warn("CONGRESS_API_KEY not set — skipping Congress.gov ingestion");
    return [];
  }

  const { congress = 119, limit = 25 } = options;
  const seen = new Set<string>();
  const results: CongressBill[] = [];

  for (const term of SEARCH_TERMS) {
    try {
      const params = new URLSearchParams({
        query: term,
        limit: String(limit),
        api_key: apiKey,
      });

      const url = `${CONGRESS_BASE}/bill/${congress}?${params}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        logger.error(`Congress.gov API error: ${res.status} for term "${term}"`);
        continue;
      }

      const data: CongressSearchResult = await res.json();
      for (const bill of data.bills ?? []) {
        const key = `${bill.congress}-${bill.billType}-${bill.billNumber}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push(bill);
        }
      }

      logger.info(`Congress.gov: "${term}" returned ${data.bills?.length ?? 0} bills`);
    } catch (err) {
      logger.error(`Congress.gov fetch failed for "${term}":`, err);
    }
  }

  logger.info(`Congress.gov total: ${results.length} unique bills across ${SEARCH_TERMS.length} terms`);
  return results;
}

/**
 * Convert a Congress bill to FeedItem shape for the classification pipeline.
 */
export function congressBillToFeedItem(bill: CongressBill) {
  return {
    source: "congress_gov" as const,
    title: bill.title,
    url: bill.url,
    publishedAt: bill.introducedDate,
    summary: `${bill.billType.toUpperCase()} ${bill.billNumber} (${bill.congress}th Congress) — ${bill.latestAction?.text ?? "No action recorded"}`,
  };
}
