"use client";

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
}: {
  breakdown?: ScoreBreakdown;
  scoreColor: string;
}) {
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
      <BreakdownRow
        label="Active Pilot Program"
        value={breakdown?.activePilotProgram ?? 0}
        max={SCORE_WEIGHTS.activePilotProgram}
        color={scoreColor}
      />
      <BreakdownRow
        label="Approved Vertiport"
        value={breakdown?.approvedVertiport ?? 0}
        max={SCORE_WEIGHTS.approvedVertiport}
        color={scoreColor}
      />
      <BreakdownRow
        label="Active Operators"
        value={breakdown?.activeOperatorPresence ?? 0}
        max={SCORE_WEIGHTS.activeOperatorPresence}
        color={scoreColor}
      />
      <BreakdownRow
        label="Vertiport Zoning"
        value={breakdown?.vertiportZoning ?? 0}
        max={SCORE_WEIGHTS.vertiportZoning}
        color={scoreColor}
      />
      <BreakdownRow
        label="Regulatory Posture"
        value={breakdown?.regulatoryPosture ?? 0}
        max={SCORE_WEIGHTS.regulatoryPosture}
        color={scoreColor}
      />
      <BreakdownRow
        label="State Legislation"
        value={breakdown?.stateLegislation ?? 0}
        max={SCORE_WEIGHTS.stateLegislation}
        color={scoreColor}
      />
      <BreakdownRow
        label="LAANC Coverage"
        value={breakdown?.laancCoverage ?? 0}
        max={SCORE_WEIGHTS.laancCoverage}
        color={scoreColor}
      />
    </div>
  );
}
