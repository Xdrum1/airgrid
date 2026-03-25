"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        background: "rgba(0,212,255,0.1)",
        border: "1px solid rgba(0,212,255,0.3)",
        borderRadius: 6,
        padding: "8px 20px",
        color: "#00d4ff",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.08em",
        cursor: "pointer",
        fontFamily: "'Inter', sans-serif",
        transition: "all 0.15s",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      DOWNLOAD PDF
    </button>
  );
}
