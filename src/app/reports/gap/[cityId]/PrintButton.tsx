"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        background: "rgba(91,141,184,0.1)",
        border: "1px solid rgba(91,141,184,0.3)",
        borderRadius: 6,
        padding: "8px 20px",
        color: "#5B8DB8",
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
