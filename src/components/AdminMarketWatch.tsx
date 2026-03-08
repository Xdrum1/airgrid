"use client";

import { useState, useEffect, useCallback } from "react";
import { CITIES } from "@/data/seed";
import { getScoreColor } from "@/lib/scoring";
import {
  WATCH_STATUS_COLORS,
  OUTLOOK_COLORS,
  WATCH_STATUS_LABELS,
  OUTLOOK_LABELS,
  formatRelativeTime,
} from "@/lib/dashboard-constants";

// -------------------------------------------------------
// Types
// -------------------------------------------------------

interface MarketWatchData {
  id: string;
  cityId: string;
  cityName: string;
  watchStatus: string;
  outlook: string;
  analystNote: string | null;
  published: boolean;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
}

interface WatchSuggestion {
  id: string;
  cityId: string;
  cityName: string;
  suggestedStatus: string;
  suggestedOutlook: string;
  reasoning: string;
  confidence: number;
  signalCount: number;
  createdAt: string;
}

interface EditState {
  cityId: string;
  cityName: string;
  watchStatus: string;
  outlook: string;
  analystNote: string;
  reason: string;
  publish: boolean;
}

const WATCH_STATUSES = ["STABLE", "POSITIVE_WATCH", "NEGATIVE_WATCH", "DEVELOPING"];
const OUTLOOKS = ["IMPROVING", "STABLE", "DETERIORATING"];

// -------------------------------------------------------
// Component
// -------------------------------------------------------

