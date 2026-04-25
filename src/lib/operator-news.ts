/**
 * Operator News RSS Ingestion
 *
 * Fetches operator-related news via Google News RSS feeds.
 * No API key required — standard RSS over HTTPS.
 *
 * ## Curation Criteria
 *
 * ### What we ingest
 * - Google News RSS for each tracked operator by exact name match
 * - Industry-wide feed for "eVTOL" OR "vertiport" OR "advanced air mobility"
 * - Rolling 30-day window (configurable via daysBack param)
 *
 * ### What passes to AI classification (classifier.ts)
 * ALL ingested articles go to the Claude classifier. The classifier decides
 * relevance — the ingestion layer is intentionally broad to avoid false
 * negatives. Better to classify noise as not_relevant than to miss a signal.
 *
 * ### What gets filtered out by the classifier
 * - Pure stock/earnings articles (no city-specific signal)
 * - General industry commentary without regulatory or market impact
 * - Analyst ratings, price targets, trading signals
 * - International news without US market implications
 *
 * ### What becomes a scoring signal
 * Only articles the classifier maps to a specific tracked city with a
 * specific factor change become ScoringOverride candidates. The chain:
 *   RSS → IngestedRecord → ClassificationResult → ScoringOverride (needs_review)
 *   → Auto-reviewer or admin approval → score change
 *
 * ### Feed maintenance
 * - Add new operator feeds when operators enter tracked markets
 * - Industry feed query should match terminology used in methodology
 * - Operator feeds use exact-match quotes to reduce noise
 */

import type { IngestedRecord } from "@/lib/ingestion";

// -------------------------------------------------------
// Operator news feed config
// -------------------------------------------------------

interface OperatorFeed {
  operatorId: string;
  query: string; // Google News search query
}

const OPERATOR_FEEDS: OperatorFeed[] = [
  { operatorId: "op_joby", query: '"joby aviation"' },
  { operatorId: "op_archer", query: '"archer aviation"' },
  { operatorId: "op_wisk", query: '"wisk aero"' },
  { operatorId: "op_blade", query: '"blade air mobility"' },
  { operatorId: "op_volocopter", query: '"volocopter"' },
  { operatorId: "industry", query: '"eVTOL" OR "vertiport" OR "advanced air mobility"' },
];

// Market-specific feeds — combine metro terms with AAM terms to catch local
// signals that operator-query feeds miss (e.g., Texas legislation, DFW
// feasibility, FAA regional activity). Each feed still produces IngestedRecord
// with source="operator_news"; the `raw.operatorId` distinguishes them.
//
// Phase 1 (Apr 24 2026): 5 feeds (Dallas, SF, Houston, DC, Chicago).
// Phase 2 (Apr 25 2026): expanded to all 25 tracked markets + added "air taxi"
// to AAM term group + broadened Chicago to include "Vertiport Chicago" (the
// existing facility) since it has lower news flux than other top metros.
const AAM_TERMS = '("eVTOL" OR "vertiport" OR "advanced air mobility" OR "air taxi")';

