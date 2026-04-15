/**
 * Operator Briefing — per-market deliverable for eVTOL operator strategy teams.
 *
 * Audience: Joby, Archer, Wisk, Eve, Beta — market-entry prioritization.
 * Differentiator from infrastructure briefing: the question is "should I
 * deploy my fleet here, and when?" — not "can I build infrastructure here?"
 * OID (Operator Intelligence Database) data is the hero.
 *
 * Distribution: licensed clients only. Supports negotiated engagements
 * with operator strategy, corporate development, and route-planning teams.
 */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getCitiesWithOverrides, CITIES } from "@/data/seed";
import { calculateReadinessScoreFromFkb, getScoreTier, getScoreColor } from "@/lib/scoring";
import { getPeerContextWithMcs } from "@/lib/gap-analysis";
import { getPrecedentsForCityByFactor } from "@/lib/rpl-precedents";
import { getForwardSignals } from "@/lib/forward-signals";
import { getMarketPresence, getOperatorEvents } from "@/lib/oid";
import { prisma } from "@/lib/prisma";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import PrintButton from "../../gap/[cityId]/PrintButton";
import TrackPageView from "@/components/TrackPageView";
import FreshnessBar from "@/components/FreshnessBar";

export async function generateStaticParams() {
  return CITIES.map((c) => ({ cityId: c.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cityId: string }>;
}): Promise<Metadata> {
  const { cityId } = await params;
  const allCities = await getCitiesWithOverrides();
  const city = allCities.find((c) => c.id === cityId);
  if (!city) return { title: "Briefing not found — AirIndex" };

  return {
    title: `${city.city}, ${city.state} — Operator Market-Entry Briefing | AirIndex`,
    description: `Operator briefing for ${city.city}. Existing operator landscape, infrastructure availability, regulatory friction, timing signals.`,
    robots: "noindex, nofollow",
  };
}

const STAGE_LABEL: Record<string, string> = {
  COMMERCIAL_OPS: "Commercial Operations",
  CERTIFIED: "Certified",
  TESTING: "Testing",
  ANNOUNCED: "Announced",
  WATCHLIST: "Watchlist",
  EXITED: "Exited",
};

const STAGE_COLOR: Record<string, string> = {
  COMMERCIAL_OPS: "#00ff88",
  CERTIFIED: "#5B8DB8",
  TESTING: "#f59e0b",
  ANNOUNCED: "#888",
  WATCHLIST: "#666",
  EXITED: "#444",
};

export default async function OperatorBriefingPage({
  params,
}: {
  params: Promise<{ cityId: string }>;
}) {
  const { cityId } = await params;
  const allCities = await getCitiesWithOverrides();
  const city = allCities.find((c) => c.id === cityId);
  if (!city) notFound();

  const { score, breakdown } = await calculateReadinessScoreFromFkb(city);
  const tier = getScoreTier(score);
  const tierColor = getScoreColor(score);
  const peers = await getPeerContextWithMcs(city, allCities);
  const precedentsByFactor = await getPrecedentsForCityByFactor(cityId, 8);
  const forward = await getForwardSignals(cityId);
  const operatorPresence = await getMarketPresence(cityId);
  const recentOperatorEvents = await getOperatorEvents({ cityId, limit: 5 });

  // Infrastructure inventory for operations (not development)
  const [heliportsInMarket, vertiportCommitments] = await Promise.all([
    prisma.heliport.count({ where: { cityId, statusCode: "O" } }),
    prisma.oidVertiportCommitment.findMany({
      where: { cityId, isActive: true },
      orderBy: { announcedDate: "desc" },
      take: 10,
    }),
  ]);

  // National rank
  const sortedCities = [...allCities].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const rank = sortedCities.findIndex((c) => c.id === cityId) + 1;

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Highest-stage operator in this market
  const leadOperator = operatorPresence[0] ?? null;

  // Page styles
  const cardStyle: React.CSSProperties = {
    background: "#0a0a12",
    border: "1px solid #1a1a2e",
    borderRadius: 12,
    padding: "28px 26px",
    marginBottom: 22,
  };
  const sectionHeading: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize: 20,
    fontWeight: 700,
    color: "#ffffff",
    margin: "0 0 16px",
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: "'Space Mono', monospace",
    fontSize: 10,
    fontWeight: 700,
    color: "#888",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  };
  const statVal: React.CSSProperties = {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 30,
    fontWeight: 700,
    lineHeight: 1,
    color: "#ffffff",
  };
  const statLabel: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    color: "#888",
    marginTop: 6,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  };
  const statSub: React.CSSProperties = { fontSize: 10, color: "#666", marginTop: 2 };

  return (
    <div style={{ background: "#050508", color: "#e0e0e0", minHeight: "100vh" }}>
      <style>{`@media print {
        @page { margin: 0.6in; size: letter; }
        body { background: #ffffff !important; color: #1a1a1a !important; }
        .briefing-container { background: #ffffff !important; color: #1a1a1a !important; }
        .screen-only { display: none !important; }
        .section-card {
          background: #ffffff !important;
          border: 1px solid #e5e7eb !important;
          color: #1a1a1a !important;
          page-break-inside: avoid;
        }
        .section-card h2, .section-card h3 { color: #1a1a1a !important; }
        .section-card p, .section-card td, .section-card th, .section-card li, .section-card span, .section-card div { color: #374151 !important; }
        .section-card a { color: #7c3aed !important; }
      } @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');`}</style>

      <TrackPageView page={`briefing-operator:${cityId}`} entityType="briefing" />
      <div className="screen-only">
        <SiteNav />
      </div>

      <div
        className="briefing-container"
        style={{
          maxWidth: 780,
          margin: "0 auto",
          padding: "36px 24px 80px",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div
          className="screen-only"
          style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}
        >
          <PrintButton />
        </div>

        {/* Header */}
        <div
          style={{
            borderBottom: "1px solid #222",
            paddingBottom: 12,
            marginBottom: 24,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            color: "#666",
            letterSpacing: "0.06em",
          }}
        >
          <span>
            <strong style={{ color: "#7c3aed" }}>AIRINDEX</strong> · Operator Briefing
          </span>
          <span>CONFIDENTIAL · {today.toUpperCase()}</span>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              color: "#7c3aed",
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            OPERATOR BRIEFING · MARKET-ENTRY PRIORITIZATION
          </div>
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 32,
              fontWeight: 700,
              color: "#ffffff",
              margin: "0 0 10px",
              lineHeight: 1.15,
            }}
          >
            {city.city}, {city.state}
          </h1>
          <p style={{ color: "#999", fontSize: 14, margin: 0, lineHeight: 1.6 }}>
            Existing operator landscape, infrastructure available for operations,
            regulatory friction, and near-term timing signals for fleet deployment decisions.
          </p>
        </div>

        <FreshnessBar today={today} />

        {/* ======== SECTION 1: Market Readiness Summary ======== */}
        <div className="section-card" style={cardStyle}>
          <h2 style={sectionHeading}>Market Readiness</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 14,
              marginBottom: 16,
            }}
          >
            <div>
              <div style={{ ...statVal, color: tierColor }}>{score}</div>
              <div style={statLabel}>AirIndex Score</div>
              <div style={statSub}>{tier} tier</div>
            </div>
            <div>
              <div style={statVal}>#{rank}</div>
              <div style={statLabel}>National Rank</div>
              <div style={statSub}>of {allCities.length} markets</div>
            </div>
            <div>
              <div style={statVal}>{operatorPresence.length}</div>
              <div style={statLabel}>Operators Present</div>
              <div style={statSub}>
                {leadOperator ? `Lead: ${leadOperator.operatorName}` : "No declared presence"}
              </div>
            </div>
            <div>
              <div style={statVal}>{breakdown.regulatoryPosture}/10</div>
              <div style={statLabel}>Regulatory Posture</div>
              <div style={statSub}>
                {city.regulatoryPosture === "friendly"
                  ? "Favorable"
                  : city.regulatoryPosture === "neutral"
                  ? "Neutral"
                  : "Restrictive"}
              </div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: "#bbb", lineHeight: 1.7, margin: "16px 0 0" }}>
            {city.city} sits at rank #{rank} of {allCities.length} tracked markets with a
            readiness score of {score}/100 ({tier} tier).
            {leadOperator
              ? ` The lead operator in-market is ${leadOperator.operatorName}, at ${STAGE_LABEL[leadOperator.deploymentStage] ?? leadOperator.deploymentStage} stage.`
              : " No operator has declared a market presence — a potential open-field entry opportunity."}
            {" "}The regulatory posture is {city.regulatoryPosture}, which
            {city.regulatoryPosture === "friendly"
              ? " supports near-term commercial entry with minimal friction."
              : city.regulatoryPosture === "neutral"
              ? " requires active advocacy to create operating conditions."
              : " presents structural barriers that will delay or complicate commercial operations."}
          </p>
        </div>

        {/* ======== SECTION 2: Operator Landscape ======== */}
        <div className="section-card" style={cardStyle}>
          <h2 style={sectionHeading}>Operator Landscape</h2>
          {operatorPresence.length === 0 ? (
            <div
              style={{
                padding: "20px 22px",
                background: "rgba(124,58,237,0.06)",
                borderLeft: "3px solid #7c3aed",
                borderRadius: 4,
                fontSize: 13,
                color: "#ddd",
                lineHeight: 1.7,
              }}
            >
              No operator has a declared market presence in {city.city}. This represents an
              open-field entry opportunity — no incumbent to displace, but also no peer to
              validate the market&apos;s commercial timeline.
            </div>
          ) : (
            <>
              <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
                Operators ranked by deployment stage (highest stage = most committed). Route
                and vertiport commitment flags indicate concrete market signals beyond a
                stage declaration.
              </p>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th
                      style={{
                        background: "#1a1a2e",
                        padding: "8px 10px",
                        textAlign: "left",
                        fontSize: 10,
                        letterSpacing: "0.08em",
                        color: "#aaa",
                      }}
                    >
                      Operator
                    </th>
                    <th
                      style={{
                        background: "#1a1a2e",
                        padding: "8px 10px",
                        textAlign: "left",
                        fontSize: 10,
                        letterSpacing: "0.08em",
                        color: "#aaa",
                      }}
                    >
                      Stage
                    </th>
                    <th
                      style={{
                        background: "#1a1a2e",
                        padding: "8px 10px",
                        textAlign: "center",
                        fontSize: 10,
                        letterSpacing: "0.08em",
                        color: "#aaa",
                        width: 60,
                      }}
                    >
                      Route
                    </th>
                    <th
                      style={{
                        background: "#1a1a2e",
                        padding: "8px 10px",
                        textAlign: "center",
                        fontSize: 10,
                        letterSpacing: "0.08em",
                        color: "#aaa",
                        width: 80,
                      }}
                    >
                      Vertiport
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {operatorPresence.map((op) => (
                    <tr key={op.operatorId}>
                      <td
                        style={{
                          padding: "10px",
                          borderBottom: "1px solid #1a1a2e",
                          color: "#ddd",
                          fontWeight: 600,
                        }}
                      >
                        {op.operatorName}
                      </td>
                      <td
                        style={{
                          padding: "10px",
                          borderBottom: "1px solid #1a1a2e",
                          color: STAGE_COLOR[op.deploymentStage] ?? "#888",
                          fontWeight: 700,
                          fontFamily: "'Space Mono', monospace",
                          fontSize: 11,
                        }}
                      >
                        {STAGE_LABEL[op.deploymentStage] ?? op.deploymentStage}
                      </td>
                      <td
                        style={{
                          padding: "10px",
                          borderBottom: "1px solid #1a1a2e",
                          textAlign: "center",
                          color: op.routeAnnounced ? "#00ff88" : "#444",
                        }}
                      >
                        {op.routeAnnounced ? "✓" : "—"}
                      </td>
                      <td
                        style={{
                          padding: "10px",
                          borderBottom: "1px solid #1a1a2e",
                          textAlign: "center",
                          color: op.vertiportCommitted ? "#00ff88" : "#444",
                        }}
                      >
                        {op.vertiportCommitted ? "✓" : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {recentOperatorEvents.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ ...labelStyle, marginBottom: 10 }}>RECENT OPERATOR EVENTS</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.75 }}>
                    {recentOperatorEvents.map((e) => {
                      const opName = operatorPresence.find((p) => p.operatorId === e.operatorId)?.operatorName ?? "Operator";
                      return (
                        <li key={e.id} style={{ color: "#ddd", marginBottom: 4 }}>
                          <strong>{opName}</strong> — {e.eventType.replace(/_/g, " ")}:{" "}
                          <span style={{ color: "#888" }}>
                            {e.headline}
                            {e.eventDate && ` (${new Date(e.eventDate).toISOString().slice(0, 10)})`}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* ======== SECTION 3: Infrastructure Available for Operations ======== */}
        <div className="section-card" style={cardStyle}>
          <h2 style={sectionHeading}>Infrastructure Available for Operations</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 14,
              marginBottom: 16,
            }}
          >
            <div>
              <div style={statVal}>{city.vertiportCount}</div>
              <div style={statLabel}>Approved Vertiports</div>
              <div style={statSub}>
                {city.vertiportCount > 0 ? "Operational or permitted" : "None yet"}
              </div>
            </div>
            <div>
              <div style={statVal}>{heliportsInMarket}</div>
              <div style={statLabel}>Operational Heliports</div>
              <div style={statSub}>FAA NASR — potential conversion</div>
            </div>
            <div>
              <div style={statVal}>{vertiportCommitments.length}</div>
              <div style={statLabel}>Committed Sites</div>
              <div style={statSub}>
                {vertiportCommitments.length > 0
                  ? "Operator/developer commitments"
                  : "No tracked commitments"}
              </div>
            </div>
          </div>
          {vertiportCommitments.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ ...labelStyle, marginBottom: 10 }}>VERTIPORT COMMITMENTS</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.75 }}>
                {vertiportCommitments.slice(0, 5).map((v) => {
                  const opName = operatorPresence.find((p) => p.operatorId === v.operatorId)?.operatorName ?? "Operator";
                  return (
                    <li key={v.id} style={{ color: "#ddd", marginBottom: 4 }}>
                      <strong>{opName}</strong> — {v.siteName ?? "Site TBD"}
                      {v.commitmentType && (
                        <span style={{ color: "#888" }}> · {v.commitmentType.replace(/_/g, " ").toLowerCase()}</span>
                      )}
                      {v.partnerName && (
                        <span style={{ color: "#888" }}> · partner: {v.partnerName}</span>
                      )}
                      <span style={{ color: "#888" }}>
                        {" "}· announced {new Date(v.announcedDate).toISOString().slice(0, 10)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <p style={{ fontSize: 12, color: "#888", marginTop: 14, lineHeight: 1.7 }}>
            Heliport conversion is typically faster than greenfield vertiport development —
            existing sites with FAA airspace determinations on file can reach operational
            status in 12–18 months versus 36+ months for new builds. eVTOL dimensional
            viability (50×50 ft TLOF minimum) is the primary conversion gate.
          </p>
        </div>

        {/* ======== SECTION 4: Regulatory Friction ======== */}
        {(peers.stateContext || precedentsByFactor.length > 0) && (
          <div className="section-card" style={cardStyle}>
            <h2 style={sectionHeading}>Regulatory Friction</h2>
            {peers.stateContext && (
              <div
                style={{
                  marginBottom: 18,
                  padding: "14px 16px",
                  background: "rgba(124,58,237,0.06)",
                  borderLeft: "3px solid #7c3aed",
                  borderRadius: 4,
                }}
              >
                <div style={{ ...labelStyle, color: "#7c3aed", marginBottom: 8 }}>
                  {peers.stateContext.stateName.toUpperCase()} STATE POSTURE
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: "#d0d0d0" }}>
                  <div>
                    Enforcement posture:{" "}
                    <strong>{peers.stateContext.enforcementPosture}</strong>
                    {" · "}DOT AAM engagement:{" "}
                    <strong>{peers.stateContext.dotAamEngagement}</strong>
                    {peers.stateContext.aamOfficeEstablished && " · AAM office established"}
                  </div>
                  {peers.stateContext.keyLegislation && (
                    <div style={{ marginTop: 6 }}>
                      Key legislation: <em>{peers.stateContext.keyLegislation}</em>
                    </div>
                  )}
                  {peers.stateContext.enforcementNote && (
                    <div style={{ marginTop: 6, fontSize: 12, color: "#999" }}>
                      {peers.stateContext.enforcementNote}
                    </div>
                  )}
                </div>
              </div>
            )}
            {precedentsByFactor.length > 0 && (
              <div>
                <p style={{ fontSize: 12, color: "#888", marginBottom: 14 }}>
                  Regulatory documents currently driving this market&apos;s legislative and
                  regulatory-posture scores. Monitor these for route-approval timing and
                  certification pathway clarity.
                </p>
                {precedentsByFactor.map((group) => (
                  <div key={group.factorCode} style={{ marginBottom: 14 }}>
                    <div style={{ ...labelStyle, color: "#5B8DB8", marginBottom: 8 }}>
                      DRIVES {group.factorLabel.toUpperCase()}
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.75 }}>
                      {group.precedents.slice(0, 3).map((p) => (
                        <li key={p.id} style={{ color: "#ddd", marginBottom: 4 }}>
                          <strong>{p.shortTitle ?? p.title.slice(0, 90)}</strong>
                          {" — "}
                          <span style={{ color: "#888" }}>
                            {p.issuingAuthority} · {p.publishedDate} ·{" "}
                            {p.momentumDirection} momentum
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======== SECTION 5: Peer Markets for Entry Comparison ======== */}
        {(peers.sameState.length > 0 ||
          (peers.regional && peers.regional.markets.length > 0) ||
          peers.sameTier.length > 0) && (
          <div className="section-card" style={cardStyle}>
            <h2 style={sectionHeading}>Peer Markets — Entry Comparison</h2>
            <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
              Markets with comparable entry dynamics. Use as sequencing input when pacing
              multi-market rollouts — same-state peers share regulatory frameworks,
              regional peers share corridor economics, tier peers share operator readiness.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              {peers.sameState.length > 0 && (
                <div>
                  <div style={{ ...labelStyle, marginBottom: 8 }}>
                    IN-STATE ({city.state})
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.9 }}>
                    {peers.sameState.map((p) => (
                      <li key={p.id} style={{ color: "#ddd" }}>
                        {p.city} — {p.score}/100
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {peers.regional && peers.regional.markets.length > 0 && (
                <div>
                  <div style={{ ...labelStyle, marginBottom: 8 }}>
                    {peers.regional.cluster?.toUpperCase()}
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.9 }}>
                    {peers.regional.markets.map((p) => (
                      <li key={p.id} style={{ color: "#ddd" }}>
                        {p.city}, {p.state} — {p.score}/100
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {peers.sameTier.length > 0 && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ ...labelStyle, marginBottom: 8 }}>
                    {tier} TIER PEERS (COMPARABLE READINESS)
                  </div>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: 18,
                      fontSize: 13,
                      lineHeight: 1.9,
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                    }}
                  >
                    {peers.sameTier.slice(0, 8).map((p) => (
                      <li key={p.id} style={{ color: "#ddd" }}>
                        {p.city}, {p.state} — {p.score}/100
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======== SECTION 6: Entry Timing — What to Watch ======== */}
        {forward.near.length > 0 && (
          <div className="section-card" style={cardStyle}>
            <h2 style={sectionHeading}>Entry Timing — What to Watch</h2>
            <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
              Near-term signals (≤60 days) likely to affect commercial-ops timing or
              market-entry economics. Watch-list events below should inform deployment
              timing decisions.
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
              {forward.near.slice(0, 5).map((s, i) => (
                <li key={i} style={{ color: "#ddd", marginBottom: 8 }}>
                  <strong>{s.description}</strong>
                  <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                    {s.windowLabel} · {s.confidence} confidence
                    {s.scoreImpact.direction !== "neutral" &&
                      s.scoreImpact.pointsIfRealized > 0 &&
                      ` · projected score impact: ${s.scoreImpact.direction === "positive" ? "+" : "-"}${s.scoreImpact.pointsIfRealized} pts`}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ======== SECTION 7: Engagement CTA ======== */}
        <div
          className="section-card"
          style={{
            ...cardStyle,
            background: "rgba(124,58,237,0.06)",
            border: "1px solid rgba(124,58,237,0.3)",
          }}
        >
          <h2 style={sectionHeading}>Market-Entry Advisory</h2>
          <p style={{ fontSize: 13, color: "#ddd", lineHeight: 1.75, margin: "0 0 14px" }}>
            This briefing is a single-market sample of AirIndex&apos;s operator
            intelligence. For operators sequencing multi-market rollouts:
          </p>
          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              fontSize: 13,
              lineHeight: 1.85,
              color: "#ddd",
            }}
          >
            <li>
              <strong>Portfolio market scorecard</strong> — all 25 tracked markets ranked
              on entry readiness with operator-landscape, infrastructure, and regulatory
              breakdowns
            </li>
            <li>
              <strong>Competitor stage tracker</strong> — daily updates on peer operator
              deployment stages, route announcements, and vertiport commitments
            </li>
            <li>
              <strong>Regulatory watch alerts</strong> — state legislation + federal
              rule changes that affect certification timing, routed to strategy teams
            </li>
            <li>
              <strong>Entry-timing forecasts</strong> — forward-signal windows with
              confidence tiers for any market in the index
            </li>
          </ul>
          <div
            style={{
              marginTop: 20,
              padding: "14px 16px",
              background: "#0a0a12",
              borderRadius: 6,
              fontSize: 12,
              color: "#bbb",
            }}
          >
            Contact{" "}
            <a href="mailto:sales@airindex.io" style={{ color: "#7c3aed", fontWeight: 600 }}>
              sales@airindex.io
            </a>{" "}
            for licensing terms.
          </div>
        </div>

        {/* Methodology footer */}
        <div
          style={{
            fontSize: 10,
            color: "#666",
            borderTop: "1px solid #222",
            paddingTop: 14,
            marginTop: 24,
            lineHeight: 1.7,
          }}
        >
          <div style={{ marginBottom: 6 }}>
            <strong style={{ color: "#888" }}>Data sources:</strong> Operator Intelligence
            Database (OID), Factor Knowledge Base (FKB), Market Context Store (MCS),
            Regulatory Precedent Library (RPL), AirIndex Forward Signals pipeline,
            FAA NASR 5010 heliport registry.
          </div>
          <div>
            This briefing does not constitute investment or operational advice. Operator
            deployment stages are derived from public disclosures and automated signal
            classification; analyst-verified events are flagged HIGH confidence.
            Methodology published at{" "}
            <Link href="/methodology" style={{ color: "#7c3aed" }}>
              airindex.io/methodology
            </Link>
            .
          </div>
        </div>
      </div>

      <div className="screen-only">
        <SiteFooter />
      </div>
    </div>
  );
}
