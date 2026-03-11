"use client";

import { City, Operator } from "@/types";
import { getScoreColor } from "@/lib/scoring";
import { OPERATORS_MAP } from "@/data/seed";
import ScoreBar from "../ScoreBar";
import WatchlistStar from "../WatchlistStar";

export default function RankingsTab({
  cities,
  selected,
  onSelect,
  animate,
  isMobile,
  watchedCityIds,
  onToggleWatch,
  isAuthenticated,
}: {
  cities: City[];
  selected: City;
  onSelect: (city: City) => void;
  animate: boolean;
  isMobile: boolean;
  watchedCityIds: string[];
  onToggleWatch: (cityId: string) => void;
  isAuthenticated: boolean;
}) {
  return (
    <div
      style={{ flex: 1, overflow: "auto", padding: isMobile ? "12px 12px" : "16px 20px", paddingLeft: isMobile ? 12 : 292, paddingRight: isMobile ? 12 : 316 }}
    >
      {cities.map((city, i) => {
        const color = getScoreColor(city.score ?? 0);
        const isSelected = selected?.id === city.id;
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
    </div>
  );
}
