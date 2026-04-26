"use client";

import { useState } from "react";

type ReportType = "risk-assessment" | "site-shortlist" | "ahj-briefing";

const REPORT_OPTIONS: Array<{
  value: ReportType;
  label: string;
  fields: { name: string; label: string; placeholder: string; help?: string }[];
}> = [
  {
    value: "risk-assessment",
    label: "RiskIndex Site Assessment",
    fields: [
      { name: "siteId", label: "FAA Site ID", placeholder: "25FA", help: "Single facility — uppercase" },
    ],
  },
  {
    value: "site-shortlist",
    label: "Site Shortlist Report",
    fields: [
      {
        name: "ids",
        label: "FAA Site IDs",
        placeholder: "25FA,1FD5,CA46",
        help: "Comma-separated, up to 10",
      },
    ],
  },
  {
    value: "ahj-briefing",
    label: "AHJ / Fire Marshal Briefing",
    fields: [
      { name: "jurisdiction", label: "Jurisdiction (state code)", placeholder: "tx", help: "Two-letter state code (lowercase)" },
    ],
  },
];

export default function ShareForm() {
  const [reportType, setReportType] = useState<ReportType>("risk-assessment");
  const [params, setParams] = useState<Record<string, string>>({});
  const [ttlDays, setTtlDays] = useState(30);
  const [clientName, setClientName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ url: string; expiresInDays: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const config = REPORT_OPTIONS.find((o) => o.value === reportType)!;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);
    setCopied(false);
    try {
      const res = await fetch("/api/admin/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: reportType,
          params,
          ttlDays,
          clientName: clientName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult({ url: data.url, expiresInDays: data.expiresInDays });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate share link");
    } finally {
      setSubmitting(false);
    }
  }

  function copy() {
    if (result?.url) {
      navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    background: "#ffffff",
    border: "1px solid #e3e8ee",
    borderRadius: 6,
    color: "#0a2540",
    fontSize: 13,
    fontFamily: "Inter, sans-serif",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    color: "#425466",
    fontSize: 10,
    letterSpacing: 1.5,
    fontFamily: "'Space Mono', monospace",
    marginBottom: 6,
    textTransform: "uppercase",
  };

  return (
    <form
      onSubmit={submit}
      style={{
        background: "#ffffff",
        border: "1px solid #e3e8ee",
        borderRadius: 10,
        padding: "28px 32px",
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Report Type</label>
        <select
          value={reportType}
          onChange={(e) => {
            setReportType(e.target.value as ReportType);
            setParams({});
            setResult(null);
          }}
          style={inputStyle}
        >
          {REPORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {config.fields.map((f) => (
        <div key={f.name} style={{ marginBottom: 20 }}>
          <label style={labelStyle}>{f.label}</label>
          <input
            type="text"
            value={params[f.name] ?? ""}
            onChange={(e) => setParams({ ...params, [f.name]: e.target.value })}
            placeholder={f.placeholder}
            style={inputStyle}
            required
          />
          {f.help && (
            <div style={{ fontSize: 11, color: "#8792a2", marginTop: 4 }}>{f.help}</div>
          )}
        </div>
      ))}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div>
          <label style={labelStyle}>Client Name (optional)</label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Acme Aviation"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Expires In (days)</label>
          <input
            type="number"
            min={1}
            max={180}
            value={ttlDays}
            onChange={(e) => setTtlDays(Math.max(1, Math.min(180, parseInt(e.target.value) || 30)))}
            style={inputStyle}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        style={{
          width: "100%",
          padding: "12px 0",
          background: submitting ? "#cbd5e1" : "#0a2540",
          border: "none",
          borderRadius: 6,
          color: "#ffffff",
          fontSize: 13,
          fontWeight: 700,
          cursor: submitting ? "default" : "pointer",
          letterSpacing: 0.4,
          fontFamily: "Inter, sans-serif",
        }}
      >
        {submitting ? "Generating…" : "Generate Share Link"}
      </button>

      {error && (
        <div
          style={{
            marginTop: 16,
            padding: "10px 14px",
            background: "#fee2e2",
            border: "1px solid #fecaca",
            borderRadius: 6,
            color: "#991b1b",
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <div
          style={{
            marginTop: 24,
            padding: "16px 18px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 8,
          }}
        >
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              letterSpacing: 1.5,
              color: "#16a34a",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Share Link · Expires in {result.expiresInDays} days
          </div>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 12,
              color: "#0a2540",
              wordBreak: "break-all",
              padding: "10px 12px",
              background: "#ffffff",
              border: "1px solid #e3e8ee",
              borderRadius: 4,
              marginBottom: 12,
            }}
          >
            {result.url}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={copy}
              style={{
                padding: "8px 16px",
                background: copied ? "#16a34a" : "#0a2540",
                color: "#ffffff",
                border: "none",
                borderRadius: 5,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {copied ? "✓ Copied" : "Copy URL"}
            </button>
            <a
              href={result.url}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: "8px 16px",
                background: "#ffffff",
                color: "#0a2540",
                border: "1px solid #e3e8ee",
                borderRadius: 5,
                fontSize: 12,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Open Preview ↗
            </a>
          </div>
        </div>
      )}
    </form>
  );
}
