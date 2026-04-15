/**
 * Congress.gov API Integration
 *
 * Tracks curated federal bills related to AAM/UAM/eVTOL/vertiport/powered-lift.
 * The Congress.gov API v3 does not support text search — the `query` parameter
 * on /bill and /summaries endpoints is effectively ignored. Instead, we maintain
 * a curated list of known relevant bills and poll their latest status.
 *
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

/**
 * Curated list of federal bills relevant to UAM/AAM.
 * Add new bills here as they're introduced.
 * Last reviewed: 2026-03-27
 */
const TRACKED_BILLS: TrackedBill[] = [
  // ── 119th Congress (2025-2026) — Active ──
  {
    congress: 119,
    type: "s",
    number: 3866,
    label: "AAM Type Certification Updates",
    relevance: "FAA type certification process updates for advanced air mobility aircraft",
  },
  {
    congress: 119,
    type: "hr",
    number: 7553,
    label: "Aviation Innovation and Global Competitiveness Act",
    relevance: "FAA type certification for powered-lift and novel aviation technologies",
  },

  // ── 118th Congress (2023-2024) — Reference / Enacted ──
  {
    congress: 118,
    type: "hr",
    number: 3935,
    label: "FAA Reauthorization Act of 2024",
    relevance: "Enacted. Sections 951-961 cover powered-lift rules, vertiport design standards, AAM infrastructure pilot program",
  },
  {
    congress: 118,
    type: "hr",
    number: 3560,
    label: "National Drone and Advanced Air Mobility R&D Act",
    relevance: "Establishes AAM R&D programs, interagency working group, NASA research institutes",
  },
  {
    congress: 118,
    type: "s",
    number: 1888,
    label: "Advanced Aviation Integration Act",
    relevance: "Creates Office of Advanced Integration within FAA, stakeholder portal for certification tracking",
  },
  {
    congress: 118,
    type: "hr",
    number: 220,
    label: "Advanced Aviation Act",
    relevance: "Redesignates Office of NextGen as Office of Advanced Aviation",
  },
  {
    congress: 118,
    type: "hr",
    number: 4719,
    label: "Advanced Air Mobility Tax Exemption Parity Act",
    relevance: "Tax treatment for advanced air mobility aircraft",
  },

  // ── 117th Congress (enacted) ──
  {
    congress: 117,
    type: "s",
    number: 516,
    label: "Advanced Air Mobility Coordination and Leadership Act",
    relevance: "Enacted as P.L. 117-203. Established interagency AAM working group",
  },
];

interface TrackedBill {
  congress: number;
  type: string;    // "hr", "s", "hres", "sres", etc.
  number: number;
  label: string;
  relevance: string;
}

export interface CongressBill {
  congress: number;
  type: string;
  number: number;
  title: string;
  introducedDate: string;
  latestAction: {
    actionDate: string;
    text: string;
  };
  url: string;
  policyArea?: { name: string };
  originChamber?: string;
  // Enriched from our curated list
  label?: string;
  relevance?: string;
}

interface CongressBillResponse {
  bill: {
    congress: number;
    type: string;
    number: string;
    title: string;
    introducedDate: string;
    latestAction: {
      actionDate: string;
      text: string;
    };
    originChamber?: string;
    policyArea?: { name: string };
  };
}

/**
 * Fetch latest status of all tracked AAM-related bills from Congress.gov.
 * Returns enriched bill data with our curated labels and relevance notes.
 */
export async function searchCongressBills(
  options: {
    /** Only return bills from this congress. Omit for all tracked. */
    congress?: number;
    /** Only return bills with latest action after this date (ISO). */
    updatedAfter?: string;
  } = {},
): Promise<CongressBill[]> {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) {
    logger.warn("CONGRESS_API_KEY not set — skipping Congress.gov ingestion");
    return [];
  }

  const { congress, updatedAfter } = options;
  const bills: CongressBill[] = [];
  let firstApiError: string | null = null;

  const tracked = congress
    ? TRACKED_BILLS.filter((b) => b.congress === congress)
    : TRACKED_BILLS;

  logger.info(`Fetching ${tracked.length} tracked AAM bills from Congress.gov`);

  for (const tb of tracked) {
    try {
      // &format=json is required — Accept header alone is ignored and the API returns XML
      const url = `${CONGRESS_BASE}/bill/${tb.congress}/${tb.type}/${tb.number}?api_key=${apiKey}&format=json`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        const bodySnippet = await res.text().then((t) => t.slice(0, 300)).catch(() => "(body unreadable)");
        const msg = `status=${res.status} for ${tb.congress}-${tb.type}-${tb.number}. Body: ${bodySnippet}`;
        logger.error(`Congress.gov API error: ${msg}`);
        if (!firstApiError) firstApiError = msg;
        continue;
      }

      const data: CongressBillResponse = await res.json();
      const b = data.bill;

      // Filter by updatedAfter if specified
      if (updatedAfter && b.latestAction?.actionDate < updatedAfter) {
        continue;
      }

      bills.push({
        congress: b.congress,
        type: b.type,
        number: parseInt(b.number, 10),
        title: b.title,
        introducedDate: b.introducedDate,
        latestAction: b.latestAction,
        url: `https://www.congress.gov/bill/${b.congress}th-congress/${tb.type === "s" ? "senate-bill" : "house-bill"}/${tb.number}`,
        policyArea: b.policyArea,
        originChamber: b.originChamber,
        label: tb.label,
        relevance: tb.relevance,
      });

      logger.info(`${tb.congress}-${tb.type.toUpperCase()}-${tb.number}: ${b.latestAction?.actionDate} — ${b.latestAction?.text?.slice(0, 80)}`);
    } catch (err) {
      logger.error(`Congress.gov fetch failed for ${tb.congress}-${tb.type}-${tb.number}:`, err);
    }
  }

  logger.info(`Congress.gov: ${bills.length} bills fetched (${tracked.length} tracked)`);
  // If we tried to fetch but got zero bills back, surface the aggregated
  // diagnostic via a thrown error so the ingestion orchestrator captures it
  // in `fetchErrors` and we can read it from the API response.
  if (bills.length === 0 && tracked.length > 0 && firstApiError) {
    throw new Error(`All ${tracked.length} tracked bill fetches returned non-OK. First error: ${firstApiError}`);
  }
  return bills;
}

/**
 * Convert a Congress bill to FeedItem shape for the classification pipeline.
 */
export function congressBillToFeedItem(bill: CongressBill) {
  const typeLabel = bill.type === "S" || bill.type === "s" ? "S" : "HR";
  return {
    source: "congress_gov" as const,
    title: `${typeLabel} ${bill.number}: ${bill.title}`,
    url: bill.url,
    publishedAt: bill.latestAction?.actionDate ?? bill.introducedDate,
    summary: `${typeLabel} ${bill.number} (${bill.congress}th Congress) — ${bill.latestAction?.text ?? "No action recorded"}${bill.relevance ? `. Relevance: ${bill.relevance}` : ""}`,
  };
}

/**
 * Returns the curated bill list for reference/display.
 */
export function getTrackedBills(): TrackedBill[] {
  return [...TRACKED_BILLS];
}
