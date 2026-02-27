/**
 * Operator News RSS Ingestion
 *
 * Fetches operator-related news via Google News RSS feeds.
 * No API key required — standard RSS over HTTPS.
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

const MARKET_KEYWORDS = /los angeles|new york|dallas|miami|orlando|las vegas|phoenix|houston|austin|san diego|san francisco|chicago|atlanta|nashville|charlotte|denver|seattle|boston|minneapolis|washington/i;
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

  for (const feed of OPERATOR_FEEDS) {
    const news = await fetchOperatorNews(feed, daysBack);
    allNews.push(...news);
  }

  console.log(`[operator-news] Fetched ${allNews.length} articles across ${OPERATOR_FEEDS.length} operators`);
  return allNews;
}
