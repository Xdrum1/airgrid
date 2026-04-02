"use client";

import { useEffect, useState } from "react";
import { CHANGE_TYPE_COLORS } from "@/lib/dashboard-constants";

interface TickerEntry {
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
  return `${d}d ago`;
}

export default function LiveTicker({
  fallbackText,
  marketCount,
  operatorCount,
  corridorCount,
}: {
  fallbackText: string;
  marketCount: number;
  operatorCount: number;
  corridorCount: number;
}) {
  const [entries, setEntries] = useState<TickerEntry[] | null>(null);

  useEffect(() => {
    fetch("/api/changelog?limit=8")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((json) => setEntries(json.data ?? []))
      .catch(() => {});
  }, []);

  if (!entries) {
    // Static fallback while loading
    return (
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 10,
          letterSpacing: 2,
          color: "#888",
          textTransform: "uppercase",
          marginBottom: 20,
        }}
      >
        {fallbackText}
      </div>
    );
  }

  // Build ticker items from real data
  const tickerItems = entries.map((e) => ({
    text: e.summary,
    color: CHANGE_TYPE_COLORS[e.changeType] ?? "#888",
    time: timeAgo(e.timestamp),
  }));

  // Add static stats at the end
  tickerItems.push(
    { text: `${marketCount} markets rated`, color: "#5B8DB8", time: "" },
    { text: `${operatorCount} operators tracked`, color: "#00ff88", time: "" },
    { text: `${corridorCount} corridors mapped`, color: "#7c3aed", time: "" }
  );

  // Double the items for seamless loop
  const doubled = [...tickerItems, ...tickerItems];

  return (
    <div
      style={{
        overflow: "hidden",
        marginBottom: 20,
        maskImage:
          "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 32,
          whiteSpace: "nowrap",
          animation: `ticker ${tickerItems.length * 4}s linear infinite`,
        }}
      >
        {doubled.map((item, i) => (
          <span
            key={i}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 10,
              letterSpacing: 1,
              color: "#888",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: item.color,
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            <span style={{ color: "#bbb" }}>{item.text}</span>
            {item.time && (
              <span style={{ color: "#888", fontSize: 8 }}>{item.time}</span>
            )}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
