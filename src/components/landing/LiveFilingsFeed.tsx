"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Filing {
  title: string;
  source: string;
  date: string;
  ingestedAt: string;
}

const SOURCE_LABELS: Record<string, string> = {
  federal_register: "FEDERAL REGISTER",
  legiscan: "LEGISLATION",
  sec_edgar: "SEC FILING",
  operator_news: "INDUSTRY",
};

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

export default function LiveFilingsFeed({
  fallback,
}: {
  fallback: { title: string; source: string; date: string; accent: string }[];
}) {
  const [filings, setFilings] = useState<Filing[] | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/filings/recent?limit=3")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((json) => {
        setFilings(json.data ?? []);
        setTotalCount(json.totalCount ?? null);
      })
      .catch(() => {});
  }, []);

  const isLive = filings !== null;
  const items = isLive
    ? filings.map((f) => ({
        title: f.title,
        sourceLabel: SOURCE_LABELS[f.source] ?? f.source.toUpperCase(),
        time: timeAgo(f.ingestedAt),
      }))
    : fallback.map((f) => ({
        title: f.title,
        sourceLabel: f.source.toUpperCase(),
        time: f.date.toUpperCase(),
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
          <span style={{ color: "#ff6b35", fontSize: 14 }}>&#9673;</span>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 9,
              letterSpacing: 2,
              color: "#ff6b35",
            }}
          >
            REGULATORY FILINGS
          </span>
          {isLive && (
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
          {isLive && totalCount
            ? `${totalCount} FILINGS TRACKED`
            : "MULTI-SOURCE INGESTION"}
        </span>
      </div>
      <div style={{ padding: "8px 0" }}>
        {items.map((f, i) => (
          <div
            key={i}
            style={{
              padding: "14px 20px",
              borderBottom:
                i < items.length - 1
                  ? "1px solid rgba(255,255,255,0.03)"
                  : "none",
            }}
          >
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                color: "#ccc",
                fontSize: 12,
                lineHeight: 1.5,
                marginBottom: 6,
              }}
            >
              {f.title}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 8,
                  color: "#888",
                  letterSpacing: 1,
                }}
              >
                {f.sourceLabel}
              </span>
              <span style={{ color: "#999", fontSize: 8 }}>·</span>
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 8,
                  color: "#aaa",
                  letterSpacing: 1,
                }}
              >
                {f.time}
              </span>
            </div>
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
          href="/dashboard?tab=filings"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 9,
            color: "#ff6b35",
            letterSpacing: 1,
            textDecoration: "none",
          }}
        >
          VIEW ALL FILINGS &rarr;
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
