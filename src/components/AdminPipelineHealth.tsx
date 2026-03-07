"use client";

import { useState, useEffect } from "react";
import { formatRelativeTime } from "@/lib/dashboard-constants";

interface PipelineHealth {
  pipelines: {
    snapshot: { lastRun: string | null; schedule: string; totalRuns: number };
    ingestion: { lastRun: string | null; schedule: string };
    classification: { lastRun: string | null; model: string | null; totalClassified: number };
    autoReview: { lastRun: string | null; schedule: string };
  };
  dataVolume: Record<string, number>;
  pendingReviews: number;
  queriedAt: string;
}

function getFreshness(isoDate: string | null): { label: string; color: string; status: string } {
  if (!isoDate) return { label: "Never", color: "#ff4444", status: "OFFLINE" };
  const hours = (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60);
  if (hours < 26) return { label: formatRelativeTime(isoDate), color: "#00ff88", status: "HEALTHY" };
  if (hours < 72) return { label: formatRelativeTime(isoDate), color: "#f59e0b", status: "STALE" };
  return { label: formatRelativeTime(isoDate), color: "#ff4444", status: "DOWN" };
}

const DATA_SOURCE_LABELS: Record<string, string> = {
  new_filing: "Federal Register / SEC",
  new_law: "LegiScan Bills",
  status_change: "Status Updates",
  faa_update: "FAA Updates",
  score_change: "Score Changes",
};

