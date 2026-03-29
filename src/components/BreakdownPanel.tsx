"use client";

import Link from "next/link";
import { ScoreBreakdown, City } from "@/types";
import { SCORE_WEIGHTS } from "@/lib/scoring";
import ScoreBar from "./ScoreBar";

// Plain-language gap statements per factor
const GAP_STATEMENTS: Record<string, { zero: string; partial?: string }> = {
  activePilotProgram: {
    zero: "No active pilot program on record — this factor scores 0 until an FAA-approved pilot program is launched or hosted in this market.",
  },
  approvedVertiport: {
    zero: "No approved vertiport on record — this factor scores 0 until a vertiport site receives municipal permits or begins construction.",
  },
  activeOperatorPresence: {
    zero: "No active operator presence — this factor scores 0 until an eVTOL operator makes a market-specific commitment beyond general interest.",
  },
  vertiportZoning: {
    zero: "No vertiport zoning in place — this factor scores 0 until the city adopts zoning provisions that accommodate vertiport development.",
  },
  regulatoryPosture: {
    zero: "Restrictive regulatory posture — the city has enacted barriers or shown active opposition to UAM operations.",
    partial: "Neutral regulatory posture — no active opposition but no UAM-specific support. Moving to friendly would add 5 points.",
  },
  stateLegislation: {
    zero: "No UAM-enabling state legislation — this is the highest-weighted factor (20 pts). Enacted legislation is a prerequisite for infrastructure capital.",
    partial: "State legislation is actively moving but not yet enacted. Full enactment would add 10 points.",
  },
  weatherInfrastructure: {
    zero: "No low-altitude weather sensing infrastructure for UAM operations in this market.",
    partial: "Standard airport weather coverage only — no dedicated low-altitude sensing for eVTOL operations.",
  },
};

type SourceCitation = { citation: string; date: string; url?: string };

function BreakdownRow({
  label,
  value,
  max,
  color,
  factorKey,
  showGaps,
  source,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  factorKey?: string;
  showGaps?: boolean;
  source?: SourceCitation;
}) {
  const isGap = value < max;
  const isPartial = value > 0 && value < max;
  const gapInfo = factorKey ? GAP_STATEMENTS[factorKey] : undefined;
  const gapText = gapInfo
    ? isPartial && gapInfo.partial
      ? gapInfo.partial
      : value === 0
        ? gapInfo.zero
        : null
    : null;

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
      {showGaps && source && (
        <div style={{ marginTop: 3 }}>
          <p
            style={{
              color: "#999",
              fontSize: 8,
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#00d4ff", textDecoration: "none" }}
              >
                {source.citation}
              </a>
            ) : (
              source.citation
            )}
            <span style={{ color: "#555", marginLeft: 6 }}>{source.date}</span>
          </p>
        </div>
      )}
      {showGaps && isGap && gapText && !source && (
        <p
          style={{
            color: "#777",
            fontSize: 8,
            lineHeight: 1.5,
            margin: "4px 0 0",
            fontStyle: "italic",
          }}
        >
          {gapText}
        </p>
      )}
      {showGaps && isGap && gapText && source && (
        <p
          style={{
            color: "#777",
            fontSize: 8,
            lineHeight: 1.5,
            margin: "2px 0 0",
            fontStyle: "italic",
          }}
        >
          {gapText}
        </p>
      )}
    </div>
  );
}

export default function BreakdownPanel({
  breakdown,
  scoreColor,
  gated = false,
  scoreSources,
}: {
  breakdown?: ScoreBreakdown;
  scoreColor: string;
  gated?: boolean;
  scoreSources?: City["scoreSources"];
}) {
  const rows = [
    { key: "activePilotProgram", label: "Active Pilot Program", value: breakdown?.activePilotProgram ?? 0, max: SCORE_WEIGHTS.activePilotProgram },
    { key: "approvedVertiport", label: "Approved Vertiport", value: breakdown?.approvedVertiport ?? 0, max: SCORE_WEIGHTS.approvedVertiport },
    { key: "activeOperatorPresence", label: "Active Operators", value: breakdown?.activeOperatorPresence ?? 0, max: SCORE_WEIGHTS.activeOperatorPresence },
    { key: "vertiportZoning", label: "Vertiport Zoning", value: breakdown?.vertiportZoning ?? 0, max: SCORE_WEIGHTS.vertiportZoning },
    { key: "regulatoryPosture", label: "Regulatory Posture", value: breakdown?.regulatoryPosture ?? 0, max: SCORE_WEIGHTS.regulatoryPosture },
    { key: "stateLegislation", label: "State Legislation", value: breakdown?.stateLegislation ?? 0, max: SCORE_WEIGHTS.stateLegislation },
    { key: "weatherInfrastructure", label: "Weather Infrastructure", value: breakdown?.weatherInfrastructure ?? 0, max: SCORE_WEIGHTS.weatherInfrastructure },
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
        <BreakdownRow
          key={r.key}
          label={r.label}
          value={r.value}
          max={r.max}
          color={scoreColor}
          factorKey={r.key}
          showGaps={!gated}
          source={scoreSources?.[r.key as keyof ScoreBreakdown]}
        />
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
              <BreakdownRow key={r.key} label={r.label} value={r.value} max={r.max} color={scoreColor} />
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
              href="/contact?tier=pro&ref=breakdown"
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
              REQUEST ACCESS
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
