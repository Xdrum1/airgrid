"use client";

import { useState } from "react";
import Link from "next/link";

const BUYER_TYPES = [
  {
    id: "infra-developer",
    label: "Infrastructure Developer / Investor",
    description: "Site feasibility, conversion viability, capital exposure by gap, phased development roadmap.",
    accent: "#00d4ff",
  },
  {
    id: "municipality",
    label: "City Planner / Municipality / State Agency",
    description: "Ordinance audit, gap analysis against FAA standards, staffing recommendations, regulatory roadmap.",
    accent: "#00ff88",
  },
  {
    id: "operator",
    label: "eVTOL Operator",
    description: "Site adequacy by aircraft type, approach path risk, competitive landscape, market entry timing.",
    accent: "#7c3aed",
  },
  {
    id: "insurance",
    label: "Insurance Carrier / Underwriter",
    description: "Portfolio compliance screening, liability exposure quantification, site-level risk assessment.",
    accent: "#f59e0b",
  },
];

export default function BuyerTypeSelector() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: 9,
        letterSpacing: 2,
        color: "#555",
        marginBottom: 16,
      }}>
        WHO IS THIS BRIEFING FOR?
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 12,
      }}>
        {BUYER_TYPES.map((bt) => {
          const isSelected = selected === bt.id;
          return (
            <button
              key={bt.id}
              onClick={() => setSelected(isSelected ? null : bt.id)}
              style={{
                padding: "16px 18px",
                background: isSelected ? `${bt.accent}08` : "rgba(255,255,255,0.02)",
                border: isSelected
                  ? `1px solid ${bt.accent}40`
                  : "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <div style={{
                color: isSelected ? bt.accent : "#ccc",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 6,
              }}>
                {bt.label}
              </div>
              <div style={{
                color: "#777",
                fontSize: 11,
                lineHeight: 1.5,
              }}>
                {bt.description}
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <Link
            href={`/contact?tier=briefing&buyer=${selected}&ref=briefings`}
            style={{
              display: "inline-block",
              padding: "10px 24px",
              background: "#00d4ff",
              color: "#050508",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textDecoration: "none",
              borderRadius: 6,
            }}
          >
            Request a {BUYER_TYPES.find(b => b.id === selected)?.label.split(" /")[0]} Briefing
          </Link>
        </div>
      )}
    </div>
  );
}
