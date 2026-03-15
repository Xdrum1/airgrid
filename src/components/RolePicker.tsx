"use client";

import { useState } from "react";

const ROLES = [
  { value: "operator", label: "Operator / Manufacturer" },
  { value: "investor", label: "Investor / Analyst" },
  { value: "government", label: "City Planner / Government" },
  { value: "researcher", label: "Researcher / Academic" },
  { value: "press", label: "Press / Media" },
  { value: "other", label: "Other" },
];

export default function RolePicker({ onComplete }: { onComplete: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!selected) return;
    setSaving(true);
    try {
      await fetch("/api/user/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selected }),
      });
    } catch {
      // Non-blocking — don't prevent dashboard access
    }
    onComplete();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(5,5,8,0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#0a0a12",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          padding: "36px 32px 28px",
          maxWidth: 400,
          width: "100%",
          margin: "0 16px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 18,
            color: "#fff",
            marginBottom: 6,
          }}
        >
          What best describes you?
        </div>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            color: "#888",
            marginBottom: 24,
          }}
        >
          Helps us tailor your experience. One click, optional.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {ROLES.map((r) => (
            <button
              key={r.value}
              onClick={() => setSelected(r.value)}
              style={{
                padding: "12px 16px",
                background: selected === r.value ? "rgba(0,212,255,0.1)" : "rgba(255,255,255,0.03)",
                border: selected === r.value
                  ? "1px solid rgba(0,212,255,0.4)"
                  : "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8,
                color: selected === r.value ? "#00d4ff" : "#bbb",
                fontSize: 13,
                fontFamily: "'Inter', sans-serif",
                cursor: "pointer",
                transition: "all 0.15s",
                textAlign: "left",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onComplete}
            style={{
              flex: 1,
              padding: "12px 0",
              background: "none",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 6,
              color: "#666",
              fontSize: 11,
              fontFamily: "'Inter', sans-serif",
              letterSpacing: "0.06em",
              cursor: "pointer",
            }}
          >
            SKIP
          </button>
          <button
            onClick={submit}
            disabled={!selected || saving}
            style={{
              flex: 2,
              padding: "12px 0",
              background: selected ? "linear-gradient(135deg, #00d4ff, #7c3aed)" : "#1a1a2e",
              border: "none",
              borderRadius: 6,
              color: selected ? "#000" : "#555",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "'Inter', sans-serif",
              letterSpacing: "0.06em",
              cursor: selected ? "pointer" : "default",
              transition: "all 0.15s",
            }}
          >
            {saving ? "SAVING..." : "CONTINUE"}
          </button>
        </div>
      </div>
    </div>
  );
}
