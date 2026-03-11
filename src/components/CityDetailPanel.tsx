"use client";

import Link from "next/link";
import { City, Vertiport, Corridor } from "@/types";
import { getScoreColor, getScoreTier, getPostureConfig } from "@/lib/scoring";
import { VERTIPORT_STATUS_COLORS, CORRIDOR_STATUS_COLORS, WATCH_STATUS_COLORS, WATCH_STATUS_LABELS, OUTLOOK_COLORS, OUTLOOK_LABELS } from "@/lib/dashboard-constants";
import { hasProAccess } from "@/lib/billing-shared";
import { OPERATORS_MAP } from "@/data/seed";
import ScoreBar from "./ScoreBar";
import BreakdownPanel from "./BreakdownPanel";

import WatchlistStar from "./WatchlistStar";
import { trackEvent } from "@/lib/track";
import { plausible } from "@/lib/plausible";

export default function CityDetailPanel({
  selected,
  vertiports,
  corridors,
  selectedVertiport,
  selectedCorridor,
  onVertiportSelect,
  onCorridorSelect,
  isMobile,
  onClose,
  isWatched,
  onToggleWatch,
  isAuthenticated,
  userTier = "free",
  watchStatus,
  outlook,
  analystNote,
}: {
  selected: City;
  vertiports: Vertiport[];
  corridors: Corridor[];
  selectedVertiport: Vertiport | null;
  selectedCorridor: Corridor | null;
  onVertiportSelect: (v: Vertiport | null) => void;
  onCorridorSelect: (c: Corridor | null) => void;
  isMobile: boolean;
  onClose: () => void;
  isWatched: boolean;
  onToggleWatch: (cityId: string) => void;
  isAuthenticated: boolean;
  userTier?: string;
  watchStatus?: string;
  outlook?: string;
  analystNote?: string | null;
}) {
  const scoreColor = getScoreColor(selected.score ?? 0);
  const posture = getPostureConfig(selected.regulatoryPosture);

  return (
    <div
      style={isMobile ? {
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        height: "75vh",
        background: "#050508",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "16px 16px 0 0",
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
        animation: "slideUp 0.3s ease",
      } : {
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        zIndex: 10,
        width: 296,
        borderLeft: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(5,5,8,0.88)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
      }}
    >
      {/* Mobile drag handle + close */}
      {isMobile && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px 16px 6px",
            flexShrink: 0,
            position: "relative",
          }}
        >
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: "rgba(255,255,255,0.15)",
            }}
          />
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              right: 16,
              top: 8,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6,
              color: "#888",
              fontSize: 12,
              padding: "8px 16px",
              cursor: "pointer",
              fontFamily: "'Space Mono', monospace",
            }}
          >
            CLOSE
          </button>
        </div>
      )}

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
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Link
                href={`/city/${selected.id}`}
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 800,
                  fontSize: 19,
                  lineHeight: 1.1,
                  color: "inherit",
                  textDecoration: "none",
                  display: "block",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#00d4ff")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "inherit")}
              >
                {selected.city}
              </Link>
              <WatchlistStar
                cityId={selected.id}
                isWatched={isWatched}
                onToggle={onToggleWatch}
                isAuthenticated={isAuthenticated}
                size="md"
              />
            </div>
            <div style={{ color: "#777", fontSize: 10, marginTop: 3 }}>
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
            <div style={{ color: "#999", fontSize: 8, letterSpacing: 1 }}>
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

        {/* Watch Status + Outlook */}
        {watchStatus && watchStatus !== "STABLE" && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                color: WATCH_STATUS_COLORS[watchStatus] ?? "#888",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 1,
                background: `${WATCH_STATUS_COLORS[watchStatus] ?? "#888"}12`,
                border: `1px solid ${WATCH_STATUS_COLORS[watchStatus] ?? "#888"}30`,
                borderRadius: 4,
                padding: "4px 8px",
              }}>
                {WATCH_STATUS_LABELS[watchStatus] ?? watchStatus}
              </span>
              {outlook && outlook !== "STABLE" && (
                <span style={{
                  color: OUTLOOK_COLORS[outlook] ?? "#888",
                  fontSize: 8,
                  letterSpacing: 1,
                  background: `${OUTLOOK_COLORS[outlook] ?? "#888"}12`,
                  border: `1px solid ${OUTLOOK_COLORS[outlook] ?? "#888"}30`,
                  borderRadius: 4,
                  padding: "3px 7px",
                }}>
                  {OUTLOOK_LABELS[outlook] ?? outlook}
                </span>
              )}
            </div>
            {hasProAccess(userTier) && analystNote ? (
              <div style={{
                color: "#999",
                fontSize: 10,
                lineHeight: 1.6,
                background: "rgba(255,255,255,0.02)",
                borderRadius: 6,
                padding: "10px 12px",
                borderLeft: `2px solid ${WATCH_STATUS_COLORS[watchStatus] ?? "#888"}60`,
              }}>
                {analystNote}
              </div>
            ) : analystNote ? (
              <div style={{
                color: "#777",
                fontSize: 9,
                fontStyle: "italic",
              }}>
                Analyst note available with Pro
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Score Breakdown */}
      <BreakdownPanel breakdown={selected.breakdown} scoreColor={scoreColor} />

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
              color: "#777",
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
                onClick={() => { trackEvent("operator_click", "operator", opId); plausible("Operator Click", { operator: opId }); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 7,
                  cursor: "pointer",
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
                  <div style={{ color: "#777", fontSize: 9 }}>
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
      {vertiports.length > 0 && (
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
            VERTIPORTS
          </div>
          {vertiports.map((v) => {
            const statusColor = VERTIPORT_STATUS_COLORS[v.status] ?? "#888";
            const isVpSelected = selectedVertiport?.id === v.id;
            return (
              <div
                key={v.id}
                onClick={() => onVertiportSelect(isVpSelected ? null : v)}
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
                <div style={{ display: "flex", gap: 10, color: "#888", fontSize: 9 }}>
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
      {corridors.length > 0 && (
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
            CORRIDORS
          </div>
          {corridors.map((c) => {
            const statusColor = CORRIDOR_STATUS_COLORS[c.status] ?? "#888";
            const isCorSelected = selectedCorridor?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => {
                  onCorridorSelect(isCorSelected ? null : c);
                  if (!isCorSelected) { trackEvent("corridor_click", "corridor", c.id); plausible("Corridor Click", { corridor: c.id }); }
                }}
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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: 10, color: "#888", fontSize: 9 }}>
                    <span>{c.distanceKm} km</span>
                    <span>{c.estimatedFlightMinutes} min</span>
                    <span>{c.maxAltitudeFt} ft</span>
                  </div>
                  <Link
                    href={`/corridor/${c.id}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{ color: "#00d4ff", fontSize: 7, letterSpacing: 1, textDecoration: "none" }}
                  >
                    DETAILS →
                  </Link>
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
              color: "#777",
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
                style={{ color: "#aaa", fontSize: 10, lineHeight: 1.6 }}
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
            color: "#777",
            fontSize: 8,
            letterSpacing: 2,
            marginBottom: 8,
          }}
        >
          MARKET INTEL
        </div>
        <p
          style={{
            color: "#999",
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
        <span style={{ color: "#777", fontSize: 8 }}>
          LAST UPDATED {selected.lastUpdated}
        </span>
      </div>
    </div>
  );
}
