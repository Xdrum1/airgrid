"use client";

import Link from "next/link";
import { ChangelogEntry } from "@/types";
import { CHANGE_TYPE_COLORS, formatRelativeTime } from "@/lib/dashboard-constants";
import { safeHref } from "@/lib/safe-url";

export default function ActivityTab({
  changelog,
  loading,
  error,
  fetchedAt,
  animate,
  isMobile,
}: {
  changelog: ChangelogEntry[];
  loading: boolean;
  error: string | null;
  fetchedAt: string | null;
  animate: boolean;
  isMobile: boolean;
}) {
  return (
    <div
      style={{ flex: 1, overflow: "auto", padding: isMobile ? "12px 12px" : "16px 20px", paddingLeft: isMobile ? 12 : 292, paddingRight: isMobile ? 12 : 316 }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 14,
        }}
      >
        <div>
          <div
            style={{
              color: "#777",
              fontSize: 8,
              letterSpacing: 2,
              marginBottom: 4,
            }}
          >
            CHANGELOG
          </div>
          <div style={{ color: "#888", fontSize: 10 }}>
            Recent data ingestion events and regulatory changes
          </div>
        </div>
        {fetchedAt && (
          <span style={{ color: "#777", fontSize: 8, flexShrink: 0 }}>
            FETCHED {new Date(fetchedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      {loading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "40px 0",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              border: "2px solid rgba(91,141,184,0.2)",
              borderTopColor: "#5B8DB8",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <span style={{ color: "#888", fontSize: 11 }}>
            Fetching activity...
          </span>
        </div>
      )}

      {error && (
        <div
          style={{
            border: "1px solid rgba(255,68,68,0.3)",
            background: "rgba(255,68,68,0.05)",
            borderRadius: 6,
            padding: "12px 16px",
            color: "#ff4444",
            fontSize: 11,
          }}
        >
          Failed to load activity: {error}
        </div>
      )}

      {!loading && !error && changelog.length === 0 && fetchedAt && (
        <div
          style={{
            color: "#777",
            fontSize: 11,
            textAlign: "center",
            padding: "40px 0",
          }}
        >
          No activity yet. Run data ingestion to populate the changelog.
        </div>
      )}

      {changelog.map((entry, i) => {
        const badgeColor = CHANGE_TYPE_COLORS[entry.changeType] ?? "#555";
        const entityLabel = entry.relatedEntityType.toUpperCase();

        return (
          <div
            key={entry.id}
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 8,
              padding: "14px 16px",
              marginBottom: 8,
              opacity: animate ? 1 : 0,
              transform: animate ? "translateY(0)" : "translateY(4px)",
              transition: `opacity 0.25s ease ${i * 0.02}s, transform 0.25s ease ${i * 0.02}s`,
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
                  color: badgeColor,
                  fontSize: 8,
                  letterSpacing: 1,
                  border: `1px solid ${badgeColor}44`,
                  borderRadius: 3,
                  padding: "2px 6px",
                  textTransform: "uppercase",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {entry.changeType.replace(/_/g, " ")}
              </span>
              <span
                style={{
                  color: "#888",
                  fontSize: 8,
                  letterSpacing: 1,
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 3,
                  padding: "2px 6px",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {entityLabel}
              </span>
              <span style={{ color: "#666", fontSize: 9, marginLeft: "auto" }}>
                {formatRelativeTime(entry.timestamp)}
              </span>
            </div>
            <div
              style={{
                color: "#ddd",
                fontSize: 11,
                lineHeight: 1.5,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {entry.summary}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
              {safeHref(entry.sourceUrl) && (
                <a
                  href={safeHref(entry.sourceUrl)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#5B8DB8",
                    fontSize: 9,
                    display: "inline-block",
                  }}
                >
                  View source →
                </a>
              )}
              {entry.changeType === "score_change" &&
                entry.relatedEntityType === "city" && (
                  <Link
                    href={`/city/${entry.relatedEntityId}`}
                    style={{
                      color: "#00ff88",
                      fontSize: 9,
                      display: "inline-block",
                    }}
                  >
                    View market →
                  </Link>
                )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
