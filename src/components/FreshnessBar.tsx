/**
 * Freshness bar — trust signal shown at the top of every per-market briefing.
 *
 * Tells the recipient:
 *   - When this briefing was generated ("Data as of ...")
 *   - Which scoring methodology version produced it ("v1.3")
 *   - That the data is live, not a static PDF snapshot
 *   - The Data Confidence flag for the city (when cityId is provided) —
 *     per the Missing Data Treatment Protocol published at
 *     airindex.io/methodology
 *
 * Renders as a single compact row in the screen view and in print.
 */
import {
  getCityDataConfidence,
  confidenceLabel,
  confidenceColor,
} from "@/lib/data-confidence";

export default async function FreshnessBar({
  today,
  cityId,
}: {
  today: string;
  cityId?: string;
}) {
  const dc = cityId ? await getCityDataConfidence(cityId) : null;
  const dcColor = dc ? confidenceColor(dc.confidence) : null;
  const dcLabelText = dc ? confidenceLabel(dc.confidence) : null;

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        fontSize: 10,
        color: "#999",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        fontFamily: "'Space Mono', monospace",
        padding: "10px 14px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 6,
        marginBottom: 22,
        alignItems: "center",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            display: "inline-block",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#00ff88",
          }}
        />
        <span style={{ color: "#00ff88", fontWeight: 700 }}>LIVE</span>
      </span>
      <span style={{ color: "#555" }}>·</span>
      <span>Data as of {today}</span>
      <span style={{ color: "#555" }}>·</span>
      <span>AIS · Methodology v1.3</span>
      <span style={{ color: "#555" }}>·</span>
      <span>
        Sources:{" "}
        <span style={{ textTransform: "none", letterSpacing: "0.04em" }}>
          FKB · MCS · OID · RPL · FPIS
        </span>
      </span>
      {dc && dcColor && dcLabelText && (
        <>
          <span style={{ color: "#555" }}>·</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span
              aria-hidden="true"
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: dcColor,
              }}
            />
            <span>
              Data Confidence:{" "}
              <strong style={{ color: dcColor, fontWeight: 700 }}>
                {dcLabelText}
              </strong>
            </span>
          </span>
        </>
      )}
    </div>
  );
}
