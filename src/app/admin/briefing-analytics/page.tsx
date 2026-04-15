/**
 * Admin briefing analytics — per-persona and per-market view counts
 * sourced from the UserEvent table where entityType = "briefing".
 *
 * Each persona briefing fires page_view + page_leave events tagged with
 * entityId of the form `briefing-<persona>:<cityId>`. This page parses
 * those tags into persona + city columns and aggregates over windows.
 *
 * Admin-gated by middleware.
 */
import { prisma } from "@/lib/prisma";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

const PERSONA_ACCENT: Record<string, string> = {
  infrastructure: "#00d4ff",
  municipality: "#5B8DB8",
  insurance: "#b45309",
  operator: "#7c3aed",
  investor: "#0369a1",
};

const PERSONA_LABEL: Record<string, string> = {
  infrastructure: "Infrastructure",
  municipality: "Municipality",
  insurance: "Insurance",
  operator: "Operator",
  investor: "Investor",
};

function parseEntityId(entityId: string): { persona: string; cityId: string } | null {
  const match = entityId.match(/^briefing-(\w+):(.+)$/);
  if (!match) return null;
  return { persona: match[1], cityId: match[2] };
}

export default async function BriefingAnalyticsPage() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  // Pull all briefing page_view events in last 30 days. Hydrate user email
  // + name separately — the UserEvent relation to User isn't part of the
  // default include path (verified in schema: relation exists but join fields
  // are firstName/lastName not name).
  const eventsRaw = await prisma.userEvent.findMany({
    where: {
      entityType: "briefing",
      event: "page_view",
      createdAt: { gte: thirtyDaysAgo },
    },
    orderBy: { createdAt: "desc" },
  });
  const userIds = [...new Set(eventsRaw.map((e) => e.userId))];
  const users = userIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, firstName: true, lastName: true },
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));
  const events = eventsRaw.map((e) => ({
    ...e,
    user: userMap.get(e.userId) ?? null,
  }));

  // Also page_leave events for duration analysis
  const leaveEvents = await prisma.userEvent.findMany({
    where: {
      entityType: "briefing",
      event: "page_leave",
      createdAt: { gte: thirtyDaysAgo },
    },
    select: {
      entityId: true,
      metadata: true,
      createdAt: true,
    },
  });

  // Aggregate
  type Bucket = { views7d: number; views30d: number; uniqueUsers: Set<string>; totalDurationSec: number; durationSamples: number };
  const byPersona: Record<string, Bucket> = {};
  const byMarket: Record<string, Bucket> = {};
  const byPersonaMarket: Record<string, Bucket> = {};

  const initBucket = (): Bucket => ({
    views7d: 0,
    views30d: 0,
    uniqueUsers: new Set(),
    totalDurationSec: 0,
    durationSamples: 0,
  });

  for (const e of events) {
    if (!e.entityId) continue;
    const parsed = parseEntityId(e.entityId);
    if (!parsed) continue;
    const { persona, cityId } = parsed;
    const isRecent = e.createdAt >= sevenDaysAgo;

    for (const key of [persona, cityId, `${persona}:${cityId}`]) {
      const bag =
        key === persona ? byPersona :
        key === cityId ? byMarket :
        byPersonaMarket;
      if (!bag[key]) bag[key] = initBucket();
      bag[key].views30d++;
      if (isRecent) bag[key].views7d++;
      bag[key].uniqueUsers.add(e.userId);
    }
  }

  // Layer duration info (from page_leave)
  for (const e of leaveEvents) {
    if (!e.entityId) continue;
    const parsed = parseEntityId(e.entityId);
    if (!parsed) continue;
    const dur = (e.metadata as { durationSec?: number })?.durationSec;
    if (typeof dur !== "number") continue;

    const { persona, cityId } = parsed;
    for (const key of [persona, cityId, `${persona}:${cityId}`]) {
      const bag =
        key === persona ? byPersona :
        key === cityId ? byMarket :
        byPersonaMarket;
      if (!bag[key]) bag[key] = initBucket();
      bag[key].totalDurationSec += dur;
      bag[key].durationSamples++;
    }
  }

  const totalViews30d = events.length;
  const totalViews7d = events.filter((e) => e.createdAt >= sevenDaysAgo).length;

  const personaRows = Object.entries(PERSONA_LABEL).map(([key, label]) => ({
    key,
    label,
    accent: PERSONA_ACCENT[key] ?? "#888",
    bucket: byPersona[key] ?? initBucket(),
  }));

  const topMarkets = Object.entries(byMarket)
    .map(([cityId, bucket]) => ({ cityId, bucket }))
    .sort((a, b) => b.bucket.views30d - a.bucket.views30d)
    .slice(0, 10);

  const topPersonaMarketCombos = Object.entries(byPersonaMarket)
    .map(([combo, bucket]) => {
      const [persona, cityId] = combo.split(":");
      return { persona, cityId, bucket };
    })
    .sort((a, b) => b.bucket.views30d - a.bucket.views30d)
    .slice(0, 15);

  const recentViews = events.slice(0, 25);

  const cardStyle: React.CSSProperties = {
    background: "#0a0a12",
    border: "1px solid #1a1a2e",
    borderRadius: 10,
    padding: "22px 24px",
    marginBottom: 20,
  };

  const avgSec = (b: Bucket): string => {
    if (b.durationSamples === 0) return "—";
    return `${Math.round(b.totalDurationSec / b.durationSamples)}s`;
  };

  return (
    <div style={{ background: "#050508", color: "#e0e0e0", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <SiteNav />
      <main style={{ maxWidth: 1040, margin: "0 auto", padding: "40px 24px 80px" }}>
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              letterSpacing: "0.2em",
              color: "#888",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            ADMIN · BRIEFING ANALYTICS
          </div>
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 28,
              fontWeight: 700,
              color: "#fff",
              margin: 0,
            }}
          >
            Briefing Views
          </h1>
          <p style={{ color: "#888", fontSize: 13, margin: "6px 0 0", lineHeight: 1.6 }}>
            Views in the last 30 days across all five persona briefings, all tracked markets.
            Authenticated views only — anonymous visits are not counted.
          </p>
        </div>

        {/* ── Totals ── */}
        <div style={cardStyle}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color: "#fff" }}>{totalViews30d}</div>
              <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "#888", textTransform: "uppercase", marginTop: 4 }}>
                Total Views 30d
              </div>
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color: "#fff" }}>{totalViews7d}</div>
              <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "#888", textTransform: "uppercase", marginTop: 4 }}>
                Total Views 7d
              </div>
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color: "#fff" }}>
                {new Set(events.map((e) => e.userId)).size}
              </div>
              <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "#888", textTransform: "uppercase", marginTop: 4 }}>
                Unique Viewers
              </div>
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color: "#fff" }}>
                {Object.keys(byMarket).length}
              </div>
              <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "#888", textTransform: "uppercase", marginTop: 4 }}>
                Markets Accessed
              </div>
            </div>
          </div>
        </div>

        {/* ── Persona Breakdown ── */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 16px" }}>By Persona</h2>
          {totalViews30d === 0 ? (
            <p style={{ color: "#888", fontSize: 13, margin: 0 }}>
              No briefing views recorded yet. Views appear once an authenticated client opens a briefing.
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 10px", background: "#1a1a2e", color: "#aaa", fontSize: 10, letterSpacing: "0.08em" }}>
                    Persona
                  </th>
                  <th style={{ textAlign: "right", padding: "8px 10px", background: "#1a1a2e", color: "#aaa", fontSize: 10, letterSpacing: "0.08em" }}>
                    7d
                  </th>
                  <th style={{ textAlign: "right", padding: "8px 10px", background: "#1a1a2e", color: "#aaa", fontSize: 10, letterSpacing: "0.08em" }}>
                    30d
                  </th>
                  <th style={{ textAlign: "right", padding: "8px 10px", background: "#1a1a2e", color: "#aaa", fontSize: 10, letterSpacing: "0.08em" }}>
                    Unique
                  </th>
                  <th style={{ textAlign: "right", padding: "8px 10px", background: "#1a1a2e", color: "#aaa", fontSize: 10, letterSpacing: "0.08em" }}>
                    Avg Dwell
                  </th>
                </tr>
              </thead>
              <tbody>
                {personaRows.map((r) => (
                  <tr key={r.key}>
                    <td style={{ padding: "10px", borderBottom: "1px solid #1a1a2e" }}>
                      <span
                        style={{
                          display: "inline-block",
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: r.accent,
                          marginRight: 8,
                        }}
                      />
                      <strong style={{ color: "#ddd" }}>{r.label}</strong>
                    </td>
                    <td style={{ textAlign: "right", padding: "10px", borderBottom: "1px solid #1a1a2e", fontFamily: "'Space Mono', monospace", color: "#ddd" }}>
                      {r.bucket.views7d}
                    </td>
                    <td style={{ textAlign: "right", padding: "10px", borderBottom: "1px solid #1a1a2e", fontFamily: "'Space Mono', monospace", color: "#ddd" }}>
                      {r.bucket.views30d}
                    </td>
                    <td style={{ textAlign: "right", padding: "10px", borderBottom: "1px solid #1a1a2e", fontFamily: "'Space Mono', monospace", color: "#888" }}>
                      {r.bucket.uniqueUsers.size}
                    </td>
                    <td style={{ textAlign: "right", padding: "10px", borderBottom: "1px solid #1a1a2e", fontFamily: "'Space Mono', monospace", color: "#888" }}>
                      {avgSec(r.bucket)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Top Markets ── */}
        {topMarkets.length > 0 && (
          <div style={cardStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 16px" }}>Top Markets (by views)</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 10px", background: "#1a1a2e", color: "#aaa", fontSize: 10, letterSpacing: "0.08em" }}>
                    Market
                  </th>
                  <th style={{ textAlign: "right", padding: "8px 10px", background: "#1a1a2e", color: "#aaa", fontSize: 10, letterSpacing: "0.08em" }}>
                    7d
                  </th>
                  <th style={{ textAlign: "right", padding: "8px 10px", background: "#1a1a2e", color: "#aaa", fontSize: 10, letterSpacing: "0.08em" }}>
                    30d
                  </th>
                  <th style={{ textAlign: "right", padding: "8px 10px", background: "#1a1a2e", color: "#aaa", fontSize: 10, letterSpacing: "0.08em" }}>
                    Unique
                  </th>
                </tr>
              </thead>
              <tbody>
                {topMarkets.map((m) => (
                  <tr key={m.cityId}>
                    <td style={{ padding: "10px", borderBottom: "1px solid #1a1a2e", color: "#ddd" }}>
                      {m.cityId}
                    </td>
                    <td style={{ textAlign: "right", padding: "10px", borderBottom: "1px solid #1a1a2e", fontFamily: "'Space Mono', monospace", color: "#ddd" }}>
                      {m.bucket.views7d}
                    </td>
                    <td style={{ textAlign: "right", padding: "10px", borderBottom: "1px solid #1a1a2e", fontFamily: "'Space Mono', monospace", color: "#ddd" }}>
                      {m.bucket.views30d}
                    </td>
                    <td style={{ textAlign: "right", padding: "10px", borderBottom: "1px solid #1a1a2e", fontFamily: "'Space Mono', monospace", color: "#888" }}>
                      {m.bucket.uniqueUsers.size}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Top Persona × Market combos ── */}
        {topPersonaMarketCombos.length > 0 && (
          <div style={cardStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 16px" }}>Top Persona × Market</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 10px", background: "#1a1a2e", color: "#aaa", fontSize: 10, letterSpacing: "0.08em" }}>
                    Briefing
                  </th>
                  <th style={{ textAlign: "right", padding: "8px 10px", background: "#1a1a2e", color: "#aaa", fontSize: 10, letterSpacing: "0.08em" }}>
                    30d Views
                  </th>
                  <th style={{ textAlign: "right", padding: "8px 10px", background: "#1a1a2e", color: "#aaa", fontSize: 10, letterSpacing: "0.08em" }}>
                    Avg Dwell
                  </th>
                </tr>
              </thead>
              <tbody>
                {topPersonaMarketCombos.map((c) => (
                  <tr key={`${c.persona}:${c.cityId}`}>
                    <td style={{ padding: "10px", borderBottom: "1px solid #1a1a2e", color: "#ddd" }}>
                      <span
                        style={{
                          display: "inline-block",
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: PERSONA_ACCENT[c.persona] ?? "#888",
                          marginRight: 8,
                        }}
                      />
                      <strong>{PERSONA_LABEL[c.persona] ?? c.persona}</strong>
                      <span style={{ color: "#888" }}> · {c.cityId}</span>
                    </td>
                    <td style={{ textAlign: "right", padding: "10px", borderBottom: "1px solid #1a1a2e", fontFamily: "'Space Mono', monospace", color: "#ddd" }}>
                      {c.bucket.views30d}
                    </td>
                    <td style={{ textAlign: "right", padding: "10px", borderBottom: "1px solid #1a1a2e", fontFamily: "'Space Mono', monospace", color: "#888" }}>
                      {avgSec(c.bucket)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Recent Views ── */}
        {recentViews.length > 0 && (
          <div style={cardStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 16px" }}>Recent Views</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 10px", background: "#1a1a2e", color: "#aaa", fontSize: 10, letterSpacing: "0.08em" }}>
                    Briefing
                  </th>
                  <th style={{ textAlign: "left", padding: "8px 10px", background: "#1a1a2e", color: "#aaa", fontSize: 10, letterSpacing: "0.08em" }}>
                    Viewer
                  </th>
                  <th style={{ textAlign: "right", padding: "8px 10px", background: "#1a1a2e", color: "#aaa", fontSize: 10, letterSpacing: "0.08em" }}>
                    When
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentViews.map((e) => {
                  const parsed = e.entityId ? parseEntityId(e.entityId) : null;
                  return (
                    <tr key={e.id}>
                      <td style={{ padding: "10px", borderBottom: "1px solid #1a1a2e", color: "#ddd" }}>
                        {parsed ? (
                          <>
                            <span
                              style={{
                                display: "inline-block",
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: PERSONA_ACCENT[parsed.persona] ?? "#888",
                                marginRight: 8,
                              }}
                            />
                            <strong>{PERSONA_LABEL[parsed.persona] ?? parsed.persona}</strong>
                            <span style={{ color: "#888" }}> · {parsed.cityId}</span>
                          </>
                        ) : (
                          e.entityId
                        )}
                      </td>
                      <td style={{ padding: "10px", borderBottom: "1px solid #1a1a2e", color: "#888" }}>
                        {e.user
                          ? [e.user.firstName, e.user.lastName].filter(Boolean).join(" ") || e.user.email
                          : "anonymous"}
                      </td>
                      <td style={{ textAlign: "right", padding: "10px", borderBottom: "1px solid #1a1a2e", fontFamily: "'Space Mono', monospace", color: "#888" }}>
                        {e.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
