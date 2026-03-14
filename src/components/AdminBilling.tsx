"use client";

import { useState, useEffect, useCallback } from "react";

interface BillingUser {
  id: string;
  email: string;
  tier: string;
  stripeCustomerId: string | null;
  createdAt: string;
  billingSubscriptions: {
    id: string;
    tier: string;
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    stripeSubscriptionId: string;
  }[];
}

interface Summary {
  activePro: number;
  activeInstitutional: number;
  grandfathered: number;
  totalPaid: number;
}

const TIER_COLORS: Record<string, string> = {
  alert: "#f59e0b",
  pro: "#00ff88",
  institutional: "#7c3aed",
  enterprise: "#ff6b35",
  grandfathered: "#00d4ff",
  free: "#555",
};

const STATUS_COLORS: Record<string, string> = {
  active: "#00ff88",
  trialing: "#00d4ff",
  past_due: "#f59e0b",
  canceled: "#ff4444",
  unpaid: "#ff4444",
};

export default function AdminBilling({ showToast }: { showToast: (msg: string) => void }) {
  const [users, setUsers] = useState<BillingUser[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/billing")
      .then((r) => r.json())
      .then((json) => {
        setUsers(json.data ?? []);
        setSummary(json.summary ?? null);
      })
      .catch(() => showToast("Failed to load billing data"))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAssignTier = async (userId: string, tier: string) => {
    setAssigningId(userId);
    try {
      const res = await fetch("/api/admin/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tier }),
      });
      if (!res.ok) {
        const json = await res.json();
        showToast(json.error ?? "Failed to assign tier");
        return;
      }
      showToast(`Tier updated to ${tier}`);
      fetchData();
    } catch {
      showToast("Network error");
    } finally {
      setAssigningId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ color: "#777", fontSize: 10, letterSpacing: 2, textAlign: "center", padding: 60 }}>
        LOADING...
      </div>
    );
  }

  return (
    <div>
      {/* Summary cards */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 28 }}>
          {[
            { label: "ACTIVE PRO", value: summary.activePro, color: "#00ff88" },
            { label: "INSTITUTIONAL", value: summary.activeInstitutional, color: "#7c3aed" },
            { label: "GRANDFATHERED", value: summary.grandfathered, color: "#00d4ff" },
            { label: "TOTAL NON-FREE", value: summary.totalPaid, color: "#888" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8,
                padding: "16px 14px",
                textAlign: "center",
              }}
            >
              <div style={{ color: s.color, fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28 }}>
                {s.value}
              </div>
              <div style={{ color: "#888", fontSize: 8, letterSpacing: 2, marginTop: 4 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* User table */}
      {users.length === 0 ? (
        <div style={{ color: "#666", fontSize: 11, letterSpacing: 2, textAlign: "center", padding: 80 }}>
          NO NON-FREE USERS
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {users.map((user) => {
            const sub = user.billingSubscriptions[0];
            const tierColor = TIER_COLORS[user.tier] ?? "#555";
            const statusColor = sub ? STATUS_COLORS[sub.status] ?? "#555" : null;

            return (
              <div
                key={user.id}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8,
                  padding: "14px 16px",
                  opacity: assigningId === user.id ? 0.5 : 1,
                  transition: "opacity 0.2s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: "#ccc", fontSize: 12 }}>{user.email}</span>
                    <span
                      style={{
                        background: `${tierColor}22`,
                        color: tierColor,
                        fontSize: 8,
                        fontWeight: 700,
                        letterSpacing: 1,
                        padding: "2px 8px",
                        borderRadius: 3,
                        border: `1px solid ${tierColor}44`,
                      }}
                    >
                      {user.tier.toUpperCase()}
                    </span>
                    {sub && statusColor && (
                      <span
                        style={{
                          color: statusColor,
                          fontSize: 8,
                          letterSpacing: 1,
                        }}
                      >
                        {sub.status.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) handleAssignTier(user.id, e.target.value);
                      }}
                      disabled={assigningId === user.id}
                      style={{
                        background: "#0a0a0f",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 4,
                        color: "#888",
                        fontSize: 9,
                        padding: "4px 8px",
                        fontFamily: "'Space Mono', monospace",
                        cursor: "pointer",
                      }}
                    >
                      <option value="">Assign tier...</option>
                      {["free", "pro", "institutional", "enterprise", "grandfathered"].map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, color: "#777", fontSize: 9 }}>
                  <span>Created {new Date(user.createdAt).toLocaleDateString()}</span>
                  {sub && (
                    <span>
                      Period ends {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                      {sub.cancelAtPeriodEnd && " (canceling)"}
                    </span>
                  )}
                  {user.stripeCustomerId && (
                    <span>Stripe: {user.stripeCustomerId.slice(0, 18)}...</span>
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
