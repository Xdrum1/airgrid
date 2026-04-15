/**
 * Freshness bar — trust signal shown at the top of every per-market briefing.
 *
 * Tells the recipient:
 *   - When this briefing was generated ("Data as of ...")
 *   - Which scoring methodology version produced it ("v1.3")
 *   - That the data is live, not a static PDF snapshot
 *
 * Renders as a single compact row in the screen view and in print.
 */
export default function FreshnessBar({ today }: { today: string }) {
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
      <span>Methodology v1.3</span>
      <span style={{ color: "#555" }}>·</span>
      <span>
        Sources:{" "}
        <span style={{ textTransform: "none", letterSpacing: "0.04em" }}>
          FKB · MCS · OID · RPL · FPIS
        </span>
      </span>
    </div>
  );
}
