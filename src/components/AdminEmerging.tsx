"use client";

import { useState, useEffect, useCallback } from "react";
import { formatRelativeTime } from "@/lib/dashboard-constants";

interface EmergingSignal {
  id: string;
  marketName: string;
  sourceId: string;
  title: string;
  url: string;
  source: string;
  relevant: boolean;
  signalType: string;
  momentum: string;
  confidence: string | null;
  classifiedAt: string;
  ingestedAt: string;
  promptVersion: string | null;
  modelUsed: string | null;
  rawClassification: unknown;
}

interface EmergingStats {
  total: number;
  relevant: number;
  unclassified: number;
  byMarket: Record<string, { total: number; relevant: number }>;
  byMomentum: Record<string, number>;
  bySource: Record<string, number>;
  bySignalType: Record<string, number>;
  lastIngestedAt: string | null;
  lastClassifiedAt: string | null;
}

interface EmergingData {
  stats: EmergingStats;
  signals: EmergingSignal[];
  totalFiltered: number;
}

interface Filters {
  marketName: string;
  relevant: string;
  momentum: string;
  signalType: string;
}

const PAGE_SIZE = 50;

const MOMENTUM_COLORS: Record<string, string> = {
  positive: "#00ff88",
  negative: "#ff4444",
  neutral: "#f59e0b",
};

function healthDotColor(iso: string | null): string {
  if (!iso) return "#ff4444";
  const hoursAgo = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
  if (hoursAgo < 24) return "#00ff88";
  if (hoursAgo < 48) return "#f59e0b";
  return "#ff4444";
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      background: `${color}1a`,
      color,
      fontSize: 8,
      fontWeight: 700,
      letterSpacing: 1,
      padding: "2px 8px",
      borderRadius: 3,
      fontFamily: "'Inter', sans-serif",
    }}>
      {label.toUpperCase()}
    </span>
  );
}

