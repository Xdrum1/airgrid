/**
 * ForwardSignalsPanel — reusable component to display predictive signals
 * for a market. Server component, print-friendly, embedded in:
 *   - Gap reports
 *   - Snapshot PDFs
 *   - City detail panel
 *   - Newsletter intelligence sections
 *
 * Data source: getForwardSignals(cityId) from src/lib/forward-signals.ts
 */

import type { ForwardSignal, ForwardSignalReport } from "@/lib/forward-signals";
import { renderSignalNarrative, getForecastSummary } from "@/lib/forward-signals";

interface Props {
  report: ForwardSignalReport;
  /** When true, omit the "powered by" footer and use compact spacing */
  compact?: boolean;
  /** When true, render dark theme; otherwise light */
  dark?: boolean;
}

const SOURCE_LABELS: Record<ForwardSignal["type"], string> = {
  awaiting_decision: "AWAITING DECISION",
  pending_classification: "PENDING DATA",
  pipeline_event: "PIPELINE EVENT",
  facility_milestone: "FACILITY MILESTONE",
  watch_trajectory: "MARKETWATCH",
};

const CATEGORY_COLORS: Record<ForwardSignal["category"], string> = {
  regulatory: "#5B8DB8",
  operator: "#ff6b35",
  infrastructure: "#a78bfa",
  weather: "#06b6d4",
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "#16a34a",
  medium: "#f59e0b",
  low: "#9ca3af",
};

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SignalCard({ signal, dark }: { signal: ForwardSignal; dark: boolean }) {
  const bg = dark ? "rgba(255,255,255,0.02)" : "#fafbfc";
  const border = dark ? "rgba(255,255,255,0.06)" : "#e8eaed";
  const labelColor = dark ? "#666" : "#888";
  const textColor = dark ? "#ccc" : "#333";
  const subtleColor = dark ? "#888" : "#666";
  const categoryColor = CATEGORY_COLORS[signal.category];
  const confidenceColor = CONFIDENCE_COLORS[signal.confidence];

  return (
    <div
      style={{
        padding: "14px 16px",
        background: bg,
        border: `1px solid ${border}`,
        borderLeft: `3px solid ${categoryColor}`,
        borderRadius: 6,
        marginBottom: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{
            fontSize: 9,
            fontFamily: "'Space Mono', 'Courier New', monospace",
            color: categoryColor,
            letterSpacing: 1,
            fontWeight: 700,
          }}>
            {SOURCE_LABELS[signal.type]}
          </span>
          <span style={{ fontSize: 9, color: labelColor }}>·</span>
          <span style={{
            fontSize: 9,
            fontFamily: "'Space Mono', 'Courier New', monospace",
            color: confidenceColor,
            letterSpacing: 1,
            fontWeight: 700,
          }}>
            {signal.confidence.toUpperCase()} CONFIDENCE
          </span>
        </div>
        <div style={{ fontSize: 10, fontFamily: "'Space Mono', 'Courier New', monospace", color: subtleColor }}>
          {signal.windowLabel}
        </div>
      </div>

      <p style={{ fontSize: 12, color: textColor, lineHeight: 1.6, margin: "0 0 8px" }}>
        {signal.description}
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 10, color: subtleColor }}>
        {signal.earliestDate && signal.latestDate && (
          <span>
            <strong style={{ color: labelColor }}>Window:</strong>{" "}
            {formatDate(signal.earliestDate)} → {formatDate(signal.latestDate)}
          </span>
        )}
        {signal.scoreImpact.pointsIfRealized > 0 && (
          <span>
            <strong style={{ color: labelColor }}>Score impact:</strong>{" "}
            <span style={{ color: signal.scoreImpact.direction === "positive" ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
              {signal.scoreImpact.direction === "positive" ? "+" : "-"}
              {signal.scoreImpact.pointsIfRealized} on {signal.scoreImpact.factor}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

export default function ForwardSignalsPanel({ report, compact = false, dark = true }: Props) {
  const cardBg = dark ? "#0a0a12" : "#ffffff";
  const cardBorder = dark ? "#1a1a2e" : "#e5e7eb";
  const titleColor = dark ? "#fff" : "#111";
  const labelColor = dark ? "#5B8DB8" : "#5B8DB8";
  const textColor = dark ? "#888" : "#666";

  const sections: { label: string; signals: ForwardSignal[]; help: string }[] = [
    { label: "Near-term (≤60 days)", signals: report.near, help: "Signals expected to resolve within 60 days" },
    { label: "Medium-term (60–180 days)", signals: report.medium, help: "Signals with resolution windows 2–6 months out" },
    { label: "Long-term / unscheduled", signals: report.long, help: "Signals beyond 6 months or with no firm timeline" },
  ];

  const watchColor = report.marketWatch?.outlook === "IMPROVING"
    ? "#16a34a"
    : report.marketWatch?.outlook === "DETERIORATING"
    ? "#dc2626"
    : "#9ca3af";

  return (
    <div
      style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: 12,
        padding: compact ? "20px" : "28px 24px",
        marginBottom: 20,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <h2 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 18,
          fontWeight: 700,
          color: titleColor,
          margin: 0,
        }}>
          Forward Signals
        </h2>
        <span style={{
          fontSize: 9,
          fontFamily: "'Space Mono', 'Courier New', monospace",
          color: labelColor,
          background: dark ? "rgba(91,141,184,0.1)" : "rgba(91,141,184,0.08)",
          border: `1px solid ${dark ? "rgba(91,141,184,0.2)" : "rgba(91,141,184,0.15)"}`,
          borderRadius: 3,
          padding: "3px 8px",
          letterSpacing: 1,
        }}>
          PREDICTIVE
        </span>
      </div>

      {/* Forecast summary */}
      <p style={{
        fontSize: 13,
        color: dark ? "#bbb" : "#444",
        lineHeight: 1.7,
        margin: "8px 0 16px",
        fontStyle: "italic",
      }}>
        {getForecastSummary(report)}
      </p>

      {/* Watch + velocity row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        {report.marketWatch && (
          <div style={{
            padding: "10px 12px",
            background: dark ? "rgba(255,255,255,0.02)" : "#f8f9fb",
            borderRadius: 6,
            border: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "#e5e7eb"}`,
          }}>
            <div style={{ fontSize: 9, letterSpacing: 1.5, color: textColor, marginBottom: 4 }}>WATCH STATUS</div>
            <div style={{ fontSize: 12, color: titleColor, fontWeight: 600 }}>
              {report.marketWatch.status.replace("_", " ")}
            </div>
            <div style={{ fontSize: 10, color: watchColor, fontWeight: 700, marginTop: 2 }}>
              {report.marketWatch.outlook}
            </div>
          </div>
        )}
        <div style={{
          padding: "10px 12px",
          background: dark ? "rgba(255,255,255,0.02)" : "#f8f9fb",
          borderRadius: 6,
          border: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "#e5e7eb"}`,
        }}>
          <div style={{ fontSize: 9, letterSpacing: 1.5, color: textColor, marginBottom: 4 }}>SIGNALS 30D</div>
          <div style={{ fontSize: 16, color: titleColor, fontWeight: 700, fontFamily: "'Space Mono', 'Courier New', monospace" }}>
            {report.velocity.signalsLast30d}
          </div>
          <div style={{ fontSize: 10, color: report.velocity.accelerating ? "#16a34a" : textColor, marginTop: 2 }}>
            {report.velocity.accelerating ? "ACCELERATING" : "STEADY"}
          </div>
        </div>
        <div style={{
          padding: "10px 12px",
          background: dark ? "rgba(255,255,255,0.02)" : "#f8f9fb",
          borderRadius: 6,
          border: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "#e5e7eb"}`,
        }}>
          <div style={{ fontSize: 9, letterSpacing: 1.5, color: textColor, marginBottom: 4 }}>NATIONAL RANK</div>
          <div style={{ fontSize: 16, color: titleColor, fontWeight: 700, fontFamily: "'Space Mono', 'Courier New', monospace" }}>
            {report.velocity.rankNational ? `#${report.velocity.rankNational}` : "—"}
          </div>
          <div style={{ fontSize: 10, color: textColor, marginTop: 2 }}>by signal density</div>
        </div>
        <div style={{
          padding: "10px 12px",
          background: dark ? "rgba(255,255,255,0.02)" : "#f8f9fb",
          borderRadius: 6,
          border: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "#e5e7eb"}`,
        }}>
          <div style={{ fontSize: 9, letterSpacing: 1.5, color: textColor, marginBottom: 4 }}>30D FORECAST</div>
          <div style={{
            fontSize: 16,
            color: report.expectedScoreChange30d
              ? (report.expectedScoreChange30d.delta > 0 ? "#16a34a" : "#dc2626")
              : titleColor,
            fontWeight: 700,
            fontFamily: "'Space Mono', 'Courier New', monospace",
          }}>
            {report.expectedScoreChange30d
              ? `${report.expectedScoreChange30d.delta > 0 ? "+" : ""}${report.expectedScoreChange30d.delta}`
              : "0"}
          </div>
          <div style={{ fontSize: 10, color: textColor, marginTop: 2 }}>
            {report.expectedScoreChange30d ? `${report.expectedScoreChange30d.confidence} conf` : "stable"}
          </div>
        </div>
      </div>

      {/* Signal sections */}
      {sections.map((section) =>
        section.signals.length > 0 ? (
          <div key={section.label} style={{ marginBottom: 18 }}>
            <div style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 8,
            }}>
              <h3 style={{
                fontSize: 12,
                fontWeight: 700,
                color: dark ? "#aaa" : "#555",
                letterSpacing: 1,
                textTransform: "uppercase",
                margin: 0,
              }}>
                {section.label}
              </h3>
              <span style={{ fontSize: 10, color: textColor, fontFamily: "'Space Mono', 'Courier New', monospace" }}>
                {section.signals.length}
              </span>
            </div>
            {section.signals.map((s) => (
              <SignalCard key={s.id} signal={s} dark={dark} />
            ))}
          </div>
        ) : null,
      )}

      {report.signals.length === 0 && (
        <p style={{ fontSize: 12, color: textColor, fontStyle: "italic" }}>
          No forward signals tracked for this market in the last 90 days.
        </p>
      )}

      {/* Footer */}
      {!compact && (
        <div style={{
          fontSize: 10,
          color: dark ? "#555" : "#888",
          marginTop: 16,
          paddingTop: 12,
          borderTop: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "#eef0f2"}`,
          lineHeight: 1.6,
        }}>
          Generated {report.generatedAt.toISOString().slice(0, 10)} · AirIndex Forward Signals v1.0 ·
          Aggregates detected signals, market trajectory, and pre-development facility milestones.
          Confidence reflects signal reliability, not outcome certainty.
        </div>
      )}
    </div>
  );
}

// Re-export for convenience so consumers don't need two imports
export { renderSignalNarrative, getForecastSummary };
