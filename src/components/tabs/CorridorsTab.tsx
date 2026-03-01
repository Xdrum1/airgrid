"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { City, Corridor, Operator } from "@/types";
import { CORRIDOR_STATUS_COLORS } from "@/lib/dashboard-constants";

type SortKey = "name" | "distance" | "status";

const STATUS_PRIORITY: Record<string, number> = {
  active: 0,
  authorized: 1,
  proposed: 2,
  suspended: 3,
};

const STATUS_FILTERS = ["all", "proposed", "authorized", "active", "suspended"] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

export default function CorridorsTab({
  corridors,
  citiesMap,
  operatorsMap,
  animate,
  isMobile,
  onCorridorClick,
}: {
  corridors: Corridor[];
  citiesMap: Record<string, City>;
  operatorsMap: Record<string, Operator>;
  animate: boolean;
  isMobile: boolean;
  onCorridorClick: (corridor: Corridor, city: City | undefined) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("name");

  const filteredCorridors = useMemo(() => {
    let result = corridors;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) => {
        const city = citiesMap[c.cityId];
        const operator = c.operatorId ? operatorsMap[c.operatorId] : null;
        return (
          c.name.toLowerCase().includes(q) ||
          (city && `${city.city} ${city.state}`.toLowerCase().includes(q)) ||
          (operator && operator.name.toLowerCase().includes(q))
        );
      });
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === "distance") return (b.distanceKm ?? 0) - (a.distanceKm ?? 0);
      if (sortBy === "status") return (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9);
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [corridors, searchQuery, statusFilter, sortBy, citiesMap, operatorsMap]);

  return (
    <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "12px 12px" : "16px 20px", paddingLeft: isMobile ? 12 : 292, paddingRight: isMobile ? 12 : 316 }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: "#444", fontSize: 8, letterSpacing: 2, marginBottom: 4 }}>
          AIR CORRIDORS
        </div>
        <div style={{ color: "#555", fontSize: 10 }}>
          {corridors.length} designated UAM routes across {new Set(corridors.map(c => c.cityId)).size} markets
        </div>
      </div>

      {/* Summary stat cards */}
      <div style={{
        display: isMobile ? "grid" : "flex",
        gridTemplateColumns: isMobile ? "1fr 1fr" : undefined,
        gap: 12,
        marginBottom: 24,
      }}>
        {[
          { label: "TOTAL", value: corridors.length, color: "#00d4ff" },
          { label: "AUTHORIZED", value: corridors.filter(c => c.status === "authorized" || c.status === "active").length, color: "#00ff88" },
          { label: "PROPOSED", value: corridors.filter(c => c.status === "proposed").length, color: "#f59e0b" },
          { label: "MARKETS", value: new Set(corridors.map(c => c.cityId)).size, color: "#7c3aed" },
        ].map((stat, i) => (
          <div
            key={stat.label}
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 8,
              padding: "16px 14px",
              opacity: animate ? 1 : 0,
              transform: animate ? "translateY(0)" : "translateY(8px)",
              transition: `opacity 0.4s ease ${i * 0.08}s, transform 0.4s ease ${i * 0.08}s`,
            }}
          >
            <div style={{ color: "#444", fontSize: 8, letterSpacing: 2, marginBottom: 8 }}>
              {stat.label}
            </div>
            <div style={{ color: stat.color, fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28 }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filter + Sort bar */}
      <div style={{ marginBottom: 16 }}>
        {/* Search input */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search corridors, cities, operators..."
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 6,
            color: "#ccc",
            fontSize: 11,
            padding: "10px 14px",
            fontFamily: "'Space Mono', monospace",
            outline: "none",
            boxSizing: "border-box",
            marginBottom: 12,
          }}
        />

        {/* Status pills + Sort */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {STATUS_FILTERS.map((s) => {
              const isActive = statusFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  style={{
                    background: isActive ? "rgba(0,212,255,0.08)" : "transparent",
                    border: isActive ? "1px solid rgba(0,212,255,0.4)" : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 4,
                    padding: "5px 10px",
                    color: isActive ? "#00d4ff" : "#555",
                    fontSize: 8,
                    letterSpacing: 1,
                    cursor: "pointer",
                    fontFamily: "'Space Mono', monospace",
                    fontWeight: isActive ? 700 : 400,
                    textTransform: "uppercase",
                  }}
                >
                  {s === "all" ? "ALL" : s}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#444", fontSize: 8, letterSpacing: 1 }}>SORT:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 4,
                color: "#888",
                fontSize: 9,
                padding: "4px 8px",
                fontFamily: "'Space Mono', monospace",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="name">Name</option>
              <option value="distance">Distance</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>

        {/* Result count */}
        {(searchQuery || statusFilter !== "all") && (
          <div style={{ color: "#555", fontSize: 9, marginTop: 10, letterSpacing: 1 }}>
            {filteredCorridors.length} of {corridors.length} corridors
          </div>
        )}
      </div>

      {/* Corridor cards */}
      {filteredCorridors.map((corridor, i) => {
        const statusColor = CORRIDOR_STATUS_COLORS[corridor.status] ?? "#888";
        const city = citiesMap[corridor.cityId];
        const operator = corridor.operatorId ? operatorsMap[corridor.operatorId] : null;

        return (
          <div
            key={corridor.id}
            onClick={() => onCorridorClick(corridor, city)}
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 8,
              padding: "16px 18px",
              marginBottom: 10,
              cursor: "pointer",
              transition: "all 0.15s",
              opacity: animate ? 1 : 0,
              transform: animate ? "translateY(0)" : "translateY(4px)",
              transitionProperty: "opacity, transform, border-color",
              transitionDuration: "0.25s",
              transitionDelay: `${i * 0.03}s`,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(0,212,255,0.3)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)")}
          >
            {/* Name + status + city */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>
                  {corridor.name}
                </span>
                <span style={{
                  color: statusColor,
                  fontSize: 7,
                  letterSpacing: 1,
                  border: `1px solid ${statusColor}44`,
                  borderRadius: 3,
                  padding: "2px 6px",
                  textTransform: "uppercase",
                  fontFamily: "'Space Mono', monospace",
                }}>
                  {corridor.status}
                </span>
              </div>
              {city && (
                <span style={{ color: "#555", fontSize: 9, fontFamily: "'Space Mono', monospace" }}>
                  {city.city}, {city.state}
                </span>
              )}
            </div>

            {/* Origin → Destination */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ color: "#00d4ff", fontSize: 10 }}>
                {corridor.startPoint.label}
              </span>
              <span style={{ color: "#333", fontSize: 10 }}>→</span>
              <span style={{ color: "#00d4ff", fontSize: 10 }}>
                {corridor.endPoint.label}
              </span>
            </div>

            {/* Stats row */}
            <div style={{ display: "flex", gap: 16, marginBottom: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ color: "#444", fontSize: 7, letterSpacing: 1, marginBottom: 2 }}>DISTANCE</div>
                <div style={{ color: "#ccc", fontSize: 11, fontFamily: "'Space Mono', monospace" }}>{corridor.distanceKm} km</div>
              </div>
              <div>
                <div style={{ color: "#444", fontSize: 7, letterSpacing: 1, marginBottom: 2 }}>FLIGHT TIME</div>
                <div style={{ color: "#ccc", fontSize: 11, fontFamily: "'Space Mono', monospace" }}>{corridor.estimatedFlightMinutes} min</div>
              </div>
              <div>
                <div style={{ color: "#444", fontSize: 7, letterSpacing: 1, marginBottom: 2 }}>ALTITUDE</div>
                <div style={{ color: "#ccc", fontSize: 11, fontFamily: "'Space Mono', monospace" }}>
                  {corridor.altitudeMinFt ? `${corridor.altitudeMinFt}–${corridor.maxAltitudeFt}` : corridor.maxAltitudeFt} ft
                </div>
              </div>
              {operator && (
                <div>
                  <div style={{ color: "#444", fontSize: 7, letterSpacing: 1, marginBottom: 2 }}>OPERATOR</div>
                  <div style={{ color: operator.color, fontSize: 11, fontFamily: "'Space Mono', monospace" }}>{operator.name}</div>
                </div>
              )}
            </div>

            {/* FAA auth details (only for authorized corridors) */}
            {corridor.faaAuthNumber && (
              <div style={{
                background: "rgba(0,255,136,0.04)",
                border: "1px solid rgba(0,255,136,0.15)",
                borderRadius: 6,
                padding: "10px 12px",
                marginBottom: 10,
              }}>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ color: "#444", fontSize: 7, letterSpacing: 1, marginBottom: 2 }}>FAA AUTH</div>
                    <div style={{ color: "#00ff88", fontSize: 10, fontFamily: "'Space Mono', monospace" }}>{corridor.faaAuthNumber}</div>
                  </div>
                  {corridor.effectiveDate && (
                    <div>
                      <div style={{ color: "#444", fontSize: 7, letterSpacing: 1, marginBottom: 2 }}>EFFECTIVE</div>
                      <div style={{ color: "#ccc", fontSize: 10, fontFamily: "'Space Mono', monospace" }}>{corridor.effectiveDate}</div>
                    </div>
                  )}
                  {corridor.expirationDate && (
                    <div>
                      <div style={{ color: "#444", fontSize: 7, letterSpacing: 1, marginBottom: 2 }}>EXPIRES</div>
                      <div style={{ color: "#ccc", fontSize: 10, fontFamily: "'Space Mono', monospace" }}>{corridor.expirationDate}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cleared operators badges */}
            {corridor.clearedOperators && corridor.clearedOperators.length > 0 && (
              <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                <span style={{ color: "#444", fontSize: 8, letterSpacing: 1, alignSelf: "center" }}>CLEARED:</span>
                {corridor.clearedOperators.map((opId) => {
                  const op = operatorsMap[opId];
                  return op ? (
                    <span
                      key={opId}
                      style={{
                        color: op.color,
                        fontSize: 8,
                        border: `1px solid ${op.color}44`,
                        borderRadius: 3,
                        padding: "2px 8px",
                        fontFamily: "'Space Mono', monospace",
                      }}
                    >
                      {op.name}
                    </span>
                  ) : null;
                })}
              </div>
            )}

            {/* Notes preview */}
            {corridor.notes && (
              <div style={{
                color: "#555",
                fontSize: 10,
                lineHeight: 1.5,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}>
                {corridor.notes}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <Link
                href={`/corridor/${corridor.id}`}
                onClick={(e) => e.stopPropagation()}
                style={{ color: "#00d4ff", fontSize: 8, letterSpacing: 1, textDecoration: "none" }}
              >
                DETAILS →
              </Link>
              <div style={{ color: "#333", fontSize: 8, letterSpacing: 1 }}>
                VIEW ON MAP →
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
