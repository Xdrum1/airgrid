"use client";

import { useEffect, useState } from "react";
import type { RplPrecedent, PrecedentsByFactor } from "@/lib/rpl-precedents";

const MOMENTUM_COLOR: Record<string, string> = {
  POS: "#00ff88",
  NEG: "#ff5470",
  NEU: "#888",
  MIX: "#f5a623",
};

const MOMENTUM_LABEL: Record<string, string> = {
  POS: "Positive",
  NEG: "Negative",
  NEU: "Neutral",
  MIX: "Mixed",
};

const TIER_ACCENT: Record<string, string> = {
  DIRECT: "#00ff88",
  STATE: "#5B8DB8",
  FEDERAL: "#888",
};

export default function PrecedentsPanel({
  cityId,
  cityName,
}: {
  cityId: string;
  cityName: string;
}) {
  const [byFactor, setByFactor] = useState<PrecedentsByFactor[] | null>(null);
  const [gated, setGated] = useState(false);

  useEffect(() => {
    setByFactor(null);
    setGated(false);
    fetch(`/api/internal/precedents/${cityId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.gated) {
          setGated(true);
          setByFactor([]);
        } else {
          setByFactor(data.byFactor ?? []);
        }
      })
      .catch(() => setByFactor([]));
  }, [cityId]);

  if (gated || byFactor === null || byFactor.length === 0) return null;

  return (
    <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.15em",
          color: "#888",
          textTransform: "uppercase",
          marginBottom: 10,
          fontWeight: 700,
        }}
      >
        Regulatory Precedents — {cityName}
      </div>
      {byFactor.map((group) => (
        <div key={group.factorCode} style={{ marginBottom: 12 }}>
          <div
            style={{
              fontSize: 9,
              letterSpacing: "0.1em",
              color: "#5B8DB8",
              textTransform: "uppercase",
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            Drives {group.factorLabel}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {group.precedents.map((p) => (
              <PrecedentCard key={p.id} p={p} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PrecedentCard({ p }: { p: RplPrecedent }) {
  return (
    <a
      href={p.sourceUrl ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "block",
        padding: "10px 12px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderLeft: `2px solid ${TIER_ACCENT[p.tier] ?? "#444"}`,
        borderRadius: 4,
        textDecoration: "none",
        transition: "background 0.15s",
        cursor: p.sourceUrl ? "pointer" : "default",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
    >
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
        <span
          style={{
            fontSize: 8,
            letterSpacing: "0.1em",
            color: TIER_ACCENT[p.tier] ?? "#888",
            fontWeight: 700,
          }}
        >
          {p.tierLabel.toUpperCase()}
        </span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: MOMENTUM_COLOR[p.momentumDirection] ?? "#888",
              display: "inline-block",
            }}
            title={MOMENTUM_LABEL[p.momentumDirection] ?? ""}
          />
          <span style={{ fontSize: 8, color: "#666" }}>{p.significance}</span>
        </span>
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#e0e0e0",
          lineHeight: 1.45,
          marginBottom: 4,
        }}
      >
        {p.shortTitle ?? p.title}
      </div>
      <div style={{ fontSize: 9, color: "#666" }}>
        {p.issuingAuthority} · {p.publishedDate}
      </div>
    </a>
  );
}
