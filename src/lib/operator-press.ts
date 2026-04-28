/**
 * Operator Press Release Ingestion
 *
 * Pulls operator-direct press releases. Distinct from operator-news.ts
 * (Google News RSS), which lags operator announcements by 6-24 hours.
 * This source captures the announcement at the moment it goes live.
 *
 * Source coverage (Phase 1, Apr 27 2026):
 * - Joby:  jobyaviation.com/news — Next.js __NEXT_DATA__ scrape
 * - Beta:  investors.beta.team/news-events/press-releases/rss — Equisolve RSS
 *
 * Parked: Archer (client-side rendered, no server data; Google News covers it),
 *         Wisk + Volocopter (low US-market signal volume).
 *
 * Records emerge with `source: "operator_press"` and `raw.operatorId`
 * matching the OPERATORS seed (op_joby, op_beta_new — see note below).
 *
 * Note: Beta is not currently in the OPERATORS seed (only Joby/Archer/Wisk/
 * Blade/Volocopter). Records still ingest with operatorId="op_beta" — the
 * classifier will treat it as a generic operator until the seed catches up.
 */

import type { IngestedRecord } from "@/lib/ingestion";

// -------------------------------------------------------
// Joby — Next.js __NEXT_DATA__ scrape
// -------------------------------------------------------

interface JobySanityArticle {
  _id: string;
  publishedAt: string;
  title: string;
  excerpt: string | null;
  slug: { current: string };
  categories: Array<{ name: string; slug: { current: string } }>;
}

async function fetchJobyPress(daysBack: number): Promise<IngestedRecord[]> {
  try {
    const res = await fetch("https://www.jobyaviation.com/news", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AirIndex/1.0; +https://www.airindex.io)",
      },
      redirect: "follow",
      // AWS Lambda egress hangs on this host without a timeout; without one
      // a stalled fetch blocks the whole ingestion Promise.all and trips the
      // Amplify 30s gateway timeout.
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.warn(`[operator-press] Joby fetch failed: ${res.status}`);
      return [];
    }
    const html = await res.text();
    const match = html.match(
      /id="__NEXT_DATA__"\s+type="application\/json">([\s\S]+?)<\/script>/,
    );
    if (!match) {
      console.warn("[operator-press] Joby __NEXT_DATA__ not found");
      return [];
    }
    const data = JSON.parse(match[1]);
    const articles: JobySanityArticle[] =
      data?.props?.pageProps?.newsArticles ?? [];

    const cutoff = Date.now() - daysBack * 86400000;
    const records: IngestedRecord[] = [];

    for (const a of articles) {
      if (!a.publishedAt) continue;
      const ts = new Date(a.publishedAt).getTime();
      if (Number.isNaN(ts) || ts < cutoff) continue;

      const isPressRelease = a.categories?.some(
        (c) => c.slug?.current === "press-releases",
      );

      const url = `https://www.jobyaviation.com/news/${a.slug.current}`;
      records.push({
        id: `press_op_joby_${a._id}`,
        source: "operator_press",
        sourceId: a._id,
        title: a.title,
        summary: `[Joby Aviation press] ${isPressRelease ? "Press release. " : ""}${a.excerpt ?? a.title}`,
        status: "published",
        date: a.publishedAt.slice(0, 10),
        url,
        raw: {
          operatorId: "op_joby",
          isPressRelease,
          excerpt: a.excerpt ?? null,
          categories: a.categories?.map((c) => c.name) ?? [],
          slug: a.slug.current,
        },
        ingestedAt: new Date().toISOString(),
      });
    }
    return records;
  } catch (err) {
    console.error("[operator-press] Joby error:", err);
    return [];
  }
}

// -------------------------------------------------------
// Beta — Equisolve RSS
// -------------------------------------------------------

async function fetchBetaPress(daysBack: number): Promise<IngestedRecord[]> {
  try {
    const res = await fetch(
      "https://investors.beta.team/news-events/press-releases/rss",
      {
        headers: { "User-Agent": "AirIndex/1.0" },
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!res.ok) {
      console.warn(`[operator-press] Beta fetch failed: ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const items = parseRssItems(xml);
    const cutoff = Date.now() - daysBack * 86400000;
    const records: IngestedRecord[] = [];

    for (const item of items) {
      if (!item.pubDate) continue;
      const ts = new Date(item.pubDate).getTime();
      if (Number.isNaN(ts) || ts < cutoff) continue;

      const sourceId = simpleHash(item.link);
      records.push({
        id: `press_op_beta_${sourceId}`,
        source: "operator_press",
        sourceId,
        title: item.title,
        summary: `[BETA Technologies press] ${item.title}`,
        status: "published",
        date: new Date(item.pubDate).toISOString().slice(0, 10),
        url: item.link,
        raw: {
          operatorId: "op_beta",
        },
        ingestedAt: new Date().toISOString(),
      });
    }
    return records;
  } catch (err) {
    console.error("[operator-press] Beta error:", err);
    return [];
  }
}

// -------------------------------------------------------
// RSS helpers (mirrors operator-news.ts — kept local to avoid coupling)
// -------------------------------------------------------

interface RssItem {
  title: string;
  link: string;
  pubDate: string;
}

function parseRssItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = cleanCdata(extractTag(block, "title"));
    const link = cleanCdata(extractTag(block, "link"));
    const pubDate = extractTag(block, "pubDate");
    if (title && link) items.push({ title, link, pubDate });
  }
  return items;
}

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`);
  const m = regex.exec(xml);
  return m ? m[1].trim() : "";
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

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// -------------------------------------------------------
// Public API
// -------------------------------------------------------

export async function fetchAllOperatorPress(
  daysBack: number = 60,
): Promise<IngestedRecord[]> {
  const [joby, beta] = await Promise.all([
    fetchJobyPress(daysBack),
    fetchBetaPress(daysBack),
  ]);
  const all = [...joby, ...beta];
  console.log(
    `[operator-press] Fetched ${all.length} press releases (joby:${joby.length}, beta:${beta.length}, ${daysBack}d window)`,
  );
  return all;
}
