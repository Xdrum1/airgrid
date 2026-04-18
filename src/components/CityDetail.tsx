"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { City, Operator, Vertiport, Corridor } from "@/types";
import { getScoreColor, getScoreTier, getPostureConfig, SCORE_WEIGHTS } from "@/lib/scoring";
import {
  VERTIPORT_STATUS_COLORS,
  CORRIDOR_STATUS_COLORS,
  SCORE_COMPONENT_COLORS,
  SCORE_COMPONENT_LABELS,
} from "@/lib/dashboard-constants";
import { useWatchlist } from "@/hooks/useWatchlist";
import WatchlistStar from "./WatchlistStar";
import TrackPageView from "./TrackPageView";
import SubscribeForm from "./SubscribeForm";
import ScoreTrend from "./ScoreTrend";
import PulseSubscribe from "./PulseSubscribe";
import FactorSparklines from "./FactorSparklines";
import { safeHref } from "@/lib/safe-url";
import { hasProAccess } from "@/lib/billing-shared";
import type { ScoreHistoryFull } from "@/lib/score-history";

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ color: "#999", fontSize: 8, letterSpacing: 1, marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ color: "#999", fontSize: 11 }}>{value}</div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div
      style={{
        color: "#999",
        fontSize: 11,
        textAlign: "center",
        padding: "32px 0",
        border: "1px solid rgba(255,255,255,0.04)",
        borderRadius: 8,
      }}
    >
      No {label} data available for this market.
    </div>
  );
}

function ScoreBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ background: "#0a0a0f", borderRadius: 3, height: 6, overflow: "hidden" }}>
      <div
        style={{
          width: mounted ? `${(value / max) * 100}%` : "0%",
          height: "100%",
          background: color,
          transition: "width 0.8s ease",
          borderRadius: 3,
        }}
      />
    </div>
  );
}

// -------------------------------------------------------
// Props
// -------------------------------------------------------

interface CityDetailProps {
  city: City;
  rank: number;
  totalCities: number;
  operators: Operator[];
  vertiports: Vertiport[];
  corridors: Corridor[];
  scoreHistory?: ScoreHistoryFull[];
  userTier?: string;
}

// -------------------------------------------------------
// Component
// -------------------------------------------------------

