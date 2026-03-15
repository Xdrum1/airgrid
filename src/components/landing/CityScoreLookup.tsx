"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { getScoreColor, getScoreTier, getPostureConfig } from "@/lib/scoring";
import type { RegulatoryPosture } from "@/types";

interface CityData {
  id: string;
  city: string;
  state: string;
  score: number;
  regulatoryPosture: string;
}

export default function CityScoreLookup({ cities }: { cities: CityData[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CityData | null>(null);

  const matches = useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return cities
      .filter(
        (c) =>
          c.city.toLowerCase().includes(q) ||
          c.state.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [query, cities]);

  function selectCity(city: CityData) {
    setSelected(city);
    setQuery("");
  }

  if (selected) {
    const color = getScoreColor(selected.score);
    const tier = getScoreTier(selected.score);
    const posture = getPostureConfig(selected.regulatoryPosture as RegulatoryPosture);

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: "14px 24px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10,
          maxWidth: 480,
          margin: "0 auto",
        }}
      >
        <div style={{ textAlign: "left", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: 16,
                color: "#fff",
              }}
            >
              {selected.city}, {selected.state}
            </span>
            <span
              style={{
                color: posture.color,
                fontSize: 8,
                border: `1px solid ${posture.color}44`,
                borderRadius: 3,
                padding: "2px 6px",
                letterSpacing: 1,
              }}
            >
              {posture.label}
            </span>
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 9,
              color: "#888",
              marginTop: 4,
              letterSpacing: 1,
            }}
          >
            {tier}
          </div>
        </div>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 800,
            fontSize: 38,
            color,
            lineHeight: 1,
          }}
        >
          {selected.score}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Link
            href={`/city/${selected.id}`}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 8,
              color: "#00d4ff",
              letterSpacing: 1,
              textDecoration: "none",
            }}
          >
            DETAILS →
          </Link>
          <button
            onClick={() => setSelected(null)}
            style={{
              background: "none",
              border: "none",
              fontFamily: "'Inter', sans-serif",
              fontSize: 8,
              color: "#888",
              letterSpacing: 1,
              cursor: "pointer",
              padding: 0,
              textAlign: "left",
            }}
          >
            SEARCH AGAIN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        maxWidth: 400,
        margin: "0 auto",
      }}
    >
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search a city — see its score"
        style={{
          width: "100%",
          padding: "12px 18px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8,
          color: "#fff",
          fontSize: 13,
          fontFamily: "'Inter', sans-serif",
          outline: "none",
          transition: "border-color 0.15s",
        }}
        onFocus={(e) =>
          (e.currentTarget.style.borderColor = "rgba(0,212,255,0.4)")
        }
        onBlur={(e) =>
          (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")
        }
      />
      {matches.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            background: "#0a0a0f",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            overflow: "hidden",
            zIndex: 20,
          }}
        >
          {matches.map((c) => {
            const color = getScoreColor(c.score);
            return (
              <button
                key={c.id}
                onClick={() => selectCity(c)}
                style={{
                  width: "100%",
                  padding: "10px 18px",
                  background: "none",
                  border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background =
                    "rgba(255,255,255,0.04)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "none")
                }
              >
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    color: "#ccc",
                    fontSize: 13,
                  }}
                >
                  {c.city}, {c.state}
                </span>
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 800,
                    fontSize: 18,
                    color,
                  }}
                >
                  {c.score}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
