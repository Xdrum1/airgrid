"use client";

interface ScoreTrendProps {
  history: { score: number; capturedAt: string }[];
  color: string;
}

function formatMonth(iso: string): string {
  const d = new Date(iso);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const yr = String(d.getFullYear()).slice(2);
  return `${months[d.getMonth()]} '${yr}`;
}

export default function ScoreTrend({ history, color }: ScoreTrendProps) {
  if (history.length < 2) return null;

  const scores = history.map((h) => h.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const delta = scores[scores.length - 1] - scores[0];

  // SVG dimensions
  const w = 200;
  const h = 40;
  const padY = 4;

  // Scale scores to SVG coordinates
  const range = max - min || 1;
  const points = scores.map((s, i) => {
    const x = (i / (scores.length - 1)) * w;
    const y = padY + ((max - s) / range) * (h - padY * 2);
    return `${x},${y}`;
  });

  const polyline = points.join(" ");
  // Closed polygon for filled area
  const areaPath = `${points.join(" ")} ${w},${h} 0,${h}`;

  const deltaLabel = delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "—";
  const deltaColor = delta > 0 ? "#00ff88" : delta < 0 ? "#ff4444" : "#555";

  return (
    <div style={{ marginTop: 16, display: "flex", alignItems: "flex-end", gap: 16 }}>
      <div>
        <svg
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          style={{ display: "block" }}
        >
          <polygon
            points={areaPath}
            fill={color}
            fillOpacity={0.1}
          />
          <polyline
            points={polyline}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 4,
          }}
        >
          <span style={{ color: "#666", fontSize: 8, letterSpacing: 0.5 }}>
            {formatMonth(history[0].capturedAt)}
          </span>
          <span style={{ color: "#666", fontSize: 8, letterSpacing: 0.5 }}>
            {formatMonth(history[history.length - 1].capturedAt)}
          </span>
        </div>
      </div>
      <span
        style={{
          color: deltaColor,
          fontSize: 11,
          fontWeight: 700,
          fontFamily: "'Space Grotesk', sans-serif",
          letterSpacing: 0.5,
          marginBottom: 12,
        }}
      >
        {deltaLabel}
      </span>
    </div>
  );
}
