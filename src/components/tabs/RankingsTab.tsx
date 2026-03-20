"use client";

import { City, Operator } from "@/types";
import { getScoreColor } from "@/lib/scoring";
import { OPERATORS_MAP } from "@/data/seed";
import ScoreBar from "../ScoreBar";
import WatchlistStar from "../WatchlistStar";
import Link from "next/link";

export default function RankingsTab({
  cities,
  selected,
  onSelect,
  animate,
  isMobile,
  watchedCityIds,
  onToggleWatch,
  isAuthenticated,
  scoreDeltas,
}: {
  cities: City[];
  selected: City;
  onSelect: (city: City) => void;
  animate: boolean;
  isMobile: boolean;
  watchedCityIds: string[];
  onToggleWatch: (cityId: string) => void;
  isAuthenticated: boolean;
  scoreDeltas?: Record<string, { delta: number; previousScore: number; currentScore: number; changedAt: string }>;
}) {
  // Compute movers: cities with non-zero deltas, sorted by absolute delta
  const movers = scoreDeltas
    ? cities
        .filter((c) => scoreDeltas[c.id] && scoreDeltas[c.id].delta !== 0)
        .sort((a, b) => Math.abs(scoreDeltas[b.id].delta) - Math.abs(scoreDeltas[a.id].delta))
    : [];

  return (
    <div
      style={{ flex: 1, overflow: "auto", padding: isMobile ? "12px 12px" : "16px 20px", paddingLeft: isMobile ? 12 : 292, paddingRight: isMobile ? 12 : 316 }}
    >
      {/* Top Movers */}
      {movers.length > 0 && (
        <div
          style={{
            marginBottom: 20,
            padding: "14px 16px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 8,
            opacity: animate ? 1 : 0,
            transform: animate ? "translateY(0)" : "translateY(4px)",
            transition: "opacity 0.3s ease, transform 0.3s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <span style={{ color: "#00d4ff", fontSize: 9, letterSpacing: 2, fontWeight: 700 }}>
              RECENT SCORE CHANGES
            </span>
            <span style={{ color: "#555", fontSize: 8 }}>
              Since last snapshot
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {movers.map((city) => {
              const d = scoreDeltas![city.id];
              const isUp = d.delta > 0;
              return (
                <div
                  key={city.id}
                  onClick={() => onSelect(city)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    background: isUp ? "rgba(0,255,136,0.04)" : "rgba(255,68,68,0.04)",
                    border: isUp
                      ? "1px solid rgba(0,255,136,0.15)"
                      : "1px solid rgba(255,68,68,0.15)",
                    borderRadius: 6,
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                >
                  <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>
                    {city.city}
                  </span>
                  <span style={{ color: "#777", fontSize: 9 }}>{city.state}</span>
                  <span
                    style={{
                      color: isUp ? "#00ff88" : "#ff4444",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {isUp ? "+" : ""}{d.delta}
                  </span>
                  <span style={{ color: "#555", fontSize: 9 }}>
                    {d.previousScore} → {d.currentScore}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rankings list */}
      {cities.map((city, i) => {
        const color = getScoreColor(city.score ?? 0);
        const isSelected = selected?.id === city.id;
        const delta = scoreDeltas?.[city.id]?.delta;
        return (
          <div
            key={city.id}
            onClick={() => onSelect(city)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "11px 14px",
              marginBottom: 4,
              background: isSelected
                ? "rgba(0,212,255,0.05)"
                : "rgba(255,255,255,0.015)",
              border: isSelected
                ? "1px solid rgba(0,212,255,0.3)"
                : "1px solid rgba(255,255,255,0.04)",
              borderRadius: 6,
              cursor: "pointer",
              opacity: animate ? 1 : 0,
              transform: animate ? "translateY(0)" : "translateY(4px)",
              transition: `opacity 0.25s ease ${i * 0.02}s, transform 0.25s ease ${i * 0.02}s, background 0.15s`,
            }}
          >
            <span
              style={{
                color: "#777",
                fontSize: 10,
                width: 22,
                textAlign: "right",
                flexShrink: 0,
              }}
            >
              {i + 1}
            </span>
            <WatchlistStar
              cityId={city.id}
              isWatched={watchedCityIds.includes(city.id)}
              onToggle={onToggleWatch}
              isAuthenticated={isAuthenticated}
              size="sm"
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 7,
                }}
              >
                <span
                  style={{
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {city.city}
                </span>
                <span style={{ color: "#777", fontSize: 10 }}>
                  {city.state}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 5,
                  marginTop: 5,
                  flexWrap: "wrap",
                }}
              >
                {city.hasActivePilotProgram && (
                  <span
                    style={{
                      color: "#00ff88",
                      fontSize: 7,
                      border: "1px solid rgba(0,255,136,0.25)",
                      borderRadius: 2,
                      padding: "1px 4px",
                    }}
                  >
                    PILOT
                  </span>
                )}
                {city.vertiportCount > 0 && (
                  <span
                    style={{
                      color: "#00d4ff",
                      fontSize: 7,
                      border: "1px solid rgba(0,212,255,0.25)",
                      borderRadius: 2,
                      padding: "1px 4px",
                    }}
                  >
                    {city.vertiportCount} VERTIPORT
                    {city.vertiportCount > 1 ? "S" : ""}
                  </span>
                )}
                {city.activeOperators.map((opId) => {
                  const op = OPERATORS_MAP[opId];
                  return op ? (
                    <span
                      key={opId}
                      style={{
                        color: op.color,
                        fontSize: 7,
                        border: `1px solid ${op.color}33`,
                        borderRadius: 2,
                        padding: "1px 4px",
                      }}
                    >
                      {op.name.split(" ")[0].toUpperCase()}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
            <div style={{ width: isMobile ? 60 : 100, flexShrink: 0 }}>
              <ScoreBar
                value={city.score ?? 0}
                color={color}
              />
            </div>
            {delta && delta !== 0 && (
              <span
                style={{
                  color: delta > 0 ? "#00ff88" : "#ff4444",
                  fontSize: 10,
                  fontWeight: 700,
                  flexShrink: 0,
                  width: 28,
                  textAlign: "right",
                }}
              >
                {delta > 0 ? "+" : ""}{delta}
              </span>
            )}
            <span
              style={{
                color,
                fontSize: 18,
                fontWeight: 700,
                width: 36,
                textAlign: "right",
                flexShrink: 0,
              }}
            >
              {city.score}
            </span>
          </div>
        );
      })}

      {/* Methodology disclaimer */}
      <div
        style={{
          marginTop: 20,
          padding: "12px 16px",
          background: "rgba(255,255,255,0.015)",
          border: "1px solid rgba(255,255,255,0.04)",
          borderRadius: 6,
          opacity: animate ? 0.8 : 0,
          transition: "opacity 0.5s ease 0.5s",
        }}
      >
        <p
          style={{
            color: "#666",
            fontSize: 10,
            lineHeight: 1.6,
            margin: 0,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Readiness Scores are derived from verified public data including FAA filings, state legislation,
          operator disclosures, and municipal records. Scores update as new signals are detected and classified.{" "}
          <Link
            href="/methodology"
            style={{ color: "#00d4ff", textDecoration: "none" }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            View methodology →
          </Link>
        </p>
      </div>
    </div>
  );
}
