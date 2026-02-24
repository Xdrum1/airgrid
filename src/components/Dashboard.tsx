"use client";

import { useState, useEffect } from "react";
import { City, Operator } from "@/types";
import { CITIES, OPERATORS_MAP } from "@/data/seed";
import { getScoreColor, getScoreTier, getPostureConfig } from "@/lib/scoring";
import { SCORE_WEIGHTS } from "@/lib/scoring";

// -------------------------------------------------------
// Sub-components
// -------------------------------------------------------

function ScoreBar({
  value,
  max = 100,
  color,
}: {
  value: number;
  max?: number;
  color: string;
}) {
  return (
    <div
      style={{
        background: "#0a0a0f",
        borderRadius: 2,
        height: 4,
        overflow: "hidden",
        flex: 1,
      }}
    >
      <div
        style={{
          width: `${(value / max) * 100}%`,
          height: "100%",
          background: color,
          transition: "width 0.6s ease",
          borderRadius: 2,
        }}
      />
    </div>
  );
}

function CityCard({
  city,
  isSelected,
  onClick,
  rank,
}: {
  city: City;
  isSelected: boolean;
  onClick: () => void;
  rank: number;
}) {
  const color = getScoreColor(city.score ?? 0);
  const posture = getPostureConfig(city.regulatoryPosture);

  return (
    <div
      onClick={onClick}
      style={{
        background: isSelected
          ? "rgba(0,212,255,0.06)"
          : "rgba(255,255,255,0.02)",
        border: isSelected
          ? "1px solid rgba(0,212,255,0.4)"
          : "1px solid rgba(255,255,255,0.05)",
        borderRadius: 8,
        padding: "12px 14px",
        cursor: "pointer",
        transition: "all 0.2s",
        marginBottom: 5,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#2a2a3a", fontSize: 10 }}>#{rank}</span>
          <div>
            <span
              style={{
                color: "#fff",
                fontFamily: "'Space Mono', monospace",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {city.city}
            </span>
            <span
              style={{
                color: "#444",
                fontFamily: "'Space Mono', monospace",
                fontSize: 10,
                marginLeft: 6,
              }}
            >
              {city.state}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              color: posture.color,
              fontSize: 8,
              opacity: 0.6,
            }}
          >
            {posture.label}
          </span>
          <span
            style={{
              color,
              fontFamily: "'Space Mono', monospace",
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            {city.score}
          </span>
        </div>
      </div>
      <ScoreBar value={city.score ?? 0} color={color} />
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <span
          style={{
            color: "#555",
            fontFamily: "'Space Mono', monospace",
            fontSize: 9,
          }}
        >
          {label}
        </span>
        <span
          style={{
            color: value > 0 ? color : "#2a2a3a",
            fontFamily: "'Space Mono', monospace",
            fontSize: 9,
          }}
        >
          {value}/{max}
        </span>
      </div>
      <ScoreBar value={value} max={max} color={value > 0 ? color : "#1a1a28"} />
    </div>
  );
}

// -------------------------------------------------------
// Main Dashboard
// -------------------------------------------------------

type FilterKey = "all" | "hot" | "operators" | "vertiport";

export default function Dashboard() {
  const [selected, setSelected] = useState<City>(CITIES[0]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [tab, setTab] = useState<"map" | "rank">("map");
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 80);
    return () => clearTimeout(t);
  }, []);

  const filtered = CITIES.filter((c) => {
    if (filter === "hot") return (c.score ?? 0) >= 60;
    if (filter === "operators") return c.activeOperators.length > 0;
    if (filter === "vertiport") return c.vertiportCount > 0;
    return true;
  });

  const scoreColor = getScoreColor(selected.score ?? 0);
  const posture = getPostureConfig(selected.regulatoryPosture);

  const headerStats = [
    { label: `${CITIES.length} MARKETS`, color: "#00d4ff" },
    {
      label: `${CITIES.filter((c) => (c.score ?? 0) >= 60).length} HIGH READINESS`,
      color: "#00ff88",
    },
    {
      label: `${CITIES.filter((c) => c.vertiportCount > 0).length} VERTIPORT CITIES`,
      color: "#f59e0b",
    },
    {
      label: `AVG SCORE ${Math.round(CITIES.reduce((a, b) => a + (b.score ?? 0), 0) / CITIES.length)}`,
      color: "#888",
    },
  ];

  // Simple US map dot positions (% based, approximated)
  const mapPositions: Record<string, { x: number; y: number }> = {
    los_angeles: { x: 8, y: 55 },
    san_francisco: { x: 6, y: 42 },
    san_diego: { x: 10, y: 62 },
    las_vegas: { x: 14, y: 53 },
    phoenix: { x: 18, y: 62 },
    denver: { x: 35, y: 45 },
    dallas: { x: 52, y: 68 },
    houston: { x: 50, y: 75 },
    austin: { x: 49, y: 72 },
    minneapolis: { x: 60, y: 22 },
    chicago: { x: 68, y: 30 },
    nashville: { x: 70, y: 55 },
    atlanta: { x: 72, y: 62 },
    charlotte: { x: 77, y: 52 },
    orlando: { x: 76, y: 76 },
    miami: { x: 78, y: 83 },
    washington_dc: { x: 83, y: 42 },
    boston: { x: 93, y: 25 },
    new_york: { x: 90, y: 33 },
    seattle: { x: 7, y: 14 },
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050508",
        fontFamily: "'Space Mono', monospace",
        color: "#fff",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 54,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 26,
              height: 26,
              background: "linear-gradient(135deg, #00d4ff, #7c3aed)",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
            }}
          >
            ✦
          </div>
          <span
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: 17,
              letterSpacing: "-0.5px",
            }}
          >
            AIRGRID
          </span>
          <span
            style={{ color: "#2a2a3a", fontSize: 9, letterSpacing: 2 }}
          >
            UAM MARKET INTELLIGENCE
          </span>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {headerStats.map((s, i) => (
            <span
              key={i}
              style={{ color: s.color, fontSize: 9, letterSpacing: 1 }}
            >
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* LEFT — City List */}
        <div
          style={{
            width: 272,
            borderRight: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
          }}
        >
          {/* Filter bar */}
          <div
            style={{
              padding: "12px 14px 10px",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <div
              style={{
                color: "#2a2a3a",
                fontSize: 8,
                letterSpacing: 2,
                marginBottom: 8,
              }}
            >
              FILTER
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {(
                [
                  ["all", "ALL"],
                  ["hot", "HOT"],
                  ["operators", "ACTIVE OPS"],
                  ["vertiport", "VERTIPORT"],
                ] as [FilterKey, string][]
              ).map(([val, lbl]) => (
                <button
                  key={val}
                  onClick={() => setFilter(val)}
                  style={{
                    background:
                      filter === val
                        ? "rgba(0,212,255,0.12)"
                        : "transparent",
                    border:
                      filter === val
                        ? "1px solid rgba(0,212,255,0.35)"
                        : "1px solid rgba(255,255,255,0.07)",
                    color: filter === val ? "#00d4ff" : "#444",
                    borderRadius: 4,
                    padding: "4px 8px",
                    fontSize: 8,
                    letterSpacing: 1,
                    cursor: "pointer",
                    fontFamily: "'Space Mono', monospace",
                    transition: "all 0.15s",
                  }}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div
            style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}
          >
            {filtered.map((city, i) => (
              <div
                key={city.id}
                style={{
                  opacity: animate ? 1 : 0,
                  transform: animate
                    ? "translateX(0)"
                    : "translateX(-8px)",
                  transition: `opacity 0.3s ease ${i * 0.025}s, transform 0.3s ease ${i * 0.025}s`,
                }}
              >
                <CityCard
                  city={city}
                  rank={CITIES.indexOf(city) + 1}
                  isSelected={selected?.id === city.id}
                  onClick={() => setSelected(city)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* CENTER — Map or Rankings */}
        <div
          style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}
        >
          {/* Tab bar */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              padding: "0 20px",
              flexShrink: 0,
            }}
          >
            {(["map", "rank"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom:
                    tab === t
                      ? "2px solid #00d4ff"
                      : "2px solid transparent",
                  color: tab === t ? "#00d4ff" : "#444",
                  padding: "13px 16px",
                  fontSize: 9,
                  letterSpacing: 2,
                  cursor: "pointer",
                  fontFamily: "'Space Mono', monospace",
                  marginBottom: -1,
                  textTransform: "uppercase",
                }}
              >
                {t === "map" ? "MAP VIEW" : "RANKINGS"}
              </button>
            ))}
          </div>

          {tab === "map" ? (
            <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
              {/* Grid lines */}
              {[20, 40, 60, 80].map((pct) => (
                <div
                  key={pct}
                  style={{
                    position: "absolute",
                    left: `${pct}%`,
                    top: 0,
                    bottom: 0,
                    borderLeft: "1px solid rgba(255,255,255,0.015)",
                  }}
                />
              ))}
              {[25, 50, 75].map((pct) => (
                <div
                  key={pct}
                  style={{
                    position: "absolute",
                    top: `${pct}%`,
                    left: 0,
                    right: 0,
                    borderTop: "1px solid rgba(255,255,255,0.015)",
                  }}
                />
              ))}

              {/* City dots */}
              {CITIES.map((city) => {
                const pos = mapPositions[city.id];
                if (!pos) return null;
                const color = getScoreColor(city.score ?? 0);
                const isSelected = selected?.id === city.id;
                const dotSize =
                  (city.score ?? 0) >= 70
                    ? 14
                    : (city.score ?? 0) >= 45
                    ? 10
                    : 7;

                return (
                  <div
                    key={city.id}
                    onClick={() => setSelected(city)}
                    style={{
                      position: "absolute",
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      transform: "translate(-50%, -50%)",
                      cursor: "pointer",
                      zIndex: isSelected ? 10 : 2,
                    }}
                  >
                    <div
                      style={{
                        width: dotSize,
                        height: dotSize,
                        borderRadius: "50%",
                        background: color,
                        border: isSelected
                          ? "2px solid #fff"
                          : `1px solid ${color}`,
                        boxShadow: `0 0 ${isSelected ? 18 : 6}px ${color}`,
                        transition: "all 0.2s",
                        position: "relative",
                      }}
                    >
                      {isSelected && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: "calc(100% + 8px)",
                            left: "50%",
                            transform: "translateX(-50%)",
                            background: "#0d0d1a",
                            border: `1px solid ${color}`,
                            borderRadius: 4,
                            padding: "4px 8px",
                            whiteSpace: "nowrap",
                            fontFamily: "'Space Mono', monospace",
                            fontSize: 9,
                            color: "#fff",
                            pointerEvents: "none",
                          }}
                        >
                          {city.city} —{" "}
                          <span style={{ color }}>{city.score}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Legend */}
              <div
                style={{
                  position: "absolute",
                  bottom: 18,
                  left: 18,
                  background: "rgba(5,5,8,0.9)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8,
                  padding: "10px 14px",
                }}
              >
                <div
                  style={{
                    color: "#333",
                    fontSize: 8,
                    letterSpacing: 2,
                    marginBottom: 8,
                  }}
                >
                  READINESS SCORE
                </div>
                {(
                  [
                    ["≥ 75 HIGH", "#00ff88", 14],
                    ["50–74 MODERATE", "#00d4ff", 10],
                    ["30–49 EARLY", "#f59e0b", 7],
                    ["< 30 NASCENT", "#ff4444", 6],
                  ] as [string, string, number][]
                ).map(([lbl, color, size]) => (
                  <div
                    key={lbl}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 5,
                    }}
                  >
                    <div
                      style={{
                        width: size,
                        height: size,
                        borderRadius: "50%",
                        background: color,
                        boxShadow: `0 0 4px ${color}`,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ color: "#555", fontSize: 9 }}>{lbl}</span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  position: "absolute",
                  bottom: 18,
                  right: 18,
                  color: "#1a1a28",
                  fontSize: 9,
                  letterSpacing: 1,
                }}
              >
                AIRGRID v0.1 — US MARKETS
              </div>
            </div>
          ) : (
            <div
              style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}
            >
              {CITIES.map((city, i) => {
                const color = getScoreColor(city.score ?? 0);
                const isSelected = selected?.id === city.id;
                return (
                  <div
                    key={city.id}
                    onClick={() => setSelected(city)}
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
                        color: "#2a2a3a",
                        fontSize: 10,
                        width: 22,
                        textAlign: "right",
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </span>
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
                        <span style={{ color: "#444", fontSize: 10 }}>
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
                    <div style={{ width: 100, flexShrink: 0 }}>
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
          )}
        </div>

        {/* RIGHT — Detail Panel */}
        <div
          style={{
            width: 296,
            borderLeft: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            flexDirection: "column",
            overflow: "auto",
            flexShrink: 0,
          }}
        >
          {/* Score Header */}
          <div
            style={{
              padding: "20px 20px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 800,
                    fontSize: 19,
                    lineHeight: 1.1,
                  }}
                >
                  {selected.city}
                </div>
                <div style={{ color: "#444", fontSize: 10, marginTop: 3 }}>
                  {selected.state} · United States
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    color: scoreColor,
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 800,
                    fontSize: 34,
                    lineHeight: 1,
                  }}
                >
                  {selected.score}
                </div>
                <div style={{ color: "#333", fontSize: 8, letterSpacing: 1 }}>
                  {getScoreTier(selected.score ?? 0)}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <ScoreBar value={selected.score ?? 0} color={scoreColor} />
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
              <span
                style={{
                  color: posture.color,
                  fontSize: 8,
                  border: `1px solid ${posture.color}44`,
                  borderRadius: 3,
                  padding: "3px 7px",
                  letterSpacing: 1,
                }}
              >
                {posture.label}
              </span>
              {selected.hasStateLegislation && (
                <span
                  style={{
                    color: "#00ff88",
                    fontSize: 8,
                    border: "1px solid rgba(0,255,136,0.25)",
                    borderRadius: 3,
                    padding: "3px 7px",
                    letterSpacing: 1,
                  }}
                >
                  STATE LAW
                </span>
              )}
              {selected.hasLaancCoverage && (
                <span
                  style={{
                    color: "#00d4ff",
                    fontSize: 8,
                    border: "1px solid rgba(0,212,255,0.25)",
                    borderRadius: 3,
                    padding: "3px 7px",
                    letterSpacing: 1,
                  }}
                >
                  LAANC
                </span>
              )}
            </div>
          </div>

          {/* Score Breakdown */}
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div
              style={{
                color: "#2a2a3a",
                fontSize: 8,
                letterSpacing: 2,
                marginBottom: 12,
              }}
            >
              SCORE BREAKDOWN
            </div>
            <BreakdownRow
              label="Active Pilot Program"
              value={selected.breakdown?.activePilotProgram ?? 0}
              max={SCORE_WEIGHTS.activePilotProgram}
              color={scoreColor}
            />
            <BreakdownRow
              label="Approved Vertiport"
              value={selected.breakdown?.approvedVertiport ?? 0}
              max={SCORE_WEIGHTS.approvedVertiport}
              color={scoreColor}
            />
            <BreakdownRow
              label="Active Operators"
              value={selected.breakdown?.activeOperatorPresence ?? 0}
              max={SCORE_WEIGHTS.activeOperatorPresence}
              color={scoreColor}
            />
            <BreakdownRow
              label="Vertiport Zoning"
              value={selected.breakdown?.vertiportZoning ?? 0}
              max={SCORE_WEIGHTS.vertiportZoning}
              color={scoreColor}
            />
            <BreakdownRow
              label="Regulatory Posture"
              value={selected.breakdown?.regulatoryPosture ?? 0}
              max={SCORE_WEIGHTS.regulatoryPosture}
              color={scoreColor}
            />
            <BreakdownRow
              label="State Legislation"
              value={selected.breakdown?.stateLegislation ?? 0}
              max={SCORE_WEIGHTS.stateLegislation}
              color={scoreColor}
            />
            <BreakdownRow
              label="LAANC Coverage"
              value={selected.breakdown?.laancCoverage ?? 0}
              max={SCORE_WEIGHTS.laancCoverage}
              color={scoreColor}
            />
          </div>

          {/* Active Operators */}
          {selected.activeOperators.length > 0 && (
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  color: "#2a2a3a",
                  fontSize: 8,
                  letterSpacing: 2,
                  marginBottom: 10,
                }}
              >
                ACTIVE OPERATORS
              </div>
              {selected.activeOperators.map((opId) => {
                const op = OPERATORS_MAP[opId];
                return op ? (
                  <div
                    key={opId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 7,
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: op.color,
                        boxShadow: `0 0 4px ${op.color}`,
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div style={{ color: "#ccc", fontSize: 11 }}>
                        {op.name}
                      </div>
                      <div style={{ color: "#444", fontSize: 9 }}>
                        {op.faaCertStatus === "operational"
                          ? "Operational"
                          : "FAA cert in progress"}{" "}
                        · {op.aircraft[0]}
                      </div>
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          )}

          {/* Key Milestones */}
          {selected.keyMilestones?.length > 0 && (
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  color: "#2a2a3a",
                  fontSize: 8,
                  letterSpacing: 2,
                  marginBottom: 10,
                }}
              >
                KEY MILESTONES
              </div>
              {selected.keyMilestones.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 8,
                    marginBottom: 8,
                    alignItems: "flex-start",
                  }}
                >
                  <span
                    style={{
                      color: scoreColor,
                      fontSize: 8,
                      marginTop: 2,
                      flexShrink: 0,
                    }}
                  >
                    ▶
                  </span>
                  <span
                    style={{ color: "#777", fontSize: 10, lineHeight: 1.6 }}
                  >
                    {m}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Market Intel */}
          <div style={{ padding: "14px 20px" }}>
            <div
              style={{
                color: "#2a2a3a",
                fontSize: 8,
                letterSpacing: 2,
                marginBottom: 8,
              }}
            >
              MARKET INTEL
            </div>
            <p
              style={{
                color: "#666",
                fontSize: 10,
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              {selected.notes}
            </p>
          </div>

          {/* Last Updated */}
          <div
            style={{
              padding: "10px 20px",
              borderTop: "1px solid rgba(255,255,255,0.04)",
              marginTop: "auto",
            }}
          >
            <span style={{ color: "#2a2a3a", fontSize: 8 }}>
              LAST UPDATED {selected.lastUpdated}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
