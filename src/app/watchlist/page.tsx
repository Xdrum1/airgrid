import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { hasProAccess, getUserTier } from "@/lib/billing";
import { getActiveMarketWatchList, getRecentlyResolvedEntries } from "@/lib/market-watchlist";
import { CITIES_MAP } from "@/data/seed";
import { getScoreTier, getScoreColor } from "@/lib/scoring";

const TRIGGER_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  LEGISLATION: { label: "Legislative Momentum", color: "#7c3aed", icon: "📜" },
  PIPELINE_OVERRIDE: { label: "Pending Override", color: "#f59e0b", icon: "⚡" },
  ELEVATED_ACTIVITY: { label: "Elevated Activity", color: "#0891b2", icon: "📊" },
};

function daysSince(date: Date): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

export default async function WatchListPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/contact");

  const tier = await getUserTier(session.user.id);
  if (!hasProAccess(tier)) redirect("/pricing");

  const [active, resolved] = await Promise.all([
    getActiveMarketWatchList(),
    getRecentlyResolvedEntries(30),
  ]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050508",
        fontFamily: "'Inter', sans-serif",
        padding: "40px 24px",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <Link
            href="/"
            style={{ color: "#555", fontSize: 12, textDecoration: "none", letterSpacing: 1 }}
          >
            ← BACK TO DASHBOARD
          </Link>
          <h1
            style={{
              color: "#fff",
              fontSize: 28,
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              margin: "16px 0 8px",
            }}
          >
            MARKET WATCH LIST
          </h1>
          <p style={{ color: "#888", fontSize: 14, lineHeight: 1.6, maxWidth: 680 }}>
            Markets on this list are showing signals our pipeline has detected that haven&rsquo;t
            fully moved their scores yet. Watch list status is not a score change — it&rsquo;s
            early intelligence.
          </p>
        </div>

        {/* Active entries */}
        <div style={{ marginBottom: 48 }}>
          <div
            style={{
              color: "#555",
              fontSize: 10,
              letterSpacing: 2,
              marginBottom: 16,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            ACTIVE ({active.length})
          </div>

          {active.length === 0 && (
            <div
              style={{
                background: "#0a0a14",
                border: "1px solid #1a1a2e",
                borderRadius: 8,
                padding: 32,
                textAlign: "center",
                color: "#555",
                fontSize: 14,
              }}
            >
              No markets currently on the watch list.
            </div>
          )}

          {active.map((entry) => {
            const city = CITIES_MAP[entry.cityId];
            const trigger = TRIGGER_LABELS[entry.triggerType] || TRIGGER_LABELS.LEGISLATION;
            const days = daysSince(entry.triggeredAt);
            const tier = getScoreTier(entry.currentScore);
            const scoreColor = getScoreColor(entry.currentScore);

            return (
              <div
                key={entry.id}
                style={{
                  background: "#0a0a14",
                  border: "1px solid #1a1a2e",
                  borderLeft: `3px solid ${trigger.color}`,
                  borderRadius: 8,
                  padding: "20px 24px",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>
                        {city?.city ?? entry.cityId}
                      </span>
                      <span style={{ color: "#666", fontSize: 13 }}>
                        {city?.state}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span
                        style={{
                          color: trigger.color,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: 0.5,
                          border: `1px solid ${trigger.color}33`,
                          borderRadius: 3,
                          padding: "3px 8px",
                        }}
                      >
                        {trigger.label.toUpperCase()}
                      </span>
                      <span style={{ color: "#555", fontSize: 11 }}>
                        {days === 0 ? "Added today" : `${days}d on watch`}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: scoreColor, fontSize: 24, fontWeight: 700 }}>
                      {entry.currentScore}
                    </div>
                    <div
                      style={{
                        color: scoreColor,
                        fontSize: 9,
                        letterSpacing: 1,
                        opacity: 0.7,
                      }}
                    >
                      {tier}
                    </div>
                  </div>
                </div>
                <p style={{ color: "#999", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                  {entry.triggerDetail}
                </p>
              </div>
            );
          })}
        </div>

        {/* Recently resolved */}
        {resolved.length > 0 && (
          <div>
            <div
              style={{
                color: "#555",
                fontSize: 10,
                letterSpacing: 2,
                marginBottom: 16,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              RECENTLY RESOLVED ({resolved.length})
            </div>
            {resolved.map((entry) => {
              const city = CITIES_MAP[entry.cityId];
              const trigger = TRIGGER_LABELS[entry.triggerType] || TRIGGER_LABELS.LEGISLATION;
              const resolvedDays = entry.resolvedAt ? daysSince(entry.resolvedAt) : 0;

              return (
                <div
                  key={entry.id}
                  style={{
                    background: "#0a0a14",
                    border: "1px solid #111",
                    borderRadius: 8,
                    padding: "16px 20px",
                    marginBottom: 8,
                    opacity: 0.6,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <span style={{ color: "#888", fontSize: 14, fontWeight: 600 }}>
                        {city?.city ?? entry.cityId}
                      </span>
                      <span style={{ color: "#555", fontSize: 12, marginLeft: 8 }}>
                        {city?.state}
                      </span>
                      <span
                        style={{
                          color: trigger.color,
                          fontSize: 9,
                          marginLeft: 12,
                          opacity: 0.7,
                        }}
                      >
                        {trigger.label}
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ color: "#4ade80", fontSize: 11 }}>
                        {entry.resolutionReason === "SCORE_CHANGED"
                          ? "Score moved"
                          : "Signal resolved"}
                      </span>
                      <span style={{ color: "#444", fontSize: 11, marginLeft: 8 }}>
                        {resolvedDays === 0 ? "today" : `${resolvedDays}d ago`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            borderTop: "1px solid #1a1a2e",
            marginTop: 48,
            paddingTop: 24,
            textAlign: "center",
          }}
        >
          <p style={{ color: "#444", fontSize: 11, lineHeight: 1.6 }}>
            Watch list updated daily at 06:00 UTC. Automated evaluation of legislation,
            pipeline overrides, and classification activity across all tracked markets.
          </p>
        </div>
      </div>
    </div>
  );
}
