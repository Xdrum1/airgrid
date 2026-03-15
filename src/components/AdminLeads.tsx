"use client";

import { useState, useEffect, useCallback } from "react";
import { formatRelativeTime } from "@/lib/dashboard-constants";

interface SignalSourceEntry {
  source: string;
  url: string;
  date: string;
  summary: string;
  signalType?: string;
  confidence?: string;
}

interface MarketLead {
  id: string;
  city: string;
  state: string;
  country: string;
  source: string;
  signal: string;
  status: string;
  priority: string;
  researchNotes: string | null;
  factorSnapshot: Record<string, boolean> | null;
  addedAsCityId: string | null;
  dismissedReason: string | null;
  signalCount: number;
  lastSignalAt: string | null;
  signalSources: SignalSourceEntry[] | null;
  createdAt: string;
  updatedAt: string;
}

type StatusKey = "new" | "researching" | "verified" | "added" | "dismissed";

const STATUS_COLORS: Record<string, string> = {
  new: "#00d4ff",
  researching: "#f59e0b",
  verified: "#00ff88",
  added: "#7c3aed",
  dismissed: "#555",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "#ff4444",
  normal: "#888",
  low: "#444",
};

const FACTOR_LABELS: Record<string, string> = {
  hasActivePilotProgram: "Active Pilot",
  hasVertiportZoning: "Vertiport Zoning",
  approvedVertiport: "Approved Vertiport",
  activeOperatorPresence: "Operator Presence",
  regulatoryPosture: "Regulatory Posture",
  stateLegislationStatus: "State Legislation",
  hasStateLegislation: "State Legislation",
  hasLaancCoverage: "LAANC Coverage",
};

const ALL_FACTORS = Object.keys(FACTOR_LABELS);

export default function AdminLeads({ showToast }: { showToast: (msg: string) => void }) {
  const [leads, setLeads] = useState<MarketLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("active");
  const [showForm, setShowForm] = useState(false);

  const fetchLeads = useCallback(() => {
    setLoading(true);
    const params = filter === "active" ? "" : filter === "all" ? "" : `?status=${filter}`;
    fetch(`/api/admin/leads${params}`)
      .then((r) => r.json())
      .then((json) => setLeads(json.data ?? []))
      .catch(() => showToast("Failed to load leads"))
      .finally(() => setLoading(false));
  }, [filter, showToast]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const filteredLeads = filter === "active"
    ? leads.filter((l) => !["added", "dismissed"].includes(l.status))
    : leads;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
            Market Watchlist
          </div>
          <div style={{ color: "#888", fontSize: 11 }}>
            Track tips and leads on potential new markets before they&apos;re scored publicly.
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: "rgba(124,58,237,0.15)",
            border: "1px solid rgba(124,58,237,0.4)",
            borderRadius: 6,
            padding: "8px 16px",
            color: "#7c3aed",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1,
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {showForm ? "CANCEL" : "+ NEW LEAD"}
        </button>
      </div>

      {/* New lead form */}
      {showForm && (
        <NewLeadForm
          onCreated={() => { setShowForm(false); fetchLeads(); showToast("Lead created"); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["active", "new", "researching", "verified", "added", "dismissed", "all"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? "rgba(255,255,255,0.06)" : "none",
              border: filter === f ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent",
              borderRadius: 4,
              padding: "5px 12px",
              color: filter === f ? "#fff" : "#555",
              fontSize: 9,
              letterSpacing: 1,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              fontWeight: filter === f ? 700 : 400,
            }}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ color: "#777", fontSize: 10, letterSpacing: 2, textAlign: "center", padding: 60 }}>
          LOADING...
        </div>
      ) : filteredLeads.length === 0 ? (
        <div style={{ color: "#666", fontSize: 11, letterSpacing: 2, textAlign: "center", padding: 80 }}>
          NO LEADS {filter !== "all" ? `WITH STATUS "${filter.toUpperCase()}"` : ""}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredLeads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onUpdate={fetchLeads} showToast={showToast} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── New Lead Form ──────────────────────────────────────────

function NewLeadForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [source, setSource] = useState("");
  const [signal, setSignal] = useState("");
  const [priority, setPriority] = useState("normal");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim() || !state.trim() || !source.trim() || !signal.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, state, source, signal, priority }),
      });
      if (res.ok) onCreated();
    } catch {
      // handled by caller
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    background: "#0a0a0f",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 6,
    color: "#fff",
    fontSize: 12,
    fontFamily: "'Inter', sans-serif",
    padding: "10px 14px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
  };

  return (
    <form onSubmit={handleSubmit} style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(124,58,237,0.2)",
      borderRadius: 8,
      padding: 20,
      marginBottom: 20,
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 12, marginBottom: 12 }}>
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City (e.g. Columbus)" style={inputStyle} />
        <input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" style={inputStyle} maxLength={10} />
      </div>
      <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source (e.g. Mike, SEC filing, news article)" style={{ ...inputStyle, marginBottom: 12 }} />
      <textarea
        value={signal}
        onChange={(e) => setSignal(e.target.value)}
        placeholder="Signal — what was observed or reported?"
        rows={3}
        style={{ ...inputStyle, marginBottom: 12, resize: "vertical" }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          style={{ ...inputStyle, width: "auto", cursor: "pointer" }}
        >
          <option value="low">Low priority</option>
          <option value="normal">Normal priority</option>
          <option value="high">High priority</option>
        </select>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={onCancel} style={{
          background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4,
          padding: "8px 16px", color: "#888", fontSize: 10, letterSpacing: 1, cursor: "pointer",
          fontFamily: "'Inter', sans-serif",
        }}>
          CANCEL
        </button>
        <button type="submit" disabled={submitting || !city.trim() || !state.trim() || !source.trim() || !signal.trim()} style={{
          background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.4)", borderRadius: 4,
          padding: "8px 16px", color: "#7c3aed", fontSize: 10, fontWeight: 700, letterSpacing: 1,
          cursor: submitting ? "default" : "pointer", fontFamily: "'Inter', sans-serif",
          opacity: submitting ? 0.5 : 1,
        }}>
          {submitting ? "SAVING..." : "ADD LEAD"}
        </button>
      </div>
    </form>
  );
}

