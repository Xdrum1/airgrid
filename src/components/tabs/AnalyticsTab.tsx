"use client";

import { useMemo } from "react";
import { City, Corridor } from "@/types";
import { getScoreColor } from "@/lib/scoring";
import { SCORE_COMPONENT_COLORS, SCORE_COMPONENT_LABELS, CORRIDOR_STATUS_COLORS } from "@/lib/dashboard-constants";
import { OPERATORS, CITIES_MAP } from "@/data/seed";

export default function AnalyticsTab({
  cities,
  corridors,
  animate,
  isMobile,
}: {
  cities: City[];
  corridors: Corridor[];
  animate: boolean;
  isMobile: boolean;
}) {
  const top10 = cities.slice(0, 10);
  const avgScore = Math.round(cities.reduce((a, c) => a + (c.score ?? 0), 0) / cities.length);
  const vertiportCityCount = cities.filter((c) => c.vertiportCount > 0).length;
  const operatorCount = OPERATORS.length;

  // Corridor analytics
  const corridorStats = useMemo(() => {
    const proposed = corridors.filter((c) => c.status === "proposed").length;
    const authorized = corridors.filter((c) => c.status === "authorized").length;
    const active = corridors.filter((c) => c.status === "active").length;
    const suspended = corridors.filter((c) => c.status === "suspended").length;

    const avgDistance = corridors.length > 0
      ? Math.round(corridors.reduce((a, c) => a + (c.distanceKm ?? 0), 0) / corridors.length * 10) / 10
      : 0;
    const avgFlight = corridors.length > 0
      ? Math.round(corridors.reduce((a, c) => a + (c.estimatedFlightMinutes ?? 0), 0) / corridors.length * 10) / 10
      : 0;

    // Corridors by city
    const byCity: Record<string, number> = {};
    for (const c of corridors) {
      byCity[c.cityId] = (byCity[c.cityId] ?? 0) + 1;
    }
    const byCitySorted = Object.entries(byCity)
      .map(([cityId, count]) => ({
        cityId,
        cityName: CITIES_MAP[cityId]?.city ?? cityId,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    return { proposed, authorized, active, suspended, avgDistance, avgFlight, byCitySorted };
  }, [corridors]);

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
            <div style={{ color: "#777", fontSize: 8, letterSpacing: 2, marginBottom: 8 }}>
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
        <div style={{ color: "#777", fontSize: 8, letterSpacing: 2, marginBottom: 14 }}>
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
      <div style={{ marginBottom: 32 }}>
        <div style={{ color: "#777", fontSize: 8, letterSpacing: 2, marginBottom: 10 }}>
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

      {/* CORRIDOR INTELLIGENCE */}
      {corridors.length > 0 && (
        <>
          <div style={{ color: "#777", fontSize: 8, letterSpacing: 2, marginBottom: 14 }}>
            CORRIDOR INTELLIGENCE
          </div>

          {/* Corridor status stat cards */}
          <div style={{
            display: isMobile ? "grid" : "flex",
            gridTemplateColumns: isMobile ? "1fr 1fr" : undefined,
            gap: 12,
            marginBottom: 24,
          }}>
            {[
              { label: "TOTAL CORRIDORS", value: corridors.length, color: "#00d4ff" },
              { label: "PROPOSED", value: corridorStats.proposed, color: CORRIDOR_STATUS_COLORS["proposed"] },
              { label: "AUTHORIZED", value: corridorStats.authorized, color: CORRIDOR_STATUS_COLORS["authorized"] },
              { label: "ACTIVE", value: corridorStats.active, color: CORRIDOR_STATUS_COLORS["active"] },
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
                  transition: `opacity 0.4s ease ${i * 0.08 + 0.2}s, transform 0.4s ease ${i * 0.08 + 0.2}s`,
                }}
              >
                <div style={{ color: "#777", fontSize: 8, letterSpacing: 2, marginBottom: 8 }}>
                  {stat.label}
                </div>
                <div style={{ color: stat.color, fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28 }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Average stats */}
          <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
            {[
              { label: "AVG DISTANCE", value: `${corridorStats.avgDistance} km`, color: "#00d4ff" },
              { label: "AVG FLIGHT TIME", value: `${corridorStats.avgFlight} min`, color: "#00ff88" },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 8,
                  padding: "14px 14px",
                }}
              >
                <div style={{ color: "#777", fontSize: 8, letterSpacing: 2, marginBottom: 6 }}>
                  {stat.label}
                </div>
                <div style={{ color: stat.color, fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 18 }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Corridors by City bar chart */}
          {corridorStats.byCitySorted.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ color: "#777", fontSize: 8, letterSpacing: 2, marginBottom: 14 }}>
                CORRIDORS BY CITY
              </div>
              <svg
                viewBox={`0 0 600 ${corridorStats.byCitySorted.length * 30 + 10}`}
                style={{ width: "100%", height: "auto" }}
              >
                {corridorStats.byCitySorted.map((entry, i) => {
                  const maxCount = corridorStats.byCitySorted[0].count;
                  const barWidth = maxCount > 0 ? (entry.count / maxCount) * 380 : 0;
                  return (
                    <g key={entry.cityId}>
                      <text
                        x={115}
                        y={i * 30 + 18}
                        fill="#888"
                        fontSize={10}
                        textAnchor="end"
                        fontFamily="'Space Mono', monospace"
                      >
                        {entry.cityName}
                      </text>
                      <rect
                        x={120}
                        y={i * 30 + 6}
                        width={animate ? barWidth : 0}
                        height={20}
                        rx={3}
                        fill="#00d4ff"
                        opacity={0.85}
                        style={{ transition: `width 0.8s ease ${i * 0.05}s` }}
                      />
                      <text
                        x={120 + barWidth + 8}
                        y={i * 30 + 18}
                        fill="#00d4ff"
                        fontSize={10}
                        fontFamily="'Space Mono', monospace"
                        fontWeight={700}
                        style={{
                          opacity: animate ? 1 : 0,
                          transition: `opacity 0.4s ease ${0.4 + i * 0.05}s`,
                        }}
                      >
                        {entry.count}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </>
      )}

    </div>
  );
}
