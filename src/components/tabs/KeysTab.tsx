"use client";

import { useState, useEffect, useCallback } from "react";
import { hasProAccess } from "@/lib/billing-shared";

interface ApiKeyEntry {
  id: string;
  name: string;
  keyPrefix: string;
  tier: string;
  lastUsedAt: string | null;
  createdAt: string;
}

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
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

export default function KeysTab({
  animate,
  isMobile,
  userTier,
}: {
  animate: boolean;
  isMobile: boolean;
  userTier: string;
}) {
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/keys");
      if (!res.ok) throw new Error("Failed to load keys");
      const json = await res.json();
      setKeys(json.data);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasProAccess(userTier)) fetchKeys();
    else setLoading(false);
  }, [userTier, fetchKeys]);

  const createKey = async () => {
    if (creating) return;
    setCreating(true);
    setRevealedKey(null);
    try {
      const res = await fetch("/api/v1/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() || "Default" }),
      });
      if (!res.ok) throw new Error("Failed to create key");
      const json = await res.json();
      setRevealedKey(json.data.key);
      setNewKeyName("");
      await fetchKeys();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (keyId: string) => {
    if (revoking) return;
    setRevoking(keyId);
    try {
      const res = await fetch(`/api/v1/keys/${keyId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke key");
      await fetchKeys();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRevoking(null);
    }
  };

  const copyKey = () => {
    if (!revealedKey) return;
    navigator.clipboard.writeText(revealedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Pro+ gate
  if (!hasProAccess(userTier)) {
    return (
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? 20 : 40,
        paddingLeft: isMobile ? 20 : 292,
        paddingRight: isMobile ? 20 : 316,
      }}>
        <div style={{
          maxWidth: 420,
          width: "100%",
          textAlign: "center",
          padding: "40px 32px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12,
          position: "relative",
        }}>
          <div style={{
            position: "absolute",
            top: -1,
            left: 40,
            right: 40,
            height: 2,
            background: "linear-gradient(90deg, #5B8DB8, #7c3aed)",
            borderRadius: "2px 2px 0 0",
          }} />
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 18,
            fontWeight: 700,
            color: "#fff",
            marginBottom: 8,
          }}>
            API Access
          </h2>
          <p style={{
            fontFamily: "'Inter', sans-serif",
            color: "#666",
            fontSize: 12,
            lineHeight: 1.7,
            marginBottom: 20,
          }}>
            API keys are available on Professional, Institutional, and Enterprise plans.
          </p>
          <a
            href="/contact?tier=institutional&ref=api"
            style={{
              display: "inline-block",
              padding: "12px 28px",
              background: "#7c3aed",
              border: "none",
              borderRadius: 6,
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "'Space Grotesk', sans-serif",
              textDecoration: "none",
            }}
          >
            Contact Sales
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        padding: isMobile ? "16px 12px" : "24px 20px",
        paddingLeft: isMobile ? 12 : 292,
        paddingRight: isMobile ? 12 : 316,
        opacity: animate ? 1 : 0,
        transition: "opacity 0.3s ease",
      }}
    >
      <div style={{ maxWidth: 640 }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 18,
            fontWeight: 700,
            color: "#fff",
            marginBottom: 6,
          }}>
            API Keys
          </h2>
          <p style={{ color: "#666", fontSize: 12, lineHeight: 1.6 }}>
            Create and manage API keys for programmatic access.
            Keys are scoped to your account and tier.
          </p>
        </div>

        {/* Revealed key banner */}
        {revealedKey && (
          <div style={{
            background: "rgba(0, 255, 136, 0.04)",
            border: "1px solid rgba(0, 255, 136, 0.2)",
            borderRadius: 8,
            padding: "16px 20px",
            marginBottom: 20,
          }}>
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 10,
              letterSpacing: 1,
              color: "#00ff88",
              textTransform: "uppercase",
              marginBottom: 8,
            }}>
              New API Key — copy now, it won&apos;t be shown again
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <code style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                color: "#fff",
                background: "rgba(0,0,0,0.3)",
                padding: "8px 12px",
                borderRadius: 4,
                flex: 1,
                overflowX: "auto",
                whiteSpace: "nowrap",
              }}>
                {revealedKey}
              </code>
              <button
                onClick={copyKey}
                style={{
                  background: copied ? "rgba(0,255,136,0.15)" : "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 4,
                  color: copied ? "#00ff88" : "#ccc",
                  padding: "8px 14px",
                  fontSize: 11,
                  fontFamily: "'Inter', sans-serif",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {copied ? "COPIED" : "COPY"}
              </button>
            </div>
          </div>
        )}

        {/* Create key form */}
        <div style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 8,
          padding: "16px 20px",
          marginBottom: 24,
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}>
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g. Production)"
            maxLength={50}
            style={{
              flex: 1,
              minWidth: 160,
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 4,
              padding: "8px 12px",
              color: "#fff",
              fontSize: 12,
              fontFamily: "'Inter', sans-serif",
              outline: "none",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") createKey();
            }}
          />
          <button
            onClick={createKey}
            disabled={creating}
            style={{
              background: "#5B8DB8",
              border: "none",
              borderRadius: 4,
              color: "#050508",
              padding: "8px 18px",
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "'Space Grotesk', sans-serif",
              cursor: creating ? "default" : "pointer",
              opacity: creating ? 0.5 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {creating ? "Creating..." : "Create Key"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            color: "#ff4444",
            fontSize: 12,
            marginBottom: 16,
            padding: "8px 12px",
            background: "rgba(255,68,68,0.06)",
            borderRadius: 4,
          }}>
            {error}
          </div>
        )}

        {/* Keys list */}
        {loading ? (
          <div style={{ color: "#888", fontSize: 12, padding: 20, textAlign: "center" }}>
            Loading keys...
          </div>
        ) : keys.length === 0 ? (
          <div style={{
            color: "#888",
            fontSize: 12,
            textAlign: "center",
            padding: "40px 20px",
            border: "1px solid rgba(255,255,255,0.04)",
            borderRadius: 8,
          }}>
            No API keys yet. Create one above to get started.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 9,
              letterSpacing: 1.5,
              color: "#888",
              textTransform: "uppercase",
              marginBottom: 4,
            }}>
              {keys.length} active key{keys.length !== 1 ? "s" : ""}
            </div>
            {keys.map((key) => (
              <div
                key={key.id}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8,
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#fff",
                    marginBottom: 4,
                  }}>
                    {key.name}
                  </div>
                  <code style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 11,
                    color: "#888",
                  }}>
                    {key.keyPrefix}...
                  </code>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                  <span style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 9,
                    letterSpacing: 1,
                    color: "#5B8DB8",
                    textTransform: "uppercase",
                    background: "rgba(91,141,184,0.08)",
                    padding: "2px 8px",
                    borderRadius: 3,
                  }}>
                    {key.tier}
                  </span>
                  <span style={{ color: "#888", fontSize: 10 }}>
                    {key.lastUsedAt ? `Used ${formatRelative(key.lastUsedAt)}` : "Never used"}
                  </span>
                  <span style={{ color: "#777", fontSize: 10 }}>
                    Created {formatDate(key.createdAt)}
                  </span>
                </div>
                <button
                  onClick={() => revokeKey(key.id)}
                  disabled={revoking === key.id}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,68,68,0.2)",
                    borderRadius: 4,
                    color: "#ff4444",
                    padding: "6px 12px",
                    fontSize: 10,
                    fontFamily: "'Inter', sans-serif",
                    cursor: revoking === key.id ? "default" : "pointer",
                    opacity: revoking === key.id ? 0.5 : 1,
                  }}
                >
                  {revoking === key.id ? "..." : "Revoke"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Docs link */}
        <div style={{
          marginTop: 32,
          paddingTop: 20,
          borderTop: "1px solid rgba(255,255,255,0.04)",
          fontSize: 12,
          color: "#888",
        }}>
          <a href="/api" style={{ color: "#5B8DB8", textDecoration: "none" }}>
            API Overview
          </a>
          {" · "}
          <a href="/api/docs" style={{ color: "#5B8DB8", textDecoration: "none" }}>
            Full Reference Docs
          </a>
        </div>
      </div>
    </div>
  );
}
