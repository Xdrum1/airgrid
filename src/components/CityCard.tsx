"use client";

import Link from "next/link";
import { City } from "@/types";
import { getScoreColor, getPostureConfig } from "@/lib/scoring";
import ScoreBar from "./ScoreBar";

export default function CityCard({
  city,
  isSelected,
  onClick,
  rank,
  starNode,
}: {
  city: City;
  isSelected: boolean;
  onClick: () => void;
  rank: number;
  starNode?: React.ReactNode;
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
          <span style={{ color: "#777", fontSize: 10 }}>#{rank}</span>
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
                color: "#777",
                fontFamily: "'Space Mono', monospace",
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
        onMouseEnter={(e) => (e.currentTarget.style.color = "#00d4ff")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#888")}
      >
        VIEW DETAILS →
      </Link>
    </div>
  );
}
