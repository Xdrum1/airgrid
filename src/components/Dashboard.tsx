"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { City, Operator, Vertiport, Corridor, ChangelogEntry } from "@/types";
import type { FederalFiling } from "@/lib/faa-api";
import { CITIES, OPERATORS_MAP, getVertiportsForCity, getCorridorsForCity } from "@/data/seed";
import { getScoreColor, getScoreTier, getPostureConfig } from "@/lib/scoring";
import { SCORE_WEIGHTS } from "@/lib/scoring";
import SubscribeForm from "./SubscribeForm";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div style={{
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#07070e",
      color: "#2a2a3a",
      fontFamily: "'Space Mono', monospace",
      fontSize: 10,
      letterSpacing: 2,
    }}>
      LOADING MAP...
    </div>
  ),
});

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

const VERTIPORT_STATUS_COLORS: Record<string, string> = {
  planned: "#f59e0b",
  permitted: "#00d4ff",
  under_construction: "#7c3aed",
  operational: "#00ff88",
};

const CORRIDOR_STATUS_COLORS: Record<string, string> = {
  proposed: "#f59e0b",
  authorized: "#00d4ff",
  active: "#00ff88",
  suspended: "#ff4444",
};

const CHANGE_TYPE_COLORS: Record<string, string> = {
  new_filing: "#00d4ff",
  status_change: "#f59e0b",
  new_law: "#00ff88",
  faa_update: "#7c3aed",
};

function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMon = Math.floor(diffDay / 30);
  return `${diffMon}mo ago`;
}

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
type TabKey = "map" | "rank" | "filings" | "activity";

