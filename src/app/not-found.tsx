import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050508",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Space Mono', monospace",
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
        404
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
        PAGE NOT FOUND
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <Link
          href="/"
          style={{
            color: "#888",
            fontSize: 11,
            letterSpacing: 1,
            textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 6,
            padding: "10px 20px",
            transition: "border-color 0.15s",
          }}
        >
          HOME
        </Link>
        <Link
          href="/feed"
          style={{
            color: "#888",
            fontSize: 11,
            letterSpacing: 1,
            textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 6,
            padding: "10px 20px",
            transition: "border-color 0.15s",
          }}
        >
          INTEL FEED
        </Link>
        <Link
          href="/dashboard"
          style={{
            color: "#00d4ff",
            fontSize: 11,
            letterSpacing: 1,
            textDecoration: "none",
            border: "1px solid rgba(0,212,255,0.3)",
            borderRadius: 6,
            padding: "10px 20px",
            transition: "background 0.15s",
          }}
        >
          DASHBOARD
        </Link>
      </div>
    </div>
  );
}
