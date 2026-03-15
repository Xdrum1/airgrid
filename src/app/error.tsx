"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050508",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', sans-serif",
        color: "#fff",
      }}
    >
      <div
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 96,
          color: "#1a1a28",
          lineHeight: 1,
        }}
      >
        500
      </div>
      <div
        style={{
          color: "#555",
          fontSize: 14,
          marginTop: 12,
          marginBottom: 32,
          letterSpacing: 2,
        }}
      >
        SOMETHING WENT WRONG
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={reset}
          style={{
            color: "#00d4ff",
            fontSize: 11,
            letterSpacing: 1,
            textDecoration: "none",
            border: "1px solid rgba(0,212,255,0.3)",
            borderRadius: 6,
            padding: "10px 20px",
            background: "transparent",
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          TRY AGAIN
        </button>
        <a
          href="/dashboard"
          style={{
            color: "#555",
            fontSize: 11,
            letterSpacing: 1,
            textDecoration: "none",
            border: "1px solid rgba(85,85,85,0.3)",
            borderRadius: 6,
            padding: "10px 20px",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          BACK TO DASHBOARD
        </a>
      </div>
    </div>
  );
}