export default function Dashboard() {
  const [selected, setSelected] = useState<City>(CITIES[0]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [tab, setTab] = useState<TabKey>("map");
  const [animate, setAnimate] = useState(false);

  // Filings state
  const [filings, setFilings] = useState<FederalFiling[]>([]);
  const [filingsLoading, setFilingsLoading] = useState(false);
  const [filingsError, setFilingsError] = useState<string | null>(null);
  const [filingsFetchedAt, setFilingsFetchedAt] = useState<string | null>(null);

  // Changelog / Activity state
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [changelogLoading, setChangelogLoading] = useState(false);
  const [changelogError, setChangelogError] = useState<string | null>(null);
  const [changelogFetchedAt, setChangelogFetchedAt] = useState<string | null>(null);

  // Vertiport & Corridor state
  const [selectedVertiport, setSelectedVertiport] = useState<Vertiport | null>(null);
  const [selectedCorridor, setSelectedCorridor] = useState<Corridor | null>(null);

  // Derived data for selected city
  const cityVertiports = getVertiportsForCity(selected.id);
  const cityCorridors = getCorridorsForCity(selected.id);

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Fetch filings on tab switch
  useEffect(() => {
    if (tab !== "filings" || filingsFetchedAt) return;
    setFilingsLoading(true);
    setFilingsError(null);
    fetch("/api/filings?days=90")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        setFilings(json.data);
        setFilingsFetchedAt(json.fetchedAt);
      })
      .catch((err) => {
        setFilingsError(err.message ?? "Failed to fetch filings");
      })
      .finally(() => setFilingsLoading(false));
  }, [tab, filingsFetchedAt]);

  // Fetch changelog on tab switch
  useEffect(() => {
    if (tab !== "activity" || changelogFetchedAt) return;
    setChangelogLoading(true);
    setChangelogError(null);
    fetch("/api/changelog?limit=100")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        setChangelog(json.data);
        setChangelogFetchedAt(json.fetchedAt);
      })
      .catch((err) => {
        setChangelogError(err.message ?? "Failed to fetch changelog");
      })
      .finally(() => setChangelogLoading(false));
  }, [tab, changelogFetchedAt]);

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
            AIRINDEX
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

        {/* CENTER — Map / Rankings / Filings / Activity */}
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
            {(
              [
                ["map", "MAP VIEW"],
                ["rank", "RANKINGS"],
                ["filings", "FILINGS"],
                ["activity", "ACTIVITY"],
              ] as [TabKey, string][]
            ).map(([t, label]) => (
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
                {label}
              </button>
            ))}
          </div>

          {/* ACTIVITY tab */}
          {tab === "activity" ? (
            <div
              style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 14,
                }}
              >
                <div>
                  <div
                    style={{
                      color: "#2a2a3a",
                      fontSize: 8,
                      letterSpacing: 2,
                      marginBottom: 4,
                    }}
                  >
                    CHANGELOG
                  </div>
                  <div style={{ color: "#555", fontSize: 10 }}>
                    Recent data ingestion events and regulatory changes
                  </div>
                </div>
                {changelogFetchedAt && (
                  <span style={{ color: "#2a2a3a", fontSize: 8, flexShrink: 0 }}>
                    FETCHED {new Date(changelogFetchedAt).toLocaleTimeString()}
                  </span>
                )}
              </div>

              {changelogLoading && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "40px 0",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      border: "2px solid rgba(0,212,255,0.2)",
                      borderTopColor: "#00d4ff",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  <span style={{ color: "#555", fontSize: 11 }}>
                    Fetching activity...
                  </span>
                </div>
              )}

              {changelogError && (
                <div
                  style={{
                    border: "1px solid rgba(255,68,68,0.3)",
                    background: "rgba(255,68,68,0.05)",
                    borderRadius: 6,
                    padding: "12px 16px",
                    color: "#ff4444",
                    fontSize: 11,
                  }}
                >
                  Failed to load activity: {changelogError}
                </div>
              )}

              {!changelogLoading && !changelogError && changelog.length === 0 && changelogFetchedAt && (
                <div
                  style={{
                    color: "#444",
                    fontSize: 11,
                    textAlign: "center",
                    padding: "40px 0",
                  }}
                >
                  No activity yet. Run data ingestion to populate the changelog.
                </div>
              )}

              {changelog.map((entry, i) => {
                const badgeColor = CHANGE_TYPE_COLORS[entry.changeType] ?? "#555";
                const entityLabel = entry.relatedEntityType.toUpperCase();

                return (
                  <div
                    key={entry.id}
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      borderRadius: 8,
                      padding: "14px 16px",
                      marginBottom: 8,
                      opacity: animate ? 1 : 0,
                      transform: animate ? "translateY(0)" : "translateY(4px)",
                      transition: `opacity 0.25s ease ${i * 0.02}s, transform 0.25s ease ${i * 0.02}s`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          color: badgeColor,
                          fontSize: 7,
                          letterSpacing: 1,
                          border: `1px solid ${badgeColor}44`,
                          borderRadius: 3,
                          padding: "2px 6px",
                          textTransform: "uppercase",
                          fontFamily: "'Space Mono', monospace",
                        }}
                      >
                        {entry.changeType.replace(/_/g, " ")}
                      </span>
                      <span
                        style={{
                          color: "#555",
                          fontSize: 7,
                          letterSpacing: 1,
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 3,
                          padding: "2px 6px",
                          fontFamily: "'Space Mono', monospace",
                        }}
                      >
                        {entityLabel}
                      </span>
                      <span style={{ color: "#333", fontSize: 9, marginLeft: "auto" }}>
                        {formatRelativeTime(entry.timestamp)}
                      </span>
                    </div>
                    <div
                      style={{
                        color: "#ddd",
                        fontSize: 11,
                        lineHeight: 1.5,
                        fontFamily: "'Space Mono', monospace",
                      }}
                    >
                      {entry.summary}
                    </div>
                    {entry.sourceUrl && (
                      <a
                        href={entry.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "#00d4ff",
                          fontSize: 9,
                          marginTop: 6,
                          display: "inline-block",
                        }}
                      >
                        View source →
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          ) : tab === "filings" ? (
            <div
              style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 14,
                }}
              >
                <div>
                  <div
                    style={{
                      color: "#2a2a3a",
                      fontSize: 8,
                      letterSpacing: 2,
                      marginBottom: 4,
                    }}
                  >
                    FEDERAL REGISTER
                  </div>
                  <div style={{ color: "#555", fontSize: 10 }}>
                    UAM / eVTOL / vertiport regulatory filings — last 90 days
                  </div>
                </div>
                {filingsFetchedAt && (
                  <span style={{ color: "#2a2a3a", fontSize: 8, flexShrink: 0 }}>
                    FETCHED {new Date(filingsFetchedAt).toLocaleTimeString()}
                  </span>
                )}
              </div>

              {filingsLoading && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "40px 0",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      border: "2px solid rgba(0,212,255,0.2)",
                      borderTopColor: "#00d4ff",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  <span style={{ color: "#555", fontSize: 11 }}>
                    Fetching filings...
                  </span>
                </div>
              )}

              {filingsError && (
                <div
                  style={{
                    border: "1px solid rgba(255,68,68,0.3)",
                    background: "rgba(255,68,68,0.05)",
                    borderRadius: 6,
                    padding: "12px 16px",
                    color: "#ff4444",
                    fontSize: 11,
                  }}
                >
                  Failed to load filings: {filingsError}
                </div>
              )}

              {!filingsLoading && !filingsError && filings.length === 0 && filingsFetchedAt && (
                <div
                  style={{
                    color: "#444",
                    fontSize: 11,
                    textAlign: "center",
                    padding: "40px 0",
                  }}
                >
                  No filings found in the last 90 days.
                </div>
              )}

              {filings.map((filing, i) => {
                const typeColors: Record<string, string> = {
                  Rule: "#ff4444",
                  "Proposed Rule": "#f59e0b",
                  Notice: "#00d4ff",
                  "Presidential Document": "#7c3aed",
                };
                const badgeColor = typeColors[filing.type] ?? "#555";

                return (
                  <a
                    key={filing.document_number}
                    href={filing.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "block",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      borderRadius: 8,
                      padding: "14px 16px",
                      marginBottom: 8,
                      textDecoration: "none",
                      cursor: "pointer",
                      transition: "border-color 0.15s",
                      opacity: animate ? 1 : 0,
                      transform: animate ? "translateY(0)" : "translateY(4px)",
                      transitionProperty: "opacity, transform, border-color",
                      transitionDuration: "0.25s",
                      transitionDelay: `${i * 0.02}s`,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor = "rgba(0,212,255,0.3)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)")
                    }
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          color: badgeColor,
                          fontSize: 7,
                          letterSpacing: 1,
                          border: `1px solid ${badgeColor}44`,
                          borderRadius: 3,
                          padding: "2px 6px",
                          textTransform: "uppercase",
                          fontFamily: "'Space Mono', monospace",
                        }}
                      >
                        {filing.type}
                      </span>
                      <span style={{ color: "#444", fontSize: 9 }}>
                        {filing.publication_date}
                      </span>
                    </div>
                    <div
                      style={{
                        color: "#ddd",
                        fontSize: 11,
                        fontWeight: 700,
                        lineHeight: 1.4,
                        marginBottom: 6,
                        fontFamily: "'Space Mono', monospace",
                      }}
                    >
                      {filing.title}
                    </div>
                    {filing.abstract && (
                      <div
                        style={{
                          color: "#666",
                          fontSize: 10,
                          lineHeight: 1.6,
                          marginBottom: 8,
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {filing.abstract}
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ color: "#333", fontSize: 8 }}>
                        {filing.document_number}
                      </span>
                      <span style={{ color: "#333", fontSize: 8 }}>
                        federalregister.gov →
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          ) : tab === "map" ? (
            <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
              <MapView
                cities={CITIES}
                selected={selected}
                onCitySelect={setSelected}
                vertiports={cityVertiports}
                selectedVertiport={selectedVertiport}
                onVertiportSelect={setSelectedVertiport}
                corridors={cityCorridors}
                selectedCorridor={selectedCorridor}
                onCorridorSelect={setSelectedCorridor}
              />
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

          {/* Vertiports */}
          {cityVertiports.length > 0 && (
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
                VERTIPORTS
              </div>
              {cityVertiports.map((v) => {
                const statusColor = VERTIPORT_STATUS_COLORS[v.status] ?? "#888";
                const isVpSelected = selectedVertiport?.id === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVertiport(isVpSelected ? null : v)}
                    style={{
                      background: isVpSelected
                        ? "rgba(0,212,255,0.06)"
                        : "rgba(255,255,255,0.02)",
                      border: isVpSelected
                        ? "1px solid rgba(0,212,255,0.3)"
                        : "1px solid rgba(255,255,255,0.05)",
                      borderRadius: 6,
                      padding: "10px 12px",
                      marginBottom: 6,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ color: "#ccc", fontSize: 11, fontWeight: 700 }}>
                        {v.name}
                      </span>
                      <span
                        style={{
                          color: statusColor,
                          fontSize: 7,
                          letterSpacing: 1,
                          border: `1px solid ${statusColor}44`,
                          borderRadius: 3,
                          padding: "2px 6px",
                        }}
                      >
                        {v.status.replace("_", " ").toUpperCase()}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 10, color: "#555", fontSize: 9 }}>
                      <span>{v.siteType.replace("_", " ")}</span>
                      {v.padCount != null && <span>{v.padCount} pads</span>}
                      {v.expectedOpenDate && <span>Opens {v.expectedOpenDate}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Corridors */}
          {cityCorridors.length > 0 && (
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
                CORRIDORS
              </div>
              {cityCorridors.map((c) => {
                const statusColor = CORRIDOR_STATUS_COLORS[c.status] ?? "#888";
                const isCorSelected = selectedCorridor?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCorridor(isCorSelected ? null : c)}
                    style={{
                      background: isCorSelected
                        ? "rgba(0,212,255,0.06)"
                        : "rgba(255,255,255,0.02)",
                      border: isCorSelected
                        ? "1px solid rgba(0,212,255,0.3)"
                        : "1px solid rgba(255,255,255,0.05)",
                      borderRadius: 6,
                      padding: "10px 12px",
                      marginBottom: 6,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ color: "#ccc", fontSize: 11, fontWeight: 700 }}>
                        {c.name}
                      </span>
                      <span
                        style={{
                          color: statusColor,
                          fontSize: 7,
                          letterSpacing: 1,
                          border: `1px solid ${statusColor}44`,
                          borderRadius: 3,
                          padding: "2px 6px",
                        }}
                      >
                        {c.status.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 10, color: "#555", fontSize: 9 }}>
                      <span>{c.distanceKm} km</span>
                      <span>{c.estimatedFlightMinutes} min</span>
                      <span>{c.maxAltitudeFt} ft</span>
                    </div>
                  </div>
                );
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

          {/* Alert Subscriptions */}
          <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <SubscribeForm cityId={selected.id} cityName={selected.city} />
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
