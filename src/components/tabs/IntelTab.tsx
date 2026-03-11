"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FEED_CATEGORY_COLORS, formatRelativeTime } from "@/lib/dashboard-constants";
import { safeHref } from "@/lib/safe-url";

interface FeedItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  sourceUrl: string | null;
  category: string;
  cityIds: string[];
  cities: { id: string; name: string }[];
  scoreImpact: boolean;
  publishedAt: string;
}

const CATEGORIES = ["All", "Regulatory", "Infrastructure", "Operator", "Legislative"];

interface IntelTabProps {
  animate: boolean;
  isMobile: boolean;
}

export default function IntelTab({ animate, isMobile }: IntelTabProps) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (activeCategory !== "All") params.set("category", activeCategory);

    fetch(`/api/feed?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        setItems(json.data ?? []);
        setTotal(json.meta?.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeCategory]);

  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        padding: isMobile ? "16px 12px" : "24px 28px",
        paddingLeft: isMobile ? 12 : 292,
        paddingRight: isMobile ? 12 : 316,
        opacity: animate ? 1 : 0,
        transition: "opacity 0.3s",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2
          style={{
            fontSize: isMobile ? 16 : 18,
            fontWeight: 700,
            color: "#fff",
            margin: "0 0 6px",
            fontFamily: "'Syne', sans-serif",
            letterSpacing: -0.5,
          }}
        >
          UAM Intel Feed
        </h2>
        <p style={{ fontSize: 11, color: "#666", margin: 0, lineHeight: 1.5 }}>
          Curated intelligence on FAA rulings, city policy, operator expansions,
          and infrastructure developments.
        </p>
      </div>

      {/* Category filters */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat;
          const color = cat === "All" ? "#888" : FEED_CATEGORY_COLORS[cat] ?? "#888";
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                background: isActive ? `${color}15` : "none",
                border: `1px solid ${isActive ? color : "#1a1a2e"}`,
                color: isActive ? color : "#444",
                fontSize: 8,
                letterSpacing: 2,
                padding: "5px 12px",
                borderRadius: 4,
                cursor: "pointer",
                fontFamily: "'Space Mono', monospace",
                transition: "all 0.15s",
              }}
            >
              {cat.toUpperCase()}
            </button>
          );
        })}
        <span style={{ fontSize: 9, color: "#666", alignSelf: "center", marginLeft: 6 }}>
          {total} item{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Items */}
      {loading ? (
        <div style={{ color: "#666", fontSize: 10, letterSpacing: 2, textAlign: "center", padding: 60 }}>
          LOADING...
        </div>
      ) : items.length === 0 ? (
        <div style={{ color: "#666", fontSize: 11, letterSpacing: 2, textAlign: "center", padding: 60 }}>
          NO INTEL YET
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                borderBottom: "1px solid #111",
                padding: "16px 0",
              }}
            >
              {/* Top row */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span
                  style={{
                    fontSize: 7,
                    letterSpacing: 2,
                    padding: "2px 6px",
                    borderRadius: 3,
                    border: `1px solid ${FEED_CATEGORY_COLORS[item.category] ?? "#555"}`,
                    color: FEED_CATEGORY_COLORS[item.category] ?? "#555",
                  }}
                >
                  {item.category.toUpperCase()}
                </span>
                {item.scoreImpact && (
                  <span
                    style={{
                      fontSize: 7,
                      letterSpacing: 2,
                      padding: "2px 6px",
                      borderRadius: 3,
                      border: "1px solid #f59e0b",
                      color: "#f59e0b",
                    }}
                  >
                    SCORE IMPACT
                  </span>
                )}
                <span style={{ fontSize: 9, color: "#666", marginLeft: "auto" }}>
                  {formatRelativeTime(item.publishedAt)}
                </span>
              </div>

              {/* Title — links to detail page */}
              <Link
                href={`/feed/${item.slug}`}
                style={{
                  display: "block",
                  fontSize: isMobile ? 13 : 14,
                  color: "#e0e0e0",
                  fontWeight: 600,
                  marginBottom: 4,
                  fontFamily: "'Syne', sans-serif",
                  lineHeight: 1.4,
                  textDecoration: "none",
                }}
              >
                {item.title}
              </Link>

              {/* Summary */}
              <div style={{ fontSize: 11, color: "#777", lineHeight: 1.5, marginBottom: 8 }}>
                {item.summary}
              </div>

              {/* Bottom row */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {item.cities.map((c) => (
                  <span
                    key={c.id}
                    style={{
                      fontSize: 8,
                      letterSpacing: 1,
                      padding: "2px 6px",
                      borderRadius: 3,
                      background: "#0d0d15",
                      border: "1px solid #1a1a2e",
                      color: "#00d4ff",
                    }}
                  >
                    {c.name}
                  </span>
                ))}
                {item.sourceUrl && (
                  <a
                    href={safeHref(item.sourceUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 9,
                      color: "#777",
                      textDecoration: "none",
                      marginLeft: "auto",
                    }}
                  >
                    Source &rarr;
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
