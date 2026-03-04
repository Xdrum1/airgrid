"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { plausible } from "@/lib/plausible";

const ALLOWED_PREFIXES = ["/dashboard", "/admin", "/pricing", "/api/docs"];

function LoginForm() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "sent">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get("callbackUrl") || "/dashboard";
  const callbackUrl = ALLOWED_PREFIXES.some((p) => rawCallback.startsWith(p))
    ? rawCallback
    : "/dashboard";
  const authError = searchParams.get("error");
  const isSignup = searchParams.get("mode") === "signup";

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");

    try {
      const result = await signIn("ses", {
        email: email.trim(),
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error === "Configuration"
          ? "Auth service error — please try again or contact support."
          : "Something went wrong. Please try again.");
        setLoading(false);
      } else {
        plausible("Sign In Attempt");
        setStep("sent");
        setLoading(false);
      }
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
          <img
            src="/images/logo/airindex-wordmark.svg"
            alt="AirIndex"
            style={{ height: 36 }}
          />
        </div>

        {step === "email" ? (
          <>
            <h1
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 20,
                fontWeight: 700,
                color: "#fff",
                marginBottom: 12,
              }}
            >
              {isSignup ? "Create your free account" : "Sign in to AirIndex"}
            </h1>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                color: "#888899",
                fontSize: 12,
                marginBottom: 32,
                lineHeight: 1.6,
              }}
            >
              {isSignup
                ? <>Track 20 UAM markets, get alerts, access regulatory filings.<br />Enter your email to get started — no password needed.</>
                : <>Get alerts, track markets, access regulatory filings.<br />Enter your email to receive a sign-in link.</>
              }
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

            <form onSubmit={handleEmailSubmit}>
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
                {loading ? "SENDING..." : isSignup ? "CREATE ACCOUNT" : "SEND SIGN-IN LINK"}
              </button>
            </form>

            {error && (
              <p style={{ color: "#ff4444", fontSize: 12, marginTop: 16 }}>{error}</p>
            )}

            <p style={{ color: "#666", fontSize: 10, marginTop: 32 }}>
              {isSignup
                ? "No password needed — we\u2019ll email you a magic link to get started."
                : "No password needed — we\u2019ll email you a sign-in link."}
            </p>
          </>
        ) : (
          <>
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
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 20,
                fontWeight: 700,
                color: "#fff",
                marginBottom: 12,
              }}
            >
              Check your email
            </h1>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                color: "#888899",
                fontSize: 12,
                marginBottom: 32,
                lineHeight: 1.6,
              }}
            >
              {isSignup ? "We sent a verification link to" : "We sent a sign-in link to"}
              <br />
              <span style={{ color: "#7c3aed", fontWeight: 700 }}>{email}</span>
              <br />
              <br />
              {isSignup ? "Click the link in the email to activate your account." : "Click the link in the email to sign in."}
            </p>

            <button
              onClick={() => {
                setStep("email");
                setError("");
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "#555",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "'Space Mono', monospace",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#888")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
            >
              ← Use a different email
            </button>

            <p style={{ color: "#666", fontSize: 10, marginTop: 32 }}>
              Link expires in 10 minutes. Check spam if you don&apos;t see it.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#050508", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#555", fontSize: 13, fontFamily: "'Space Mono', monospace", letterSpacing: 2 }}>LOADING...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
