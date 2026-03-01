"use client";

import { SCORE_WEIGHTS } from "@/lib/scoring";
import {
  SCORE_COMPONENT_COLORS,
  SCORE_COMPONENT_LABELS,
} from "@/lib/dashboard-constants";

interface FactorSparklinesProps {
  history: { breakdown: Record<string, number>; capturedAt: string }[];
}

export default function FactorSparklines({ history }: FactorSparklinesProps) {
  if (history.length < 2) return null;

  const factors = Object.keys(SCORE_WEIGHTS);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: 12,
      }}
    >
      {factors.map((key) => {
        const values = history.map((h) => h.breakdown?.[key] ?? 0);
        const max = SCORE_WEIGHTS[key as keyof typeof SCORE_WEIGHTS];
        const color = SCORE_COMPONENT_COLORS[key] ?? "#555";
        const label = SCORE_COMPONENT_LABELS[key] ?? key;
        const current = values[values.length - 1];
        const first = values[0];
        const delta = current - first;

        // Only render factors with >= 2 data points that have variation
        const hasVariation = values.some((v) => v !== values[0]);
        if (!hasVariation) return null;

        // SVG sparkline
        const w = 120;
        const h = 28;
        const padY = 3;
        const vMin = Math.min(...values);
        const vMax = Math.max(...values);
        const range = vMax - vMin || 1;

        const points = values.map((v, i) => {
          const x = (i / (values.length - 1)) * w;
          const y = padY + ((vMax - v) / range) * (h - padY * 2);
          return `${x},${y}`;
        });

        const polyline = points.join(" ");
        const areaPath = `${polyline} ${w},${h} 0,${h}`;

        const deltaLabel = delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "";
        const deltaColor = delta > 0 ? "#00ff88" : delta < 0 ? "#ff4444" : "#555";

        return (
          <div
            key={key}
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 8,
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 10,
              }}
            >
              <span style={{ color: "#555", fontSize: 9, letterSpacing: 1 }}>
                {label.toUpperCase()}
              </span>
              <span
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  color: current > 0 ? color : "#666",
                }}
              >
                {current}/{max}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
              <svg
                width={w}
                height={h}
                viewBox={`0 0 ${w} ${h}`}
                style={{ display: "block", flex: 1 }}
              >
                <polygon
                  points={areaPath}
                  fill={color}
                  fillOpacity={0.1}
                />
                <polyline
                  points={polyline}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
              {deltaLabel && (
                <span
                  style={{
                    color: deltaColor,
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: "'Space Grotesk', sans-serif",
                    flexShrink: 0,
                  }}
                >
                  {deltaLabel}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
