"use client";

import { useState, useMemo } from "react";
import { ScoreBreakdown } from "@/types";
import { SCORE_WEIGHTS, getScoreTier, getScoreColor } from "@/lib/scoring";

const FACTOR_LABELS: Record<keyof ScoreBreakdown, string> = {
  stateLegislation: "State Legislation",
  activePilotProgram: "Active Pilot Program",
  approvedVertiport: "Approved Vertiport",
  activeOperatorPresence: "Operator Presence",
  vertiportZoning: "Vertiport Zoning",
  regulatoryPosture: "Regulatory Posture",
  weatherInfrastructure: "Weather Infrastructure",
};

// What happens when you toggle a factor to max
const SCENARIO_LABELS: Record<keyof ScoreBreakdown, string> = {
  stateLegislation: "State passes UAM legislation",
  activePilotProgram: "Pilot program launches",
  approvedVertiport: "Vertiport receives approval",
  activeOperatorPresence: "Operator commits to market",
  vertiportZoning: "City adopts vertiport zoning",
  regulatoryPosture: "City moves to friendly posture",
  weatherInfrastructure: "Low-altitude weather sensing deployed",
};

export default function ScenarioPanel({
  breakdown,
  currentScore,
  scoreColor,
}: {
  breakdown?: ScoreBreakdown;
  currentScore: number;
  scoreColor: string;
}) {
  const [toggled, setToggled] = useState<Set<keyof ScoreBreakdown>>(new Set());

  // Find factors with room to improve
  const gaps = useMemo(() => {
    if (!breakdown) return [];
    const factors = Object.keys(SCORE_WEIGHTS) as (keyof ScoreBreakdown)[];
    return factors
      .filter((k) => (breakdown[k] ?? 0) < SCORE_WEIGHTS[k])
      .sort((a, b) => SCORE_WEIGHTS[b] - SCORE_WEIGHTS[a]);
  }, [breakdown]);

  // Compute projected score
  const projected = useMemo(() => {
    if (!breakdown) return currentScore;
    let score = currentScore;
    for (const factor of toggled) {
      const current = breakdown[factor] ?? 0;
      const max = SCORE_WEIGHTS[factor];
      score += max - current;
    }
    return Math.min(score, 100);
  }, [breakdown, currentScore, toggled]);

  const projectedTier = getScoreTier(projected);
  const projectedColor = getScoreColor(projected);
  const currentTier = getScoreTier(currentScore);
  const tierChanged = projectedTier !== currentTier;
  const delta = projected - currentScore;

  if (gaps.length === 0) return null;

  const toggle = (factor: keyof ScoreBreakdown) => {
    setToggled((prev) => {
      const next = new Set(prev);
      if (next.has(factor)) next.delete(factor);
      else next.add(factor);
      return next;
    });
  };

  return (
    <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
      }}>
        <div style={{ color: "#777", fontSize: 8, letterSpacing: 2 }}>
          WHAT IF
        </div>
        {delta > 0 && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}>
            <span style={{
              color: projectedColor,
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "'Space Mono', monospace",
            }}>
              {projected}
            </span>
            <span style={{
              color: "#00ff88",
              fontSize: 9,
              fontWeight: 700,
              fontFamily: "'Space Mono', monospace",
            }}>
              +{delta}
            </span>
          </div>
        )}
      </div>

      {/* Projected tier badge */}
      {delta > 0 && tierChanged && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 12,
          padding: "6px 10px",
          background: "rgba(0,255,136,0.04)",
          border: "1px solid rgba(0,255,136,0.12)",
          borderRadius: 6,
        }}>
          <span style={{
            color: scoreColor,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 1,
          }}>
            {currentTier}
          </span>
          <span style={{ color: "#555", fontSize: 9 }}>→</span>
          <span style={{
            color: projectedColor,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 1,
          }}>
            {projectedTier}
          </span>
        </div>
      )}

      {/* Factor toggles */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {gaps.map((factor) => {
          const current = breakdown?.[factor] ?? 0;
          const max = SCORE_WEIGHTS[factor];
          const gain = max - current;
          const isOn = toggled.has(factor);

          return (
            <button
              key={factor}
              onClick={() => toggle(factor)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 10px",
                background: isOn ? "rgba(0,255,136,0.06)" : "rgba(255,255,255,0.02)",
                border: isOn
                  ? "1px solid rgba(0,255,136,0.2)"
                  : "1px solid rgba(255,255,255,0.06)",
                borderRadius: 6,
                cursor: "pointer",
                transition: "all 0.15s",
                textAlign: "left",
                width: "100%",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {/* Toggle indicator */}
              <div style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                border: isOn ? "1px solid #00ff88" : "1px solid #333",
                background: isOn ? "#00ff88" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: 9,
                color: "#050508",
                fontWeight: 700,
              }}>
                {isOn ? "✓" : ""}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  color: isOn ? "#ccc" : "#888",
                  fontSize: 10,
                  lineHeight: 1.4,
                }}>
                  {SCENARIO_LABELS[factor]}
                </div>
              </div>

              <span style={{
                color: isOn ? "#00ff88" : "#555",
                fontSize: 9,
                fontWeight: 700,
                fontFamily: "'Space Mono', monospace",
                flexShrink: 0,
              }}>
                +{gain}
              </span>
            </button>
          );
        })}
      </div>

      {toggled.size > 0 && (
        <button
          onClick={() => setToggled(new Set())}
          style={{
            background: "none",
            border: "none",
            color: "#555",
            fontSize: 8,
            cursor: "pointer",
            padding: "6px 0 0",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Reset scenarios
        </button>
      )}
    </div>
  );
}
