import {
  getCityDataConfidence,
  confidenceLabel,
  confidenceColor,
} from "@/lib/data-confidence";

/**
 * Server component — renders the Data Confidence badge for a city.
 *
 * Per the published methodology (airindex.io/methodology), the flag is
 * visible to licensed clients in market detail views and is noted in
 * briefing reports. This component is the single source of truth for
 * both surfaces.
 *
 * Use variant="full" on the market-detail page (shows rationale) and
 * variant="inline" in briefing report footers (one compact line).
 */
export default async function DataConfidenceBadge({
  cityId,
  variant = "full",
}: {
  cityId: string;
  variant?: "full" | "inline";
}) {
  const dc = await getCityDataConfidence(cityId);
  const color = confidenceColor(dc.confidence);
  const label = confidenceLabel(dc.confidence);

  if (variant === "inline") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          color: "#697386",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: color,
            flexShrink: 0,
          }}
        />
        Data Confidence: <strong style={{ color }}>{label}</strong>
        {dc.daysSinceLastVerification !== null && (
          <span style={{ color: "#8792a2" }}>
            · last verified {dc.daysSinceLastVerification}d ago
          </span>
        )}
      </span>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "12px 16px",
        background: `${color}14`,
        border: `1px solid ${color}40`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 8,
        marginBottom: 16,
        fontSize: 12,
        color: "#425466",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: color,
          marginTop: 4,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 10,
            letterSpacing: "0.12em",
            color,
            textTransform: "uppercase",
            fontWeight: 700,
            marginBottom: 2,
          }}
        >
          Data Confidence · {label}
        </div>
        <div style={{ lineHeight: 1.55 }}>
          {dc.rationale}
          {dc.daysSinceLastVerification !== null && (
            <>
              {" · last primary-source activity "}
              {dc.daysSinceLastVerification} day{dc.daysSinceLastVerification === 1 ? "" : "s"} ago
            </>
          )}
          .
        </div>
      </div>
    </div>
  );
}
