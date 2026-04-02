"use client";

import { useState, useEffect } from "react";
import { safeHref } from "@/lib/safe-url";

interface FactorDelta {
  factor: string;
  previous: number;
  current: number;
  delta: number;
}

interface TrajectoryPoint {
  score: number;
  previousScore: number | null;
  scoreDelta: number | null;
  factorDeltas: FactorDelta[];
  tier: string | null;
  capturedAt: string;
  triggeringEvent?: {
    summary: string;
    sourceUrl: string | null;
    changeType: string;
    timestamp: string;
  };
}

const FACTOR_LABELS: Record<string, string> = {
  activePilotProgram: "Pilot Program",
  approvedVertiport: "Vertiport",
  activeOperatorPresence: "Operators",
  vertiportZoning: "Zoning",
  regulatoryPosture: "Reg. Posture",
  stateLegislation: "Legislation",
  weatherInfrastructure: "Weather",
};

const CHANGE_TYPE_COLORS: Record<string, string> = {
  new_filing: "#5B8DB8",
  new_law: "#00ff88",
  status_change: "#f59e0b",
  faa_update: "#7c3aed",
  score_change: "#ff6b35",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

export default function ScoreTimeline({
  cityId,
  scoreColor,
}: {
  cityId: string;
  scoreColor: string;
}) {
  const [points, setPoints] = useState<TrajectoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setLoading(true);
    setPoints([]);
    fetch(`/api/internal/trajectory/${cityId}`)
      .then((r) => (r.ok ? r.json() : { points: [] }))
      .then((data) => setPoints(data.points ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cityId]);

  // Filter to only points where something changed
  const events = points.filter(
    (p) => p.scoreDelta !== null && p.scoreDelta !== 0
  );

  if (loading) {
    return (
      <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ color: "#777", fontSize: 8, letterSpacing: 2, marginBottom: 10 }}>
          SCORE TIMELINE
        </div>
        <div style={{ color: "#555", fontSize: 9 }}>Loading...</div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ color: "#777", fontSize: 8, letterSpacing: 2, marginBottom: 10 }}>
          SCORE TIMELINE
        </div>
        <div style={{ color: "#666", fontSize: 9 }}>No score changes recorded yet.</div>
      </div>
    );
  }

  // Show most recent first, limit to 5 unless expanded
  const sorted = [...events].reverse();
  const visible = expanded ? sorted : sorted.slice(0, 5);

  return (
    <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
      }}>
        <div style={{ color: "#777", fontSize: 8, letterSpacing: 2 }}>
          SCORE TIMELINE
        </div>
        <div style={{ color: "#888", fontSize: 9 }}>
          {events.length} change{events.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div style={{ position: "relative", paddingLeft: 16 }}>
        {/* Vertical line */}
        <div style={{
          position: "absolute",
          left: 4,
          top: 0,
          bottom: 0,
          width: 1,
          background: "rgba(255,255,255,0.06)",
        }} />

        {visible.map((point, i) => {
          const isUp = (point.scoreDelta ?? 0) > 0;
          const deltaColor = isUp ? "#00ff88" : "#ff4444";
          const eventColor = point.triggeringEvent
            ? CHANGE_TYPE_COLORS[point.triggeringEvent.changeType] ?? "#888"
            : deltaColor;

          return (
            <div key={i} style={{ position: "relative", marginBottom: 14 }}>
              {/* Dot on the timeline */}
              <div style={{
                position: "absolute",
                left: -14,
                top: 2,
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: eventColor,
                border: "1px solid #050508",
              }} />

              {/* Date + delta */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <span style={{ color: "#666", fontSize: 8, fontFamily: "'Space Mono', monospace" }}>
                  {formatDate(point.capturedAt)}
                </span>
                <span style={{
                  color: deltaColor,
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: "'Space Mono', monospace",
                }}>
                  {isUp ? "+" : ""}{point.scoreDelta}
                </span>
                <span style={{ color: "#555", fontSize: 8 }}>
                  {point.previousScore} → {point.score}
                </span>
              </div>

              {/* Factor deltas */}
              {point.factorDeltas.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 3 }}>
                  {point.factorDeltas.map((fd) => (
                    <span key={fd.factor} style={{
                      fontSize: 7,
                      letterSpacing: 0.5,
                      color: fd.delta > 0 ? "#00ff88" : "#ff4444",
                      background: fd.delta > 0 ? "rgba(0,255,136,0.06)" : "rgba(255,68,68,0.06)",
                      border: `1px solid ${fd.delta > 0 ? "rgba(0,255,136,0.15)" : "rgba(255,68,68,0.15)"}`,
                      borderRadius: 3,
                      padding: "1px 5px",
                    }}>
                      {FACTOR_LABELS[fd.factor] ?? fd.factor} {fd.delta > 0 ? "+" : ""}{fd.delta}
                    </span>
                  ))}
                </div>
              )}

              {/* Triggering event */}
              {point.triggeringEvent && (
                <div style={{ marginTop: 2 }}>
                  {safeHref(point.triggeringEvent.sourceUrl) ? (
                    <a
                      href={safeHref(point.triggeringEvent.sourceUrl)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#999", fontSize: 9, lineHeight: 1.5, textDecoration: "none" }}
                    >
                      {point.triggeringEvent.summary}
                      <span style={{ color: "#5B8DB8", marginLeft: 4 }}>↗</span>
                    </a>
                  ) : (
                    <span style={{ color: "#999", fontSize: 9, lineHeight: 1.5 }}>
                      {point.triggeringEvent.summary}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {sorted.length > 5 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            background: "none",
            border: "none",
            color: "#5B8DB8",
            fontSize: 9,
            letterSpacing: 1,
            cursor: "pointer",
            padding: "4px 0",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {expanded ? "SHOW LESS" : `+${sorted.length - 5} MORE`}
        </button>
      )}
    </div>
  );
}
