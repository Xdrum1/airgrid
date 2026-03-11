"use client";

import { useState, useEffect, useCallback } from "react";
import { CITIES } from "@/data/seed";
import { FEED_CATEGORY_COLORS, FEED_STATUS_COLORS } from "@/lib/dashboard-constants";
import { safeHref } from "@/lib/safe-url";

interface FeedItemData {
  id: string;
  title: string;
  summary: string;
  sourceUrl: string | null;
  category: string;
  cityIds: string[];
  cities: { id: string; name: string }[];
  scoreImpact: boolean;
  status: string;
  promotedBy: string | null;
  publishedAt: string;
  createdAt: string;
}

const CITY_OPTIONS = CITIES.map((c) => ({ id: c.id, label: `${c.city}, ${c.state}` }));
const CATEGORY_OPTIONS = ["Regulatory", "Infrastructure", "Operator", "Legislative"];
const STATUS_OPTIONS = ["draft", "published", "archived"];

const EMPTY_FORM = {
  title: "",
  summary: "",
  sourceUrl: "",
  category: "Regulatory",
  cityIds: [] as string[],
  scoreImpact: false,
  status: "draft",
};

export default function AdminFeed({
  showToast,
}: {
  showToast: (msg: string) => void;
}) {
  const [items, setItems] = useState<FeedItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [promoteId, setPromoteId] = useState("");

  const fetchItems = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/feed", { credentials: "include" })
      .then((r) => r.json())
      .then((json) => setItems(json.data ?? []))
      .catch(() => showToast("Failed to load feed items"))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (item: FeedItemData) => {
    setForm({
      title: item.title,
      summary: item.summary,
      sourceUrl: item.sourceUrl ?? "",
      category: item.category,
      cityIds: item.cityIds,
      scoreImpact: item.scoreImpact,
      status: item.status,
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.summary.trim()) {
      showToast("Title and summary are required");
      return;
    }

    setSubmitting(true);
    try {
      const url = editingId ? `/api/admin/feed/${editingId}` : "/api/admin/feed";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      showToast(editingId ? "Feed item updated" : "Feed item created");
      resetForm();
      fetchItems();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/feed/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      showToast("Feed item archived");
      fetchItems();
    } catch {
      showToast("Failed to archive");
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/feed/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      if (!res.ok) throw new Error("Failed");
      showToast("Feed item published");
      fetchItems();
    } catch {
      showToast("Failed to publish");
    }
  };

  const handlePromote = async () => {
    if (!promoteId.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/feed/promote", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId: promoteId.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      showToast("Record promoted to draft");
      setPromoteId("");
      fetchItems();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to promote");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    background: "#111",
    border: "1px solid #222",
    borderRadius: 4,
    color: "#ccc",
    fontSize: 12,
    fontFamily: "'Space Mono', monospace",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 9,
    letterSpacing: 2,
    color: "#888",
    marginBottom: 4,
    display: "block",
    fontFamily: "'Space Mono', monospace",
  };

  const btnStyle = (color: string): React.CSSProperties => ({
    background: "none",
    border: `1px solid ${color}`,
    color,
    fontSize: 9,
    letterSpacing: 1,
    padding: "4px 10px",
    borderRadius: 3,
    cursor: "pointer",
    fontFamily: "'Space Mono', monospace",
  });

  return (
    <div>
      {/* Promote from record */}
      <div style={{ marginBottom: 20, display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="text"
          placeholder="Ingested record ID to promote..."
          value={promoteId}
          onChange={(e) => setPromoteId(e.target.value)}
          style={{ ...inputStyle, width: 300 }}
        />
        <button
          onClick={handlePromote}
          disabled={submitting || !promoteId.trim()}
          style={btnStyle("#7c3aed")}
        >
          PROMOTE TO DRAFT
        </button>
      </div>

      {/* Create / Edit form */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          style={btnStyle("#00d4ff")}
        >
          {showForm ? "CANCEL" : editingId ? "EDITING..." : "+ NEW FEED ITEM"}
        </button>
      </div>

      {showForm && (
        <div
          style={{
            border: "1px solid #1a1a2e",
            borderRadius: 6,
            padding: 16,
            marginBottom: 24,
            background: "#0a0a12",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>TITLE</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                style={inputStyle}
                maxLength={300}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>SUMMARY</label>
              <textarea
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
                maxLength={1000}
              />
            </div>

            <div>
              <label style={labelStyle}>CATEGORY</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                style={inputStyle}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>SOURCE URL</label>
              <input
                type="url"
                value={form.sourceUrl}
                onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
                style={inputStyle}
                placeholder="https://..."
              />
            </div>

            <div>
              <label style={labelStyle}>CITY TAGS</label>
              <select
                multiple
                value={form.cityIds}
                onChange={(e) =>
                  setForm({
                    ...form,
                    cityIds: Array.from(e.target.selectedOptions, (o) => o.value),
                  })
                }
                style={{ ...inputStyle, minHeight: 80 }}
              >
                {CITY_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>STATUS</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                style={inputStyle}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.toUpperCase()}</option>
                ))}
              </select>

              <div style={{ marginTop: 12 }}>
                <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.scoreImpact}
                    onChange={(e) => setForm({ ...form, scoreImpact: e.target.checked })}
                  />
                  SCORE IMPACT
                </label>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button onClick={handleSubmit} disabled={submitting} style={btnStyle("#00ff88")}>
              {submitting ? "SAVING..." : editingId ? "UPDATE" : "CREATE"}
            </button>
            <button onClick={resetForm} style={btnStyle("#555")}>CANCEL</button>
          </div>
        </div>
      )}

      {/* Items list */}
      {loading ? (
        <div style={{ color: "#777", fontSize: 10, letterSpacing: 2, textAlign: "center", padding: 60 }}>
          LOADING...
        </div>
      ) : items.length === 0 ? (
        <div style={{ color: "#666", fontSize: 11, letterSpacing: 2, textAlign: "center", padding: 80 }}>
          NO FEED ITEMS YET
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                border: "1px solid #1a1a2e",
                borderRadius: 6,
                padding: 14,
                background: "#0a0a12",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                {/* Status badge */}
                <span
                  style={{
                    fontSize: 8,
                    letterSpacing: 2,
                    padding: "2px 6px",
                    borderRadius: 3,
                    border: `1px solid ${FEED_STATUS_COLORS[item.status] ?? "#555"}`,
                    color: FEED_STATUS_COLORS[item.status] ?? "#555",
                  }}
                >
                  {item.status.toUpperCase()}
                </span>

                {/* Category pill */}
                <span
                  style={{
                    fontSize: 8,
                    letterSpacing: 2,
                    padding: "2px 6px",
                    borderRadius: 3,
                    border: `1px solid ${FEED_CATEGORY_COLORS[item.category] ?? "#555"}`,
                    color: FEED_CATEGORY_COLORS[item.category] ?? "#555",
                  }}
                >
                  {item.category.toUpperCase()}
                </span>

                {item.scoreImpact && (
                  <span style={{ fontSize: 8, letterSpacing: 2, color: "#f59e0b" }}>
                    SCORE IMPACT
                  </span>
                )}

                {item.promotedBy && (
                  <span style={{ fontSize: 8, color: "#666" }}>
                    via {item.promotedBy}
                  </span>
                )}
              </div>

              <div style={{ fontSize: 13, color: "#ddd", fontWeight: 600, marginBottom: 4 }}>
                {item.title}
              </div>

              <div style={{ fontSize: 11, color: "#888", marginBottom: 8, lineHeight: 1.5 }}>
                {item.summary}
              </div>

              {item.cities.length > 0 && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                  {item.cities.map((c) => (
                    <span
                      key={c.id}
                      style={{
                        fontSize: 8,
                        letterSpacing: 1,
                        padding: "2px 6px",
                        borderRadius: 3,
                        background: "#111",
                        border: "1px solid #222",
                        color: "#aaa",
                      }}
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {item.sourceUrl && (
                  <a
                    href={safeHref(item.sourceUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 9, color: "#00d4ff" }}
                  >
                    SOURCE
                  </a>
                )}
                <span style={{ fontSize: 9, color: "#666" }}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                  {item.status === "draft" && (
                    <button onClick={() => handlePublish(item.id)} style={btnStyle("#00ff88")}>
                      PUBLISH
                    </button>
                  )}
                  <button onClick={() => handleEdit(item)} style={btnStyle("#00d4ff")}>
                    EDIT
                  </button>
                  {item.status !== "archived" && (
                    <button onClick={() => handleArchive(item.id)} style={btnStyle("#ff4444")}>
                      ARCHIVE
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
