"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { plausible } from "@/lib/plausible";

function ContactForm() {
  const searchParams = useSearchParams();
  const tier = searchParams.get("tier") ?? "";

  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    tier: tier || "pro",
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
        body: JSON.stringify(form),
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

  const isPro = form.tier === "pro";
  const tierLocked = !!tier; // lock when arriving from a specific CTA

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
          {isPro ? "You're on the list" : "Thank you"}
        </h2>
        <p style={{ color: "#999", fontSize: 13, lineHeight: 1.7, marginBottom: 24 }}>
          {isPro
            ? "We'll notify you when Pro launches. In the meantime, all features are free during beta."
            : "We'll reach out within 48 hours."}
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
    fontFamily: "'Space Mono', monospace",
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
        <label style={labelStyle}>INTERESTED IN</label>
        <select
          value={form.tier}
          onChange={(e) => setForm({ ...form, tier: e.target.value })}
          disabled={tierLocked}
          style={{
            ...inputStyle,
            appearance: "none",
            cursor: tierLocked ? "default" : "pointer",
            opacity: tierLocked ? 0.7 : 1,
          }}
        >
          {tierLocked ? (
            <option value={form.tier}>
              {form.tier === "pro" ? "Pro Waitlist" : form.tier === "institutional" ? "Institutional" : "Enterprise"}
            </option>
          ) : (
            <>
              <option value="pro">Pro Waitlist</option>
              <option value="institutional">Institutional</option>
              <option value="enterprise">Enterprise</option>
            </>
          )}
        </select>
      </div>
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>USE CASE</label>
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
          fontFamily: "'Syne', sans-serif",
          letterSpacing: "0.06em",
          cursor: state === "submitting" ? "default" : "pointer",
          transition: "opacity 0.15s",
        }}
      >
        {state === "submitting" ? "SENDING..." : isPro ? "JOIN WAITLIST" : "GET IN TOUCH"}
      </button>
      {state === "error" && (
        <div style={{ color: "#ff4444", fontSize: 11, marginTop: 12, textAlign: "center" }}>
          Something went wrong. Try emailing alan@airindex.io directly.
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
        fontFamily: "'Space Mono', monospace",
        color: "#fff",
      }}
    >
      {/* Nav */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(5,5,8,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "0 20px",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
            <img
              src="/images/logo/airindex-wordmark.svg"
              alt="AirIndex"
              style={{ height: 28 }}
            />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link
              href="/pricing"
              style={{
                color: "#888",
                fontSize: 11,
                letterSpacing: "0.06em",
                textDecoration: "none",
              }}
            >
              Pricing
            </Link>
            <Link
              href="/api"
              style={{
                color: "#888",
                fontSize: 11,
                letterSpacing: "0.06em",
                textDecoration: "none",
              }}
            >
              API
            </Link>
            <Link
              href="/dashboard"
              style={{
                color: "#888",
                fontSize: 11,
                letterSpacing: "0.06em",
                textDecoration: "none",
                padding: "8px 16px",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 6,
              }}
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "clamp(48px, 6vw, 80px) 20px 40px", textAlign: "center" }}>
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
        </p>
      </section>

      {/* Form */}
      <section style={{ padding: "0 20px 80px" }}>
        <Suspense fallback={null}>
          <ContactForm />
        </Suspense>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "24px 20px",
          textAlign: "center",
        }}
      >
        <span style={{ color: "#777", fontSize: 9, letterSpacing: 1 }}>
          © 2026 AIRINDEX · <Link href="/" style={{ color: "#777", textDecoration: "none" }}>HOME</Link> · <Link href="/about" style={{ color: "#777", textDecoration: "none" }}>ABOUT</Link> · <Link href="/pricing" style={{ color: "#777", textDecoration: "none" }}>PRICING</Link> · <Link href="/api" style={{ color: "#777", textDecoration: "none" }}>API</Link> · <Link href="/dashboard" style={{ color: "#777", textDecoration: "none" }}>DASHBOARD</Link>
        </span>
      </footer>
    </div>
  );
}