const MARKET_FEEDS: OperatorFeed[] = [
  // Phase 1 markets (kept, term group broadened)
  { operatorId: "market_dallas", query: `("Dallas" OR "DFW" OR "Fort Worth") AND ${AAM_TERMS}` },
  { operatorId: "market_san_francisco", query: `("San Francisco" OR "Bay Area" OR "Oakland") AND ${AAM_TERMS}` },
  { operatorId: "market_houston", query: `"Houston" AND ${AAM_TERMS}` },
  { operatorId: "market_washington_dc", query: `("Washington DC" OR "DCA airport" OR "Capital Region") AND ${AAM_TERMS}` },
  { operatorId: "market_chicago", query: `("Chicago" OR "Vertiport Chicago") AND ${AAM_TERMS}` },

  // Phase 2 — silent markets (zero 7d activity in Apr 25 audit)
  { operatorId: "market_san_diego", query: `"San Diego" AND ${AAM_TERMS}` },
  { operatorId: "market_las_vegas", query: `("Las Vegas" OR "Clark County" OR "LVCC") AND ${AAM_TERMS}` },
  { operatorId: "market_atlanta", query: `("Atlanta" OR "Hartsfield" OR "Fulton County") AND ${AAM_TERMS}` },
  { operatorId: "market_nashville", query: `"Nashville" AND ${AAM_TERMS}` },
  { operatorId: "market_charlotte", query: `"Charlotte" AND ${AAM_TERMS}` },
  { operatorId: "market_denver", query: `("Denver" OR "DEN airport") AND ${AAM_TERMS}` },
  { operatorId: "market_seattle", query: `("Seattle" OR "SeaTac" OR "Puget Sound") AND ${AAM_TERMS}` },
  { operatorId: "market_boston", query: `("Boston" OR "Logan airport") AND ${AAM_TERMS}` },
  { operatorId: "market_minneapolis", query: `("Minneapolis" OR "Twin Cities") AND ${AAM_TERMS}` },
  { operatorId: "market_columbus", query: `"Columbus" AND ("Ohio" OR "Franklin County") AND ${AAM_TERMS}` },
  { operatorId: "market_cincinnati", query: `"Cincinnati" AND ${AAM_TERMS}` },

  // Phase 2 — markets with operator-feed coverage; metro feeds catch
  // city/agency signals operators don't push (zoning, mayor announcements,
  // local FAA activity, infrastructure funding)
  { operatorId: "market_los_angeles", query: `("Los Angeles" OR "LADOT" OR "LAX" OR "LA County") AND ${AAM_TERMS}` },
  { operatorId: "market_new_york", query: `("New York" OR "NYC" OR "Manhattan" OR "JFK airport" OR "LaGuardia") AND ${AAM_TERMS}` },
  { operatorId: "market_miami", query: `("Miami" OR "Miami-Dade" OR "MIA airport") AND ${AAM_TERMS}` },
  { operatorId: "market_orlando", query: `("Orlando" OR "Lake Nona" OR "MCO airport") AND ${AAM_TERMS}` },
  { operatorId: "market_phoenix", query: `("Phoenix" OR "Maricopa" OR "Sky Harbor") AND ${AAM_TERMS}` },
  { operatorId: "market_austin", query: `("Austin" OR "Austin-Bergstrom") AND ${AAM_TERMS}` },
  { operatorId: "market_san_antonio", query: `"San Antonio" AND ${AAM_TERMS}` },
  { operatorId: "market_tampa", query: `("Tampa" OR "Tampa Bay") AND ${AAM_TERMS}` },
  { operatorId: "market_salt_lake_city", query: `("Salt Lake City" OR "SLC airport") AND ${AAM_TERMS}` },
];

// -------------------------------------------------------
// RSS parsing (lightweight, no external deps)
// -------------------------------------------------------

interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

function parseRssItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    const pubDate = extractTag(block, "pubDate");
    const source = extractTag(block, "source");

    if (title && link) {
      items.push({
        title: cleanCdata(title),
        link,
        pubDate: pubDate || "",
        source: cleanCdata(source),
      });
    }
  }

  return items;
}

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`);
  const match = regex.exec(xml);
  return match ? match[1].trim() : "";
}

function cleanCdata(text: string): string {
  return text
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// -------------------------------------------------------
// Keyword classifier
// -------------------------------------------------------

const MARKET_KEYWORDS = /los angeles|new york|dallas|miami|orlando|las vegas|phoenix|houston|austin|san diego|san francisco|chicago|atlanta|nashville|charlotte|denver|seattle|boston|minneapolis|washington|columbus.{0,5}ohio|cincinnati|cleveland|detroit|pittsburgh|portland|salt lake|tampa|jacksonville|san antonio|indianapolis|memphis|louisville|richmond|raleigh|sacramento|kansas city|st\.? louis|milwaukee|new orleans|oklahoma city|tucson|omaha|albuquerque|honolulu|anchorage/i;
const CORRIDOR_KEYWORDS = /corridor|route|airspace|flight path|airway/i;
const CERT_KEYWORDS = /type cert|airworthiness|faa cert|part 135|powered.lift|approval|certified/i;
const TIMELINE_KEYWORDS = /launch|commercial ops|first flight|service begin|operations start|target date|timeline/i;
const PARTNERSHIP_KEYWORDS = /partnership|deal|agreement|investment|order|contract|alliance/i;

export interface NewsClassification {
  mentionsMarket: boolean;
  mentionsCorridor: boolean;
  mentionsCert: boolean;
  mentionsTimeline: boolean;
  mentionsPartnership: boolean;
  markets: string[];
}

function classifyArticle(title: string): NewsClassification {
  const text = title.toLowerCase();
  const marketMatches = text.match(MARKET_KEYWORDS);

  return {
    mentionsMarket: !!marketMatches,
    mentionsCorridor: CORRIDOR_KEYWORDS.test(text),
    mentionsCert: CERT_KEYWORDS.test(text),
    mentionsTimeline: TIMELINE_KEYWORDS.test(text),
    mentionsPartnership: PARTNERSHIP_KEYWORDS.test(text),
    markets: marketMatches ? [marketMatches[0].toLowerCase()] : [],
  };
}

// -------------------------------------------------------
// Fetch and normalize
// -------------------------------------------------------

async function fetchOperatorNews(
  feed: OperatorFeed,
  daysBack: number = 30
): Promise<IngestedRecord[]> {
  try {
    const query = encodeURIComponent(feed.query);
    const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;

    const res = await fetch(url, {
      headers: { "User-Agent": "AirIndex/1.0" },
    });
    if (!res.ok) {
      console.warn(`[operator-news] Failed to fetch ${feed.operatorId}: ${res.status}`);
      return [];
    }

    const xml = await res.text();
    const items = parseRssItems(xml);

    // Filter to recent items only
    const cutoff = Date.now() - daysBack * 86400000;
    const recent = items.filter((item) => {
      if (!item.pubDate) return false;
      return new Date(item.pubDate).getTime() > cutoff;
    });

    return recent.map((item) => {
      const classification = classifyArticle(item.title);
      const tags = [
        classification.mentionsMarket && "market",
        classification.mentionsCorridor && "corridor",
        classification.mentionsCert && "certification",
        classification.mentionsTimeline && "timeline",
        classification.mentionsPartnership && "partnership",
      ].filter(Boolean);

      // Create a stable ID from the link
      const linkHash = simpleHash(item.link);

      return {
        id: `news_${feed.operatorId}_${linkHash}`,
        source: "operator_news" as IngestedRecord["source"],
        sourceId: linkHash,
        title: item.title,
        summary: `[${item.source}] ${tags.length > 0 ? `Tags: ${tags.join(", ")}. ` : ""}${item.title}`,
        status: "published",
        date: item.pubDate ? new Date(item.pubDate).toISOString().split("T")[0] : "",
        url: item.link,
        raw: {
          operatorId: feed.operatorId,
          source: item.source,
          classification,
        } as unknown as Record<string, unknown>,
        ingestedAt: new Date().toISOString(),
      };
    });
  } catch (err) {
    console.error(`[operator-news] Error fetching ${feed.operatorId}:`, err);
    return [];
  }
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// -------------------------------------------------------
// Public API
// -------------------------------------------------------

export async function fetchAllOperatorNews(
  daysBack: number = 30
): Promise<IngestedRecord[]> {
  const allNews: IngestedRecord[] = [];
  const feeds = [...OPERATOR_FEEDS, ...MARKET_FEEDS];

  for (const feed of feeds) {
    const news = await fetchOperatorNews(feed, daysBack);
    allNews.push(...news);
  }

  console.log(
    `[operator-news] Fetched ${allNews.length} articles across ${feeds.length} feeds ` +
      `(${OPERATOR_FEEDS.length} operator + ${MARKET_FEEDS.length} market)`,
  );
  return allNews;
}