export default function AdminMarketWatch({ showToast }: { showToast: (msg: string) => void }) {
  const [watches, setWatches] = useState<MarketWatchData[]>([]);
  const [suggestions, setSuggestions] = useState<WatchSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(() => {
    fetch("/api/admin/market-watch")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((json) => {
        setWatches(json.data || []);
        setSuggestions(json.suggestions || []);
      })
      .catch(() => showToast("Failed to load watch data"))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build a map of existing watches by cityId
  const watchMap = new Map(watches.map((w) => [w.cityId, w]));

  // All cities with their watch status (defaulting to STABLE if no record)
  const allCities = CITIES.map((c) => {
    const watch = watchMap.get(c.id);
    return {
      id: c.id,
      city: c.city,
      state: c.state,
      score: c.score ?? 0,
      watchStatus: watch?.watchStatus ?? "STABLE",
      outlook: watch?.outlook ?? "STABLE",
      analystNote: watch?.analystNote ?? null,
      published: watch?.published ?? false,
      publishedAt: watch?.publishedAt ?? null,
      updatedAt: watch?.updatedAt ?? null,
      hasWatch: !!watch,
    };
  }).sort((a, b) => {
    // Non-stable first, then by score
    const aActive = a.watchStatus !== "STABLE" ? 0 : 1;
    const bActive = b.watchStatus !== "STABLE" ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;
    return b.score - a.score;
  });

  function startEdit(cityId: string) {
    const city = allCities.find((c) => c.id === cityId);
    if (!city) return;
    setEditing({
      cityId,
      cityName: `${city.city}, ${city.state}`,
      watchStatus: city.watchStatus,
      outlook: city.outlook,
      analystNote: city.analystNote ?? "",
      reason: "",
      publish: city.published,
    });
  }

  function startEditFromSuggestion(suggestion: WatchSuggestion) {
    const city = allCities.find((c) => c.id === suggestion.cityId);
    setEditing({
      cityId: suggestion.cityId,
      cityName: city ? `${city.city}, ${city.state}` : suggestion.cityName,
      watchStatus: suggestion.suggestedStatus,
      outlook: suggestion.suggestedOutlook,
      analystNote: "",
      reason: `AI suggestion (${(suggestion.confidence * 100).toFixed(0)}% confidence): ${suggestion.reasoning}`,
      publish: false,
    });
  }

  async function saveWatch(publishOverride?: boolean) {
    if (!editing) return;
    if (editing.reason.length < 10) {
      showToast("Reason must be at least 10 characters");
      return;
    }

    const shouldPublish = publishOverride ?? editing.publish;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/market-watch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cityId: editing.cityId,
          watchStatus: editing.watchStatus,
          outlook: editing.outlook,
          analystNote: editing.analystNote || null,
          reason: editing.reason,
          publish: shouldPublish,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }

      showToast(`${editing.cityName} watch updated`);
      setEditing(null);
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(cityId: string, currentlyPublished: boolean) {
    try {
      const res = await fetch("/api/admin/market-watch/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cityId,
          action: currentlyPublished ? "unpublish" : "publish",
        }),
      });
      if (!res.ok) throw new Error();
      showToast(currentlyPublished ? "Unpublished" : "Published");
      fetchData();
    } catch {
      showToast("Failed to update publish status");
    }
  }

  async function dismissSuggestion(id: string) {
    try {
      const res = await fetch("/api/admin/market-watch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss_suggestion", suggestionId: id }),
      });
      if (!res.ok) {
        // Fallback: just remove from UI
      }
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      showToast("Suggestion dismissed");
    } catch {
      showToast("Failed to dismiss");
    }
  }

  if (loading) {
    return (
      <div style={{ color: "#444", fontSize: 10, letterSpacing: 2, textAlign: "center", padding: 60 }}>
        LOADING...
      </div>
    );
  }

  // -------------------------------------------------------
  // Edit modal
  // -------------------------------------------------------

  if (editing) {
    return (
      <div>
        <button
          onClick={() => setEditing(null)}
          style={{
            background: "none",
            border: "none",
            color: "#555",
            fontSize: 10,
            cursor: "pointer",
            marginBottom: 20,
            fontFamily: "'Space Mono', monospace",
          }}
        >
          ← BACK TO GRID
        </button>

        <div style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10,
          padding: 28,
        }}>
          <div style={{ color: "#fff", fontSize: 16, fontFamily: "'Syne', sans-serif", fontWeight: 700, marginBottom: 24 }}>
            {editing.cityName}
          </div>

          {/* Watch Status */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ color: "#555", fontSize: 9, letterSpacing: 2, display: "block", marginBottom: 8 }}>
              WATCH STATUS
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {WATCH_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setEditing({ ...editing, watchStatus: s })}
                  style={{
                    background: editing.watchStatus === s ? `${WATCH_STATUS_COLORS[s]}20` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${editing.watchStatus === s ? WATCH_STATUS_COLORS[s] : "rgba(255,255,255,0.08)"}`,
                    color: editing.watchStatus === s ? WATCH_STATUS_COLORS[s] : "#555",
                    fontSize: 10,
                    letterSpacing: 1,
                    padding: "8px 14px",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontFamily: "'Space Mono', monospace",
                    fontWeight: editing.watchStatus === s ? 700 : 400,
                  }}
                >
                  {WATCH_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Outlook */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ color: "#555", fontSize: 9, letterSpacing: 2, display: "block", marginBottom: 8 }}>
              6-MONTH OUTLOOK
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {OUTLOOKS.map((o) => (
                <button
                  key={o}
                  onClick={() => setEditing({ ...editing, outlook: o })}
                  style={{
                    background: editing.outlook === o ? `${OUTLOOK_COLORS[o]}20` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${editing.outlook === o ? OUTLOOK_COLORS[o] : "rgba(255,255,255,0.08)"}`,
                    color: editing.outlook === o ? OUTLOOK_COLORS[o] : "#555",
                    fontSize: 10,
                    letterSpacing: 1,
                    padding: "8px 14px",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontFamily: "'Space Mono', monospace",
                    fontWeight: editing.outlook === o ? 700 : 400,
                  }}
                >
                  {OUTLOOK_LABELS[o]}
                </button>
              ))}
            </div>
          </div>

          {/* Analyst Note */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ color: "#555", fontSize: 9, letterSpacing: 2, display: "block", marginBottom: 8 }}>
              ANALYST NOTE (visible to Pro users)
            </label>
            <textarea
              value={editing.analystNote}
              onChange={(e) => setEditing({ ...editing, analystNote: e.target.value })}
              maxLength={2000}
              placeholder="Analysis supporting this watch status..."
              style={{
                width: "100%",
                minHeight: 120,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 6,
                color: "#ccc",
                fontSize: 12,
                fontFamily: "'Space Mono', monospace",
                padding: 12,
                resize: "vertical",
              }}
            />
            <div style={{ color: "#333", fontSize: 9, textAlign: "right", marginTop: 4 }}>
              {editing.analystNote.length}/2000
            </div>
          </div>

          {/* Reason */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ color: "#555", fontSize: 9, letterSpacing: 2, display: "block", marginBottom: 8 }}>
              REASON FOR CHANGE (internal audit trail)
            </label>
            <textarea
              value={editing.reason}
              onChange={(e) => setEditing({ ...editing, reason: e.target.value })}
              placeholder="What triggered this watch change..."
              style={{
                width: "100%",
                minHeight: 60,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 6,
                color: "#ccc",
                fontSize: 12,
                fontFamily: "'Space Mono', monospace",
                padding: 12,
                resize: "vertical",
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button
              onClick={() => saveWatch(false)}
              disabled={saving}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#888",
                fontSize: 11,
                padding: "10px 20px",
                borderRadius: 6,
                cursor: saving ? "default" : "pointer",
                fontFamily: "'Space Mono', monospace",
                opacity: saving ? 0.5 : 1,
              }}
            >
              SAVE DRAFT
            </button>
            <button
              onClick={() => saveWatch(true)}
              disabled={saving}
              style={{
                background: "rgba(124,58,237,0.15)",
                border: "1px solid rgba(124,58,237,0.4)",
                color: "#7c3aed",
                fontSize: 11,
                padding: "10px 20px",
                borderRadius: 6,
                cursor: saving ? "default" : "pointer",
                fontFamily: "'Space Mono', monospace",
                fontWeight: 700,
                opacity: saving ? 0.5 : 1,
              }}
            >
              SAVE & PUBLISH
            </button>
            <button
              onClick={() => setEditing(null)}
              style={{
                background: "none",
                border: "none",
                color: "#444",
                fontSize: 10,
                cursor: "pointer",
                marginLeft: "auto",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------
  // Main grid
  // -------------------------------------------------------

  const activeWatches = allCities.filter((c) => c.watchStatus !== "STABLE");
  const stableCities = allCities.filter((c) => c.watchStatus === "STABLE");

  return (
    <div>
      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ color: "#444", fontSize: 8, letterSpacing: 2, marginBottom: 12 }}>
            AI SUGGESTIONS ({suggestions.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {suggestions.map((s) => (
              <div
                key={s.id}
                style={{
                  background: "rgba(232,121,249,0.04)",
                  border: "1px solid rgba(232,121,249,0.15)",
                  borderRadius: 8,
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ color: "#e879f9", fontSize: 11, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>
                      {s.cityName}
                    </span>
                    <span style={{
                      fontSize: 8,
                      letterSpacing: 1,
                      color: WATCH_STATUS_COLORS[s.suggestedStatus] ?? "#888",
                      background: `${WATCH_STATUS_COLORS[s.suggestedStatus] ?? "#888"}15`,
                      padding: "2px 6px",
                      borderRadius: 3,
                      border: `1px solid ${WATCH_STATUS_COLORS[s.suggestedStatus] ?? "#888"}30`,
                    }}>
                      {WATCH_STATUS_LABELS[s.suggestedStatus] ?? s.suggestedStatus}
                    </span>
                    <span style={{ color: "#444", fontSize: 9 }}>
                      {(s.confidence * 100).toFixed(0)}% · {s.signalCount} signals
                    </span>
                  </div>
                  <div style={{ color: "#666", fontSize: 10, lineHeight: 1.5 }}>
                    {s.reasoning}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => startEditFromSuggestion(s)}
                    style={{
                      background: "rgba(124,58,237,0.15)",
                      border: "1px solid rgba(124,58,237,0.3)",
                      color: "#7c3aed",
                      fontSize: 9,
                      padding: "6px 12px",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontFamily: "'Space Mono', monospace",
                    }}
                  >
                    REVIEW
                  </button>
                  <button
                    onClick={() => dismissSuggestion(s.id)}
                    style={{
                      background: "none",
                      border: "1px solid rgba(255,255,255,0.06)",
                      color: "#444",
                      fontSize: 9,
                      padding: "6px 10px",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    DISMISS
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Watches */}
      {activeWatches.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ color: "#444", fontSize: 8, letterSpacing: 2, marginBottom: 12 }}>
            ACTIVE WATCHES ({activeWatches.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activeWatches.map((c) => (
              <WatchRow
                key={c.id}
                city={c}
                onEdit={() => startEdit(c.id)}
                onTogglePublish={() => togglePublish(c.id, c.published)}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Cities */}
      <div>
        <div style={{ color: "#444", fontSize: 8, letterSpacing: 2, marginBottom: 12 }}>
          ALL MARKETS ({allCities.length})
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {stableCities.map((c) => (
            <WatchRow
              key={c.id}
              city={c}
              onEdit={() => startEdit(c.id)}
              onTogglePublish={() => togglePublish(c.id, c.published)}
              compact
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------
// Watch Row
// -------------------------------------------------------

function WatchRow({
  city,
  onEdit,
  onTogglePublish,
  compact,
}: {
  city: {
    id: string;
    city: string;
    state: string;
    score: number;
    watchStatus: string;
    outlook: string;
    analystNote: string | null;
    published: boolean;
    publishedAt: string | null;
    updatedAt: string | null;
    hasWatch: boolean;
  };
  onEdit: () => void;
  onTogglePublish: () => void;
  compact?: boolean;
}) {
  const tierColor = getScoreColor(city.score);
  const watchColor = WATCH_STATUS_COLORS[city.watchStatus] ?? "#888";
  const outlookColor = OUTLOOK_COLORS[city.outlook] ?? "#888";

  return (
    <div
      style={{
        background: compact ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${compact ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 8,
        padding: compact ? "10px 16px" : "14px 18px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      {/* Score */}
      <div style={{
        color: tierColor,
        fontSize: 14,
        fontFamily: "'Syne', sans-serif",
        fontWeight: 800,
        minWidth: 32,
        textAlign: "center",
      }}>
        {city.score}
      </div>

      {/* City name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#ccc", fontSize: 12, fontWeight: 600 }}>
            {city.city}, {city.state}
          </span>
          {/* Watch badge */}
          {city.watchStatus !== "STABLE" && (
            <span style={{
              fontSize: 7,
              letterSpacing: 1,
              color: watchColor,
              background: `${watchColor}15`,
              padding: "2px 6px",
              borderRadius: 3,
              border: `1px solid ${watchColor}30`,
              fontWeight: 700,
            }}>
              {WATCH_STATUS_LABELS[city.watchStatus]}
            </span>
          )}
          {/* Outlook badge */}
          {city.outlook !== "STABLE" && (
            <span style={{
              fontSize: 7,
              letterSpacing: 1,
              color: outlookColor,
              background: `${outlookColor}15`,
              padding: "2px 6px",
              borderRadius: 3,
              border: `1px solid ${outlookColor}30`,
            }}>
              {OUTLOOK_LABELS[city.outlook]}
            </span>
          )}
        </div>
        {!compact && city.analystNote && (
          <div style={{ color: "#555", fontSize: 10, marginTop: 4, lineHeight: 1.4 }}>
            {city.analystNote.length > 120 ? city.analystNote.slice(0, 120) + "…" : city.analystNote}
          </div>
        )}
      </div>

      {/* Publish status */}
      {city.hasWatch && (
        <button
          onClick={onTogglePublish}
          style={{
            background: "none",
            border: `1px solid ${city.published ? "rgba(0,255,136,0.2)" : "rgba(255,255,255,0.06)"}`,
            color: city.published ? "#00ff88" : "#333",
            fontSize: 8,
            letterSpacing: 1,
            padding: "4px 8px",
            borderRadius: 3,
            cursor: "pointer",
            fontFamily: "'Space Mono', monospace",
          }}
        >
          {city.published ? "LIVE" : "DRAFT"}
        </button>
      )}

      {/* Updated */}
      {city.updatedAt && (
        <span style={{ color: "#333", fontSize: 9, fontFamily: "'Space Mono', monospace", minWidth: 50 }}>
          {formatRelativeTime(city.updatedAt)}
        </span>
      )}

      {/* Edit */}
      <button
        onClick={onEdit}
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "#666",
          fontSize: 9,
          padding: "6px 12px",
          borderRadius: 4,
          cursor: "pointer",
          fontFamily: "'Space Mono', monospace",
        }}
      >
        EDIT
      </button>
    </div>
  );
}