export default function AdminPipelineHealth({ showToast }: { showToast: (msg: string) => void }) {
  const [health, setHealth] = useState<PipelineHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pipeline-health")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setHealth)
      .catch(() => showToast("Failed to load pipeline health"))
      .finally(() => setLoading(false));
  }, [showToast]);

  if (loading) {
    return (
      <div style={{ color: "#444", fontSize: 10, letterSpacing: 2, textAlign: "center", padding: 60 }}>
        LOADING...
      </div>
    );
  }

  if (!health) {
    return (
      <div style={{ color: "#333", fontSize: 11, letterSpacing: 2, textAlign: "center", padding: 80 }}>
        FAILED TO LOAD PIPELINE DATA
      </div>
    );
  }

  const pipelines = [
    {
      label: "SNAPSHOT",
      desc: "Score capture for all rated markets",
      schedule: health.pipelines.snapshot.schedule,
      lastRun: health.pipelines.snapshot.lastRun,
      stat: `${health.pipelines.snapshot.totalRuns} total runs`,
    },
    {
      label: "INGESTION",
      desc: "Federal Register, LegiScan, SEC EDGAR, Operator News",
      schedule: health.pipelines.ingestion.schedule,
      lastRun: health.pipelines.ingestion.lastRun,
      stat: null,
    },
    {
      label: "AI CLASSIFICATION",
      desc: health.pipelines.classification.model ?? "NLP classifier",
      schedule: "Triggered on ingestion",
      lastRun: health.pipelines.classification.lastRun,
      stat: `${health.pipelines.classification.totalClassified} records classified`,
    },
    {
      label: "AUTO-REVIEW",
      desc: "AI review of scoring overrides",
      schedule: health.pipelines.autoReview.schedule,
      lastRun: health.pipelines.autoReview.lastRun,
      stat: null,
    },
  ];

  const totalVolume = Object.values(health.dataVolume).reduce((a, b) => a + b, 0);
  const overallHealthy = pipelines.every((p) => getFreshness(p.lastRun).status === "HEALTHY");

  return (
    <div>
      {/* Overall status banner */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 24,
        padding: "12px 16px",
        background: overallHealthy ? "rgba(0,255,136,0.04)" : "rgba(245,158,11,0.04)",
        border: `1px solid ${overallHealthy ? "rgba(0,255,136,0.15)" : "rgba(245,158,11,0.15)"}`,
        borderRadius: 8,
      }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: overallHealthy ? "#00ff88" : "#f59e0b",
          boxShadow: `0 0 8px ${overallHealthy ? "#00ff8840" : "#f59e0b40"}`,
        }} />
        <span style={{
          color: overallHealthy ? "#00ff88" : "#f59e0b",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 2,
        }}>
          {overallHealthy ? "ALL PIPELINES HEALTHY" : "ATTENTION NEEDED"}
        </span>
        <span style={{ color: "#333", fontSize: 9, marginLeft: "auto" }}>
          Queried {formatRelativeTime(health.queriedAt)}
        </span>
      </div>

      {/* Pipeline cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
        {pipelines.map((p) => {
          const freshness = getFreshness(p.lastRun);
          return (
            <div
              key={p.label}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8,
                padding: "16px 18px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ color: "#888", fontSize: 10, fontWeight: 700, letterSpacing: 1.5 }}>
                  {p.label}
                </span>
                <span style={{
                  fontSize: 8,
                  letterSpacing: 1,
                  color: freshness.color,
                  background: `${freshness.color}15`,
                  padding: "3px 8px",
                  borderRadius: 3,
                  border: `1px solid ${freshness.color}30`,
                  fontWeight: 700,
                }}>
                  {freshness.status}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: freshness.color,
                  flexShrink: 0,
                  boxShadow: `0 0 6px ${freshness.color}40`,
                }} />
                <span style={{
                  color: freshness.color,
                  fontSize: 14,
                  fontFamily: "'Space Mono', monospace",
                  fontWeight: 600,
                }}>
                  {freshness.label}
                </span>
              </div>

              <div style={{ color: "#555", fontSize: 9, marginBottom: 4 }}>
                {p.desc}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#333", fontSize: 8, letterSpacing: 1 }}>
                  {p.schedule}
                </span>
                {p.stat && (
                  <span style={{ color: "#444", fontSize: 9 }}>
                    {p.stat}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Data volume + pending reviews */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {/* Changelog volume */}
        <div style={{
          flex: 2,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 8,
          padding: "16px 18px",
        }}>
          <div style={{ color: "#444", fontSize: 8, letterSpacing: 2, marginBottom: 14 }}>
            CHANGELOG VOLUME BY TYPE
          </div>
          {Object.entries(health.dataVolume)
            .sort(([, a], [, b]) => b - a)
            .map(([type, count]) => {
              const pct = totalVolume > 0 ? (count / totalVolume) * 100 : 0;
              return (
                <div key={type} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "#666", fontSize: 10, fontFamily: "'Space Mono', monospace" }}>
                      {DATA_SOURCE_LABELS[type] ?? type}
                    </span>
                    <span style={{ color: "#888", fontSize: 10, fontFamily: "'Space Mono', monospace", fontWeight: 600 }}>
                      {count.toLocaleString()}
                    </span>
                  </div>
                  <div style={{
                    height: 5,
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: "#00d4ff",
                      borderRadius: 3,
                      opacity: 0.7,
                    }} />
                  </div>
                </div>
              );
            })}
          <div style={{ color: "#333", fontSize: 9, marginTop: 12, fontFamily: "'Space Mono', monospace" }}>
            {totalVolume.toLocaleString()} total entries
          </div>
        </div>

        {/* Pending reviews */}
        <div style={{
          flex: 1,
          background: "rgba(255,255,255,0.02)",
          border: `1px solid ${health.pendingReviews > 0 ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.06)"}`,
          borderRadius: 8,
          padding: "16px 18px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
        }}>
          <div style={{ color: "#444", fontSize: 8, letterSpacing: 2, marginBottom: 12 }}>
            PENDING REVIEWS
          </div>
          <div style={{
            color: health.pendingReviews > 0 ? "#f59e0b" : "#00ff88",
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: 42,
            lineHeight: 1,
            marginBottom: 10,
          }}>
            {health.pendingReviews}
          </div>
          <div style={{ color: "#444", fontSize: 9, fontFamily: "'Space Mono', monospace", lineHeight: 1.5 }}>
            {health.pendingReviews > 0
              ? "Scoring overrides need admin review"
              : "All clear"}
          </div>
        </div>
      </div>
    </div>
  );
}
