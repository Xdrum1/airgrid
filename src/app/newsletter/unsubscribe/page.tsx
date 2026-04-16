"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function UnsubscribeForm() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleUnsubscribe() {
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', sans-serif",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: "100%",
          background: "#f9fbfd",
          border: "1px solid #e3e8ee",
          borderRadius: 12,
          padding: 40,
          textAlign: "center",
        }}
      >
        <h1 style={{ color: "#0a2540", fontSize: 22, margin: "0 0 12px" }}>
          Unsubscribe from UAM Market Pulse
        </h1>

        {status === "idle" && (
          <>
            <p style={{ color: "#697386", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
              Click below to unsubscribe <strong style={{ color: "#425466" }}>{email}</strong> from
              the weekly newsletter. You&rsquo;ll still have access to your AirIndex account.
            </p>
            <button
              onClick={handleUnsubscribe}
              style={{
                background: "#5B8DB8",
                color: "#ffffff",
                border: "1px solid #5B8DB8",
                padding: "12px 32px",
                borderRadius: 6,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Unsubscribe
            </button>
          </>
        )}

        {status === "loading" && (
          <p style={{ color: "#697386", fontSize: 14 }}>Processing...</p>
        )}

        {status === "done" && (
          <>
            <p style={{ color: "#4ade80", fontSize: 16, margin: "0 0 12px" }}>
              You&rsquo;ve been unsubscribed.
            </p>
            <p style={{ color: "#697386", fontSize: 14, lineHeight: 1.6 }}>
              You won&rsquo;t receive any more newsletter emails. Your AirIndex account remains
              active.
            </p>
            <a
              href="https://www.airindex.io"
              style={{ color: "#00c2ff", fontSize: 14, textDecoration: "none", marginTop: 16, display: "inline-block" }}
            >
              Back to AirIndex
            </a>
          </>
        )}

        {status === "error" && (
          <>
            <p style={{ color: "#f87171", fontSize: 14, margin: "0 0 12px" }}>
              Something went wrong. Please try again or email hello@airindex.io.
            </p>
            <button
              onClick={() => setStatus("idle")}
              style={{
                background: "#5B8DB8",
                color: "#ffffff",
                border: "1px solid #5B8DB8",
                padding: "10px 24px",
                borderRadius: 6,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "#697386" }}>Loading...</p>
        </div>
      }
    >
      <UnsubscribeForm />
    </Suspense>
  );
}
