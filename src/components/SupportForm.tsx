"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const CATEGORIES = [
  { value: "billing", label: "Billing & Payments" },
  { value: "technical", label: "Technical Issue" },
  { value: "account", label: "Account & Access" },
  { value: "data", label: "Data & Scoring" },
  { value: "feature", label: "Feature Request" },
  { value: "general", label: "General" },
];

export default function SupportForm() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "general";

  const [category, setCategory] = useState(initialCategory);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const userEmail = session?.user?.email || "";
  const userTier = (session?.user as { tier?: string } | undefined)?.tier ?? "free";

  if (status === "loading") {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <div style={{ color: "#555", fontSize: 13, letterSpacing: 2 }}>LOADING...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20, marginBottom: 12 }}>
          Sign in to contact support
        </h2>
        <p style={{ color: "#888", fontSize: 13, marginBottom: 24 }}>
          Please sign in first so we can help you faster.
        </p>
        <Link
          href={`/login?callbackUrl=${encodeURIComponent("/support" + (initialCategory !== "general" ? `?category=${initialCategory}` : ""))}`}
          style={{
            display: "inline-block",
            padding: "12px 28px",
            background: "#00d4ff",
            color: "#050508",
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
            borderRadius: 6,
            letterSpacing: "0.04em",
          }}
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "rgba(0,255,136,0.1)",
            border: "1px solid rgba(0,255,136,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            fontSize: 22,
          }}
        >
          &#10003;
        </div>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20, marginBottom: 12 }}>
          Message sent
        </h2>
        <p style={{ color: "#888", fontSize: 13, lineHeight: 1.7, marginBottom: 8 }}>
          We&apos;ll get back to you at <span style={{ color: "#00d4ff" }}>{userEmail}</span> within 24 hours.
        </p>
        <p style={{ color: "#666", fontSize: 12, marginBottom: 32 }}>
          Check your email for a confirmation.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 6,
            padding: "10px 24px",
            color: "#aaa",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            letterSpacing: "0.04em",
          }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setState("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, subject, message, website: honeypot }),
      });

      if (res.ok) {
        setState("success");
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || "Something went wrong. Please try again.");
        setState("error");
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setState("error");
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 6,
    color: "#fff",
    fontSize: 13,
    fontFamily: "'Inter', sans-serif",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    color: "#999",
    fontSize: 9,
    letterSpacing: 2,
    marginBottom: 6,
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 520, margin: "0 auto" }}>
      {/* User info — read-only */}
      <div
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 6,
          padding: "14px 16px",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ color: "#888", fontSize: 12 }}>{userEmail}</span>
        <span
          style={{
            fontSize: 9,
            letterSpacing: 1,
            color: userTier === "free" ? "#666" : "#00d4ff",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          {userTier === "grandfathered" ? "PRO (FOUNDING)" : userTier}
        </span>
      </div>

      {/* Category */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>CATEGORY</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{
            ...inputStyle,
            appearance: "none",
            cursor: "pointer",
          }}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Subject */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>SUBJECT</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          style={inputStyle}
          placeholder="Brief description of your issue"
          maxLength={200}
        />
      </div>

      {/* Message */}
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>MESSAGE *</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          required
          style={{
            ...inputStyle,
            resize: "vertical",
            minHeight: 120,
          }}
          placeholder="Describe your issue or question in detail..."
          maxLength={5000}
        />
        <div style={{ textAlign: "right", color: "#444", fontSize: 9, marginTop: 4 }}>
          {message.length}/5000
        </div>
      </div>

      {/* Honeypot */}
      <div
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", top: "-9999px", height: 0, overflow: "hidden" } as React.CSSProperties}
      >
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={state === "submitting" || !message.trim()}
        style={{
          width: "100%",
          padding: "14px 0",
          background: !message.trim() ? "#1a1a2e" : state === "submitting" ? "#333" : "#00d4ff",
          border: "none",
          borderRadius: 6,
          color: !message.trim() ? "#555" : "#050508",
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "'Inter', sans-serif",
          letterSpacing: "0.06em",
          cursor: !message.trim() || state === "submitting" ? "default" : "pointer",
          transition: "all 0.15s",
        }}
      >
        {state === "submitting" ? "SENDING..." : "SEND MESSAGE"}
      </button>

      {state === "error" && (
        <div style={{ color: "#ff4444", fontSize: 11, marginTop: 12, textAlign: "center" }}>
          {errorMsg}
        </div>
      )}

      <p style={{ color: "#444", fontSize: 10, marginTop: 16, textAlign: "center", lineHeight: 1.6 }}>
        You can also email us directly at{" "}
        <a href="mailto:support@airindex.io" style={{ color: "#00d4ff", textDecoration: "none" }}>
          support@airindex.io
        </a>
      </p>
    </form>
  );
}