export default function AdminEmerging({ showToast }: { showToast: (msg: string) => void }) {
  const [data, setData] = useState<EmergingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    marketName: "",
    relevant: "",
    momentum: "",
    signalType: "",
  });
  const [offset, setOffset] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.marketName) params.set("marketName", filters.marketName);
    if (filters.relevant) params.set("relevant", filters.relevant);
    if (filters.momentum) params.set("momentum", filters.momentum);
    if (filters.signalType) params.set("signalType", filters.signalType);
    params.set("offset", String(offset));
    params.set("limit", String(PAGE_SIZE));

    fetch(`/api/admin/emerging?${params.toString()}`)
      .then((r) => r.json())
      .then((json) => setData(json))
      .catch(() => showToast("Failed to load emerging signals"))
      .finally(() => setLoading(false));
  }, [filters, offset, showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setOffset(0);
  };

  const stats = data?.stats;
  const signals = data?.signals ?? [];
  const totalFiltered = data?.totalFiltered ?? 0;

  const marketNames = stats
    ? Object.keys(stats.byMarket).filter((m) => m !== "Other" && m !== "Unclassified").sort()
    : [];
  const signalTypes = stats ? Object.keys(stats.bySignalType).sort() : [];
  const sourceCount = stats ? Object.keys(stats.bySource).length : 0;

  const selectStyle: React.CSSProperties = {
    background: "#0a0a0f",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 4,
    color: "#ccc",
    fontSize: 11,
    fontFamily: "'Inter', sans-serif",
    padding: "6px 10px",
    outline: "none",
    cursor: "pointer",
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
          Emerging Markets Pipeline
        </div>
        <div style={{ color: "#888", fontSize: 11 }}>
          VDG stealth pipeline — signal ingestion, classification, and market momentum tracking.
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          <StatBox label="TOTAL SIGNALS" value={stats.total} color="#fff" />
          <StatBox label="RELEVANT" value={stats.relevant} color="#00ff88" />
          <StatBox
            label="UNCLASSIFIED"
            value={stats.unclassified}
            color={stats.unclassified > 0 ? "#f59e0b" : "#00ff88"}
          />
          <StatBox label="SOURCES" value={sourceCount} color="#5B8DB8" />
        </div>
      )}

      {/* Pipeline Health */}
      {stats && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          marginBottom: 20,
          padding: "10px 16px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 6,
        }}>
          <HealthIndicator
            label="Last ingestion"
            iso={stats.lastIngestedAt}
          />
          <HealthIndicator
            label="Last classification"
            iso={stats.lastClassifiedAt}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: stats.unclassified > 0 ? "#f59e0b" : "#00ff88",
              display: "inline-block",
            }} />
            <span style={{ color: "#999", fontSize: 10, fontFamily: "'Inter', sans-serif" }}>
              Backlog: <span style={{ color: stats.unclassified > 0 ? "#f59e0b" : "#ccc" }}>{stats.unclassified} unclassified</span>
            </span>
          </div>
        </div>
      )}

      {/* Market Grid */}
      {stats && marketNames.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: "#777", fontSize: 8, letterSpacing: 2, marginBottom: 10 }}>
            MARKETS
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 8,
          }}>
            {marketNames.map((name) => {
              const m = stats.byMarket[name];
              const borderColor = m.relevant > 5 ? "#00ff88" : m.relevant > 0 ? "#f59e0b" : "rgba(255,255,255,0.06)";
              return (
                <div key={name} style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderLeft: `3px solid ${borderColor}`,
                  borderRadius: 6,
                  padding: "10px 12px",
                }}>
                  <div style={{ color: "#fff", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    {name}
                  </div>
                  <div style={{ color: "#888", fontSize: 11 }}>
                    {m.relevant} relevant / {m.total} total
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <select
          value={filters.marketName}
          onChange={(e) => updateFilter("marketName", e.target.value)}
          style={selectStyle}
        >
          <option value="">All Markets</option>
          {marketNames.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select
          value={filters.relevant}
          onChange={(e) => updateFilter("relevant", e.target.value)}
          style={selectStyle}
        >
          <option value="">All</option>
          <option value="true">Relevant only</option>
          <option value="false">Not relevant</option>
        </select>

        <select
          value={filters.momentum}
          onChange={(e) => updateFilter("momentum", e.target.value)}
          style={selectStyle}
        >
          <option value="">All Momentum</option>
          <option value="positive">Positive</option>
          <option value="negative">Negative</option>
          <option value="neutral">Neutral</option>
        </select>

        <select
          value={filters.signalType}
          onChange={(e) => updateFilter("signalType", e.target.value)}
          style={selectStyle}
        >
          <option value="">All Signal Types</option>
          {signalTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Signal List */}
      {loading ? (
        <div style={{ color: "#777", fontSize: 10, letterSpacing: 2, textAlign: "center", padding: 60 }}>
          LOADING...
        </div>
      ) : signals.length === 0 ? (
        <div style={{ color: "#666", fontSize: 11, letterSpacing: 2, textAlign: "center", padding: 80 }}>
          NO SIGNALS FOUND
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {signals.map((signal) => {
            const isExpanded = expandedId === signal.id;
            const momentumColor = MOMENTUM_COLORS[signal.momentum] ?? "#888";
            return (
              <div
                key={signal.id}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8,
                  padding: 14,
                  cursor: "pointer",
                  transition: "border-color 0.15s",
                }}
                onClick={() => setExpandedId(isExpanded ? null : signal.id)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <a
                      href={signal.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 500,
                        textDecoration: "none",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        lineHeight: 1.4,
                        marginBottom: 8,
                      }}
                    >
                      {signal.title}
                    </a>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <Badge label={signal.marketName} color="#5B8DB8" />
                      <Badge label={signal.source} color="#888" />
                      <Badge label={signal.signalType} color="#7c3aed" />
                      <Badge label={signal.momentum} color={momentumColor} />
                      {signal.confidence && (
                        <Badge
                          label={signal.confidence}
                          color={signal.confidence === "high" ? "#00ff88" : signal.confidence === "medium" ? "#f59e0b" : "#888"}
                        />
                      )}
                    </div>
                  </div>
                  <div style={{
                    color: "#666",
                    fontSize: 9,
                    letterSpacing: 1,
                    whiteSpace: "nowrap",
                    paddingTop: 2,
                  }}>
                    {formatRelativeTime(signal.classifiedAt)}
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ color: "#777", fontSize: 8, letterSpacing: 2, marginBottom: 6 }}>
                      RAW CLASSIFICATION
                    </div>
                    <pre style={{
                      background: "#0a0a12",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 6,
                      padding: 12,
                      maxHeight: 300,
                      overflowY: "auto",
                      color: "#999",
                      fontSize: 10,
                      fontFamily: "'Space Mono', monospace",
                      lineHeight: 1.5,
                      margin: 0,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}>
                      {JSON.stringify(signal.rawClassification, null, 2)}
                    </pre>
                    <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                      {signal.promptVersion && (
                        <span style={{ color: "#555", fontSize: 9 }}>
                          Prompt: {signal.promptVersion}
                        </span>
                      )}
                      {signal.modelUsed && (
                        <span style={{ color: "#555", fontSize: 9 }}>
                          Model: {signal.modelUsed}
                        </span>
                      )}
                      <span style={{ color: "#555", fontSize: 9 }}>
                        Ingested: {formatRelativeTime(signal.ingestedAt)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalFiltered > 0 && (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 20,
          padding: "10px 0",
        }}>
          <span style={{ color: "#888", fontSize: 10 }}>
            Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, totalFiltered)} of {totalFiltered}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={offset === 0}
              style={{
                background: offset === 0 ? "none" : "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 4,
                padding: "6px 14px",
                color: offset === 0 ? "#444" : "#ccc",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 1,
                cursor: offset === 0 ? "default" : "pointer",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              PREV
            </button>
            <button
              onClick={() => setOffset(offset + PAGE_SIZE)}
              disabled={offset + PAGE_SIZE >= totalFiltered}
              style={{
                background: offset + PAGE_SIZE >= totalFiltered ? "none" : "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 4,
                padding: "6px 14px",
                color: offset + PAGE_SIZE >= totalFiltered ? "#444" : "#ccc",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 1,
                cursor: offset + PAGE_SIZE >= totalFiltered ? "default" : "pointer",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              NEXT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stat Box ──────────────────────────────────────────────

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 8,
      padding: "14px 16px",
      textAlign: "center",
    }}>
      <div style={{ color: "#777", fontSize: 8, letterSpacing: 2, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ color, fontSize: 20, fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

// ── Health Indicator ──────────────────────────────────────

function HealthIndicator({ label, iso }: { label: string; iso: string | null }) {
  const dotColor = healthDotColor(iso);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: dotColor,
        display: "inline-block",
      }} />
      <span style={{ color: "#999", fontSize: 10, fontFamily: "'Inter', sans-serif" }}>
        {label}: <span style={{ color: "#ccc" }}>{iso ? formatRelativeTime(iso) : "never"}</span>
      </span>
    </div>
  );
}
