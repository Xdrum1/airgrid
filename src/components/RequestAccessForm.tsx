"use client";

import { useState } from "react";
import { plausible } from "@/lib/plausible";

const USE_CASES = [
  "Operator",
  "Infrastructure Developer",
  "Government / Municipal",
  "Investor",
  "Insurance / Risk",
  "Aerospace / Defense",
  "Research / Academic",
  "Other",
] as const;

export default function RequestAccessForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    organization: "",
    role: "",
    useCase: "",
    website: "", // honeypot
  });
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.name.trim()) return;
    setState("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          company: form.organization,
          role: form.role,
          tier: "pro",
          message: `Use case: ${form.useCase || "Not specified"}\nOrganization: ${form.organization || "Not specified"}\nRole: ${form.role || "Not specified"}`,
          website: form.website,
        }),
      });
      if (res.ok) {
        setState("success");
        plausible("Request Access", { source: "request-access", useCase: form.useCase });
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

  const labelStyle: React.CSSProperties = {
    fontSize: 9,
    letterSpacing: 2,
    color: "#888",
    marginBottom: 6,
    display: "block",
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label style={labelStyle}>NAME *</label>
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
          <label style={labelStyle}>WORK EMAIL *</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@company.com"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label style={labelStyle}>ORGANIZATION</label>
          <input
            type="text"
            value={form.organization}
            onChange={(e) => setForm({ ...form, organization: e.target.value })}
            placeholder="Company or agency"
            style={inputStyle}
            maxLength={100}
          />
        </div>
        <div>
          <label style={labelStyle}>ROLE / TITLE</label>
          <input
            type="text"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            placeholder="Your role"
            style={inputStyle}
            maxLength={100}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>USE CASE</label>
        <select
          value={form.useCase}
          onChange={(e) => setForm({ ...form, useCase: e.target.value })}
          style={{
            ...inputStyle,
            cursor: "pointer",
            appearance: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 14px center",
            paddingRight: 36,
          }}
        >
          <option value="" style={{ background: "#0a0a12", color: "#666" }}>Select your use case</option>
          {USE_CASES.map((uc) => (
            <option key={uc} value={uc} style={{ background: "#0a0a12", color: "#ccc" }}>
              {uc}
            </option>
          ))}
        </select>
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
          background: "#00d4ff",
          color: "#050508",
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
          Something went wrong. Please try again or contact hello@airindex.io.
        </p>
      )}

      <p style={{ fontSize: 10, color: "#555", textAlign: "center", margin: 0, lineHeight: 1.6 }}>
        By requesting access, you agree to receive market updates and the weekly UAM Market Pulse. You can unsubscribe at any time.
      </p>
    </form>
  );
}
