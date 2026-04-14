"use client";

import { useEffect, useState } from "react";
import type { CausalNarrative } from "@/lib/causal-narrative";

const DIR_COLOR: Record<string, string> = {
  positive: "#00ff88",
  negative: "#ff5470",
  neutral: "#888",
};

export default function CausalNarrativePanel({ cityId }: { cityId: string }) {
  const [narrative, setNarrative] = useState<CausalNarrative | null>(null);
  const [gated, setGated] = useState(false);

  useEffect(() => {
    setNarrative(null);
    setGated(false);
    fetch(`/api/internal/causal-narrative/${cityId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.gated) setGated(true);
        else setNarrative(data.narrative ?? null);
      })
      .catch(() => setNarrative(null));
  }, [cityId]);

  if (gated || narrative === null) return null;

  return (
    <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.15em",
          color: "#888",
          textTransform: "uppercase",
          marginBottom: 10,
          fontWeight: 700,
        }}
      >
        Why This Score
      </div>

      <p style={{ color: "#d4d4d4", fontSize: 11, lineHeight: 1.55, margin: "0 0 12px" }}>
        {narrative.summary}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {narrative.weakestFactor && (
          <Row label="Weakest factor" value={`${narrative.weakestFactor.label} — ${narrative.weakestFactor.currentPoints}/${narrative.weakestFactor.maxPoints} pts`} />
        )}
        {narrative.mostMoveableFactor && (
          <Row
            label="Most moveable"
            value={`${narrative.mostMoveableFactor.label} (+${narrative.mostMoveableFactor.potentialGain} pts available)`}
            sublabel={narrative.mostMoveableFactor.rationale}
          />
        )}
        {narrative.recentChange && (
          <Row
            label="Recent move"
            value={`${narrative.recentChange.from} → ${narrative.recentChange.to} (${narrative.recentChange.delta > 0 ? "+" : ""}${narrative.recentChange.delta}) on ${narrative.recentChange.capturedAt}`}
          />
        )}
        {narrative.marketWatch && narrative.marketWatch.status !== "STABLE" && (
          <Row
            label="Watch status"
            value={`${narrative.marketWatch.status.replace(/_/g, " ")} / ${narrative.marketWatch.outlook.toLowerCase()} (set ${narrative.marketWatch.setAt})`}
          />
        )}
      </div>

      {narrative.nearTermSignals.length > 0 && (
        <>
          <div
            style={{
              fontSize: 9,
              letterSpacing: "0.1em",
              color: "#666",
              textTransform: "uppercase",
              margin: "14px 0 6px",
              fontWeight: 700,
            }}
          >
            Near-term signals
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {narrative.nearTermSignals.map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  padding: "6px 8px",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: 3,
                  borderLeft: `2px solid ${DIR_COLOR[s.direction] ?? "#444"}`,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: DIR_COLOR[s.direction] ?? "#888",
                    minWidth: 36,
                  }}
                >
                  {s.pointsIfRealized > 0
                    ? `${s.direction === "negative" ? "-" : "+"}${s.pointsIfRealized}`
                    : "—"}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "#d4d4d4", lineHeight: 1.45 }}>
                    {s.description}
                  </div>
                  <div style={{ fontSize: 9, color: "#666", marginTop: 2 }}>
                    {s.windowLabel} · {s.confidence} confidence
                    {s.factor && ` · ${s.factor}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
        <span style={{ fontSize: 9, color: "#666", letterSpacing: "0.05em", minWidth: 94, textTransform: "uppercase", fontWeight: 700 }}>
          {label}
        </span>
        <span style={{ fontSize: 11, color: "#e0e0e0" }}>{value}</span>
      </div>
      {sublabel && (
        <div style={{ fontSize: 9, color: "#888", paddingLeft: 102, lineHeight: 1.45, marginTop: 2 }}>
          {sublabel}
        </div>
      )}
    </div>
  );
}
