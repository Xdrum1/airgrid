"use client";

import { useState } from "react";
import { City, SubIndicator } from "@/types";
import { analyzeGapsSync } from "@/lib/gap-analysis";

const STATUS_ICONS: Record<string, { icon: string; color: string }> = {
  achieved: { icon: "\u2713", color: "#00ff88" },
  partial: { icon: "\u25CF", color: "#f59e0b" },
  missing: { icon: "\u2717", color: "#ff4444" },
  unknown: { icon: "?", color: "#555" },
};

function SubIndicatorRow({ si }: { si: SubIndicator }) {
  const { icon, color } = STATUS_ICONS[si.status] ?? STATUS_ICONS.unknown;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "3px 0",
      }}
    >
      <span style={{ color, fontSize: 10, fontWeight: 700, minWidth: 12, textAlign: "center" }}>
        {icon}
      </span>
      <div style={{ flex: 1 }}>
        <span style={{ color: "#aaa", fontSize: 9 }}>{si.label}</span>
        {si.citation && (
          <div style={{ color: "#666", fontSize: 8, marginTop: 1 }}>{si.citation}</div>
        )}
        {si.peerNote && (
          <div style={{ color: "#5B8DB8", fontSize: 8, marginTop: 1, fontStyle: "italic" }}>
            {si.peerNote}
          </div>
        )}
      </div>
    </div>
  );
}

export default function GapAnalysisPanel({
  city,
  scoreColor,
  showSubIndicators = false,
}: {
  city: City;
  scoreColor: string;
  showSubIndicators?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [expandedFactors, setExpandedFactors] = useState<Set<string>>(new Set());
  const gap = analyzeGapsSync(city);

  const toggleFactor = (key: string) => {
    setExpandedFactors((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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
        {showSubIndicators && (
          <div style={{ color: "#888", fontSize: 9, marginTop: 6 }}>
            {gap.subIndicatorSummary.achieved} of {gap.subIndicatorSummary.total} sub-indicators met
          </div>
        )}
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
          marginBottom: showSubIndicators ? 6 : 12,
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

      {/* Sub-indicator summary bar */}
      {showSubIndicators && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", gap: 2, flex: 1, height: 3, borderRadius: 2, overflow: "hidden" }}>
            {Array.from({ length: gap.subIndicatorSummary.total }).map((_, i) => {
              let color = "#333";
              if (i < gap.subIndicatorSummary.achieved) color = "#00ff88";
              else if (i < gap.subIndicatorSummary.achieved + gap.subIndicatorSummary.partial) color = "#f59e0b";
              else if (i < gap.subIndicatorSummary.achieved + gap.subIndicatorSummary.partial + gap.subIndicatorSummary.missing) color = "rgba(255,68,68,0.4)";
              return <div key={i} style={{ flex: 1, background: color, borderRadius: 1 }} />;
            })}
          </div>
          <span style={{ color: "#666", fontSize: 8, marginLeft: 8, whiteSpace: "nowrap" }}>
            {gap.subIndicatorSummary.achieved}/{gap.subIndicatorSummary.total} indicators
          </span>
        </div>
      )}

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
              cursor: showSubIndicators ? "pointer" : "default",
            }}
            onClick={showSubIndicators ? () => toggleFactor(g.key) : undefined}
          >
            <span
              style={{
                color: "#ccc",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {g.label}
              {showSubIndicators && (
                <span style={{ color: "#555", fontSize: 9, marginLeft: 6 }}>
                  {expandedFactors.has(g.key) ? "\u25B4" : "\u25BE"}
                </span>
              )}
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

          {/* Expanded sub-indicators */}
          {showSubIndicators && expandedFactors.has(g.key) && g.subIndicators.length > 0 && (
            <div
              style={{
                marginTop: 6,
                paddingLeft: 4,
                borderTop: "1px solid rgba(255,255,255,0.04)",
                paddingTop: 6,
              }}
            >
              {g.subIndicators.map((si) => (
                <SubIndicatorRow key={si.id} si={si} />
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Expand/collapse */}
      {gap.gaps.length > 3 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            background: "none",
            border: "none",
            color: "#5B8DB8",
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

      {/* Enterprise CTA when sub-indicators are hidden */}
      {!showSubIndicators && (
        <div style={{ marginTop: 10, textAlign: "center" }}>
          <a
            href="/contact?tier=enterprise&ref=gap-analysis"
            style={{
              color: "#5B8DB8",
              fontSize: 9,
              letterSpacing: 0.5,
              textDecoration: "none",
              opacity: 0.7,
              transition: "opacity 0.15s",
            }}
          >
            Want diagnostic depth? Request enterprise briefing &rarr;
          </a>
        </div>
      )}
    </div>
  );
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, "") + "...";
}
