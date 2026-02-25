export default function CheckEmailPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050508",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Space Mono', monospace",
      }}
    >
      <div style={{ width: "100%", maxWidth: 400, padding: 32, textAlign: "center" }}>
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            marginBottom: 48,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: "linear-gradient(135deg, #00d4ff, #7c3aed)",
            }}
          />
          <span
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 26,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "0.08em",
            }}
          >
            AIRINDEX
          </span>
        </div>

        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "rgba(0,212,255,0.1)",
            border: "1px solid rgba(0,212,255,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            fontSize: 22,
          }}
        >
          ✉
        </div>

        <h1
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 20,
            fontWeight: 800,
            color: "#fff",
            marginBottom: 12,
          }}
        >
          Check your email
        </h1>
        <p
          style={{
            color: "#888899",
            fontSize: 12,
            lineHeight: 1.8,
          }}
        >
          We sent you a sign-in link.
          <br />
          Click the link in the email to continue.
        </p>
        <p
          style={{
            color: "#333",
            fontSize: 10,
            marginTop: 32,
          }}
        >
          Didn&apos;t receive it? Check your spam folder or try again.
        </p>
      </div>
    </div>
  );
}
