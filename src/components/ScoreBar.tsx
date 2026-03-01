"use client";

export default function ScoreBar({
  value,
  max = 100,
  color,
}: {
  value: number;
  max?: number;
  color: string;
}) {
  return (
    <div
      style={{
        background: "#0a0a0f",
        borderRadius: 2,
        height: 4,
        overflow: "hidden",
        flex: 1,
      }}
    >
      <div
        style={{
          width: `${(value / max) * 100}%`,
          height: "100%",
          background: color,
          transition: "width 0.6s ease",
          borderRadius: 2,
        }}
      />
    </div>
  );
}
