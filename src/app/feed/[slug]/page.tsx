import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getFeedItemBySlug } from "@/lib/feed";
import { FEED_CATEGORY_COLORS, formatRelativeTime } from "@/lib/dashboard-constants";
import { safeHref } from "@/lib/safe-url";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import TrackPageView from "@/components/TrackPageView";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = await getFeedItemBySlug(slug);
  if (!item) return { title: "Not Found — AirIndex" };

  const cityNames = item.cities.map((c) => c.name).join(", ");
  const description = item.summary.slice(0, 160);

  return {
    title: `${item.title} — AirIndex Intel`,
    description,
    openGraph: {
      title: item.title,
      description,
      type: "article",
      publishedTime: item.publishedAt,
      tags: [item.category, ...(cityNames ? [cityNames] : [])],
    },
  };
}

export default async function FeedItemPage({ params }: Props) {
  const { slug } = await params;
  const item = await getFeedItemBySlug(slug);
  if (!item) notFound();

  const categoryColor = FEED_CATEGORY_COLORS[item.category] ?? "#555";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050508",
        fontFamily: "'Space Mono', monospace",
        color: "#fff",
      }}
    >
      <TrackPageView page={`/feed/${slug}`} />
      <SiteNav />

      {/* Back link */}
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "20px 24px 0",
        }}
      >
        <Link
          href="/feed"
          style={{
            color: "#555",
            textDecoration: "none",
            fontSize: 10,
            letterSpacing: 3,
            transition: "color 0.15s",
          }}
        >
          &larr; INTEL FEED
        </Link>
      </div>

      {/* Article */}
      <article style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 80px" }}>
        {/* Meta row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 8,
              letterSpacing: 2,
              padding: "3px 8px",
              borderRadius: 3,
              border: `1px solid ${categoryColor}`,
              color: categoryColor,
            }}
          >
            {item.category.toUpperCase()}
          </span>

          {item.scoreImpact && (
            <span
              style={{
                fontSize: 8,
                letterSpacing: 2,
                padding: "3px 8px",
                borderRadius: 3,
                border: "1px solid #f59e0b",
                color: "#f59e0b",
              }}
            >
              SCORE IMPACT
            </span>
          )}

          <span style={{ fontSize: 9, color: "#444" }}>
            {formatRelativeTime(item.publishedAt)}
          </span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: "clamp(20px, 3vw, 28px)",
            fontWeight: 700,
            color: "#fff",
            margin: "0 0 20px",
            fontFamily: "'Syne', sans-serif",
            letterSpacing: -0.5,
            lineHeight: 1.3,
          }}
        >
          {item.title}
        </h1>

        {/* Summary / body */}
        <div
          style={{
            fontSize: 14,
            color: "#aaa",
            lineHeight: 1.8,
            marginBottom: 32,
          }}
        >
          {item.summary}
        </div>

        {/* City tags */}
        {item.cities.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              marginBottom: 24,
            }}
          >
            <span style={{ fontSize: 9, color: "#444", alignSelf: "center", marginRight: 4 }}>
              MARKETS:
            </span>
            {item.cities.map((c) => (
              <Link
                key={c.id}
                href={`/?city=${c.id}`}
                style={{
                  fontSize: 9,
                  letterSpacing: 1,
                  padding: "3px 10px",
                  borderRadius: 3,
                  background: "#0d0d15",
                  border: "1px solid #1a1a2e",
                  color: "#00d4ff",
                  textDecoration: "none",
                  transition: "border-color 0.15s",
                }}
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}

        {/* Source link */}
        {item.sourceUrl && (
          <a
            href={safeHref(item.sourceUrl)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              fontSize: 10,
              letterSpacing: 2,
              padding: "8px 20px",
              border: "1px solid #333",
              borderRadius: 4,
              color: "#888",
              textDecoration: "none",
              transition: "all 0.15s",
            }}
          >
            VIEW SOURCE &rarr;
          </a>
        )}
      </article>

      <SiteFooter />
    </div>
  );
}
