"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { FacilityDecision } from "@/app/api/internal/facility-decision/[siteId]/route";

// ── Design tokens (dark dashboard) ──
const D = {
  bg: "#0d1117",
  cardBg: "#161b22",
  border: "#21262d",
  textPrimary: "#e6edf3",
  textSecondary: "#8b949e",
  textTertiary: "#6e7681",
  accent: "#5B8DB8",
};

interface FacilityDecisionPanelProps {
  siteId: string;
  isMobile: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
}

export default function FacilityDecisionPanel({
  siteId,
  isMobile,
  onClose,
  isAuthenticated,
}: FacilityDecisionPanelProps) {
  const [data, setData] = useState<FacilityDecision | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!siteId) return;
    setLoading(true);
    setError(false);

    fetch(`/api/internal/facility-decision/${siteId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [siteId]);

  // ── Panel shell (mirrors CityDetailPanel layout) ──
  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "75vh",
        background: D.bg,
        borderRadius: "16px 16px 0 0",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.4)",
      }
    : {
        position: "absolute",
        top: 0,
        right: 0,
        width: 320,
        height: "100%",
        background: D.bg,
        borderLeft: `1px solid ${D.border}`,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      };

  return (
    <div style={panelStyle}>
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: `1px solid ${D.border}`,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 10,
            letterSpacing: "0.1em",
            color: D.accent,
            textTransform: "uppercase",
          }}
        >
          Facility Assessment
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: D.textSecondary,
            fontSize: 18,
            cursor: "pointer",
            padding: "4px 8px",
            lineHeight: 1,
          }}
          aria-label="Close panel"
        >
          &times;
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {loading && (
          <div style={{ textAlign: "center", padding: "40px 0", color: D.textSecondary }}>
            <div style={{ fontSize: 13 }}>Assessing facility...</div>
          </div>
        )}

        {error && (
          <div style={{ textAlign: "center", padding: "40px 0", color: D.textSecondary, fontSize: 13 }}>
            Facility not found or no data available.
          </div>
        )}

        {data && !loading && (
          <>
            {/* ── Verdict header ── */}
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: 16,
                  color: D.textPrimary,
                  marginBottom: 4,
                  lineHeight: 1.3,
                }}
              >
                {data.facilityName}
              </div>
              <div style={{ fontSize: 11, color: D.textSecondary, marginBottom: 14 }}>
                {data.city}, {data.state} · {data.siteType ?? data.useType} · {data.facilityId}
              </div>

              {/* Verdict badge */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: `${data.verdictColor}18`,
                  border: `1px solid ${data.verdictColor}40`,
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 10,
                    background: data.verdictColor,
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: 700,
                      fontSize: 15,
                      color: data.verdictColor,
                    }}
                  >
                    {data.verdictLabel}
                  </div>
                  <div style={{ fontSize: 11, color: D.textSecondary, marginTop: 1 }}>
                    Confidence: {data.confidence} · {data.primaryConstraint}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Why bullets ── */}
            {data.whyBullets.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 9,
                    letterSpacing: "0.1em",
                    color: D.textTertiary,
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  Why
                </div>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {data.whyBullets.map((b, i) => (
                    <li
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        fontSize: 12,
                        color: D.textSecondary,
                        lineHeight: 1.5,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          width: 4,
                          height: 4,
                          borderRadius: 4,
                          background: D.textTertiary,
                          marginTop: 6,
                          flexShrink: 0,
                        }}
                      />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── Module cards ── */}
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 9,
                  letterSpacing: "0.1em",
                  color: D.textTertiary,
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Assessment
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {/* DQS */}
                <ModuleRow
                  label="Data Quality"
                  value={data.modules.dqs ? `${data.modules.dqs.score}` : "N/A"}
                  status={data.modules.dqs?.label.split(".")[0] ?? "Unknown"}
                  color={data.modules.dqs?.color ?? D.textTertiary}
                />
                {/* Compliance */}
                <ModuleRow
                  label="Compliance"
                  value={data.modules.compliance.label}
                  status={data.modules.compliance.status}
                  color={data.modules.compliance.color}
                />
                {/* Dimensional */}
                <ModuleRow
                  label="Dimensional"
                  value={data.modules.dimensional.label}
                  status={data.modules.dimensional.status}
                  color={data.modules.dimensional.color}
                />
                {/* OES */}
                <ModuleRow
                  label="Obstruction (OES)"
                  value={data.modules.oes ? `${data.modules.oes.score}` : "N/A"}
                  status={data.modules.oes?.tier ?? "No data"}
                  color={data.modules.oes?.color ?? D.textTertiary}
                />
                {/* OEL */}
                <ModuleRow
                  label="Exposure (OEL)"
                  value={data.modules.oel.label}
                  status={data.modules.oel.level}
                  color={data.modules.oel.color}
                />
              </div>
            </div>

            {/* ── Implication ── */}
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 6,
                background: D.cardBg,
                border: `1px solid ${D.border}`,
                fontSize: 12,
                color: D.textSecondary,
                lineHeight: 1.5,
                marginBottom: 20,
                fontStyle: "italic",
              }}
            >
              {data.implication}
            </div>

            {/* ── Actions ── */}
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 9,
                  letterSpacing: "0.1em",
                  color: D.textTertiary,
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Recommended
              </div>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {data.actions.map((a, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                      color: D.textPrimary,
                      lineHeight: 1.5,
                    }}
                  >
                    <span style={{ color: D.accent, fontSize: 10 }}>→</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Action buttons ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {isAuthenticated && (
                <Link
                  href={`/admin/reports/risk-assessment/${data.facilityId}`}
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "10px 16px",
                    borderRadius: 6,
                    background: D.accent,
                    color: "#ffffff",
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  View Full Assessment →
                </Link>
              )}
              <Link
                href="/contact"
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "10px 16px",
                  borderRadius: 6,
                  background: "transparent",
                  border: `1px solid ${D.border}`,
                  color: D.textSecondary,
                  fontSize: 12,
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                Run assessment on your sites →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Module row sub-component ──
function ModuleRow({
  label,
  value,
  status,
  color,
}: {
  label: string;
  value: string;
  status: string;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 12px",
        borderRadius: 6,
        background: D.cardBg,
        border: `1px solid ${D.border}`,
      }}
    >
      <span style={{ fontSize: 12, color: D.textSecondary }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            fontWeight: 700,
            color,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
