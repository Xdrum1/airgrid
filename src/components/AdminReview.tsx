"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { CITIES } from "@/data/seed";

// -------------------------------------------------------
// Types
// -------------------------------------------------------

interface PendingOverride {
  id: string;
  cityId: string;
  cityName: string | null;
  field: string;
  value: unknown;
  reason: string;
  sourceRecordId: string | null;
  sourceUrl: string | null;
  confidence: string;
  createdAt: string;
}

interface ClassificationResult {
  id: string;
  recordId: string;
  eventType: string;
  factorsJson: unknown;
  affectedCities: string[];
  confidence: string;
  rawResponse: unknown;
  modelUsed: string;
  promptVersion: string;
  createdAt: string;
}

type TabKey = "overrides" | "classifications";

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "#00ff88",
  medium: "#f59e0b",
  needs_review: "#ff4444",
};

const CITY_OPTIONS = CITIES.map((c) => ({ id: c.id, label: `${c.city}, ${c.state}` }));

function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const d = new Date(timestamp);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// -------------------------------------------------------
// PIN Prompt
// -------------------------------------------------------

function PinPrompt({ onVerified }: { onVerified: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      if (res.ok) {
        onVerified();
        return;
      }

      if (res.status === 429) {
        setError("Too many attempts. Try again later.");
      } else {
        const json = await res.json();
        setError(json.error ?? "Verification failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setPin("");
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050508",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Space Mono', monospace",
        color: "#fff",
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(124,58,237,0.3)",
          borderRadius: 12,
          padding: "40px 36px",
          maxWidth: 360,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: "#7c3aed",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 3,
            marginBottom: 8,
          }}
        >
          ADMIN VERIFICATION
        </div>
        <div
          style={{
            color: "#555",
            fontSize: 11,
            marginBottom: 28,
            lineHeight: 1.5,
          }}
        >
          Enter your admin PIN to continue
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN"
            autoFocus
            style={{
              width: "100%",
              background: "#0a0a0f",
              border: error
                ? "1px solid rgba(255,68,68,0.5)"
                : "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6,
              color: "#fff",
              fontSize: 16,
              fontFamily: "'Space Mono', monospace",
              padding: "12px 16px",
              textAlign: "center",
              letterSpacing: 6,
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.15s",
            }}
          />

          {error && (
            <div
              style={{
                color: "#ff4444",
                fontSize: 10,
                letterSpacing: 1,
                marginTop: 10,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !pin.trim()}
            style={{
              width: "100%",
              marginTop: 16,
              background: submitting
                ? "rgba(124,58,237,0.1)"
                : "rgba(124,58,237,0.15)",
              border: "1px solid rgba(124,58,237,0.4)",
              borderRadius: 6,
              padding: "12px 0",
              color: "#7c3aed",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 2,
              cursor: submitting ? "default" : "pointer",
              fontFamily: "'Space Mono', monospace",
              transition: "all 0.15s",
              opacity: submitting || !pin.trim() ? 0.5 : 1,
            }}
          >
            {submitting ? "VERIFYING..." : "VERIFY"}
          </button>
        </form>

        <Link
          href="/dashboard"
          style={{
            display: "inline-block",
            marginTop: 24,
            color: "#333",
            fontSize: 9,
            letterSpacing: 2,
            textDecoration: "none",
          }}
        >
          ← DASHBOARD
        </Link>
      </div>
    </div>
  );
}

// -------------------------------------------------------
// Component
// -------------------------------------------------------

export default function AdminReview({ adminEmail }: { adminEmail: string }) {
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<TabKey>("overrides");
  const [overrides, setOverrides] = useState<PendingOverride[]>([]);
  const [classifications, setClassifications] = useState<ClassificationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [citySelections, setCitySelections] = useState<Record<string, string>>({});
  const [pinVerified, setPinVerified] = useState(false);
  const [needsPin, setNeedsPin] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Initial data fetch — detects if PIN is needed
  const fetchOverrides = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/overrides")
      .then((r) => {
        if (r.status === 403) {
          setNeedsPin(true);
          setLoading(false);
          return null;
        }
        return r.json();
      })
      .then((json) => {
        if (json) {
          setOverrides(json.data ?? []);
          setPinVerified(true);
          setNeedsPin(false);
        }
      })
      .catch(() => showToast("Failed to load overrides"))
      .finally(() => setLoading(false));
  }, [showToast]);

  // Fetch overrides on mount and tab switch
  useEffect(() => {
    if (tab !== "overrides") return;
    if (needsPin && !pinVerified) return;
    fetchOverrides();
  }, [tab, pinVerified]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch classifications
  useEffect(() => {
    if (tab !== "classifications") return;
    if (needsPin && !pinVerified) return;
    setLoading(true);
    fetch("/api/admin/classifications?limit=50")
      .then((r) => {
        if (r.status === 403) {
          setNeedsPin(true);
          setLoading(false);
          return null;
        }
        return r.json();
      })
      .then((json) => {
        if (json) {
          setClassifications(json.data ?? []);
        }
      })
      .catch(() => showToast("Failed to load classifications"))
      .finally(() => setLoading(false));
  }, [tab, pinVerified, showToast]);

  // Try fetching on mount to check if cookie already exists
  useEffect(() => {
    fetchOverrides();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAction = async (
    overrideId: string,
    action: "approve" | "reject"
  ) => {
    const override = overrides.find((o) => o.id === overrideId);
    if (!override) return;

    if (action === "approve" && override.cityId === "__unresolved__") {
      const selectedCity = citySelections[overrideId];
      if (!selectedCity) {
        showToast("Select a city before approving");
        return;
      }
    }

    setActionInProgress(overrideId);

    try {
      const body: Record<string, string> = { overrideId, action };
      if (action === "approve" && override.cityId === "__unresolved__") {
        body.cityId = citySelections[overrideId];
      }

      const res = await fetch("/api/admin/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 429) {
        showToast("Rate limited — slow down");
        return;
      }

      if (res.status === 403) {
        setNeedsPin(true);
        setPinVerified(false);
        return;
      }

      const json = await res.json();

      if (!res.ok) {
        showToast(json.error ?? "Action failed");
        return;
      }

      setOverrides((prev) => prev.filter((o) => o.id !== overrideId));

      if (action === "approve" && json.scoreChange) {
        const sc = json.scoreChange;
        showToast(`Approved — score ${sc.oldScore} → ${sc.newScore}`);
      } else if (action === "approve") {
        showToast("Approved — no score change");
      } else {
        showToast("Rejected");
      }
    } catch {
      showToast("Network error");
    } finally {
      setActionInProgress(null);
    }
  };

  // Auth gate — show nothing while loading, 404-style for non-admins
  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: "#050508" }} />
    );
  }

  if (!session?.user?.email || session.user.email !== adminEmail) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#050508",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Space Mono', monospace",
          color: "#fff",
        }}
      >
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 96, color: "#1a1a28", lineHeight: 1 }}>404</div>
        <div style={{ color: "#555", fontSize: 14, marginTop: 12, marginBottom: 32, letterSpacing: 2 }}>MARKET NOT FOUND</div>
        <Link href="/dashboard" style={{ color: "#00d4ff", fontSize: 11, letterSpacing: 1, textDecoration: "none", border: "1px solid rgba(0,212,255,0.3)", borderRadius: 6, padding: "10px 20px" }}>
          BACK TO DASHBOARD
        </Link>
      </div>
    );
  }

  // PIN gate — show PIN prompt if cookie missing or expired
  if (needsPin && !pinVerified) {
    return (
      <PinPrompt
        onVerified={() => {
          setPinVerified(true);
          setNeedsPin(false);
        }}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050508",
        fontFamily: "'Space Mono', monospace",
        color: "#fff",
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 54,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link
            href="/dashboard"
            style={{
              color: "#555",
              fontSize: 9,
              letterSpacing: 2,
              textDecoration: "none",
            }}
          >
            ← DASHBOARD
          </Link>
          <span
            style={{
              color: "#7c3aed",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            ADMIN REVIEW
          </span>
        </div>
        <span style={{ color: "#333", fontSize: 9, letterSpacing: 1 }}>
          {overrides.length} PENDING
        </span>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "0 24px",
        }}
      >
        {(["overrides", "classifications"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: "none",
              border: "none",
              borderBottom:
                tab === t
                  ? "2px solid #7c3aed"
                  : "2px solid transparent",
              color: tab === t ? "#fff" : "#555",
              fontSize: 10,
              letterSpacing: 2,
              padding: "14px 20px",
              cursor: "pointer",
              fontFamily: "'Space Mono', monospace",
              fontWeight: tab === t ? 700 : 400,
              transition: "all 0.15s",
            }}
          >
            {t === "overrides" ? "PENDING OVERRIDES" : "CLASSIFICATIONS"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        {loading ? (
          <div
            style={{
              color: "#444",
              fontSize: 10,
              letterSpacing: 2,
              textAlign: "center",
              padding: 60,
            }}
          >
            LOADING...
          </div>
        ) : tab === "overrides" ? (
          overrides.length === 0 ? (
            <div
              style={{
                color: "#333",
                fontSize: 11,
                letterSpacing: 2,
                textAlign: "center",
                padding: 80,
              }}
            >
              NO PENDING OVERRIDES
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {overrides.map((o) => (
                <OverrideCard
                  key={o.id}
                  override={o}
                  isActing={actionInProgress === o.id}
                  selectedCity={citySelections[o.id] ?? ""}
                  onCityChange={(cityId) =>
                    setCitySelections((prev) => ({
                      ...prev,
                      [o.id]: cityId,
                    }))
                  }
                  onApprove={() => handleAction(o.id, "approve")}
                  onReject={() => handleAction(o.id, "reject")}
                />
              ))}
            </div>
          )
        ) : classifications.length === 0 ? (
          <div
            style={{
              color: "#333",
              fontSize: 11,
              letterSpacing: 2,
              textAlign: "center",
              padding: 80,
            }}
          >
            NO CLASSIFICATIONS YET
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {classifications.map((c) => (
              <ClassificationCard key={c.id} classification={c} />
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#0e0e16",
            border: "1px solid rgba(124,58,237,0.4)",
            borderRadius: 6,
            padding: "10px 20px",
            color: "#fff",
            fontSize: 11,
            letterSpacing: 1,
            fontFamily: "'Space Mono', monospace",
            zIndex: 9999,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------
// Override Card
// -------------------------------------------------------

function OverrideCard({
  override,
  isActing,
  selectedCity,
  onCityChange,
  onApprove,
  onReject,
}: {
  override: PendingOverride;
  isActing: boolean;
  selectedCity: string;
  onCityChange: (cityId: string) => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const confidenceColor = CONFIDENCE_COLORS[override.confidence] ?? "#555";
  const isUnresolved = override.cityId === "__unresolved__";

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 8,
        padding: 16,
        opacity: isActing ? 0.5 : 1,
        transition: "opacity 0.2s",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              background: `${confidenceColor}22`,
              color: confidenceColor,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 1,
              padding: "3px 8px",
              borderRadius: 3,
              border: `1px solid ${confidenceColor}44`,
            }}
          >
            {override.confidence.toUpperCase()}
          </span>
          <span
            style={{
              color: "#00d4ff",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            {override.field}
          </span>
          <span style={{ color: "#555", fontSize: 10 }}>→</span>
          <span style={{ color: "#fff", fontSize: 11 }}>
            {JSON.stringify(override.value)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isUnresolved ? (
            <span
              style={{
                color: "#ff4444",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              UNRESOLVED
            </span>
          ) : (
            <span style={{ color: "#888", fontSize: 10 }}>
              {override.cityName ?? override.cityId}
            </span>
          )}
        </div>
      </div>

      {/* Reason */}
      <div
        style={{
          color: "#999",
          fontSize: 11,
          lineHeight: 1.5,
          marginBottom: 10,
        }}
      >
        {override.reason}
      </div>

      {/* Source URL + timestamp */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: isUnresolved ? 10 : 12,
        }}
      >
        {override.sourceUrl && (
          <a
            href={override.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#7c3aed",
              fontSize: 10,
              textDecoration: "none",
              letterSpacing: 0.5,
            }}
          >
            SOURCE →
          </a>
        )}
        <span style={{ color: "#333", fontSize: 9, letterSpacing: 1 }}>
          {formatRelativeTime(override.createdAt)}
        </span>
      </div>

      {/* City selector for unresolved */}
      {isUnresolved && (
        <div style={{ marginBottom: 12 }}>
          <select
            value={selectedCity}
            onChange={(e) => onCityChange(e.target.value)}
            style={{
              background: "#0a0a0f",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 4,
              color: selectedCity ? "#fff" : "#555",
              fontSize: 11,
              padding: "8px 12px",
              fontFamily: "'Space Mono', monospace",
              width: "100%",
              cursor: "pointer",
            }}
          >
            <option value="">Assign a city...</option>
            {CITY_OPTIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onApprove}
          disabled={isActing}
          style={{
            background: "rgba(0,255,136,0.08)",
            border: "1px solid rgba(0,255,136,0.3)",
            borderRadius: 4,
            padding: "7px 16px",
            color: "#00ff88",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 1,
            cursor: isActing ? "default" : "pointer",
            fontFamily: "'Space Mono', monospace",
            transition: "all 0.15s",
          }}
        >
          APPROVE
        </button>
        <button
          onClick={onReject}
          disabled={isActing}
          style={{
            background: "rgba(255,68,68,0.08)",
            border: "1px solid rgba(255,68,68,0.3)",
            borderRadius: 4,
            padding: "7px 16px",
            color: "#ff4444",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 1,
            cursor: isActing ? "default" : "pointer",
            fontFamily: "'Space Mono', monospace",
            transition: "all 0.15s",
          }}
        >
          REJECT
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------
// Classification Card
// -------------------------------------------------------

function ClassificationCard({
  classification,
}: {
  classification: ClassificationResult;
}) {
  const [expanded, setExpanded] = useState(false);
  const confidenceColor =
    CONFIDENCE_COLORS[classification.confidence] ?? "#555";

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 8,
        padding: 16,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              background: "rgba(0,212,255,0.1)",
              color: "#00d4ff",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 1,
              padding: "3px 8px",
              borderRadius: 3,
              border: "1px solid rgba(0,212,255,0.3)",
            }}
          >
            {classification.eventType.toUpperCase()}
          </span>
          <span
            style={{
              background: `${confidenceColor}22`,
              color: confidenceColor,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 1,
              padding: "3px 8px",
              borderRadius: 3,
              border: `1px solid ${confidenceColor}44`,
            }}
          >
            {classification.confidence.toUpperCase()}
          </span>
        </div>
        <span style={{ color: "#333", fontSize: 9, letterSpacing: 1 }}>
          {formatRelativeTime(classification.createdAt)}
        </span>
      </div>

      {/* Cities & factors */}
      <div style={{ marginBottom: 8 }}>
        <span style={{ color: "#555", fontSize: 9, letterSpacing: 1 }}>
          CITIES:{" "}
        </span>
        <span style={{ color: "#888", fontSize: 10 }}>
          {classification.affectedCities.length > 0
            ? classification.affectedCities.join(", ")
            : "none"}
        </span>
      </div>

      <div style={{ marginBottom: 8 }}>
        <span style={{ color: "#555", fontSize: 9, letterSpacing: 1 }}>
          FACTORS:{" "}
        </span>
        <span style={{ color: "#888", fontSize: 10 }}>
          {Array.isArray(classification.factorsJson)
            ? (classification.factorsJson as Array<{ factor?: string }>)
                .map((f) => f.factor ?? JSON.stringify(f))
                .join(", ")
            : JSON.stringify(classification.factorsJson)}
        </span>
      </div>

      {/* Model info */}
      <div style={{ marginBottom: 10 }}>
        <span style={{ color: "#333", fontSize: 9, letterSpacing: 1 }}>
          MODEL: {classification.modelUsed} · PROMPT: v
          {classification.promptVersion}
        </span>
      </div>

      {/* Expandable raw response */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          background: "none",
          border: "none",
          color: "#555",
          fontSize: 9,
          letterSpacing: 1,
          cursor: "pointer",
          fontFamily: "'Space Mono', monospace",
          padding: 0,
        }}
      >
        {expanded ? "▼ HIDE RAW RESPONSE" : "▶ SHOW RAW RESPONSE"}
      </button>

      {expanded && (
        <pre
          style={{
            background: "#0a0a0f",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 4,
            padding: 12,
            marginTop: 8,
            color: "#888",
            fontSize: 10,
            lineHeight: 1.5,
            overflow: "auto",
            maxHeight: 300,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {JSON.stringify(classification.rawResponse, null, 2)}
        </pre>
      )}
    </div>
  );
}
