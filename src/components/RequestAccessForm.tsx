"use client";

import { useState } from "react";
import { plausible } from "@/lib/plausible";

export default function RequestAccessForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    context: "",
    website: "", // honeypot
  });
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim()) return;
    setState("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          message: form.context || "Requested access from /request-access",
          tier: "pro",
          company: "",
          role: "",
          website: form.website,
        }),
      });
      if (res.ok) {
        setState("success");
        plausible("Request Access", { source: "request-access" });
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    background: "#0a0a12",
    border: "1px solid #1a1a2e",
    borderRadius: 6,
    color: "#ccc",
    fontSize: 13,
    fontFamily: "'Inter', sans-serif",
    outline: "none",
    transition: "border-color 0.15s",
  };

  if (state === "success") {
    return (
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <div
          style={{
            fontSize: 14,
            color: "#00ff88",
            marginBottom: 8,
            fontFamily: "'Inter', sans-serif",
            fontWeight: 700,
          }}
        >
          Request received
        </div>
        <p style={{ fontSize: 12, color: "#888", lineHeight: 1.6 }}>
          We&apos;ll review your request and send an invite link to your email.
          Most requests are processed within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <label
          style={{
            fontSize: 9,
            letterSpacing: 2,
            color: "#888",
            marginBottom: 6,
            display: "block",
          }}
        >
          EMAIL *
        </label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="you@company.com"
          style={inputStyle}
        />
      </div>

      <div>
        <label
          style={{
            fontSize: 9,
            letterSpacing: 2,
            color: "#888",
            marginBottom: 6,
            display: "block",
          }}
        >
          NAME *
        </label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Your name"
          style={inputStyle}
          maxLength={100}
        />
      </div>

      <div>
        <label
          style={{
            fontSize: 9,
            letterSpacing: 2,
            color: "#888",
            marginBottom: 6,
            display: "block",
          }}
        >
          HOW DID YOU HEAR ABOUT US?
        </label>
        <input
          type="text"
          value={form.context}
          onChange={(e) => setForm({ ...form, context: e.target.value })}
          placeholder="Optional"
          style={inputStyle}
          maxLength={200}
        />
      </div>

      {/* Honeypot */}
      <div style={{ position: "absolute", left: -9999, top: -9999 }} aria-hidden="true">
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
        />
      </div>

      <button
        type="submit"
        disabled={state === "submitting" || !form.email.trim() || !form.name.trim()}
        style={{
          padding: "14px 28px",
          background: "#7c3aed",
          color: "#fff",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 2,
          border: "none",
          borderRadius: 6,
          cursor: state === "submitting" ? "wait" : "pointer",
          fontFamily: "'Inter', sans-serif",
          transition: "opacity 0.15s",
          opacity: state === "submitting" ? 0.6 : 1,
          marginTop: 8,
        }}
      >
        {state === "submitting" ? "SUBMITTING..." : "REQUEST ACCESS"}
      </button>

      {state === "error" && (
        <p style={{ fontSize: 11, color: "#ff4444", textAlign: "center", margin: 0 }}>
          Something went wrong. Please try again.
        </p>
      )}

      <p style={{ fontSize: 10, color: "#777", textAlign: "center", margin: 0, lineHeight: 1.6 }}>
        Free during early access. No credit card required.
      </p>
    </form>
  );
}
