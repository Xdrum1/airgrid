"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CHANGE_TYPE_COLORS } from "@/lib/dashboard-constants";

interface ActivityEntry {
  summary: string;
  changeType: string;
  timestamp: string;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  return `${w}w ago`;
}

export default function LiveActivityFeed({
  fallback,
}: {
  fallback: { summary: string; type: string; time: string; accent: string }[];
}) {
  const [entries, setEntries] = useState<ActivityEntry[] | null>(null);

  useEffect(() => {
    fetch("/api/changelog?limit=5")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((json) => setEntries(json.data ?? []))
      .catch(() => {});
  }, []);

  // Use real data if loaded, otherwise fallback
  const items = entries
    ? entries.map((e) => ({
        summary: e.summary,
        accent: CHANGE_TYPE_COLORS[e.changeType] ?? "#888",
        time: timeAgo(e.timestamp),
      }))
    : fallback.map((f) => ({
        summary: f.summary,
        accent: f.accent,
        time: f.time,
      }));

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#00d4ff", fontSize: 14 }}>&#9889;</span>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 9,
              letterSpacing: 2,
              color: "#00d4ff",
            }}
          >
            ACTIVITY FEED
          </span>
          {entries && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#00ff88",
                display: "inline-block",
                boxShadow: "0 0 6px #00ff8860",
                animation: "pulse 2s infinite",
              }}
            />
          )}
        </div>
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 8,
            color: "#999",
            letterSpacing: 1,
          }}
        >
          {entries ? "LIVE" : "REAL-TIME CHANGELOG"}
        </span>
      </div>
      <div style={{ padding: "8px 0" }}>
        {items.map((a, i) => (
          <div
            key={i}
            style={{
              padding: "12px 20px",
              borderBottom:
                i < items.length - 1
                  ? "1px solid rgba(255,255,255,0.03)"
                  : "none",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: a.accent,
                flexShrink: 0,
                marginTop: 5,
              }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  color: "#bbb",
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                {a.summary}
              </div>
            </div>
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 8,
                color: "#aaa",
                letterSpacing: 1,
                flexShrink: 0,
              }}
            >
              {a.time.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
      <div
        style={{
          padding: "12px 20px",
          borderTop: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <Link
          href="/dashboard?tab=activity"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 9,
            color: "#00d4ff",
            letterSpacing: 1,
            textDecoration: "none",
          }}
        >
          VIEW ALL ACTIVITY &rarr;
        </Link>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
