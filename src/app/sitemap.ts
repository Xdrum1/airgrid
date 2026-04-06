import type { MetadataRoute } from "next";
import { getPublishedFeedItems } from "@/lib/feed";
import { getCitiesWithOverrides } from "@/data/seed";
import { getCorridors } from "@/lib/corridors";
import { ONE_MARKET_MONDAY_ISSUES } from "@/data/one-market-monday";

const BASE = "https://www.airindex.io";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static public pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/feed`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/methodology`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/pricing`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/api`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/request-access`, changeFrequency: "monthly", priority: 0.5 },
  ];

  // City pages — money pages, priority 1.0
  const cities = await getCitiesWithOverrides();
  const cityPages: MetadataRoute.Sitemap = cities.map((c) => ({
    url: `${BASE}/city/${c.id}`,
    lastModified: c.lastUpdated || undefined,
    changeFrequency: "weekly",
    priority: 1.0,
  }));

  // Corridor pages
  const corridors = await getCorridors();
  const corridorPages: MetadataRoute.Sitemap = corridors.map((c) => ({
    url: `${BASE}/corridor/${c.id}`,
    lastModified: c.lastUpdated || undefined,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // Feed items — SEO engine
  const { items } = await getPublishedFeedItems({ limit: 1000 });
  const feedPages: MetadataRoute.Sitemap = items.map((item) => ({
    url: `${BASE}/feed/${item.slug}`,
    lastModified: item.publishedAt || undefined,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // One Market Monday issues
  const mondayPages: MetadataRoute.Sitemap = ONE_MARKET_MONDAY_ISSUES.map((issue) => ({
    url: `${BASE}/insights/one-market-monday/${issue.slug}`,
    lastModified: issue.publishDate,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [
    ...staticPages,
    ...cityPages,
    ...corridorPages,
    ...feedPages,
    ...mondayPages,
  ];
}
