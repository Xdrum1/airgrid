"use client";

import { City, Operator } from "@/types";
import { getScoreColor } from "@/lib/scoring";
import { SCORE_COMPONENT_COLORS, SCORE_COMPONENT_LABELS } from "@/lib/dashboard-constants";
import { OPERATORS } from "@/data/seed";

export default function AnalyticsTab({
  cities,
  animate,
  isMobile,
}: {
  cities: City[];
  animate: boolean;
  isMobile: boolean;
}) {
  const top10 = cities.slice(0, 10);
  const avgScore = Math.round(cities.reduce((a, c) => a + (c.score ?? 0), 0) / cities.length);
  const vertiportCityCount = cities.filter((c) => c.vertiportCount > 0).length;
  const operatorCount = OPERATORS.length;

  return (
    <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "12px 12px" : "16px 20px", paddingLeft: isMobile ? 12 : 292, paddingRight: isMobile ? 12 : 316 }}>
      {/* Summary Stats Row */}
      <div style={{
        display: isMobile ? "grid" : "flex",
        gridTemplateColumns: isMobile ? "1fr 1fr" : undefined,
        gap: 12,
        marginBottom: 24,
      }}>
        {[
          { label: "TOTAL MARKETS", value: cities.length, color: "#00d4ff" },
          { label: "AVG SCORE", value: avgScore, color: "#00ff88" },
          { label: "VERTIPORT CITIES", value: vertiportCityCount, color: "#f59e0b" },
          { label: "OPERATORS", value: operatorCount, color: "#7c3aed" },
        ].map((stat, i) => (
          <div
            key={stat.label}
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 8,
              padding: "16px 14px",
              opacity: animate ? 1 : 0,
              transform: animate ? "translateY(0)" : "translateY(8px)",
              transition: `opacity 0.4s ease ${i * 0.08}s, transform 0.4s ease ${i * 0.08}s`,
            }}
          >
            <div style={{ color: "#444", fontSize: 8, letterSpacing: 2, marginBottom: 8 }}>
              {stat.label}
            </div>
            <div style={{ color: stat.color, fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28 }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Horizontal Bar Chart — Top 10 by Readiness Score */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ color: "#444", fontSize: 8, letterSpacing: 2, marginBottom: 14 }}>
          TOP 10 MARKETS BY READINESS SCORE
        </div>
        <svg viewBox="0 0 600 280" style={{ width: "100%", height: "auto" }}>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((tick) => (
            <g key={tick}>
              <line
                x1={120 + (tick / 100) * 400}
                y1={0}
                x2={120 + (tick / 100) * 400}
                y2={270}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={1}
              />
              <text
                x={120 + (tick / 100) * 400}
                y={278}
                fill="#333"
                fontSize={9}
                textAnchor="middle"
                fontFamily="'Space Mono', monospace"
              >
                {tick}
              </text>
            </g>
          ))}
          {/* Bars */}
          {top10.map((city, i) => {
            const barColor = getScoreColor(city.score ?? 0);
            const barWidth = ((city.score ?? 0) / 100) * 400;
            return (
              <g key={city.id}>
                <text
                  x={115}
                  y={i * 27 + 16}
                  fill="#888"
                  fontSize={10}
                  textAnchor="end"
                  fontFamily="'Space Mono', monospace"
                >
                  {city.city}
                </text>
                <rect
                  x={120}
                  y={i * 27 + 4}
                  width={animate ? barWidth : 0}
                  height={18}
                  rx={3}
                  fill={barColor}
                  opacity={0.85}
                  style={{ transition: `width 0.8s ease ${i * 0.05}s` }}
                />
                <text
                  x={120 + barWidth + 8}
                  y={i * 27 + 16}
                  fill={barColor}
                  fontSize={10}
                  fontFamily="'Space Mono', monospace"
                  fontWeight={700}
                  style={{
                    opacity: animate ? 1 : 0,
                    transition: `opacity 0.4s ease ${0.4 + i * 0.05}s`,
                  }}
                >
                  {city.score}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Stacked Bar Chart — Score Breakdown by Component */}
      <div>
        <div style={{ color: "#444", fontSize: 8, letterSpacing: 2, marginBottom: 10 }}>
          SCORE BREAKDOWN BY COMPONENT
        </div>
        {/* Legend */}
        <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
          {Object.entries(SCORE_COMPONENT_LABELS).map(([key, label]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: SCORE_COMPONENT_COLORS[key] }} />
              <span style={{ color: "#666", fontSize: 8, fontFamily: "'Space Mono', monospace" }}>{label}</span>
            </div>
          ))}
        </div>
        <svg viewBox="0 0 600 280" style={{ width: "100%", height: "auto" }}>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((tick) => (
            <g key={tick}>
              <line
                x1={120 + (tick / 100) * 400}
                y1={0}
                x2={120 + (tick / 100) * 400}
                y2={270}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={1}
              />
              <text
                x={120 + (tick / 100) * 400}
                y={278}
                fill="#333"
                fontSize={9}
                textAnchor="middle"
                fontFamily="'Space Mono', monospace"
              >
                {tick}
              </text>
            </g>
          ))}
          {/* Stacked bars */}
          {top10.map((city, i) => {
            const breakdown = city.breakdown;
            const keys = Object.keys(SCORE_COMPONENT_COLORS) as (keyof typeof SCORE_COMPONENT_COLORS)[];
            const segments = keys.reduce<{ key: string; x: number; width: number; color: string }[]>(
              (acc, key) => {
                const val = breakdown?.[key as keyof typeof breakdown] ?? 0;
                const prevEnd = acc.length > 0 ? acc[acc.length - 1].x + acc[acc.length - 1].width : 0;
                if (val > 0) {
                  acc.push({
                    key,
                    x: prevEnd,
                    width: (val / 100) * 400,
                    color: SCORE_COMPONENT_COLORS[key],
                  });
                }
                return acc;
              },
              []
            );
            return (
              <g key={city.id}>
                <text
                  x={115}
                  y={i * 27 + 16}
                  fill="#888"
                  fontSize={10}
                  textAnchor="end"
                  fontFamily="'Space Mono', monospace"
                >
                  {city.city}
                </text>
                {segments.map((seg) => (
                  <rect
                    key={seg.key}
                    x={120 + (animate ? seg.x : 0)}
                    y={i * 27 + 4}
                    width={animate ? seg.width : 0}
                    height={18}
                    rx={1}
                    fill={seg.color}
                    opacity={0.85}
                    style={{ transition: `width 0.8s ease ${i * 0.05}s, x 0.8s ease ${i * 0.05}s` }}
                  />
                ))}
                <text
                  x={120 + ((city.score ?? 0) / 100) * 400 + 8}
                  y={i * 27 + 16}
                  fill="#555"
                  fontSize={10}
                  fontFamily="'Space Mono', monospace"
                  style={{
                    opacity: animate ? 1 : 0,
                    transition: `opacity 0.4s ease ${0.4 + i * 0.05}s`,
                  }}
                >
                  {city.score}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
