"use client";

import { useState, useEffect, useCallback } from "react";
import { formatRelativeTime } from "@/lib/dashboard-constants";

// -------------------------------------------------------
// Types
// -------------------------------------------------------

interface UserEvent {
  id: string;
  userId: string;
  event: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { email: string };
}

// -------------------------------------------------------
// Constants
// -------------------------------------------------------

const EVENT_COLORS: Record<string, string> = {
  page_view: "#00d4ff",
  page_leave: "#555",
  city_detail: "#00ff88",
  corridor_click: "#f59e0b",
  tab_switch: "#7c3aed",
  filing_click: "#ff6b35",
  operator_click: "#14b8a6",
  alert_subscribe: "#00ff88",
  alert_unsubscribe: "#ff4444",
  watchlist_add: "#00d4ff",
  watchlist_remove: "#ff4444",
  report_download: "#7c3aed",
};

const ALL_EVENT_TYPES = Object.keys(EVENT_COLORS);

// -------------------------------------------------------
// Component
// -------------------------------------------------------

export default function AdminEvents({
  showToast,
}: {
  showToast: (msg: string) => void;
}) {
  const [events, setEvents] = useState<UserEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEvent, setFilterEvent] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [limit, setLimit] = useState(200);

  const fetchEvents = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterEvent) params.set("event", filterEvent);
    if (filterUser) params.set("userId", filterUser);
    params.set("limit", String(limit));

    fetch(`/api/admin/events?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => setEvents(json.data ?? []))
      .catch(() => showToast("Failed to load events"))
      .finally(() => setLoading(false));
  }, [filterEvent, filterUser, limit, showToast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // ---- Derived stats ----
  const uniqueUsers = new Set(events.map((e) => e.user.email));
  const eventCounts: Record<string, number> = {};
  const userCounts: Record<string, number> = {};
  for (const e of events) {
    eventCounts[e.event] = (eventCounts[e.event] ?? 0) + 1;
    userCounts[e.user.email] = (userCounts[e.user.email] ?? 0) + 1;
  }
  const topUsers = Object.entries(userCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Pair page_view + page_leave for duration display
  const durationMap = new Map<string, number>();
  for (const e of events) {
    if (e.event === "page_leave" && e.metadata?.durationSec != null) {
      const key = `${e.userId}:${e.entityType}:${e.entityId}`;
      durationMap.set(key, e.metadata.durationSec as number);
    }
  }

  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------

  return (
    <div>
      {/* ---- Summary row ---- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <StatBox label="TOTAL EVENTS" value={String(events.length)} color="#7c3aed" />
        <StatBox label="UNIQUE USERS" value={String(uniqueUsers.size)} color="#00d4ff" />
        <StatBox
          label="PAGE VIEWS"
          value={String(eventCounts["page_view"] ?? 0)}
          color={EVENT_COLORS.page_view}
        />
        <StatBox
          label="CITY DETAILS"
          value={String(eventCounts["city_detail"] ?? 0)}
          color={EVENT_COLORS.city_detail}
        />
        <StatBox
          label="FILING CLICKS"
          value={String(eventCounts["filing_click"] ?? 0)}
          color={EVENT_COLORS.filing_click}
        />
        <StatBox
          label="SUBSCRIPTIONS"
          value={String(eventCounts["alert_subscribe"] ?? 0)}
          color={EVENT_COLORS.alert_subscribe}
        />
      </div>

      {/* ---- Top users ---- */}
      {topUsers.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              color: "#666",
              fontSize: 8,
              letterSpacing: 2,
              marginBottom: 8,
            }}
          >
            MOST ACTIVE USERS
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {topUsers.map(([email, count]) => (
              <button
                key={email}
                onClick={() => {
                  // Find userId for this email
                  const ev = events.find((e) => e.user.email === email);
                  if (ev) {
                    setFilterUser(filterUser === ev.userId ? "" : ev.userId);
                  }
                }}
                style={{
                  background:
                    events.find((e) => e.user.email === email)?.userId === filterUser
                      ? "rgba(124,58,237,0.15)"
                      : "rgba(255,255,255,0.02)",
                  border:
                    events.find((e) => e.user.email === email)?.userId === filterUser
                      ? "1px solid rgba(124,58,237,0.4)"
                      : "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 4,
                  padding: "5px 10px",
                  cursor: "pointer",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 10,
                  color: "#888",
                  transition: "all 0.15s",
                }}
              >
                {email.split("@")[0]}
                <span style={{ color: "#888", marginLeft: 6 }}>{count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---- Filters ---- */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ color: "#666", fontSize: 8, letterSpacing: 2, marginRight: 4 }}>
          FILTER
        </div>
        {ALL_EVENT_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setFilterEvent(filterEvent === t ? "" : t)}
            style={{
              background:
                filterEvent === t
                  ? `${EVENT_COLORS[t]}18`
                  : "transparent",
              border:
                filterEvent === t
                  ? `1px solid ${EVENT_COLORS[t]}55`
                  : "1px solid rgba(255,255,255,0.06)",
              color: filterEvent === t ? EVENT_COLORS[t] : "#444",
              borderRadius: 3,
              padding: "3px 7px",
              fontSize: 8,
              letterSpacing: 0.5,
              cursor: "pointer",
              fontFamily: "'Space Mono', monospace",
              transition: "all 0.15s",
            }}
          >
            {t}
          </button>
        ))}
        {(filterEvent || filterUser) && (
          <button
            onClick={() => {
              setFilterEvent("");
              setFilterUser("");
            }}
            style={{
              background: "rgba(255,68,68,0.08)",
              border: "1px solid rgba(255,68,68,0.3)",
              color: "#ff4444",
              borderRadius: 3,
              padding: "3px 7px",
              fontSize: 8,
              letterSpacing: 1,
              cursor: "pointer",
              fontFamily: "'Space Mono', monospace",
            }}
          >
            CLEAR
          </button>
        )}
        <div style={{ marginLeft: "auto" }}>
          <button
            onClick={fetchEvents}
            style={{
              background: "rgba(124,58,237,0.08)",
              border: "1px solid rgba(124,58,237,0.3)",
              color: "#7c3aed",
              borderRadius: 4,
              padding: "5px 12px",
              fontSize: 9,
              letterSpacing: 1,
              cursor: "pointer",
              fontFamily: "'Space Mono', monospace",
            }}
          >
            REFRESH
          </button>
        </div>
      </div>

      {/* ---- Event stream ---- */}
      {loading ? (
        <div
          style={{
            color: "#777",
            fontSize: 10,
            letterSpacing: 2,
            textAlign: "center",
            padding: 60,
          }}
        >
          LOADING...
        </div>
      ) : events.length === 0 ? (
        <div
          style={{
            color: "#666",
            fontSize: 11,
            letterSpacing: 2,
            textAlign: "center",
            padding: 80,
          }}
        >
          NO EVENTS YET
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {events.map((e) => {
            const color = EVENT_COLORS[e.event] ?? "#555";
            const durationKey = `${e.userId}:${e.entityType}:${e.entityId}`;
            const duration =
              e.event === "page_view" ? durationMap.get(durationKey) : null;

            return (
              <div
                key={e.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  background: "rgba(255,255,255,0.015)",
                  border: "1px solid rgba(255,255,255,0.03)",
                  borderRadius: 6,
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(el) =>
                  (el.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")
                }
                onMouseLeave={(el) =>
                  (el.currentTarget.style.borderColor = "rgba(255,255,255,0.03)")
                }
              >
                {/* Event badge */}
                <span
                  style={{
                    background: `${color}15`,
                    color,
                    fontSize: 8,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    padding: "3px 7px",
                    borderRadius: 3,
                    border: `1px solid ${color}33`,
                    whiteSpace: "nowrap",
                    minWidth: 90,
                    textAlign: "center",
                  }}
                >
                  {e.event}
                </span>

                {/* Entity */}
                {e.entityId && (
                  <span
                    style={{
                      color: "#888",
                      fontSize: 10,
                      minWidth: 100,
                      maxWidth: 160,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {e.entityId}
                  </span>
                )}

                {/* Duration (for page_view with matched page_leave) */}
                {duration != null && (
                  <span
                    style={{
                      color: duration >= 60 ? "#00ff88" : duration >= 10 ? "#f59e0b" : "#555",
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatDuration(duration)}
                  </span>
                )}

                {/* page_leave: show duration inline */}
                {e.event === "page_leave" && e.metadata?.durationSec != null && (
                  <span
                    style={{
                      color:
                        (e.metadata.durationSec as number) >= 60
                          ? "#00ff88"
                          : (e.metadata.durationSec as number) >= 10
                            ? "#f59e0b"
                            : "#555",
                      fontSize: 9,
                      fontWeight: 700,
                    }}
                  >
                    {formatDuration(e.metadata.durationSec as number)}
                  </span>
                )}

                {/* Metadata extras (filing type, etc) */}
                {e.metadata &&
                  e.event !== "page_leave" &&
                  Object.keys(e.metadata).length > 0 && (
                    <span
                      style={{
                        color: "#666",
                        fontSize: 8,
                        maxWidth: 120,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {compactMeta(e.metadata)}
                    </span>
                  )}

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* User */}
                <span
                  style={{
                    color: "#888",
                    fontSize: 9,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: 160,
                  }}
                >
                  {e.user.email.split("@")[0]}
                </span>

                {/* Timestamp */}
                <span
                  style={{
                    color: "#666",
                    fontSize: 8,
                    letterSpacing: 0.5,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {formatRelativeTime(e.createdAt)}
                </span>
              </div>
            );
          })}

          {/* Load more */}
          {events.length >= limit && (
            <button
              onClick={() => setLimit((l) => l + 200)}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 6,
                padding: "10px 0",
                color: "#888",
                fontSize: 9,
                letterSpacing: 1,
                cursor: "pointer",
                fontFamily: "'Space Mono', monospace",
                marginTop: 4,
              }}
            >
              LOAD MORE
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 6,
        padding: "12px 14px",
      }}
    >
      <div style={{ color: "#666", fontSize: 8, letterSpacing: 1, marginBottom: 6 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 22,
          color,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function compactMeta(meta: Record<string, unknown>): string {
  // Show the most useful field concisely
  if (meta.type) return String(meta.type);
  if (meta.changeTypes) return `types: ${(meta.changeTypes as string[]).length}`;
  if (meta.allCities) return "all cities";
  return Object.keys(meta).join(", ");
}
