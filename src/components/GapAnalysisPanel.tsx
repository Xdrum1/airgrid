"use client";

import { useState } from "react";
import { City } from "@/types";
import { analyzeGaps } from "@/lib/gap-analysis";

export default function GapAnalysisPanel({
  city,
  scoreColor,
}: {
  city: City;
  scoreColor: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const gap = analyzeGaps(city);

  if (gap.gaps.length === 0) {
    return (
      <div
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            color: "#777",
            fontSize: 8,
            letterSpacing: 2,
            marginBottom: 10,
          }}
        >
          GAP ANALYSIS
        </div>
        <div
          style={{
            color: "#00ff88",
            fontSize: 11,
            lineHeight: 1.6,
          }}
        >
          All {gap.totalFactors} readiness factors achieved.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "14px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            color: "#777",
            fontSize: 8,
            letterSpacing: 2,
          }}
        >
          GAP ANALYSIS
        </div>
        <div
          style={{
            color: "#888",
            fontSize: 9,
          }}
        >
          {gap.achievedCount}/{gap.totalFactors} factors met
        </div>
      </div>

      {/* Summary bar */}
      <div
        style={{
          display: "flex",
          gap: 2,
          marginBottom: 12,
          height: 4,
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        {gap.factors.map((f) => (
          <div
            key={f.key}
            style={{
              flex: f.max,
              background: f.achieved
                ? "#00ff88"
                : f.partial
                  ? "#f59e0b"
                  : "rgba(255,68,68,0.4)",
              borderRadius: 1,
              transition: "background 0.3s",
            }}
            title={`${f.label}: ${f.earned}/${f.max}`}
          />
        ))}
      </div>

      {/* Gap items */}
      {gap.gaps.slice(0, expanded ? undefined : 3).map((g) => (
        <div
          key={g.key}
          style={{
            marginBottom: 10,
            paddingLeft: 10,
            borderLeft: `2px solid ${g.max >= 15 ? "rgba(255,68,68,0.5)" : "rgba(245,158,11,0.5)"}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 2,
            }}
          >
            <span
              style={{
                color: "#ccc",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {g.label}
            </span>
            <span
              style={{
                color: g.max >= 15 ? "#ff4444" : "#f59e0b",
                fontSize: 9,
                fontWeight: 700,
                fontFamily: "'Space Mono', monospace",
              }}
            >
              +{g.max - g.earned} pts
            </span>
          </div>
          <p
            style={{
              color: "#888",
              fontSize: 9,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {truncate(g.recommendation, 120)}
          </p>
        </div>
      ))}

      {/* Expand/collapse */}
      {gap.gaps.length > 3 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            background: "none",
            border: "none",
            color: "#00d4ff",
            fontSize: 9,
            letterSpacing: 1,
            cursor: "pointer",
            padding: "4px 0",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {expanded
            ? "SHOW LESS"
            : `+${gap.gaps.length - 3} MORE GAP${gap.gaps.length - 3 > 1 ? "S" : ""}`}
        </button>
      )}

      {/* Points available */}
      <div
        style={{
          marginTop: 8,
          padding: "8px 10px",
          background: "rgba(255,255,255,0.02)",
          borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ color: "#888", fontSize: 9 }}>
          Total points available
        </span>
        <span
          style={{
            color: scoreColor,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "'Space Mono', monospace",
          }}
        >
          +{gap.gaps.reduce((sum, g) => sum + (g.max - g.earned), 0)}
        </span>
      </div>
    </div>
  );
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, "") + "...";
}