// ── Lead Card ──────────────────────────────────────────────

function LeadCard({
  lead,
  onUpdate,
  showToast,
}: {
  lead: MarketLead;
  onUpdate: () => void;
  showToast: (msg: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(lead.researchNotes ?? "");
  const [factors, setFactors] = useState<Record<string, boolean>>(lead.factorSnapshot ?? {});
  const [saving, setSaving] = useState(false);
  const [dismissReason, setDismissReason] = useState("");
  const [showSignals, setShowSignals] = useState(false);

  const statusColor = STATUS_COLORS[lead.status] ?? "#555";
  const priorityColor = PRIORITY_COLORS[lead.priority] ?? "#888";
  const isAutoDiscovered = lead.source === "auto-discovery" || lead.source === "auto-ingestion";

  const patchLead = async (data: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, ...data }),
      });
      if (res.ok) {
        onUpdate();
        return true;
      }
    } catch {
      showToast("Failed to update lead");
    } finally {
      setSaving(false);
    }
    return false;
  };

  const trueFactorCount = Object.values(factors).filter(Boolean).length;

  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: `1px solid ${lead.priority === "high" ? "rgba(255,68,68,0.15)" : "rgba(255,255,255,0.06)"}`,
      borderRadius: 8,
      padding: 16,
      opacity: saving ? 0.5 : 1,
      transition: "opacity 0.2s",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            background: `${statusColor}22`,
            color: statusColor,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 1,
            padding: "3px 8px",
            borderRadius: 3,
            border: `1px solid ${statusColor}44`,
          }}>
            {lead.status.toUpperCase()}
          </span>
          {lead.priority !== "normal" && (
            <span style={{
              color: priorityColor,
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: 1,
            }}>
              {lead.priority.toUpperCase()}
            </span>
          )}
          {isAutoDiscovered && (
            <span style={{
              background: "rgba(0,212,255,0.1)",
              color: "#00d4ff",
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: 1,
              padding: "2px 6px",
              borderRadius: 3,
              border: "1px solid rgba(0,212,255,0.25)",
            }}>
              AUTO
            </span>
          )}
          <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>
            {lead.city}, {lead.state}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {lead.signalCount > 1 && (
            <span style={{
              background: "rgba(245,158,11,0.1)",
              color: "#f59e0b",
              fontSize: 9,
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: 3,
              border: "1px solid rgba(245,158,11,0.25)",
            }}>
              {lead.signalCount} signals
            </span>
          )}
          {trueFactorCount > 0 && (
            <span style={{ color: "#777", fontSize: 9 }}>
              {trueFactorCount}/7 factors
            </span>
          )}
          <span style={{ color: "#666", fontSize: 9, letterSpacing: 1 }}>
            {formatRelativeTime(lead.updatedAt)}
          </span>
        </div>
      </div>

      {/* Source & signal */}
      <div style={{ marginBottom: 8 }}>
        <span style={{ color: "#888", fontSize: 9, letterSpacing: 1 }}>SOURCE: </span>
        <span style={{ color: "#888", fontSize: 11 }}>{lead.source}</span>
      </div>
      <div style={{ color: "#999", fontSize: 11, lineHeight: 1.5, marginBottom: 12 }}>
        {lead.signal}
      </div>

      {/* Graduated / dismissed info */}
      {lead.addedAsCityId && (
        <div style={{
          background: "rgba(124,58,237,0.06)",
          border: "1px solid rgba(124,58,237,0.15)",
          borderRadius: 4,
          padding: "8px 12px",
          marginBottom: 12,
          color: "#7c3aed",
          fontSize: 10,
        }}>
          Graduated to live market: <strong>{lead.addedAsCityId}</strong>
        </div>
      )}
      {lead.dismissedReason && (
        <div style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 4,
          padding: "8px 12px",
          marginBottom: 12,
          color: "#888",
          fontSize: 10,
        }}>
          Dismissed: {lead.dismissedReason}
        </div>
      )}

      {/* Expand/collapse */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          background: "none",
          border: "none",
          color: "#888",
          fontSize: 9,
          letterSpacing: 1,
          cursor: "pointer",
          fontFamily: "'Inter', sans-serif",
          padding: 0,
          marginBottom: expanded ? 12 : 0,
        }}
      >
        {expanded ? "▼ COLLAPSE" : "▶ RESEARCH & ACTIONS"}
      </button>

      {expanded && (
        <div style={{ marginTop: 8 }}>
          {/* Signal timeline */}
          {lead.signalSources && lead.signalSources.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={() => setShowSignals(!showSignals)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#888",
                  fontSize: 8,
                  letterSpacing: 2,
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                  padding: 0,
                  marginBottom: showSignals ? 8 : 0,
                }}
              >
                {showSignals ? "▼" : "▶"} SIGNAL TIMELINE ({lead.signalSources.length})
              </button>
              {showSignals && (
                <div style={{
                  background: "rgba(0,0,0,0.2)",
                  borderRadius: 6,
                  padding: 12,
                  maxHeight: 200,
                  overflowY: "auto",
                }}>
                  {lead.signalSources.map((s, i) => (
                    <div
                      key={i}
                      style={{
                        borderBottom: i < lead.signalSources!.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                        padding: "8px 0",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ color: "#888", fontSize: 8, letterSpacing: 1 }}>
                          {s.source.toUpperCase()}
                        </span>
                        {s.confidence && (
                          <span style={{
                            color: s.confidence === "high" ? "#00ff88" : s.confidence === "medium" ? "#f59e0b" : "#555",
                            fontSize: 8,
                          }}>
                            {s.confidence}
                          </span>
                        )}
                        <span style={{ color: "#666", fontSize: 8 }}>
                          {new Date(s.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={{ color: "#888", fontSize: 10, lineHeight: 1.4 }}>
                        {s.summary}
                      </div>
                      {s.url && (
                        <a
                          href={s.url}
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
            </div>
          )}

          {/* Factor checklist */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: "#777", fontSize: 8, letterSpacing: 2, marginBottom: 8 }}>
              7-FACTOR ASSESSMENT
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {ALL_FACTORS.map((factor) => (
                <label
                  key={factor}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    padding: "4px 8px",
                    borderRadius: 4,
                    background: factors[factor] ? "rgba(0,255,136,0.04)" : "transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!factors[factor]}
                    onChange={(e) => setFactors({ ...factors, [factor]: e.target.checked })}
                    style={{ accentColor: "#00ff88" }}
                  />
                  <span style={{
                    color: factors[factor] ? "#00ff88" : "#555",
                    fontSize: 10,
                    fontFamily: "'Inter', sans-serif",
                  }}>
                    {FACTOR_LABELS[factor]}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Research notes */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: "#777", fontSize: 8, letterSpacing: 2, marginBottom: 8 }}>
              RESEARCH NOTES
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Running notes on public records, data sources found, verification status..."
              rows={4}
              style={{
                width: "100%",
                background: "#0a0a0f",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 6,
                color: "#ccc",
                fontSize: 11,
                fontFamily: "'Inter', sans-serif",
                padding: "10px 14px",
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
                lineHeight: 1.6,
              }}
            />
          </div>

          {/* Save notes + factors */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button
              onClick={() => patchLead({ researchNotes: notes, factorSnapshot: factors }).then((ok) => ok && showToast("Saved"))}
              disabled={saving}
              style={{
                background: "rgba(0,212,255,0.08)",
                border: "1px solid rgba(0,212,255,0.3)",
                borderRadius: 4,
                padding: "7px 16px",
                color: "#00d4ff",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 1,
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              SAVE NOTES & FACTORS
            </button>
          </div>

          {/* Status transitions */}
          <div style={{ color: "#777", fontSize: 8, letterSpacing: 2, marginBottom: 8 }}>
            STATUS ACTIONS
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {lead.status === "new" && (
              <StatusButton label="START RESEARCH" color="#f59e0b" onClick={() => patchLead({ status: "researching" }).then((ok) => ok && showToast("Moved to researching"))} />
            )}
            {lead.status === "researching" && (
              <StatusButton label="MARK VERIFIED" color="#00ff88" onClick={() => patchLead({ status: "verified" }).then((ok) => ok && showToast("Verified"))} />
            )}
            {lead.status === "verified" && (
              <StatusButton label="MARK ADDED" color="#7c3aed" onClick={() => patchLead({ status: "added" }).then((ok) => ok && showToast("Marked as added"))} />
            )}
            {!["added", "dismissed"].includes(lead.status) && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  value={dismissReason}
                  onChange={(e) => setDismissReason(e.target.value)}
                  placeholder="Reason to dismiss..."
                  style={{
                    background: "#0a0a0f",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 4,
                    color: "#888",
                    fontSize: 10,
                    fontFamily: "'Inter', sans-serif",
                    padding: "7px 12px",
                    outline: "none",
                    width: 200,
                  }}
                />
                <StatusButton
                  label="DISMISS"
                  color="#ff4444"
                  onClick={() => {
                    if (!dismissReason.trim()) { showToast("Enter a reason to dismiss"); return; }
                    patchLead({ status: "dismissed", dismissedReason: dismissReason }).then((ok) => ok && showToast("Dismissed"));
                  }}
                />
              </div>
            )}
            {["added", "dismissed"].includes(lead.status) && (
              <StatusButton label="REOPEN" color="#f59e0b" onClick={() => patchLead({ status: "new" }).then((ok) => ok && showToast("Reopened"))} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusButton({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: `${color}12`,
        border: `1px solid ${color}44`,
        borderRadius: 4,
        padding: "7px 14px",
        color,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 1,
        cursor: "pointer",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {label}
    </button>
  );
}
