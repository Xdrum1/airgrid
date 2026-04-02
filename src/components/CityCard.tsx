"use client";

import Link from "next/link";
import { City } from "@/types";
import { getScoreColor, getPostureConfig } from "@/lib/scoring";
import { WATCH_STATUS_COLORS, WATCH_STATUS_LABELS } from "@/lib/dashboard-constants";
import ScoreBar from "./ScoreBar";

export default function CityCard({
  city,
  isSelected,
  onClick,
  rank,
  starNode,
  watchStatus,
  scoreDelta,
}: {
  city: City;
  isSelected: boolean;
  onClick: () => void;
  rank: number;
  starNode?: React.ReactNode;
  watchStatus?: string;
  scoreDelta?: number;
}) {
  const color = getScoreColor(city.score ?? 0);
  const posture = getPostureConfig(city.regulatoryPosture);

  return (
    <div
      onClick={onClick}
      style={{
        background: isSelected
          ? "rgba(91,141,184,0.06)"
          : "rgba(255,255,255,0.02)",
        border: isSelected
          ? "1px solid rgba(91,141,184,0.4)"
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
          <span style={{ color: "#777", fontSize: 10 }}>#{rank}</span>
          <div>
            <span
              style={{
                color: "#fff",
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {city.city}
            </span>
            <span
              style={{
                color: "#777",
                fontFamily: "'Inter', sans-serif",
                fontSize: 10,
                marginLeft: 6,
              }}
            >
              {city.state}
            </span>
          </div>
          {starNode}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {watchStatus && watchStatus !== "STABLE" && (
            <span
              style={{
                color: WATCH_STATUS_COLORS[watchStatus] ?? "#888",
                fontSize: 7,
                letterSpacing: 0.5,
                background: `${WATCH_STATUS_COLORS[watchStatus] ?? "#888"}15`,
                border: `1px solid ${WATCH_STATUS_COLORS[watchStatus] ?? "#888"}30`,
                borderRadius: 3,
                padding: "2px 5px",
                fontWeight: 700,
              }}
            >
              {WATCH_STATUS_LABELS[watchStatus] ?? watchStatus}
            </span>
          )}
          <span
            style={{
              color: posture.color,
              fontSize: 8,
              opacity: 0.6,
            }}
          >
            {posture.label}
          </span>
          {scoreDelta && scoreDelta !== 0 && (
            <span
              style={{
                color: scoreDelta > 0 ? "#00ff88" : "#ff4444",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 0.3,
              }}
            >
              {scoreDelta > 0 ? "+" : ""}{scoreDelta}
            </span>
          )}
          <span
            style={{
              color,
              fontFamily: "'Inter', sans-serif",
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            {city.score}
          </span>
        </div>
      </div>
      <ScoreBar value={city.score ?? 0} color={color} />
      <Link
        href={`/city/${city.id}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "block",
          color: "#888",
          fontSize: 8,
          letterSpacing: 1,
          textDecoration: "none",
          marginTop: 8,
          textAlign: "right",
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#5B8DB8")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#888")}
      >
        VIEW DETAILS →
      </Link>
    </div>
  );
}
