import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getFeedItemBySlug, getRelatedFeedItems } from "@/lib/feed";
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

  const related = await getRelatedFeedItems(item.id, item.category, item.cityIds, 3);
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
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 24px 0" }}>
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
      <article style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 48px" }}>
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
              marginBottom: 40,
            }}
          >
            VIEW SOURCE &rarr;
          </a>
        )}

        {/* Related Markets */}
        {item.cities.length > 0 && (
          <div
            style={{
              borderTop: "1px solid #111",
              paddingTop: 32,
              marginBottom: 40,
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: 3,
                color: "#555",
                marginBottom: 16,
              }}
            >
              RELATED MARKETS
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {item.cities.map((c) => (
                <Link
                  key={c.id}
                  href={`/city/${c.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "12px 16px",
                    borderRadius: 6,
                    border: "1px solid #1a1a2e",
                    background: "#0a0a12",
                    textDecoration: "none",
                    transition: "border-color 0.15s",
                    flex: "1 1 140px",
                    maxWidth: 220,
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#00d4ff",
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 12, color: "#e0e0e0", fontWeight: 600 }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: 9, color: "#555", letterSpacing: 1 }}>
                      VIEW SCORE &rarr;
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* More Intel */}
        {related.length > 0 && (
          <div
            style={{
              borderTop: "1px solid #111",
              paddingTop: 32,
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: 3,
                color: "#555",
                marginBottom: 16,
              }}
            >
              MORE INTEL
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {related.map((r) => {
                const relColor = FEED_CATEGORY_COLORS[r.category] ?? "#555";
                return (
                  <Link
                    key={r.id}
                    href={`/feed/${r.slug}`}
                    style={{
                      display: "block",
                      borderBottom: "1px solid #111",
                      padding: "16px 0",
                      textDecoration: "none",
                      transition: "background 0.15s",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 7,
                          letterSpacing: 2,
                          padding: "2px 6px",
                          borderRadius: 3,
                          border: `1px solid ${relColor}`,
                          color: relColor,
                        }}
                      >
                        {r.category.toUpperCase()}
                      </span>
                      <span style={{ fontSize: 9, color: "#333" }}>
                        {formatRelativeTime(r.publishedAt)}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#ccc",
                        fontWeight: 600,
                        fontFamily: "'Syne', sans-serif",
                        lineHeight: 1.4,
                      }}
                    >
                      {r.title}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </article>

      <SiteFooter />
    </div>
  );
}
