"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { plausible } from "@/lib/plausible";

const ALLOWED_PREFIXES = ["/dashboard", "/admin", "/pricing", "/api/docs", "/support"];

function LoginForm() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "sent">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [loadedAt] = useState(() => Date.now());
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

    // Bot detection: honeypot filled or submitted in under 2 seconds
    if (honeypot || Date.now() - loadedAt < 2000) {
      // Fake success — don't reveal detection
      setStep("sent");
      return;
    }

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
        background:
          "linear-gradient(180deg, rgba(91,141,184,0.08) 0%, rgba(167,139,250,0.04) 45%, #ffffff 80%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420, padding: 32, textAlign: "center" }}>
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            marginBottom: 40,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo/airindex-wordmark-light.svg"
            alt="AirIndex"
            style={{ height: 36 }}
          />
        </div>

        <div style={{
          background: "#ffffff",
          border: "1px solid #e3e8ee",
          borderRadius: 14,
          padding: "32px 28px",
          boxShadow: "0 10px 30px rgba(10,37,64,0.08), 0 2px 6px rgba(10,37,64,0.04)",
        }}>

        {step === "email" ? (
          <>
            <h1
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 20,
                fontWeight: 700,
                color: "#0a2540",
                marginBottom: 12,
              }}
            >
              {isSignup ? "Create your free account" : "Welcome back"}
            </h1>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                color: "#425466",
                fontSize: 12,
                marginBottom: 32,
                lineHeight: 1.6,
              }}
            >
              {isSignup
                ? <>Track 20+ UAM markets, get alerts, access regulatory filings.<br />Enter your email to get started — no password needed.</>
                : <>Existing member? Enter your email to receive a sign-in link.<br />New to AirIndex? <a href="/contact" style={{ color: "#5B8DB8", textDecoration: "none" }}>Talk to us</a> to get started.</>
              }
            </p>

            {authError && (
              <div
                style={{
                  color: "#dc2626",
                  fontSize: 11,
                  marginBottom: 16,
                  padding: "10px 14px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 6,
                }}
              >
                {authError === "Verification"
                  ? "That link has expired or was already used. Please try again."
                  : "Something went wrong. Please try again."}
              </div>
            )}

            <form onSubmit={handleEmailSubmit}>
              {/* Honeypot — hidden from humans, bots auto-fill it */}
              <div style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, overflow: "hidden" }} aria-hidden="true">
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoFocus
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  background: "#ffffff",
                  border: "1px solid #e3e8ee",
                  borderRadius: 8,
                  color: "#0a2540",
                  fontSize: 14,
                  fontFamily: "'Inter', sans-serif",
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
                  background: email.trim() ? "#0a2540" : "#cbd5e1",
                  border: "none",
                  borderRadius: 8,
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: "0.02em",
                  cursor: email.trim() ? "pointer" : "default",
                  transition: "all 0.2s",
                }}
              >
                {loading ? "Sending..." : isSignup ? "Create Account" : "Send Sign-In Link"}
              </button>
            </form>

            {error && (
              <p style={{ color: "#dc2626", fontSize: 12, marginTop: 16 }}>{error}</p>
            )}

            <p style={{ color: "#697386", fontSize: 12, marginTop: 24 }}>
              {isSignup ? (
                <>
                  Already have an account?{" "}
                  <a
                    href={`/login${callbackUrl !== "/dashboard" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
                    style={{ color: "#5B8DB8", textDecoration: "none" }}
                  >
                    Sign in
                  </a>
                </>
              ) : (
                <>
                  Need access?{" "}
                  <a
                    href="/contact"
                    style={{ color: "#5B8DB8", textDecoration: "none" }}
                  >
                    Talk to us
                  </a>
                </>
              )}
            </p>
            <p style={{ color: "#697386", fontSize: 11, marginTop: 16 }}>
              No password needed — we&apos;ll email you a sign-in link.
            </p>
            <p style={{ color: "#8792a2", fontSize: 10, marginTop: 12, lineHeight: 1.5 }}>
              By creating an account, you agree to our{" "}
              <a href="/terms" style={{ color: "#5B8DB8", textDecoration: "none" }}>Terms of Service</a> and{" "}
              <a href="/privacy" style={{ color: "#5B8DB8", textDecoration: "none" }}>Privacy Policy</a>, and to receive
              market updates and the weekly UAM Market Pulse newsletter. You can{" "}
              <a href="/privacy#your-rights" style={{ color: "#5B8DB8", textDecoration: "none" }}>unsubscribe</a> at any time.
            </p>
          </>
        ) : (
          <>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "rgba(91,141,184,0.1)",
                border: "1px solid rgba(91,141,184,0.3)",
                color: "#5B8DB8",
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
                color: "#0a2540",
                marginBottom: 12,
              }}
            >
              Check your email
            </h1>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                color: "#425466",
                fontSize: 12,
                marginBottom: 32,
                lineHeight: 1.6,
              }}
            >
              {isSignup ? "We sent a verification link to" : "We sent a sign-in link to"}
              <br />
              <span style={{ color: "#0a2540", fontWeight: 700 }}>{email}</span>
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
                color: "#697386",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#0a2540")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#697386")}
            >
              ← Use a different email
            </button>

            <p style={{ color: "#8792a2", fontSize: 11, marginTop: 32 }}>
              Link expires in 10 minutes. Check spam if you don&apos;t see it.
            </p>
          </>
        )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#697386", fontSize: 13, fontFamily: "'Inter', sans-serif", letterSpacing: "0.08em" }}>Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
