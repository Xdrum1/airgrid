"use client";

import { useState } from "react";
import Link from "next/link";

interface ScreeningResult {
  facilityId: string;
  facilityName: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  siteType: string;
  ownershipType: string | null;
  complianceStatus: string;
  complianceScore: number;
  flagCount: number;
  q1: string;
  q2: string;
  q3: string;
  q4: string;
  q5: string;
  q1Note: string | null;
  q2Note: string | null;
  q3Note: string | null;
  q4Note: string | null;
  q5Note: string | null;
  determinationCount: number;
  marketId: string | null;
}

interface ScreeningResponse {
  matched: ScreeningResult[];
  unmatched: string[];
  summary: {
    total: number;
    matched: number;
    unmatched: number;
    compliant: number;
    conditional: number;
    objectionable: number;
    unknown: number;
  };
}

const STATUS_COLORS: Record<string, string> = {
  compliant: "#16a34a",
  conditional: "#f59e0b",
  objectionable: "#dc2626",
  unknown: "#666",
};

export default function PortfolioScreener() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"id" | "state" | "name">("id");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScreeningResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScreen = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/admin/portfolio-screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: input.trim(), mode }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to screen portfolio");
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    if (!result) return;
    const headers = [
      "Facility ID", "Facility Name", "City", "State", "Lat", "Lng",
      "Site Type", "Ownership", "Compliance Status", "Score (0-5)", "Flags",
      "Q1 FAA Registration", "Q2 Airspace Determination", "Q3 State Enforcement",
      "Q4 NFPA 418", "Q5 eVTOL Viability",
      "Q1 Note", "Q2 Note", "Q3 Note", "Q4 Note", "Q5 Note",
      "FAA Determinations", "Market",
    ];
    const rows = result.matched.map((r) => [
      r.facilityId, `"${r.facilityName}"`, r.city, r.state, r.lat, r.lng,
      r.siteType, r.ownershipType ?? "", r.complianceStatus, r.complianceScore, r.flagCount,
      r.q1, r.q2, r.q3, r.q4, r.q5,
      `"${(r.q1Note ?? "").replace(/"/g, '""')}"`,
      `"${(r.q2Note ?? "").replace(/"/g, '""')}"`,
      `"${(r.q3Note ?? "").replace(/"/g, '""')}"`,
      `"${(r.q4Note ?? "").replace(/"/g, '""')}"`,
      `"${(r.q5Note ?? "").replace(/"/g, '""')}"`,
      r.determinationCount, r.marketId ?? "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `airindex_portfolio_screening_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ background: "#050508", color: "#e0e0e0", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <Link href="/admin/review" style={{ color: "#555", fontSize: 12, textDecoration: "none" }}>← Admin</Link>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: "#fff", margin: "12px 0 4px" }}>
              Portfolio Screener
            </h1>
            <p style={{ color: "#888", fontSize: 13 }}>Match facilities against the AirIndex compliance database</p>
          </div>
        </div>

        {/* Input */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 24, marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            {[
              { value: "id" as const, label: "FAA Facility IDs" },
              { value: "state" as const, label: "By State Code" },
              { value: "name" as const, label: "Facility Names" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setMode(opt.value)}
                style={{
                  padding: "6px 16px",
                  borderRadius: 4,
                  border: mode === opt.value ? "1px solid #5B8DB8" : "1px solid rgba(255,255,255,0.1)",
                  background: mode === opt.value ? "rgba(91,141,184,0.1)" : "transparent",
                  color: mode === opt.value ? "#5B8DB8" : "#888",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  letterSpacing: "0.04em",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === "id" ? "Paste FAA facility IDs, one per line (e.g., 0LA1, HHR, BUR)..."
              : mode === "state" ? "Enter state code (e.g., FL, TX, CA)..."
              : "Paste facility names, one per line..."
            }
            style={{
              width: "100%",
              minHeight: 120,
              padding: 16,
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              color: "#e0e0e0",
              fontSize: 13,
              fontFamily: "'Space Mono', monospace",
              resize: "vertical",
            }}
          />

          <div style={{ display: "flex", gap: 12, marginTop: 16, alignItems: "center" }}>
            <button
              onClick={handleScreen}
              disabled={loading || !input.trim()}
              style={{
                padding: "10px 28px",
                background: loading ? "#333" : "#5B8DB8",
                color: loading ? "#888" : "#050508",
                border: "none",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                cursor: loading ? "wait" : "pointer",
                letterSpacing: "0.06em",
              }}
            >
              {loading ? "SCREENING..." : "SCREEN PORTFOLIO"}
            </button>
            {result && (
              <button
                onClick={exportCsv}
                style={{
                  padding: "10px 28px",
                  background: "transparent",
                  color: "#5B8DB8",
                  border: "1px solid rgba(91,141,184,0.3)",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  letterSpacing: "0.06em",
                }}
              >
                EXPORT CSV
              </button>
            )}
          </div>
        </div>

        {error && (
          <div style={{ padding: 16, background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 8, color: "#f87171", fontSize: 13, marginBottom: 24 }}>
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <>
            {/* Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 1, background: "rgba(255,255,255,0.06)", borderRadius: 8, overflow: "hidden", marginBottom: 24 }}>
              {[
                { value: result.summary.total, label: "Input", color: "#fff" },
                { value: result.summary.matched, label: "Matched", color: "#5B8DB8" },
                { value: result.summary.compliant, label: "Compliant", color: "#16a34a" },
                { value: result.summary.conditional, label: "Conditional", color: "#f59e0b" },
                { value: result.summary.objectionable, label: "Objectionable", color: "#dc2626" },
                { value: result.summary.unknown, label: "Unknown", color: "#666" },
              ].map((s) => (
                <div key={s.label} style={{ background: "#0a0a12", padding: 16, textAlign: "center" }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#666", marginTop: 4 }}>{s.label.toUpperCase()}</div>
                </div>
              ))}
            </div>

            {/* Unmatched */}
            {result.unmatched.length > 0 && (
              <div style={{ padding: 16, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 8, marginBottom: 24 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", letterSpacing: 1, marginBottom: 8 }}>
                  {result.unmatched.length} UNMATCHED
                </div>
                <div style={{ fontSize: 11, color: "#888", fontFamily: "'Space Mono', monospace" }}>
                  {result.unmatched.join(", ")}
                </div>
              </div>
            )}

            {/* Results table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr>
                    {["Facility", "City/State", "Type", "Status", "Score", "Q1", "Q2", "Q3", "Q4", "Q5", "Det."].map((h) => (
                      <th key={h} style={{ padding: "8px 8px", textAlign: "left", borderBottom: "2px solid #5B8DB8", color: "#888", fontSize: 9, fontWeight: 700, letterSpacing: 1, whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.matched.map((r) => (
                    <tr key={r.facilityId} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "6px 8px" }}>
                        <div style={{ fontWeight: 600, color: "#ddd" }}>{r.facilityName.slice(0, 30)}</div>
                        <div style={{ fontSize: 9, color: "#555", fontFamily: "'Space Mono', monospace" }}>{r.facilityId}</div>
                      </td>
                      <td style={{ padding: "6px 8px", color: "#999" }}>{r.city}, {r.state}</td>
                      <td style={{ padding: "6px 8px", color: "#888", fontSize: 10 }}>{r.siteType}</td>
                      <td style={{ padding: "6px 8px" }}>
                        <span style={{ color: STATUS_COLORS[r.complianceStatus] ?? "#666", fontWeight: 700, fontSize: 10, letterSpacing: 0.5 }}>
                          {r.complianceStatus.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "6px 8px", fontFamily: "'Space Mono', monospace", color: "#fff" }}>{r.complianceScore}/5</td>
                      {[r.q1, r.q2, r.q3, r.q4, r.q5].map((q, i) => (
                        <td key={i} style={{ padding: "6px 8px", fontSize: 10, color: q === "pass" || q === "on_file" || q === "adopted" || q === "strong" || q === "viable" ? "#16a34a" : q === "unknown" ? "#555" : "#f87171" }}>
                          {q === "pass" || q === "on_file" || q === "adopted" || q === "strong" || q === "viable" ? "✓" : q === "unknown" ? "?" : "✗"}
                        </td>
                      ))}
                      <td style={{ padding: "6px 8px", fontFamily: "'Space Mono', monospace", color: r.determinationCount > 0 ? "#5B8DB8" : "#444" }}>
                        {r.determinationCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
