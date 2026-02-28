"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Corridor, City, Operator, ChangelogEntry } from "@/types";
import type { CorridorStatusHistoryEntry } from "@/lib/corridors";
import CorridorSubscribeForm from "./CorridorSubscribeForm";

// -------------------------------------------------------
// Constants
// -------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  proposed: "#f59e0b",
  authorized: "#00d4ff",
  active: "#00ff88",
  suspended: "#ff4444",
};

const STATUS_LABELS: Record<string, string> = {
  proposed: "PROPOSED",
  authorized: "AUTHORIZED",
  active: "ACTIVE",
  suspended: "SUSPENDED",
};

// -------------------------------------------------------
// Props
// -------------------------------------------------------

interface CorridorDetailProps {
  corridor: Corridor;
  city: City | null;
  operator: Operator | null;
  statusHistory: CorridorStatusHistoryEntry[];
  relatedChangelog: ChangelogEntry[];
}

// -------------------------------------------------------
// Component
// -------------------------------------------------------

export default function CorridorDetail({
  corridor,
  city,
  operator,
  statusHistory,
  relatedChangelog,
}: CorridorDetailProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const statusColor = STATUS_COLORS[corridor.status] ?? "#666";

  return (
    <div
      style={{
        height: "100vh",
        overflowY: "auto",
        background: "#050508",
        fontFamily: "'Space Mono', monospace",
        color: "#fff",
      }}
    >
      {/* ---- Sticky Header ---- */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "#050508",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "0 32px",
        }}
      >
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            height: 54,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href="/dashboard"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <img
              src="/images/logo/airindex-wordmark.svg"
              alt="AirIndex"
              style={{ height: 26 }}
            />
          </Link>
          <Link
            href="/dashboard?tab=corridors"
            style={{
              color: "#555",
              fontSize: 10,
              letterSpacing: 1,
              textDecoration: "none",
              transition: "color 0.15s",
            }}
          >
            ← ALL CORRIDORS
          </Link>
        </div>
      </div>

      {/* ---- Content ---- */}
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "0 32px",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(8px)",
          transition: "all 0.5s ease",
        }}
      >
        {/* ---- Hero Section ---- */}
        <div style={{ paddingTop: 48, paddingBottom: 36, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 800,
                fontFamily: "'Syne', sans-serif",
                letterSpacing: -1,
                margin: 0,
              }}
            >
              {corridor.name}
            </h1>
            <span
              style={{
                background: `${statusColor}18`,
                color: statusColor,
                border: `1px solid ${statusColor}40`,
                borderRadius: 4,
                padding: "3px 8px",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              {STATUS_LABELS[corridor.status] ?? corridor.status.toUpperCase()}
            </span>
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            {city && (
              <Link
                href={`/city/${city.id}`}
                style={{
                  color: "#888",
                  fontSize: 11,
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
              >
                {city.city}, {city.state}
              </Link>
            )}
            {operator && (
              <span
                style={{
                  background: `${operator.color}18`,
                  color: operator.color,
                  border: `1px solid ${operator.color}30`,
                  borderRadius: 4,
                  padding: "2px 8px",
                  fontSize: 9,
                  fontWeight: 600,
                }}
              >
                {operator.name}
              </span>
            )}
          </div>
        </div>

        {/* ---- Stats Row ---- */}
        <div style={{ paddingTop: 28, paddingBottom: 28, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
            <StatCard label="DISTANCE" value={`${corridor.distanceKm} km`} />
            <StatCard label="FLIGHT TIME" value={`${corridor.estimatedFlightMinutes} min`} />
            <StatCard
              label="ALTITUDE"
              value={
                corridor.altitudeMinFt
                  ? `${corridor.altitudeMinFt} – ${corridor.maxAltitudeFt} ft`
                  : `${corridor.maxAltitudeFt} ft max`
              }
            />
            <StatCard
              label="ORIGIN"
              value={corridor.startPoint.label}
              sub={`${corridor.startPoint.lat.toFixed(4)}, ${corridor.startPoint.lng.toFixed(4)}`}
            />
            <StatCard
              label="DESTINATION"
              value={corridor.endPoint.label}
              sub={`${corridor.endPoint.lat.toFixed(4)}, ${corridor.endPoint.lng.toFixed(4)}`}
            />
            {corridor.waypoints && corridor.waypoints.length > 0 && (
              <StatCard label="WAYPOINTS" value={String(corridor.waypoints.length)} />
            )}
          </div>
        </div>

        {/* ---- FAA Authorization Section ---- */}
        {(corridor.status === "authorized" || corridor.status === "active") &&
          corridor.faaAuthNumber && (
            <div style={{ paddingTop: 28, paddingBottom: 28, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div
                style={{
                  color: "#2a2a3a",
                  fontSize: 9,
                  letterSpacing: 2,
                  marginBottom: 16,
                }}
              >
                FAA AUTHORIZATION
              </div>
              <div
                style={{
                  background: "rgba(0,212,255,0.04)",
                  border: "1px solid rgba(0,212,255,0.12)",
                  borderRadius: 8,
                  padding: 20,
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
                  <div>
                    <div style={{ color: "#2a2a3a", fontSize: 8, letterSpacing: 1, marginBottom: 3 }}>
                      AUTH NUMBER
                    </div>
                    <div style={{ color: "#00d4ff", fontSize: 12, fontWeight: 700 }}>
                      {corridor.faaAuthNumber}
                    </div>
                  </div>
                  {corridor.effectiveDate && (
                    <div>
                      <div style={{ color: "#2a2a3a", fontSize: 8, letterSpacing: 1, marginBottom: 3 }}>
                        EFFECTIVE
                      </div>
                      <div style={{ color: "#999", fontSize: 11 }}>
                        {corridor.effectiveDate}
                      </div>
                    </div>
                  )}
                  {corridor.expirationDate && (
                    <div>
                      <div style={{ color: "#2a2a3a", fontSize: 8, letterSpacing: 1, marginBottom: 3 }}>
                        EXPIRES
                      </div>
                      <div style={{ color: "#999", fontSize: 11 }}>
                        {corridor.expirationDate}
                      </div>
                    </div>
                  )}
                </div>

                {corridor.clearedOperators && corridor.clearedOperators.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ color: "#2a2a3a", fontSize: 8, letterSpacing: 1, marginBottom: 8 }}>
                      CLEARED OPERATORS
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {corridor.clearedOperators.map((opId) => (
                        <span
                          key={opId}
                          style={{
                            background: "rgba(0,212,255,0.08)",
                            color: "#00d4ff",
                            border: "1px solid rgba(0,212,255,0.2)",
                            borderRadius: 4,
                            padding: "3px 8px",
                            fontSize: 9,
                          }}
                        >
                          {opId}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        {/* ---- Notes ---- */}
        {corridor.notes && (
          <div style={{ paddingTop: 28, paddingBottom: 28, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ color: "#2a2a3a", fontSize: 9, letterSpacing: 2, marginBottom: 12 }}>
              NOTES
            </div>
            <p style={{ color: "#888", fontSize: 12, lineHeight: 1.7, margin: 0 }}>
              {corridor.notes}
            </p>
          </div>
        )}

        {/* ---- Status Timeline ---- */}
        <div style={{ paddingTop: 28, paddingBottom: 28, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ color: "#2a2a3a", fontSize: 9, letterSpacing: 2, marginBottom: 16 }}>
            STATUS HISTORY
          </div>
          {statusHistory.length === 0 ? (
            <div style={{ color: "#333", fontSize: 11, padding: "20px 0", textAlign: "center" }}>
              No status history recorded yet.
            </div>
          ) : (
            <div style={{ position: "relative", paddingLeft: 24 }}>
              {/* Vertical line */}
              <div
                style={{
                  position: "absolute",
                  left: 7,
                  top: 4,
                  bottom: 4,
                  width: 1,
                  background: "rgba(255,255,255,0.06)",
                }}
              />
              {statusHistory.map((entry, i) => {
                const toColor = STATUS_COLORS[entry.toStatus] ?? "#666";
                return (
                  <div key={entry.id} style={{ position: "relative", marginBottom: i < statusHistory.length - 1 ? 20 : 0 }}>
                    {/* Dot */}
                    <div
                      style={{
                        position: "absolute",
                        left: -20,
                        top: 2,
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: `${toColor}30`,
                        border: `2px solid ${toColor}`,
                      }}
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      {entry.fromStatus && (
                        <>
                          <span
                            style={{
                              color: STATUS_COLORS[entry.fromStatus] ?? "#666",
                              fontSize: 9,
                              fontWeight: 700,
                              letterSpacing: 1,
                            }}
                          >
                            {(entry.fromStatus).toUpperCase()}
                          </span>
                          <span style={{ color: "#333", fontSize: 10 }}>→</span>
                        </>
                      )}
                      <span
                        style={{
                          color: toColor,
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: 1,
                        }}
                      >
                        {entry.toStatus.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ color: "#555", fontSize: 10, marginBottom: entry.reason ? 4 : 0 }}>
                      {new Date(entry.changedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    {entry.reason && (
                      <div style={{ color: "#666", fontSize: 10 }}>
                        {entry.reason}
                      </div>
                    )}
                    {entry.sourceUrl && (
                      <a
                        href={entry.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#00d4ff", fontSize: 9, textDecoration: "none", letterSpacing: 0.5 }}
                      >
                        SOURCE →
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ---- Related Changelog ---- */}
        {relatedChangelog.length > 0 && (
          <div style={{ paddingTop: 28, paddingBottom: 28, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ color: "#2a2a3a", fontSize: 9, letterSpacing: 2, marginBottom: 16 }}>
              RELATED ACTIVITY
            </div>
            {relatedChangelog.map((entry) => (
              <div
                key={entry.id}
                style={{
                  padding: "10px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span
                    style={{
                      background: "rgba(124,58,237,0.1)",
                      color: "#7c3aed",
                      borderRadius: 3,
                      padding: "2px 6px",
                      fontSize: 8,
                      letterSpacing: 1,
                      fontWeight: 700,
                    }}
                  >
                    {entry.changeType.replace("_", " ").toUpperCase()}
                  </span>
                  <span style={{ color: "#444", fontSize: 9 }}>
                    {new Date(entry.timestamp).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div style={{ color: "#888", fontSize: 11 }}>{entry.summary}</div>
                {entry.sourceUrl && (
                  <a
                    href={entry.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#00d4ff", fontSize: 9, textDecoration: "none" }}
                  >
                    Source →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ---- Subscribe ---- */}
        <div style={{ paddingTop: 28, paddingBottom: 48 }}>
          <div style={{ color: "#2a2a3a", fontSize: 9, letterSpacing: 2, marginBottom: 12 }}>
            CORRIDOR TRACKING
          </div>
          <CorridorSubscribeForm
            corridorId={corridor.id}
            corridorName={corridor.name}
          />
        </div>

        {/* ---- Source Info ---- */}
        <div style={{ paddingBottom: 48 }}>
          <div style={{ color: "#1a1a1f", fontSize: 9 }}>
            Last updated: {corridor.lastUpdated}
            {corridor.sourceUrl && (
              <>
                {" · "}
                <a
                  href={corridor.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#333", textDecoration: "none" }}
                >
                  Source
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------
// Stat Card Helper
// -------------------------------------------------------

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 6,
        padding: "12px 14px",
      }}
    >
      <div style={{ color: "#2a2a3a", fontSize: 8, letterSpacing: 1, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ color: "#ccc", fontSize: 14, fontWeight: 700 }}>{value}</div>
      {sub && (
        <div style={{ color: "#333", fontSize: 9, marginTop: 2 }}>{sub}</div>
      )}
    </div>
  );
}
