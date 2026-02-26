"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const authError = searchParams.get("error");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first code input when step changes
  useEffect(() => {
    if (step === "code") {
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    }
  }, [step]);

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
        setStep("code");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function handleCodeSubmit(fullCode?: string) {
    const codeStr = fullCode || code.join("");
    if (codeStr.length !== 6) return;
    setLoading(true);
    setError("");

    // Construct the NextAuth callback URL with the verification token
    const authUrl = process.env.NEXT_PUBLIC_AUTH_URL || window.location.origin;
    const params = new URLSearchParams({
      callbackUrl,
      token: codeStr,
      email: email.trim(),
    });

    window.location.href = `${authUrl}/api/auth/callback/ses?${params.toString()}`;
  }

  function handleCodeInput(index: number, value: string) {
    // Handle paste of full code
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const newCode = [...code];
      digits.forEach((d, i) => {
        if (index + i < 6) newCode[index + i] = d;
      });
      setCode(newCode);
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      if (newCode.every((d) => d !== "")) {
        handleCodeSubmit(newCode.join(""));
      }
      return;
    }

    const digit = value.replace(/\D/g, "");
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (digit && newCode.every((d) => d !== "")) {
      handleCodeSubmit(newCode.join(""));
    }
  }

  function handleCodeKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newCode = [...code];
      newCode[index - 1] = "";
      setCode(newCode);
    }
    if (e.key === "Enter") {
      handleCodeSubmit();
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

        {step === "email" ? (
          <>
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
              Enter your email to receive a verification code.
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
                  ? "That code has expired or was already used. Please try again."
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
                {loading ? "SENDING..." : "SEND VERIFICATION CODE"}
              </button>
            </form>

            {error && (
              <p style={{ color: "#ff4444", fontSize: 12, marginTop: 16 }}>{error}</p>
            )}

            <p style={{ color: "#333", fontSize: 10, marginTop: 32 }}>
              No password needed — we&apos;ll email you a 6-digit code.
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
                fontFamily: "'Syne', sans-serif",
                fontSize: 20,
                fontWeight: 800,
                color: "#fff",
                marginBottom: 12,
              }}
            >
              Enter verification code
            </h1>
            <p
              style={{
                color: "#888899",
                fontSize: 12,
                marginBottom: 32,
                lineHeight: 1.6,
              }}
            >
              We sent a 6-digit code to
              <br />
              <span style={{ color: "#7c3aed", fontWeight: 700 }}>{email}</span>
            </p>

            {/* 6-digit code input */}
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "center",
                marginBottom: 24,
              }}
            >
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleCodeInput(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  disabled={loading}
                  style={{
                    width: 44,
                    height: 52,
                    textAlign: "center",
                    fontSize: 20,
                    fontWeight: 700,
                    fontFamily: "'Space Mono', monospace",
                    background: "#0a0a12",
                    border: digit
                      ? "1px solid rgba(124,58,237,0.5)"
                      : "1px solid #1a1a2e",
                    borderRadius: 8,
                    color: "#e0e0e8",
                    outline: "none",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(124,58,237,0.8)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = digit
                      ? "rgba(124,58,237,0.5)"
                      : "#1a1a2e";
                  }}
                />
              ))}
            </div>

            {loading && (
              <p style={{ color: "#7c3aed", fontSize: 12, marginBottom: 16 }}>
                Verifying...
              </p>
            )}

            {error && (
              <p style={{ color: "#ff4444", fontSize: 12, marginBottom: 16 }}>{error}</p>
            )}

            <button
              onClick={() => {
                setStep("email");
                setCode(["", "", "", "", "", ""]);
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

            <p style={{ color: "#333", fontSize: 10, marginTop: 32 }}>
              Code expires in 10 minutes. Check spam if you don&apos;t see it.
            </p>
          </>
        )}
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
