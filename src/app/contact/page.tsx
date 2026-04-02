"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { plausible } from "@/lib/plausible";
import NavClient from "@/components/NavClient";
import SiteFooter from "@/components/SiteFooter";

function ContactForm() {
  const searchParams = useSearchParams();
  const inquiry = searchParams.get("inquiry") ?? "";
  const ref = searchParams.get("ref") ?? "";
  const buyer = searchParams.get("buyer") ?? "";

  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    tier: inquiry || "general",
    buyerType: buyer || "",
    message: "",
    website: "", // honeypot — bots fill this, humans don't see it
  });
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setState("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source: ref || undefined, buyerType: form.buyerType || undefined }),
      });
      if (res.ok) {
        setState("success");
        plausible("Contact Submission", { tier: form.tier });
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  };

  const inquiryLocked = !!inquiry;

  if (state === "success") {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>&#10003;</div>
        <h2
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 24,
            marginBottom: 12,
          }}
        >
          Inquiry received
        </h2>
        <p style={{ color: "#999", fontSize: 13, lineHeight: 1.7, marginBottom: 24 }}>
          We&apos;ll review your inquiry and reach out within 48 hours.
        </p>
        <Link
          href="/dashboard"
          style={{
            color: "#00d4ff",
            fontSize: 11,
            letterSpacing: 1,
            textDecoration: "none",
          }}
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 6,
    color: "#fff",
    fontSize: 13,
    fontFamily: "'Inter', sans-serif",
    outline: "none",
    boxSizing: "border-box" as const,
  };

  const labelStyle = {
    display: "block",
    color: "#999",
    fontSize: 9,
    letterSpacing: 2,
    marginBottom: 6,
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 480, margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>NAME *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            style={inputStyle}
            placeholder="Jane Smith"
          />
        </div>
        <div>
          <label style={labelStyle}>WORK EMAIL *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            style={inputStyle}
            placeholder="jane@company.com"
          />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>COMPANY</label>
          <input
            type="text"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            style={inputStyle}
            placeholder="Acme Aviation"
          />
        </div>
        <div>
          <label style={labelStyle}>ROLE</label>
          <input
            type="text"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            style={inputStyle}
            placeholder="Strategy Analyst"
          />
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>INQUIRY TYPE</label>
        <select
          value={form.tier}
          onChange={(e) => setForm({ ...form, tier: e.target.value })}
          disabled={inquiryLocked}
          style={{
            ...inputStyle,
            appearance: "none",
            cursor: inquiryLocked ? "default" : "pointer",
            opacity: inquiryLocked ? 0.7 : 1,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 14px center",
            paddingRight: 36,
          }}
        >
          <option value="general">General Inquiry</option>
          <option value="data-license">Data License</option>
          <option value="market-report">Market Intelligence Report</option>
          <option value="heliport-audit">Heliport Infrastructure Audit</option>
          <option value="api-access">API Access</option>
          <option value="partnership">Partnership / Data Exchange</option>
          <option value="press">Press / Research</option>
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>I AM A</label>
        <select
          value={form.buyerType}
          onChange={(e) => setForm({ ...form, buyerType: e.target.value })}
          style={{
            ...inputStyle,
            appearance: "none",
            cursor: "pointer",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 14px center",
            paddingRight: 36,
          }}
        >
          <option value="">Select your role</option>
          <option value="infra-developer">Infrastructure Developer / Investor</option>
          <option value="operator">eVTOL / AAM Operator</option>
          <option value="municipality">City Planner / Municipality / State Agency</option>
          <option value="airport-authority">Airport Authority</option>
          <option value="heliport-owner">Heliport or Vertiport Owner</option>
          <option value="insurance">Insurance Carrier / Underwriter</option>
          <option value="federal">Federal Agency / DOT</option>
          <option value="economic-dev">Economic Development Alliance</option>
          <option value="defense">Defense / Aerospace</option>
          <option value="weather-sensor">Weather / Sensor Provider</option>
          <option value="academia">Academia / Research</option>
          <option value="press">Press / Media</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>WHAT ARE YOU WORKING ON?</label>
        <textarea
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          rows={3}
          style={{
            ...inputStyle,
            resize: "vertical",
          }}
          placeholder="What are you looking to use AirIndex for?"
        />
      </div>
      {/* Honeypot — hidden from humans, bots auto-fill it */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "-9999px", height: 0, overflow: "hidden", tabIndex: -1 } as React.CSSProperties}>
        <label htmlFor="website">Website</label>
        <input
          type="text"
          id="website"
          name="website"
          autoComplete="off"
          tabIndex={-1}
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
        />
      </div>
      <button
        type="submit"
        disabled={state === "submitting" || !form.name.trim() || !form.email.trim()}
        style={{
          width: "100%",
          padding: "14px 0",
          background: state === "submitting" ? "#333" : "#00d4ff",
          border: "none",
          borderRadius: 6,
          color: "#050508",
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "'Inter', sans-serif",
          letterSpacing: "0.06em",
          cursor: state === "submitting" ? "default" : "pointer",
          transition: "opacity 0.15s",
        }}
      >
        {state === "submitting" ? "SENDING..." : "SEND INQUIRY"}
      </button>
      <p style={{ color: "#555", fontSize: 9, marginTop: 12, textAlign: "center", lineHeight: 1.5 }}>
        By submitting, you agree to our{" "}
        <a href="/terms" style={{ color: "#00d4ff", textDecoration: "none" }}>Terms of Service</a> and{" "}
        <a href="/privacy" style={{ color: "#00d4ff", textDecoration: "none" }}>Privacy Policy</a>. You may receive
        the monthly UAM Market Pulse and product updates. You can unsubscribe at any time.
      </p>
      {state === "error" && (
        <div style={{ color: "#ff4444", fontSize: 11, marginTop: 12, textAlign: "center" }}>
          Something went wrong. Try emailing hello@airindex.io directly.
        </div>
      )}
    </form>
  );
}

export default function ContactPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050508",
        fontFamily: "'Inter', sans-serif",
        color: "#fff",
      }}
    >
      <NavClient isAuthed={false} />

      {/* Header */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "clamp(48px, 6vw, 80px) 20px 40px", textAlign: "center" }}>
        <div style={{
          fontSize: 9,
          letterSpacing: 3,
          color: "#00d4ff",
          fontFamily: "'Space Mono', monospace",
          marginBottom: 16,
        }}>
          DATA LICENSES &middot; REPORTS &middot; API &middot; PARTNERSHIPS
        </div>
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(24px, 3.5vw, 36px)",
            margin: "0 0 12px",
          }}
        >
          Talk to us
        </h1>
        <p style={{ fontFamily: "'Inter', sans-serif", color: "#999", fontSize: 14, margin: 0, lineHeight: 1.6 }}>
          Tell us what you&apos;re working on and we&apos;ll reach out within 48 hours.
          All data access is negotiated &mdash; no self-serve checkout.
        </p>
      </section>

      {/* Form */}
      <section style={{ padding: "0 20px 80px" }}>
        <Suspense fallback={null}>
          <ContactForm />
        </Suspense>
      </section>

      <SiteFooter />
    </div>
  );
}
