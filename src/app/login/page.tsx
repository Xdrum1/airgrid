"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const authError = searchParams.get("error");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");

    try {
      await signIn("resend", { email: email.trim(), callbackUrl });
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

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

        <h1
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 20,
            fontWeight: 800,
            color: "#fff",
            marginBottom: 12,
          }}
        >
          Sign in to AirIndex
        </h1>
        <p
          style={{
            color: "#888899",
            fontSize: 12,
            marginBottom: 32,
            lineHeight: 1.6,
          }}
        >
          Get alerts, track markets, access regulatory filings.
          <br />
          Enter your email to receive a magic link.
        </p>

        {authError && (
          <div
            style={{
              color: "#ff4444",
              fontSize: 11,
              marginBottom: 16,
              padding: "10px 14px",
              background: "rgba(255,68,68,0.06)",
              border: "1px solid rgba(255,68,68,0.15)",
              borderRadius: 6,
            }}
          >
            {authError === "Verification"
              ? "That link has expired or was already used. Please try again."
              : "Something went wrong. Please try again."}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoFocus
            style={{
              width: "100%",
              padding: "14px 16px",
              background: "#0a0a12",
              border: "1px solid #1a1a2e",
              borderRadius: 6,
              color: "#e0e0e8",
              fontSize: 14,
              fontFamily: "'Space Mono', monospace",
              outline: "none",
              marginBottom: 16,
            }}
          />
          <button
            type="submit"
            disabled={loading || !email.trim()}
            style={{
              width: "100%",
              padding: "14px 16px",
              background: email.trim()
                ? "linear-gradient(135deg, #00d4ff, #7c3aed)"
                : "#1a1a2e",
              border: "none",
              borderRadius: 6,
              color: email.trim() ? "#000" : "#555",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "'Syne', sans-serif",
              letterSpacing: "0.06em",
              cursor: email.trim() ? "pointer" : "default",
              transition: "all 0.2s",
            }}
          >
            {loading ? "SENDING..." : "SEND MAGIC LINK"}
          </button>
        </form>

        {error && (
          <p style={{ color: "#ff4444", fontSize: 12, marginTop: 16 }}>{error}</p>
        )}

        <p style={{ color: "#333", fontSize: 10, marginTop: 32 }}>
          No password needed — we&apos;ll email you a sign-in link.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
