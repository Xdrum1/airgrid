"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FEED_CATEGORY_COLORS, formatRelativeTime } from "@/lib/dashboard-constants";
import { safeHref } from "@/lib/safe-url";

interface FeedItem {
  id: string;
  title: string;
  summary: string;
  sourceUrl: string | null;
  category: string;
  cityIds: string[];
  cities: { id: string; name: string }[];
  scoreImpact: boolean;
  publishedAt: string;
}

const FREE_ITEMS = 3;
const CATEGORIES = ["All", "Regulatory", "Infrastructure", "Operator", "Legislative"];

export default function FeedPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (activeCategory !== "All") params.set("category", activeCategory);

    fetch(`/api/feed?${params}`)
      .then((r) => r.json())
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
        minHeight: "100vh",
        background: "#050508",
        color: "#ccc",
        fontFamily: "'Space Mono', monospace",
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: "1px solid #111",
          padding: "20px 24px",
          maxWidth: 800,
          margin: "0 auto",
        }}
      >
        <Link
          href="/"
          style={{
            color: "#555",
            textDecoration: "none",
            fontSize: 10,
            letterSpacing: 3,
          }}
        >
          AIRINDEX
        </Link>

        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#fff",
            margin: "16px 0 6px",
            fontFamily: "'Syne', sans-serif",
            letterSpacing: -0.5,
          }}
        >
          UAM Intel Feed
        </h1>
        <p style={{ fontSize: 12, color: "#666", margin: 0, lineHeight: 1.6 }}>
          Curated intelligence on FAA rulings, city policy, operator expansions,
          and infrastructure developments shaping UAM market readiness.
        </p>
      </div>

      {/* Category filters */}
      <div
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: "16px 24px 0",
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
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
                fontSize: 9,
                letterSpacing: 2,
                padding: "6px 14px",
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
        <span style={{ fontSize: 9, color: "#333", alignSelf: "center", marginLeft: 8 }}>
          {total} item{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Feed items */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "20px 24px 60px" }}>
        {loading ? (
          <div
            style={{
              color: "#333",
              fontSize: 10,
              letterSpacing: 2,
              textAlign: "center",
              padding: 80,
            }}
          >
            LOADING...
          </div>
        ) : items.length === 0 ? (
          <div
            style={{
              color: "#333",
              fontSize: 11,
              letterSpacing: 2,
              textAlign: "center",
              padding: 80,
            }}
          >
            NO INTEL YET — CHECK BACK SOON
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {items.map((item, idx) => {
              const isGated = idx >= FREE_ITEMS;
              return (
                <div
                  key={item.id}
                  style={{
                    borderBottom: "1px solid #111",
                    padding: "20px 0",
                    position: "relative",
                    ...(isGated
                      ? { filter: "blur(4px)", pointerEvents: "none", userSelect: "none" }
                      : {}),
                  }}
                >
                  {/* Top row: category + timestamp */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 8,
                        letterSpacing: 2,
                        padding: "3px 8px",
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

                    <span style={{ fontSize: 9, color: "#333", marginLeft: "auto" }}>
                      {formatRelativeTime(item.publishedAt)}
                    </span>
                  </div>

                  {/* Title */}
                  <div
                    style={{
                      fontSize: 14,
                      color: "#e0e0e0",
                      fontWeight: 600,
                      marginBottom: 6,
                      fontFamily: "'Syne', sans-serif",
                      lineHeight: 1.4,
                    }}
                  >
                    {item.title}
                  </div>

                  {/* Summary */}
                  <div
                    style={{
                      fontSize: 12,
                      color: "#777",
                      lineHeight: 1.6,
                      marginBottom: 10,
                    }}
                  >
                    {item.summary}
                  </div>

                  {/* Bottom row: city tags + source */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    {item.cities.map((c) => (
                      <Link
                        key={c.id}
                        href={`/?city=${c.id}`}
                        style={{
                          fontSize: 9,
                          letterSpacing: 1,
                          padding: "2px 8px",
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

                    {item.sourceUrl && (
                      <a
                        href={safeHref(item.sourceUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: 9,
                          color: "#444",
                          textDecoration: "none",
                          marginLeft: "auto",
                        }}
                      >
                        Source &rarr;
                      </a>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Teaser wall CTA */}
            {items.length > FREE_ITEMS && (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  marginTop: -40,
                  position: "relative",
                  zIndex: 2,
                  background: "linear-gradient(transparent, #050508 40%)",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: "#888",
                    marginBottom: 12,
                    fontFamily: "'Syne', sans-serif",
                  }}
                >
                  {total - FREE_ITEMS} more intel items available
                </div>
                <Link
                  href="/request-access"
                  style={{
                    display: "inline-block",
                    padding: "10px 28px",
                    border: "1px solid #7c3aed",
                    borderRadius: 6,
                    color: "#7c3aed",
                    fontSize: 10,
                    letterSpacing: 2,
                    textDecoration: "none",
                    fontFamily: "'Space Mono', monospace",
                    transition: "all 0.2s",
                  }}
                >
                  REQUEST ACCESS
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: "1px solid #111",
          padding: "20px 24px",
          textAlign: "center",
        }}
      >
        <Link
          href="/"
          style={{ color: "#333", fontSize: 9, letterSpacing: 2, textDecoration: "none" }}
        >
          AIRINDEX.IO
        </Link>
      </div>
    </div>
  );
}
