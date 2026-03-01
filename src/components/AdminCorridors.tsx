"use client";

import { useState, useEffect, useCallback } from "react";
import { CITIES, OPERATORS } from "@/data/seed";
import { CORRIDOR_STATUS_COLORS } from "@/lib/dashboard-constants";

interface CorridorData {
  id: string;
  name: string;
  status: string;
  cityId: string;
  operatorId?: string;
  startPoint: { label: string };
  endPoint: { label: string };
  distanceKm: number;
  estimatedFlightMinutes: number;
  notes?: string;
  sourceUrl?: string;
  lastUpdated: string;
}

const CITY_OPTIONS = CITIES.map((c) => ({ id: c.id, label: `${c.city}, ${c.state}` }));
const OPERATOR_OPTIONS = OPERATORS.map((o) => ({ id: o.id, label: o.name }));
const STATUS_OPTIONS = ["proposed", "authorized", "active", "suspended"];

const EMPTY_FORM = {
  name: "",
  status: "proposed",
  cityId: "",
  operatorId: "",
  startPointLabel: "",
  endPointLabel: "",
  distanceKm: "",
  estimatedFlightMinutes: "",
  notes: "",
  sourceUrl: "",
};

export default function AdminCorridors({
  showToast,
}: {
  showToast: (msg: string) => void;
}) {
  const [corridors, setCorridors] = useState<CorridorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchCorridors = useCallback(() => {
    setLoading(true);
    fetch("/api/corridors")
      .then((r) => r.json())
      .then((json) => setCorridors(json.data ?? []))
      .catch(() => showToast("Failed to load corridors"))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => {
    fetchCorridors();
  }, [fetchCorridors]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (c: CorridorData) => {
    setForm({
      name: c.name,
      status: c.status,
      cityId: c.cityId,
      operatorId: c.operatorId ?? "",
      startPointLabel: c.startPoint.label,
      endPointLabel: c.endPoint.label,
      distanceKm: c.distanceKm ? String(c.distanceKm) : "",
      estimatedFlightMinutes: c.estimatedFlightMinutes ? String(c.estimatedFlightMinutes) : "",
      notes: c.notes ?? "",
      sourceUrl: c.sourceUrl ?? "",
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.cityId || !form.startPointLabel || !form.endPointLabel) {
      showToast("Fill required fields");
      return;
    }

    setSubmitting(true);
    const payload = {
      name: form.name,
      status: form.status,
      cityId: form.cityId,
      operatorId: form.operatorId || undefined,
      startPointLabel: form.startPointLabel,
      endPointLabel: form.endPointLabel,
      distanceKm: form.distanceKm ? Number(form.distanceKm) : undefined,
      estimatedFlightMinutes: form.estimatedFlightMinutes ? Number(form.estimatedFlightMinutes) : undefined,
      notes: form.notes || undefined,
      sourceUrl: form.sourceUrl || undefined,
    };

    try {
      const url = editingId
        ? `/api/admin/corridors/${editingId}`
        : "/api/admin/corridors";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 429) {
        showToast("Rate limited — slow down");
        return;
      }

      if (!res.ok) {
        const json = await res.json();
        showToast(json.error ?? "Request failed");
        return;
      }

      showToast(editingId ? "Corridor updated" : "Corridor created");
      resetForm();
      fetchCorridors();
    } catch {
      showToast("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/corridors/${id}`, { method: "DELETE" });
      if (res.status === 429) {
        showToast("Rate limited");
        return;
      }
      if (!res.ok) {
        const json = await res.json();
        showToast(json.error ?? "Delete failed");
        return;
      }
      showToast("Corridor deleted");
      setDeleteConfirm(null);
      fetchCorridors();
    } catch {
      showToast("Network error");
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#0a0a0f",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 4,
    color: "#fff",
    fontSize: 11,
    padding: "8px 10px",
    fontFamily: "'Space Mono', monospace",
    boxSizing: "border-box",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    color: "#555",
    fontSize: 9,
    letterSpacing: 1,
    marginBottom: 4,
    display: "block",
  };

  if (loading) {
    return (
      <div style={{ color: "#444", fontSize: 10, letterSpacing: 2, textAlign: "center", padding: 60 }}>
        LOADING CORRIDORS...
      </div>
    );
  }

  return (
    <div>
      {/* Header + Create button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ color: "#555", fontSize: 10, letterSpacing: 1 }}>
          {corridors.length} CORRIDOR{corridors.length !== 1 ? "S" : ""}
        </div>
        <button
          onClick={() => {
            if (showForm && !editingId) {
              resetForm();
            } else {
              setForm(EMPTY_FORM);
              setEditingId(null);
              setShowForm(true);
            }
          }}
          style={{
            background: "rgba(124,58,237,0.12)",
            border: "1px solid rgba(124,58,237,0.4)",
            borderRadius: 4,
            padding: "7px 16px",
            color: "#7c3aed",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 1,
            cursor: "pointer",
            fontFamily: "'Space Mono', monospace",
          }}
        >
          {showForm && !editingId ? "CANCEL" : "CREATE CORRIDOR"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(124,58,237,0.2)",
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <div style={{ color: "#7c3aed", fontSize: 10, fontWeight: 700, letterSpacing: 2, marginBottom: 14 }}>
            {editingId ? "EDIT CORRIDOR" : "NEW CORRIDOR"}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>NAME *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. LAX → Downtown"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>STATUS *</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                style={inputStyle}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>CITY *</label>
              <select
                value={form.cityId}
                onChange={(e) => setForm((f) => ({ ...f, cityId: e.target.value }))}
                style={{ ...inputStyle, color: form.cityId ? "#fff" : "#555" }}
              >
                <option value="">Select city...</option>
                {CITY_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>OPERATOR</label>
              <select
                value={form.operatorId}
                onChange={(e) => setForm((f) => ({ ...f, operatorId: e.target.value }))}
                style={{ ...inputStyle, color: form.operatorId ? "#fff" : "#555" }}
              >
                <option value="">None</option>
                {OPERATOR_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>START POINT *</label>
              <input
                value={form.startPointLabel}
                onChange={(e) => setForm((f) => ({ ...f, startPointLabel: e.target.value }))}
                placeholder="e.g. LAX Terminal"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>END POINT *</label>
              <input
                value={form.endPointLabel}
                onChange={(e) => setForm((f) => ({ ...f, endPointLabel: e.target.value }))}
                placeholder="e.g. Downtown Helipad"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>DISTANCE (KM)</label>
              <input
                type="number"
                value={form.distanceKm}
                onChange={(e) => setForm((f) => ({ ...f, distanceKm: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>FLIGHT TIME (MIN)</label>
              <input
                type="number"
                value={form.estimatedFlightMinutes}
                onChange={(e) => setForm((f) => ({ ...f, estimatedFlightMinutes: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>NOTES</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>SOURCE URL</label>
            <input
              value={form.sourceUrl}
              onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))}
              placeholder="https://..."
              style={inputStyle}
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: "rgba(124,58,237,0.15)",
                border: "1px solid rgba(124,58,237,0.4)",
                borderRadius: 4,
                padding: "8px 20px",
                color: "#7c3aed",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 1,
                cursor: submitting ? "default" : "pointer",
                fontFamily: "'Space Mono', monospace",
                opacity: submitting ? 0.5 : 1,
              }}
            >
              {submitting ? "SAVING..." : editingId ? "UPDATE" : "CREATE"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              style={{
                background: "none",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 4,
                padding: "8px 20px",
                color: "#555",
                fontSize: 9,
                letterSpacing: 1,
                cursor: "pointer",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              CANCEL
            </button>
          </div>
        </form>
      )}

      {/* Corridor list */}
      {corridors.length === 0 ? (
        <div style={{ color: "#333", fontSize: 11, letterSpacing: 2, textAlign: "center", padding: 80 }}>
          NO CORRIDORS
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {corridors.map((c) => {
            const statusColor = CORRIDOR_STATUS_COLORS[c.status] ?? "#888";
            const cityLabel = CITY_OPTIONS.find((ci) => ci.id === c.cityId)?.label ?? c.cityId;

            return (
              <div
                key={c.id}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8,
                  padding: 16,
                }}
              >
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>
                      {c.name}
                    </span>
                    <span
                      style={{
                        color: statusColor,
                        fontSize: 8,
                        letterSpacing: 1,
                        border: `1px solid ${statusColor}44`,
                        borderRadius: 3,
                        padding: "2px 6px",
                        textTransform: "uppercase",
                        fontFamily: "'Space Mono', monospace",
                      }}
                    >
                      {c.status}
                    </span>
                  </div>
                  <span style={{ color: "#555", fontSize: 9 }}>{cityLabel}</span>
                </div>

                {/* Route */}
                <div style={{ color: "#888", fontSize: 10, marginBottom: 8 }}>
                  {c.startPoint.label} → {c.endPoint.label}
                </div>

                {/* Stats */}
                <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
                  {c.distanceKm > 0 && (
                    <div>
                      <span style={{ color: "#444", fontSize: 8, letterSpacing: 1 }}>DIST </span>
                      <span style={{ color: "#ccc", fontSize: 10 }}>{c.distanceKm} km</span>
                    </div>
                  )}
                  {c.estimatedFlightMinutes > 0 && (
                    <div>
                      <span style={{ color: "#444", fontSize: 8, letterSpacing: 1 }}>TIME </span>
                      <span style={{ color: "#ccc", fontSize: 10 }}>{c.estimatedFlightMinutes} min</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => handleEdit(c)}
                    style={{
                      background: "rgba(0,212,255,0.08)",
                      border: "1px solid rgba(0,212,255,0.3)",
                      borderRadius: 4,
                      padding: "6px 14px",
                      color: "#00d4ff",
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: 1,
                      cursor: "pointer",
                      fontFamily: "'Space Mono', monospace",
                    }}
                  >
                    EDIT
                  </button>
                  {deleteConfirm === c.id ? (
                    <>
                      <button
                        onClick={() => handleDelete(c.id)}
                        style={{
                          background: "rgba(255,68,68,0.15)",
                          border: "1px solid rgba(255,68,68,0.5)",
                          borderRadius: 4,
                          padding: "6px 14px",
                          color: "#ff4444",
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: 1,
                          cursor: "pointer",
                          fontFamily: "'Space Mono', monospace",
                        }}
                      >
                        CONFIRM DELETE
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        style={{
                          background: "none",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 4,
                          padding: "6px 14px",
                          color: "#555",
                          fontSize: 9,
                          letterSpacing: 1,
                          cursor: "pointer",
                          fontFamily: "'Space Mono', monospace",
                        }}
                      >
                        CANCEL
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(c.id)}
                      style={{
                        background: "rgba(255,68,68,0.08)",
                        border: "1px solid rgba(255,68,68,0.3)",
                        borderRadius: 4,
                        padding: "6px 14px",
                        color: "#ff4444",
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: 1,
                        cursor: "pointer",
                        fontFamily: "'Space Mono', monospace",
                      }}
                    >
                      DELETE
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
