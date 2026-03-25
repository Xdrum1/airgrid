"use client";

import Link from "next/link";
import { ScoreBreakdown } from "@/types";
import { SCORE_WEIGHTS } from "@/lib/scoring";
import ScoreBar from "./ScoreBar";

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
            color: "#888",
            fontFamily: "'Inter', sans-serif",
            fontSize: 9,
          }}
        >
          {label}
        </span>
        <span
          style={{
            color: value > 0 ? color : "#666",
            fontFamily: "'Inter', sans-serif",
            fontSize: 9,
          }}
        >
          {value}/{max}
        </span>
      </div>
      <ScoreBar value={value} max={max} color={value > 0 ? color : "#333"} />
    </div>
  );
}

export default function BreakdownPanel({
  breakdown,
  scoreColor,
  gated = false,
}: {
  breakdown?: ScoreBreakdown;
  scoreColor: string;
  gated?: boolean;
}) {
  const rows = [
    { label: "Active Pilot Program", value: breakdown?.activePilotProgram ?? 0, max: SCORE_WEIGHTS.activePilotProgram },
    { label: "Approved Vertiport", value: breakdown?.approvedVertiport ?? 0, max: SCORE_WEIGHTS.approvedVertiport },
    { label: "Active Operators", value: breakdown?.activeOperatorPresence ?? 0, max: SCORE_WEIGHTS.activeOperatorPresence },
    { label: "Vertiport Zoning", value: breakdown?.vertiportZoning ?? 0, max: SCORE_WEIGHTS.vertiportZoning },
    { label: "Regulatory Posture", value: breakdown?.regulatoryPosture ?? 0, max: SCORE_WEIGHTS.regulatoryPosture },
    { label: "State Legislation", value: breakdown?.stateLegislation ?? 0, max: SCORE_WEIGHTS.stateLegislation },
    { label: "Weather Infrastructure", value: breakdown?.weatherInfrastructure ?? 0, max: SCORE_WEIGHTS.weatherInfrastructure },
  ];

  // Show first 2 rows unblurred, blur the rest
  const visibleRows = gated ? rows.slice(0, 2) : rows;
  const hiddenRows = gated ? rows.slice(2) : [];

  return (
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
          marginBottom: 12,
        }}
      >
        SCORE BREAKDOWN
      </div>

      {visibleRows.map((r) => (
        <BreakdownRow key={r.label} label={r.label} value={r.value} max={r.max} color={scoreColor} />
      ))}

      {gated && hiddenRows.length > 0 && (
        <div style={{ position: "relative" }}>
          {/* Blurred preview of remaining rows */}
          <div
            style={{
              filter: "blur(6px)",
              opacity: 0.5,
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            {hiddenRows.map((r) => (
              <BreakdownRow key={r.label} label={r.label} value={r.value} max={r.max} color={scoreColor} />
            ))}
          </div>

          {/* Upgrade overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                color: "#bbb",
                fontSize: 11,
                lineHeight: 1.6,
                textAlign: "center",
                maxWidth: 220,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              See the full factor breakdown with source evidence.
            </div>
            <Link
              href="/pricing"
              style={{
                display: "inline-block",
                padding: "8px 20px",
                background: "linear-gradient(135deg, #00d4ff, #7c3aed)",
                borderRadius: 5,
                color: "#000",
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "'Inter', sans-serif",
                letterSpacing: "0.06em",
                textDecoration: "none",
              }}
            >
              UPGRADE TO PRO
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