export default function CityDetail({
  city,
  rank,
  totalCities,
  operators,
  vertiports,
  corridors,
  scoreHistory,
  userTier = "free",
}: CityDetailProps) {
  const [mounted, setMounted] = useState(false);
  const { isWatched, toggle: toggleWatch, isAuthenticated } = useWatchlist();
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const scoreColor = getScoreColor(city.score ?? 0);
  const tier = getScoreTier(city.score ?? 0);
  const posture = getPostureConfig(city.regulatoryPosture);

  return (
    <div
      style={{
        height: "100vh",
        overflowY: "auto",
        background: "#050508",
        fontFamily: "'Inter', sans-serif",
        color: "#fff",
      }}
    >
      <TrackPageView page={city.id} entityType="city" />

      {/* ---- a) Sticky Header/Nav ---- */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "#050508",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "0 32px",
        }}
      >
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            height: 54,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href="/dashboard"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <img
              src="/images/logo/airindex-wordmark.svg"
              alt="AirIndex"
              style={{ height: 26 }}
            />
          </Link>
          <Link
            href="/dashboard"
            style={{
              color: "#888",
              fontSize: 10,
              letterSpacing: 1,
              textDecoration: "none",
              transition: "color 0.15s",
            }}
          >
            ← BACK TO DASHBOARD
          </Link>
        </div>
      </div>

      {/* ---- Content container ---- */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 32px" }}>

        {/* ---- b) Hero Section ---- */}
        <div
          style={{
            paddingTop: 48,
            paddingBottom: 40,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <h1
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700,
                    fontSize: 42,
                    margin: 0,
                    lineHeight: 1.1,
                  }}
                >
                  {city.city}
                </h1>
                <WatchlistStar
                  cityId={city.id}
                  isWatched={isWatched(city.id)}
                  onToggle={toggleWatch}
                  isAuthenticated={isAuthenticated}
                  size="md"
                />
              </div>
              <div style={{ color: "#888", fontSize: 13, marginTop: 6 }}>
                {city.state}, {city.country}
              </div>
            </div>
            <div
              style={{
                color: "#999",
                fontSize: 10,
                letterSpacing: 1,
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 4,
                padding: "6px 12px",
                flexShrink: 0,
                marginTop: 8,
              }}
            >
              #{rank} OF {totalCities}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 20, marginBottom: 20 }}>
            <span
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: 64,
                color: scoreColor,
                lineHeight: 1,
              }}
            >
              {city.score}
            </span>
            <span style={{ color: "#aaa", fontSize: 12, letterSpacing: 2 }}>
              {tier}
            </span>
          </div>

          <ScoreBar value={city.score ?? 0} color={scoreColor} />

          {scoreHistory && scoreHistory.length >= 2 && (
            <ScoreTrend history={scoreHistory} color={scoreColor} />
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <span
              style={{
                color: posture.color,
                fontSize: 9,
                border: `1px solid ${posture.color}44`,
                borderRadius: 4,
                padding: "4px 10px",
                letterSpacing: 1,
              }}
            >
              {posture.label}
            </span>
            {city.stateLegislationStatus !== "none" && (
              <span
                style={{
                  color: city.stateLegislationStatus === "enacted" ? "#00ff88" : "#f59e0b",
                  fontSize: 9,
                  border: `1px solid ${city.stateLegislationStatus === "enacted" ? "rgba(0,255,136,0.25)" : "rgba(245,158,11,0.25)"}`,
                  borderRadius: 4,
                  padding: "4px 10px",
                  letterSpacing: 1,
                }}
              >
                {city.stateLegislationStatus === "enacted" ? "STATE LAW" : "BILLS MOVING"}
              </span>
            )}
            {city.weatherInfraLevel !== "none" && (
              <span
                style={{
                  color: city.weatherInfraLevel === "full" ? "#00ff88" : "#f59e0b",
                  fontSize: 9,
                  border: `1px solid ${city.weatherInfraLevel === "full" ? "rgba(0,255,136,0.25)" : "rgba(245,158,11,0.25)"}`,
                  borderRadius: 4,
                  padding: "4px 10px",
                  letterSpacing: 1,
                }}
              >
                {city.weatherInfraLevel === "full" ? "WEATHER" : "WX PARTIAL"}
              </span>
            )}
            {city.hasActivePilotProgram && (
              <span
                style={{
                  color: "#7c3aed",
                  fontSize: 9,
                  border: "1px solid rgba(124,58,237,0.25)",
                  borderRadius: 4,
                  padding: "4px 10px",
                  letterSpacing: 1,
                }}
              >
                PILOT PROGRAM
              </span>
            )}
            {city.vertiportCount > 0 && (
              <span
                style={{
                  color: "#f59e0b",
                  fontSize: 9,
                  border: "1px solid rgba(245,158,11,0.25)",
                  borderRadius: 4,
                  padding: "4px 10px",
                  letterSpacing: 1,
                }}
              >
                {city.vertiportCount} VERTIPORT{city.vertiportCount > 1 ? "S" : ""}
              </span>
            )}
          </div>
        </div>

        {/* ---- c) Score Breakdown ---- */}
        <div style={{ paddingTop: 36, paddingBottom: 36, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ color: "#999", fontSize: 9, letterSpacing: 2, marginBottom: 20 }}>
            SCORE BREAKDOWN
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            {Object.entries(SCORE_WEIGHTS).map(([key, max], i) => {
              const value = city.breakdown?.[key as keyof typeof city.breakdown] ?? 0;
              const color = SCORE_COMPONENT_COLORS[key] ?? "#555";
              const label = SCORE_COMPONENT_LABELS[key] ?? key;
              const source = city.scoreSources?.[key as keyof typeof city.scoreSources];
              return (
                <div
                  key={key}
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: 8,
                    padding: "16px 18px",
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? "translateY(0)" : "translateY(8px)",
                    transition: `opacity 0.4s ease ${i * 0.06}s, transform 0.4s ease ${i * 0.06}s`,
                  }}
                >
                  <div style={{ color: "#888", fontSize: 9, letterSpacing: 1, marginBottom: 10 }}>
                    {label.toUpperCase()}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: 700,
                      fontSize: 22,
                      color: value > 0 ? color : "#666",
                      marginBottom: 10,
                    }}
                  >
                    {value}/{max}
                  </div>
                  <div style={{ background: "#0a0a0f", borderRadius: 2, height: 4, overflow: "hidden", marginBottom: source ? 10 : 0 }}>
                    <div
                      style={{
                        width: mounted ? `${(value / max) * 100}%` : "0%",
                        height: "100%",
                        background: value > 0 ? color : "#333",
                        transition: `width 0.8s ease ${0.2 + i * 0.06}s`,
                        borderRadius: 2,
                      }}
                    />
                  </div>
                  {source && (
                    <div style={{ marginTop: 2 }}>
                      <div style={{ color: "#aaa", fontSize: 9, lineHeight: 1.5 }}>
                        {safeHref(source.url) ? (
                          <a
                            href={safeHref(source.url)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#aaa", textDecoration: "none", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
                          >
                            {source.citation}
                          </a>
                        ) : (
                          source.citation
                        )}
                      </div>
                      <div style={{ color: "#999", fontSize: 8, letterSpacing: 1, marginTop: 3 }}>
                        VERIFIED {source.date}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ---- c2) Factor Trends ---- */}
        {scoreHistory && scoreHistory.filter((h) => h.breakdown).length >= 2 && (
          hasProAccess(userTier) ? (
            <div style={{ paddingTop: 36, paddingBottom: 36, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ color: "#999", fontSize: 9, letterSpacing: 2, marginBottom: 20 }}>
                FACTOR TRENDS
              </div>
              <FactorSparklines history={scoreHistory} />
            </div>
          ) : (
            <div style={{ paddingTop: 36, paddingBottom: 36, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ color: "#999", fontSize: 9, letterSpacing: 2, marginBottom: 20 }}>
                FACTOR TRENDS
              </div>
              <div
                style={{
                  textAlign: "center",
                  padding: "32px 20px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8,
                }}
              >
                <div style={{ color: "#888", fontSize: 12, marginBottom: 12 }}>
                  Factor trend analysis is available on Professional.
                </div>
                <Link
                  href="/contact?tier=pro&ref=trends"
                  style={{
                    color: "#00ff88",
                    fontSize: 10,
                    letterSpacing: 1,
                    textDecoration: "none",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  TALK TO US →
                </Link>
              </div>
            </div>
          )
        )}

        {/* ---- c3) Score History ---- */}
        {scoreHistory && scoreHistory.filter((h) => h.triggeringEventId).length > 0 && (
          hasProAccess(userTier) ? (
          <div style={{ paddingTop: 36, paddingBottom: 36, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ color: "#999", fontSize: 9, letterSpacing: 2, marginBottom: 20 }}>
              SCORE HISTORY
            </div>
            <div style={{ position: "relative", paddingLeft: 20 }}>
              {/* Vertical timeline line */}
              <div
                style={{
                  position: "absolute",
                  left: 4,
                  top: 4,
                  bottom: 4,
                  width: 1,
                  background: "rgba(255,255,255,0.06)",
                }}
              />
              {scoreHistory
                .filter((h) => h.triggeringEventId)
                .reverse()
                .map((entry, i, arr) => {
                  // Find previous snapshot to compute delta
                  const allIdx = scoreHistory.findIndex(
                    (h) => h.capturedAt === entry.capturedAt && h.triggeringEventId === entry.triggeringEventId
                  );
                  const prev = allIdx > 0 ? scoreHistory[allIdx - 1] : null;
                  const prevScore = prev?.score ?? entry.score;
                  const prevTier = prev?.tier ?? entry.tier;
                  const tierChanged = prevTier && entry.tier && prevTier !== entry.tier;
                  const deltaScore = entry.score - prevScore;
                  const deltaColor = deltaScore > 0 ? "#00ff88" : deltaScore < 0 ? "#ff4444" : "#555";

                  // Factor diff
                  const changedFactors: string[] = [];
                  if (prev?.breakdown && entry.breakdown) {
                    for (const key of Object.keys(entry.breakdown)) {
                      const oldVal = prev.breakdown[key] ?? 0;
                      const newVal = entry.breakdown[key] ?? 0;
                      if (oldVal !== newVal) {
                        const label = SCORE_COMPONENT_LABELS[key] ?? key;
                        changedFactors.push(`${label}: ${oldVal} → ${newVal}`);
                      }
                    }
                  }

                  const date = new Date(entry.capturedAt);
                  const dateStr = date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });

                  return (
                    <div
                      key={`${entry.capturedAt}-${i}`}
                      style={{
                        position: "relative",
                        marginBottom: i < arr.length - 1 ? 24 : 0,
                        opacity: mounted ? 1 : 0,
                        transform: mounted ? "translateY(0)" : "translateY(6px)",
                        transition: `opacity 0.3s ease ${i * 0.06}s, transform 0.3s ease ${i * 0.06}s`,
                      }}
                    >
                      {/* Timeline dot */}
                      <div
                        style={{
                          position: "absolute",
                          left: -17,
                          top: 5,
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: deltaColor,
                          boxShadow: `0 0 6px ${deltaColor}66`,
                        }}
                      />

                      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                        <span style={{ color: "#888", fontSize: 10 }}>{dateStr}</span>
                        {deltaScore !== 0 && (
                          <span
                            style={{
                              fontFamily: "'Space Grotesk', sans-serif",
                              fontWeight: 700,
                              fontSize: 13,
                              color: deltaColor,
                            }}
                          >
                            {prevScore} → {entry.score}
                          </span>
                        )}
                      </div>

                      {tierChanged && (
                        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                          <span
                            style={{
                              fontSize: 8,
                              letterSpacing: 1,
                              color: getScoreColor(prevScore),
                              border: `1px solid ${getScoreColor(prevScore)}44`,
                              borderRadius: 3,
                              padding: "2px 6px",
                            }}
                          >
                            {prevTier}
                          </span>
                          <span style={{ color: "#999", fontSize: 10 }}>→</span>
                          <span
                            style={{
                              fontSize: 8,
                              letterSpacing: 1,
                              color: getScoreColor(entry.score),
                              border: `1px solid ${getScoreColor(entry.score)}44`,
                              borderRadius: 3,
                              padding: "2px 6px",
                            }}
                          >
                            {entry.tier}
                          </span>
                        </div>
                      )}

                      {entry.triggeringEvent && (
                        <div style={{ color: "#aaa", fontSize: 11, lineHeight: 1.5, marginBottom: 4 }}>
                          {entry.triggeringEvent.summary}
                        </div>
                      )}

                      {entry.triggeringEvent?.sourceUrl && safeHref(entry.triggeringEvent.sourceUrl) && (
                        <a
                          href={safeHref(entry.triggeringEvent.sourceUrl)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#5B8DB8", fontSize: 9, letterSpacing: 0.5 }}
                        >
                          View source →
                        </a>
                      )}

                      {changedFactors.length > 0 && (
                        <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {changedFactors.map((f) => (
                            <span
                              key={f}
                              style={{
                                color: "#888",
                                fontSize: 8,
                                letterSpacing: 0.5,
                                border: "1px solid rgba(255,255,255,0.06)",
                                borderRadius: 3,
                                padding: "2px 6px",
                              }}
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
          ) : (
            <div style={{ paddingTop: 36, paddingBottom: 36, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ color: "#999", fontSize: 9, letterSpacing: 2, marginBottom: 20 }}>
                SCORE HISTORY
              </div>
              <div
                style={{
                  textAlign: "center",
                  padding: "32px 20px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8,
                }}
              >
                <div style={{ color: "#888", fontSize: 12, marginBottom: 12 }}>
                  Score history timeline is available on Professional.
                </div>
                <Link
                  href="/contact?tier=pro&ref=history"
                  style={{
                    color: "#00ff88",
                    fontSize: 10,
                    letterSpacing: 1,
                    textDecoration: "none",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  TALK TO US →
                </Link>
              </div>
            </div>
          )
        )}

        {/* ---- d) Operator Presence ---- */}
        <div style={{ paddingTop: 36, paddingBottom: 36, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ color: "#999", fontSize: 9, letterSpacing: 2, marginBottom: 20 }}>
            OPERATOR PRESENCE
          </div>
          {operators.length === 0 ? (
            <EmptyState label="operator" />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 12,
              }}
            >
              {operators.map((op, i) => (
                <div
                  key={op.id}
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: 8,
                    padding: "18px 20px",
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? "translateY(0)" : "translateY(8px)",
                    transition: `opacity 0.4s ease ${i * 0.08}s, transform 0.4s ease ${i * 0.08}s`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: op.color,
                        boxShadow: `0 0 6px ${op.color}`,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontWeight: 600,
                        fontSize: 16,
                        color: "#eee",
                      }}
                    >
                      {op.name}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                    <DetailItem label="TYPE" value={op.type.replace(/_/g, " ")} />
                    <DetailItem label="HQ" value={op.hq} />
                    <DetailItem label="FAA CERT" value={op.faaCertStatus.replace(/_/g, " ")} />
                    <DetailItem label="FUNDING" value={op.funding} />
                  </div>

                  {op.aircraft.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ color: "#999", fontSize: 8, letterSpacing: 1, marginBottom: 5 }}>
                        AIRCRAFT
                      </div>
                      <div style={{ color: "#888", fontSize: 11 }}>
                        {op.aircraft.join(", ")}
                      </div>
                    </div>
                  )}

                  {op.keyPartnerships.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                      {op.keyPartnerships.map((p) => (
                        <span
                          key={p}
                          style={{
                            color: "#999",
                            fontSize: 8,
                            letterSpacing: 1,
                            border: "1px solid rgba(255,255,255,0.06)",
                            borderRadius: 3,
                            padding: "3px 8px",
                          }}
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  )}

                  {op.website && (
                    <a
                      href={op.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "#5B8DB8",
                        fontSize: 10,
                        letterSpacing: 1,
                        textDecoration: "none",
                      }}
                    >
                      WEBSITE →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ---- e) Vertiport Infrastructure ---- */}
        <div style={{ paddingTop: 36, paddingBottom: 36, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ color: "#999", fontSize: 9, letterSpacing: 2, marginBottom: 20 }}>
            VERTIPORT INFRASTRUCTURE
          </div>
          {vertiports.length === 0 ? (
            <EmptyState label="vertiport" />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 12,
              }}
            >
              {vertiports.map((v, i) => {
                const statusColor = VERTIPORT_STATUS_COLORS[v.status] ?? "#888";
                return (
                  <div
                    key={v.id}
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      borderRadius: 8,
                      padding: "18px 20px",
                      opacity: mounted ? 1 : 0,
                      transform: mounted ? "translateY(0)" : "translateY(8px)",
                      transition: `opacity 0.4s ease ${i * 0.08}s, transform 0.4s ease ${i * 0.08}s`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <span style={{ color: "#eee", fontSize: 14, fontWeight: 700 }}>{v.name}</span>
                      <span
                        style={{
                          color: statusColor,
                          fontSize: 8,
                          letterSpacing: 1,
                          border: `1px solid ${statusColor}44`,
                          borderRadius: 3,
                          padding: "3px 8px",
                        }}
                      >
                        {v.status.replace(/_/g, " ").toUpperCase()}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                      <DetailItem label="SITE TYPE" value={v.siteType.replace(/_/g, " ")} />
                      <DetailItem label="PAD COUNT" value={v.padCount != null ? String(v.padCount) : "—"} />
                      <DetailItem label="CHARGING" value={v.chargingCapable ? "Yes" : "No"} />
                      {v.permitFilingDate && <DetailItem label="PERMIT FILED" value={v.permitFilingDate} />}
                      {v.expectedOpenDate && <DetailItem label="EXPECTED OPEN" value={v.expectedOpenDate} />}
                    </div>

                    <div style={{ color: "#999", fontSize: 9 }}>
                      {v.lat.toFixed(4)}, {v.lng.toFixed(4)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ---- f) Air Corridors ---- */}
        <div style={{ paddingTop: 36, paddingBottom: 36, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ color: "#999", fontSize: 9, letterSpacing: 2, marginBottom: 20 }}>
            AIR CORRIDORS
          </div>
          {corridors.length === 0 ? (
            <EmptyState label="corridor" />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 12,
              }}
            >
              {corridors.map((c, i) => {
                const statusColor = CORRIDOR_STATUS_COLORS[c.status] ?? "#888";
                return (
                  <Link
                    key={c.id}
                    href={`/corridor/${c.id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        borderRadius: 8,
                        padding: "18px 20px",
                        opacity: mounted ? 1 : 0,
                        transform: mounted ? "translateY(0)" : "translateY(8px)",
                        transition: `opacity 0.4s ease ${i * 0.08}s, transform 0.4s ease ${i * 0.08}s, border-color 0.15s`,
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(91,141,184,0.3)")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)")}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                        <span style={{ color: "#eee", fontSize: 14, fontWeight: 700 }}>{c.name}</span>
                        <span
                          style={{
                            color: statusColor,
                            fontSize: 8,
                            letterSpacing: 1,
                            border: `1px solid ${statusColor}44`,
                            borderRadius: 3,
                            padding: "3px 8px",
                          }}
                        >
                          {c.status.toUpperCase()}
                        </span>
                      </div>

                      <div style={{ color: "#888", fontSize: 12, marginBottom: 14 }}>
                        {c.startPoint.label} → {c.endPoint.label}
                      </div>

                      <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
                        <DetailItem label="DISTANCE" value={`${c.distanceKm} km`} />
                        <DetailItem label="FLIGHT TIME" value={`${c.estimatedFlightMinutes} min`} />
                        <DetailItem label="MAX ALT" value={`${c.maxAltitudeFt} ft`} />
                      </div>

                      {c.notes && (
                        <div style={{ color: "#888", fontSize: 10, lineHeight: 1.6 }}>
                          {c.notes}
                        </div>
                      )}

                      <div style={{ color: "#5B8DB8", fontSize: 8, letterSpacing: 1, marginTop: 10, textAlign: "right" }}>
                        DETAILS →
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ---- g) Key Milestones ---- */}
        {city.keyMilestones?.length > 0 && (
          <div style={{ paddingTop: 36, paddingBottom: 36, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ color: "#999", fontSize: 9, letterSpacing: 2, marginBottom: 20 }}>
              KEY MILESTONES
            </div>
            {city.keyMilestones.map((m, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  lineHeight: 1.8,
                }}
              >
                <span style={{ color: scoreColor, fontSize: 10, marginTop: 3, flexShrink: 0 }}>
                  ▶
                </span>
                <span style={{ color: "#888", fontSize: 12, lineHeight: 1.8 }}>
                  {m}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ---- h) Market Intelligence ---- */}
        <div style={{ paddingTop: 36, paddingBottom: 36, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ color: "#999", fontSize: 9, letterSpacing: 2, marginBottom: 16 }}>
            MARKET INTELLIGENCE
          </div>
          <p
            style={{
              color: "#aaa",
              fontSize: 13,
              lineHeight: 1.8,
              margin: 0,
              maxWidth: 720,
            }}
          >
            {city.notes}
          </p>
        </div>

        {/* ---- i) Subscribe ---- */}
        <div style={{ paddingTop: 36, paddingBottom: 36, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <SubscribeForm cityId={city.id} cityName={city.city} userTier={userTier} />
        </div>

        {/* ---- j) Footer ---- */}
        <div
          style={{
            paddingTop: 24,
            paddingBottom: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ color: "#999", fontSize: 9, letterSpacing: 1 }}>
            LAST UPDATED {city.lastUpdated}
          </span>
          <Link
            href="/dashboard"
            style={{
              color: "#888",
              fontSize: 10,
              letterSpacing: 1,
              textDecoration: "none",
            }}
          >
            ← BACK TO DASHBOARD
          </Link>
        </div>

        {/* Subscribe CTA */}
        <div style={{ marginTop: 32, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
          <PulseSubscribe source={`city-${city.id}`} compact />
        </div>
      </div>
    </div>
  );
}
