"use client";

import { useState, useEffect, useCallback } from "react";

interface Inquiry {
  id: string;
  name: string;
  email: string;
  company: string | null;
  role: string | null;
  tier: string;
  message: string | null;
  status: string;
  notes: string | null;
  source: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  converted: number;
  closed: number;
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  new: { color: "#00d4ff", label: "NEW" },
  contacted: { color: "#f59e0b", label: "CONTACTED" },
  qualified: { color: "#7c3aed", label: "QUALIFIED" },
  converted: { color: "#00ff88", label: "CONVERTED" },
  closed: { color: "#666", label: "CLOSED" },
};

const TIER_COLORS: Record<string, string> = {
  pro: "#00d4ff",
  institutional: "#7c3aed",
  enterprise: "#f59e0b",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

function responseTime(createdAt: string, status: string): string {
  if (status === "new") {
    const hours = Math.floor((Date.now() - new Date(createdAt).getTime()) / 3600000);
    if (hours < 1) return "< 1h waiting";
    if (hours < 24) return `${hours}h waiting`;
    const days = Math.floor(hours / 24);
    return `${days}d waiting`;
  }
  return "";
}

function isOverdue(createdAt: string, status: string): boolean {
  if (status !== "new") return false;
  return Date.now() - new Date(createdAt).getTime() > 24 * 60 * 60 * 1000;
}

export default function AdminInquiries({
  showToast,
}: {
  showToast: (msg: string) => void;
}) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const res = await fetch(`/api/admin/inquiries${params}`);
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setInquiries(json.data);
      setStats(json.stats);
    } catch {
      showToast("Failed to load inquiries");
    } finally {
      setLoading(false);
    }
  }, [filter, showToast]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      const res = await fetch("/api/admin/inquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("Failed");
      await fetchInquiries();
      showToast(`Marked as ${status}`);
    } catch {
      showToast("Failed to update status");
    } finally {
      setUpdating(null);
    }
  };

  const saveNotes = async (id: string) => {
    setUpdating(id);
    try {
      const res = await fetch("/api/admin/inquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, notes: notesDraft }),
      });
      if (!res.ok) throw new Error("Failed");
      setEditingNotes(null);
      await fetchInquiries();
      showToast("Notes saved");
    } catch {
      showToast("Failed to save notes");
    } finally {
      setUpdating(null);
    }
  };

  const filtered = inquiries;
  const newCount = stats?.new ?? 0;
  const overdueCount = inquiries.filter((i) => isOverdue(i.createdAt, i.status)).length;

  return (
    <div>
      {/* Stats bar */}
      {stats && (
        <div
          style={{
            display: "flex",
            gap: 16,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          {(["new", "contacted", "qualified", "converted", "closed"] as const).map((s) => {
            const cfg = STATUS_CONFIG[s];
            const count = stats[s];
            return (
              <div
                key={s}
                onClick={() => setFilter(filter === s ? "all" : s)}
                style={{
                  background: filter === s ? `${cfg.color}15` : "rgba(255,255,255,0.02)",
                  border: `1px solid ${filter === s ? `${cfg.color}40` : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 6,
                  padding: "10px 16px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  minWidth: 80,
                  textAlign: "center",
                }}
              >
                <div style={{ color: cfg.color, fontSize: 18, fontWeight: 700 }}>{count}</div>
                <div style={{ color: "#888", fontSize: 9, letterSpacing: 1.5, marginTop: 2 }}>{cfg.label}</div>
              </div>
            );
          })}
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 6,
              padding: "10px 16px",
              minWidth: 80,
              textAlign: "center",
            }}
          >
            <div style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>{stats.total}</div>
            <div style={{ color: "#888", fontSize: 9, letterSpacing: 1.5, marginTop: 2 }}>TOTAL</div>
          </div>
        </div>
      )}

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <div
          style={{
            background: "rgba(255,68,68,0.06)",
            border: "1px solid rgba(255,68,68,0.2)",
            borderRadius: 6,
            padding: "10px 16px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: "#ff4444", fontSize: 11, fontWeight: 700 }}>
            {overdueCount} inquiry{overdueCount !== 1 ? "ies" : ""} waiting 24h+
          </span>
          <span style={{ color: "#888", fontSize: 10 }}>
            — respond within 24 hours to maintain pipeline velocity
          </span>
        </div>
      )}

      {/* Filter label */}
      {filter !== "all" && (
        <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#888", fontSize: 10, letterSpacing: 1 }}>
            SHOWING: {STATUS_CONFIG[filter]?.label}
          </span>
          <button
            onClick={() => setFilter("all")}
            style={{
              background: "none",
              border: "none",
              color: "#00d4ff",
              fontSize: 10,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              padding: 0,
            }}
          >
            CLEAR
          </button>
        </div>
      )}

      {/* Inquiries list */}
      {loading ? (
        <div style={{ color: "#777", fontSize: 10, letterSpacing: 2, textAlign: "center", padding: 60 }}>
          LOADING...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ color: "#666", fontSize: 11, letterSpacing: 2, textAlign: "center", padding: 80 }}>
          {filter !== "all" ? `NO ${STATUS_CONFIG[filter]?.label} INQUIRIES` : "NO INQUIRIES YET"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((inq) => {
            const overdue = isOverdue(inq.createdAt, inq.status);
            const waiting = responseTime(inq.createdAt, inq.status);
            const statusCfg = STATUS_CONFIG[inq.status] || STATUS_CONFIG.new;
            const tierColor = TIER_COLORS[inq.tier] || "#888";
            const isEditing = editingNotes === inq.id;

            return (
              <div
                key={inq.id}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: overdue
                    ? "1px solid rgba(255,68,68,0.25)"
                    : "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8,
                  padding: 16,
                  opacity: updating === inq.id ? 0.5 : 1,
                  transition: "opacity 0.2s",
                }}
              >
                {/* Top row: status + tier + time */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 10,
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        background: `${statusCfg.color}15`,
                        color: statusCfg.color,
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: 1,
                        padding: "3px 8px",
                        borderRadius: 3,
                        border: `1px solid ${statusCfg.color}40`,
                      }}
                    >
                      {statusCfg.label}
                    </span>
                    <span
                      style={{
                        background: `${tierColor}15`,
                        color: tierColor,
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: 1,
                        padding: "3px 8px",
                        borderRadius: 3,
                        border: `1px solid ${tierColor}40`,
                        textTransform: "uppercase",
                      }}
                    >
                      {inq.tier}
                    </span>
                    {inq.source && (
                      <span style={{ color: "#555", fontSize: 9, letterSpacing: 1 }}>
                        via {inq.source}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {waiting && (
                      <span
                        style={{
                          color: overdue ? "#ff4444" : "#f59e0b",
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: 1,
                        }}
                      >
                        {waiting}
                      </span>
                    )}
                    <span style={{ color: "#666", fontSize: 9, letterSpacing: 1 }}>
                      {formatRelative(inq.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Contact info */}
                <div style={{ marginBottom: 8 }}>
                  <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>
                    {inq.name}
                  </span>
                  {inq.company && (
                    <span style={{ color: "#888", fontSize: 12, marginLeft: 8 }}>
                      {inq.company}
                    </span>
                  )}
                  {inq.role && (
                    <span style={{ color: "#666", fontSize: 11, marginLeft: 8 }}>
                      ({inq.role})
                    </span>
                  )}
                </div>

                {/* Email */}
                <div style={{ marginBottom: inq.message ? 8 : 10 }}>
                  <a
                    href={`mailto:${inq.email}`}
                    style={{ color: "#00d4ff", fontSize: 11, textDecoration: "none" }}
                  >
                    {inq.email}
                  </a>
                </div>

                {/* Message */}
                {inq.message && (
                  <div
                    style={{
                      color: "#999",
                      fontSize: 11,
                      lineHeight: 1.6,
                      marginBottom: 10,
                      padding: "8px 12px",
                      background: "rgba(0,0,0,0.2)",
                      borderRadius: 4,
                      borderLeft: "2px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    {inq.message}
                  </div>
                )}

                {/* Notes */}
                {isEditing ? (
                  <div style={{ marginBottom: 10 }}>
                    <textarea
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      rows={2}
                      style={{
                        width: "100%",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(124,58,237,0.3)",
                        borderRadius: 4,
                        padding: "8px 10px",
                        color: "#fff",
                        fontSize: 11,
                        fontFamily: "'Inter', sans-serif",
                        outline: "none",
                        boxSizing: "border-box",
                        resize: "vertical",
                      }}
                      placeholder="Add notes about this inquiry..."
                      autoFocus
                    />
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <button
                        onClick={() => saveNotes(inq.id)}
                        style={{
                          background: "rgba(124,58,237,0.15)",
                          border: "1px solid rgba(124,58,237,0.3)",
                          borderRadius: 4,
                          padding: "5px 12px",
                          color: "#7c3aed",
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: 1,
                          cursor: "pointer",
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        SAVE
                      </button>
                      <button
                        onClick={() => setEditingNotes(null)}
                        style={{
                          background: "none",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: 4,
                          padding: "5px 12px",
                          color: "#888",
                          fontSize: 9,
                          letterSpacing: 1,
                          cursor: "pointer",
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                ) : inq.notes ? (
                  <div
                    onClick={() => {
                      setEditingNotes(inq.id);
                      setNotesDraft(inq.notes || "");
                    }}
                    style={{
                      color: "#7c3aed",
                      fontSize: 10,
                      lineHeight: 1.5,
                      marginBottom: 10,
                      padding: "6px 10px",
                      background: "rgba(124,58,237,0.06)",
                      border: "1px solid rgba(124,58,237,0.15)",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ fontSize: 8, letterSpacing: 1, color: "#666", marginRight: 6 }}>NOTES:</span>
                    {inq.notes}
                  </div>
                ) : null}

                {/* Actions */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  {/* Status transitions */}
                  {inq.status === "new" && (
                    <button
                      onClick={() => updateStatus(inq.id, "contacted")}
                      disabled={!!updating}
                      style={{
                        background: "rgba(245,158,11,0.08)",
                        border: "1px solid rgba(245,158,11,0.3)",
                        borderRadius: 4,
                        padding: "6px 12px",
                        color: "#f59e0b",
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: 1,
                        cursor: "pointer",
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      MARK CONTACTED
                    </button>
                  )}
                  {(inq.status === "new" || inq.status === "contacted") && (
                    <button
                      onClick={() => updateStatus(inq.id, "qualified")}
                      disabled={!!updating}
                      style={{
                        background: "rgba(124,58,237,0.08)",
                        border: "1px solid rgba(124,58,237,0.3)",
                        borderRadius: 4,
                        padding: "6px 12px",
                        color: "#7c3aed",
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: 1,
                        cursor: "pointer",
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      QUALIFIED
                    </button>
                  )}
                  {inq.status === "qualified" && (
                    <button
                      onClick={() => updateStatus(inq.id, "converted")}
                      disabled={!!updating}
                      style={{
                        background: "rgba(0,255,136,0.08)",
                        border: "1px solid rgba(0,255,136,0.3)",
                        borderRadius: 4,
                        padding: "6px 12px",
                        color: "#00ff88",
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: 1,
                        cursor: "pointer",
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      CONVERTED
                    </button>
                  )}
                  {inq.status !== "closed" && inq.status !== "converted" && (
                    <button
                      onClick={() => updateStatus(inq.id, "closed")}
                      disabled={!!updating}
                      style={{
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 4,
                        padding: "6px 12px",
                        color: "#666",
                        fontSize: 9,
                        letterSpacing: 1,
                        cursor: "pointer",
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      CLOSE
                    </button>
                  )}
                  {inq.status === "closed" && (
                    <button
                      onClick={() => updateStatus(inq.id, "new")}
                      disabled={!!updating}
                      style={{
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 4,
                        padding: "6px 12px",
                        color: "#888",
                        fontSize: 9,
                        letterSpacing: 1,
                        cursor: "pointer",
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      REOPEN
                    </button>
                  )}

                  {/* Add notes button */}
                  {!isEditing && !inq.notes && (
                    <button
                      onClick={() => {
                        setEditingNotes(inq.id);
                        setNotesDraft("");
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#555",
                        fontSize: 9,
                        letterSpacing: 1,
                        cursor: "pointer",
                        fontFamily: "'Inter', sans-serif",
                        padding: "6px 8px",
                      }}
                    >
                      + NOTES
                    </button>
                  )}

                  {/* Reply via email */}
                  <a
                    href={`mailto:${inq.email}?subject=Re: AirIndex ${inq.tier} inquiry`}
                    style={{
                      marginLeft: "auto",
                      color: "#00d4ff",
                      fontSize: 9,
                      letterSpacing: 1,
                      textDecoration: "none",
                      fontWeight: 600,
                    }}
                  >
                    REPLY →
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
