"use client";

import { useState } from "react";

export default function PulseSubscribe({
  source = "homepage",
  compact = false,
  theme = "dark",
}: {
  source?: string;
  compact?: boolean;
  theme?: "dark" | "light";
}) {
  const isLight = theme === "light";
  const [form, setForm] = useState({ name: "", organization: "", email: "", website: "" });
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setState("submitting");

    try {
      const res = await fetch("/api/pulse-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source }),
      });
      setState(res.ok ? "success" : "error");
    } catch {
      setState("error");
    }
  };

  if (state === "success") {
    return (
      <div style={{
        padding: compact ? "16px 20px" : "24px",
        background: "rgba(91,141,184,0.04)",
        border: "1px solid rgba(91,141,184,0.12)",
        borderRadius: 8,
        textAlign: "center",
      }}>
        <div style={{ fontSize: 16, marginBottom: 6 }}>&#10003;</div>
        <div style={{ color: "#5B8DB8", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
          You&apos;re on the list.
        </div>
        <div style={{ color: "#666", fontSize: 11 }}>
          We&apos;ll send you the next Market Pulse when it publishes.
        </div>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    background: isLight ? "#ffffff" : "rgba(255,255,255,0.03)",
    border: isLight ? "1px solid #e3e8ee" : "1px solid rgba(255,255,255,0.1)",
    borderRadius: 6,
    color: isLight ? "#0a2540" : "#fff",
    fontSize: 12,
    fontFamily: "'Inter', sans-serif",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{
      padding: compact ? "20px" : "28px 24px",
      background: isLight ? "#ffffff" : "rgba(255,255,255,0.02)",
      border: isLight ? "1px solid #e3e8ee" : "1px solid rgba(255,255,255,0.06)",
      borderRadius: 10,
    }}>
      {!compact && (
        <>
          <div style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 9,
            letterSpacing: 2,
            color: "#5B8DB8",
            marginBottom: 10,
          }}>
            UAM MARKET PULSE
          </div>
          <div style={{
            color: isLight ? "#0a2540" : "#ccc",
            fontSize: 15,
            fontWeight: 600,
            fontFamily: "'Space Grotesk', sans-serif",
            marginBottom: 6,
          }}>
            Free monthly intelligence on what&apos;s moving and why.
          </div>
          <div style={{ color: isLight ? "#425466" : "#666", fontSize: 12, lineHeight: 1.6, marginBottom: 20 }}>
            Score movements, regulatory signals, operator activity, and federal program tracking.
            No paywall. No sales pitch.
          </div>
        </>
      )}

      {compact && (
        <div style={{ color: isLight ? "#425466" : "#888", fontSize: 12, marginBottom: 12 }}>
          Get the next Market Pulse in your inbox.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{
          display: "grid",
          gridTemplateColumns: compact ? "1fr 1fr 1fr auto" : "1fr 1fr 1fr",
          gap: 10,
          marginBottom: compact ? 0 : 10,
        }}>
          <input
            type="text"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="Organization"
            value={form.organization}
            onChange={(e) => setForm({ ...form, organization: e.target.value })}
            style={inputStyle}
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            style={inputStyle}
          />
          {compact && (
            <button
              type="submit"
              disabled={state === "submitting"}
              style={{
                padding: "10px 20px",
                background: state === "submitting" ? "#333" : "#5B8DB8",
                border: "none",
                borderRadius: 6,
                color: "#050508",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                cursor: state === "submitting" ? "default" : "pointer",
                fontFamily: "'Inter', sans-serif",
                whiteSpace: "nowrap",
              }}
            >
              {state === "submitting" ? "..." : "Subscribe"}
            </button>
          )}
        </div>
        {/* Honeypot */}
        <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "-9999px", height: 0, overflow: "hidden" }}>
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
          />
        </div>
        {!compact && (
          <button
            type="submit"
            disabled={state === "submitting"}
            style={{
              padding: "11px 28px",
              background: state === "submitting" ? (isLight ? "#cbd5e1" : "#333") : "#5B8DB8",
              border: "none",
              borderRadius: 6,
              color: "#ffffff",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              cursor: state === "submitting" ? "default" : "pointer",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {state === "submitting" ? "Subscribing..." : "Subscribe — it\u2019s free"}
          </button>
        )}
      </form>
      {state === "error" && (
        <div style={{ color: "#ff4444", fontSize: 11, marginTop: 8 }}>
          Something went wrong. Try again or email info@airindex.io.
        </div>
      )}
    </div>
  );
}
