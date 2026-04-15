/**
 * Investor Briefing — per-market deliverable for institutional investors,
 * corp dev teams, and sector analysts covering eVTOL / UAM.
 *
 * Audience question: which markets prove or invalidate the investable
 * UAM thesis, and what's moving in each that affects portfolio companies?
 *
 * Differentiator from other briefings: capital-flow data is the hero —
 * operator financing rounds (OID), federal program capital (FPIS),
 * score trajectory (are markets compounding or flat?), and regulatory
 * catalysts tied to quarterly-reporting timelines.
 *
 * Distribution: licensed clients only. Supports coverage initiations,
 * earnings-period re-rates, and portfolio diversification decisions.
 */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getCitiesWithOverrides, CITIES } from "@/data/seed";
import { calculateReadinessScoreFromFkb, getScoreTier, getScoreColor } from "@/lib/scoring";
import { getPeerContextWithMcs } from "@/lib/gap-analysis";
import { getPrecedentsForCityByFactor } from "@/lib/rpl-precedents";
import { getForwardSignals } from "@/lib/forward-signals";
import { getMarketPresence } from "@/lib/oid";
import { getGapRecommendations } from "@/lib/fpis";
import { getScoreTrajectory } from "@/lib/score-history";
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
    title: `${city.city}, ${city.state} — Investor Briefing | AirIndex`,
    description: `Investor briefing for ${city.city}. Score trajectory, operator capital flow, federal program capital, regulatory catalysts, and portfolio diversification peers.`,
    robots: "noindex, nofollow",
  };
}

const STAGE_LABEL: Record<string, string> = {
  COMMERCIAL_OPS: "Commercial Ops",
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

function formatCurrency(amountUsd: number | null): string {
  if (amountUsd === null) return "undisclosed";
  if (amountUsd >= 1_000_000_000) return `$${(amountUsd / 1_000_000_000).toFixed(1)}B`;
  if (amountUsd >= 1_000_000) return `$${(amountUsd / 1_000_000).toFixed(0)}M`;
  if (amountUsd >= 1_000) return `$${(amountUsd / 1_000).toFixed(0)}K`;
  return `$${amountUsd}`;
}

export default async function InvestorBriefingPage({
  params,
}: {
  params: Promise<{ cityId: string }>;
}) {
  const { cityId } = await params;
  const allCities = await getCitiesWithOverrides();
  const city = allCities.find((c) => c.id === cityId);
  if (!city) notFound();

  const { score } = await calculateReadinessScoreFromFkb(city);
  const tier = getScoreTier(score);
  const tierColor = getScoreColor(score);
  const peers = await getPeerContextWithMcs(city, allCities);
  const precedentsByFactor = await getPrecedentsForCityByFactor(cityId, 8);
  const forward = await getForwardSignals(cityId);
  const operatorPresence = await getMarketPresence(cityId);
  const trajectory = await getScoreTrajectory(cityId, { sinceDaysAgo: 180 });

  // Financing rounds for operators present in this market
  const operatorIds = operatorPresence.map((p) => p.operatorId);
  const financingRounds = operatorIds.length > 0
    ? await prisma.oidOperatorFinancing.findMany({
        where: { operatorId: { in: operatorIds } },
        include: { operator: { select: { shortName: true } } },
        orderBy: { announcedDate: "desc" },
        take: 8,
      })
    : [];

  // Federal programs applicable to this market's weakest factors
  const peerCityIds = [
    ...peers.sameState.map((p) => p.id),
    ...(peers.regional?.markets.map((p) => p.id) ?? []),
  ];
  // FPIS has sparse factor mapping — LEG/OPR/ZON have 0 programs today;
  // REG/VRT/PLT/WTH carry the federal capital picture. Pull across all
  // populated factors so the investor sees the full non-dilutive landscape.
  const [regPrograms, vrtPrograms, pltPrograms, wthPrograms] = await Promise.all([
    getGapRecommendations("REG", peerCityIds).catch(() => []),
    getGapRecommendations("VRT", peerCityIds).catch(() => []),
    getGapRecommendations("PLT", peerCityIds).catch(() => []),
    getGapRecommendations("WTH", peerCityIds).catch(() => []),
  ]);
  const allPrograms = [...regPrograms, ...vrtPrograms, ...pltPrograms, ...wthPrograms]
    .filter((p, idx, arr) => arr.findIndex((x) => x.program.code === p.program.code) === idx)
    .slice(0, 8);

  const sortedCities = [...allCities].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const rank = sortedCities.findIndex((c) => c.id === cityId) + 1;

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Trajectory numbers
  const trajPoints = trajectory.points;
  const netChange180d = trajectory.summary.netScoreChange;
  const firstPoint = trajPoints[0];
  const lastPoint = trajPoints[trajPoints.length - 1];
  const hasTrajectory = trajPoints.length >= 2 && netChange180d !== null;

  // Capital flow aggregates
  const totalDisclosedCapital = financingRounds.reduce(
    (sum, r) => sum + (r.amountUsd ? Number(r.amountUsd) : 0),
    0,
  );
  const disclosedRoundCount = financingRounds.filter((r) => r.amountUsd).length;

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

  const trajectoryColor =
    netChange180d === null || netChange180d === 0
      ? "#888"
      : netChange180d > 0
      ? "#00ff88"
      : "#ff5470";

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
        .section-card a { color: #0369a1 !important; }
      } @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');`}</style>

      <TrackPageView page={`briefing-investor:${cityId}`} entityType="briefing" />
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
            <strong style={{ color: "#0369a1" }}>AIRINDEX</strong> · Investor Briefing
          </span>
          <span>CONFIDENTIAL · {today.toUpperCase()}</span>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              color: "#0369a1",
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            INVESTOR BRIEFING · UAM MARKET INTELLIGENCE
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
            Score trajectory, operator capital-flow, federal program capital,
            regulatory catalysts, and portfolio-diversification peers for sector
            analysts and institutional investors.
          </p>
        </div>

        <FreshnessBar today={today} />

        {/* ======== SECTION 1: Investment Thesis Summary ======== */}
        <div className="section-card" style={cardStyle}>
          <h2 style={sectionHeading}>Investment Thesis Summary</h2>
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
              <div style={statSub}>of {allCities.length}</div>
            </div>
            <div>
              <div style={{ ...statVal, color: trajectoryColor }}>
                {hasTrajectory
                  ? `${netChange180d! > 0 ? "+" : ""}${netChange180d}`
                  : "—"}
              </div>
              <div style={statLabel}>180-Day Trajectory</div>
              <div style={statSub}>
                {hasTrajectory
                  ? `${firstPoint?.score ?? "—"} → ${lastPoint?.score ?? "—"}`
                  : "Insufficient history"}
              </div>
            </div>
            <div>
              <div style={statVal}>{operatorPresence.length}</div>
              <div style={statLabel}>Operators</div>
              <div style={statSub}>
                {operatorPresence.length > 0
                  ? `${operatorPresence.filter((o) => o.deploymentStage === "COMMERCIAL_OPS" || o.deploymentStage === "CERTIFIED" || o.deploymentStage === "TESTING").length} active`
                  : "None declared"}
              </div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: "#bbb", lineHeight: 1.7, margin: "16px 0 0" }}>
            {city.city} ranks #{rank} of {allCities.length} markets with a readiness score of {score}/100 ({tier} tier).
            {hasTrajectory &&
              netChange180d !== null &&
              netChange180d !== 0 &&
              ` Over the past 180 days the score moved ${netChange180d > 0 ? "+" : ""}${netChange180d} points — ${netChange180d > 0 ? "a compounding thesis with measurable progress" : "a deteriorating thesis warranting re-underwriting"}.`}
            {hasTrajectory &&
              netChange180d === 0 &&
              " The score has been flat over the past 180 days — a durable but un-accelerating thesis."}
            {" "}The market has{" "}
            {operatorPresence.length === 0 ? (
              "no declared operator presence, which creates open-field entry risk for any portfolio company deploying here without a first-mover precedent."
            ) : (
              <>
                {operatorPresence.length} declared operators, led by{" "}
                <strong>{operatorPresence[0].operatorName}</strong> at{" "}
                {STAGE_LABEL[operatorPresence[0].deploymentStage]} stage.
              </>
            )}
          </p>
        </div>

        {/* ======== SECTION 2: Score Trajectory ======== */}
        {hasTrajectory && (
          <div className="section-card" style={cardStyle}>
            <h2 style={sectionHeading}>Score Trajectory — 180 Days</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 14,
                marginBottom: 16,
              }}
            >
              <div>
                <div style={statVal}>{firstPoint?.score ?? "—"}</div>
                <div style={statLabel}>Score 180d Ago</div>
              </div>
              <div>
                <div style={statVal}>{lastPoint?.score ?? "—"}</div>
                <div style={statLabel}>Score Today</div>
              </div>
              <div>
                <div style={{ ...statVal, color: trajectoryColor }}>
                  {netChange180d! > 0 ? "+" : ""}
                  {netChange180d}
                </div>
                <div style={statLabel}>Net Change</div>
              </div>
              <div>
                <div style={statVal}>
                  {trajectory.summary.scoreRange
                    ? `${trajectory.summary.scoreRange.min}–${trajectory.summary.scoreRange.max}`
                    : "—"}
                </div>
                <div style={statLabel}>Range</div>
                <div style={statSub}>Min / max over window</div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "#888", margin: 0, lineHeight: 1.7 }}>
              Score movements are triggered by audited pipeline events (classifier
              outputs with HIGH confidence promoted by the auto-reviewer). Each
              move is traceable to the underlying filing, bill, or operator event.
              Methodology at <Link href="/methodology" style={{ color: "#0369a1" }}>airindex.io/methodology</Link>.
            </p>
          </div>
        )}

        {/* ======== SECTION 3: Operator Capital Flow ======== */}
        {financingRounds.length > 0 && (
          <div className="section-card" style={cardStyle}>
            <h2 style={sectionHeading}>Operator Capital Flow</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 14,
                marginBottom: 18,
              }}
            >
              <div>
                <div style={statVal}>{financingRounds.length}</div>
                <div style={statLabel}>Recent Rounds</div>
                <div style={statSub}>Across in-market operators</div>
              </div>
              <div>
                <div style={statVal}>{formatCurrency(totalDisclosedCapital)}</div>
                <div style={statLabel}>Disclosed Capital</div>
                <div style={statSub}>{disclosedRoundCount} of {financingRounds.length} rounds disclosed</div>
              </div>
              <div>
                <div style={statVal}>
                  {new Set(financingRounds.map((r) => r.operatorId)).size}
                </div>
                <div style={statLabel}>Operators Funded</div>
                <div style={statSub}>with recent financing activity</div>
              </div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ background: "#1a1a2e", padding: "8px 10px", textAlign: "left", fontSize: 10, letterSpacing: "0.08em", color: "#aaa" }}>
                    Operator
                  </th>
                  <th style={{ background: "#1a1a2e", padding: "8px 10px", textAlign: "left", fontSize: 10, letterSpacing: "0.08em", color: "#aaa" }}>
                    Round
                  </th>
                  <th style={{ background: "#1a1a2e", padding: "8px 10px", textAlign: "right", fontSize: 10, letterSpacing: "0.08em", color: "#aaa" }}>
                    Amount
                  </th>
                  <th style={{ background: "#1a1a2e", padding: "8px 10px", textAlign: "left", fontSize: 10, letterSpacing: "0.08em", color: "#aaa" }}>
                    Date
                  </th>
                  <th style={{ background: "#1a1a2e", padding: "8px 10px", textAlign: "left", fontSize: 10, letterSpacing: "0.08em", color: "#aaa" }}>
                    Lead
                  </th>
                </tr>
              </thead>
              <tbody>
                {financingRounds.map((r) => (
                  <tr key={r.id}>
                    <td style={{ padding: "10px", borderBottom: "1px solid #1a1a2e", color: "#ddd", fontWeight: 600 }}>
                      {r.operator.shortName}
                    </td>
                    <td style={{ padding: "10px", borderBottom: "1px solid #1a1a2e", color: "#888", fontFamily: "'Space Mono', monospace", fontSize: 11 }}>
                      {r.roundType}
                    </td>
                    <td style={{ padding: "10px", borderBottom: "1px solid #1a1a2e", color: "#ddd", fontFamily: "'Space Mono', monospace", textAlign: "right" }}>
                      {formatCurrency(r.amountUsd ? Number(r.amountUsd) : null)}
                    </td>
                    <td style={{ padding: "10px", borderBottom: "1px solid #1a1a2e", color: "#888", fontSize: 11 }}>
                      {new Date(r.announcedDate).toISOString().slice(0, 10)}
                    </td>
                    <td style={{ padding: "10px", borderBottom: "1px solid #1a1a2e", color: "#888", fontSize: 11 }}>
                      {r.leadInvestor ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: 11, color: "#666", marginTop: 12, lineHeight: 1.6 }}>
              Capital flow reflects the operators with declared market presence here.
              Rounds cover their full business — not exclusively this metro — but
              concentration of post-SPAC / debt rounds signals commercial-ops runway.
            </p>
          </div>
        )}

        {/* ======== SECTION 4: Federal Program Capital ======== */}
        {allPrograms.length > 0 && (
          <div className="section-card" style={cardStyle}>
            <h2 style={sectionHeading}>Federal Program Capital</h2>
            <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
              Non-dilutive federal capital applicable to this market via grants,
              SBIR, and DOT appropriations. Peer-city precedents show what similar
              markets have won.
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.9 }}>
              {allPrograms.map((rec) => (
                <li key={rec.program.code + rec.factorCode} style={{ color: "#ddd", marginBottom: 10 }}>
                  <strong>{rec.program.name}</strong>{" "}
                  <span style={{ color: "#888", fontFamily: "'Space Mono', monospace", fontSize: 11 }}>
                    ({rec.program.code} · {rec.program.agency})
                  </span>
                  <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                    Drives: <strong style={{ color: "#5B8DB8" }}>{rec.factorCode}</strong>
                    {rec.pointsOnAward > 0 && ` · +${rec.pointsOnAward} pts on award`}
                    {rec.program.awardRangeMax && (
                      <>
                        {" "}· award range{" "}
                        {formatCurrency(rec.program.awardRangeMin)}–{formatCurrency(rec.program.awardRangeMax)}
                      </>
                    )}
                    {rec.peerAwards.length > 0 && (
                      <>
                        {" "}· {rec.peerAwards.length} peer-city award{rec.peerAwards.length === 1 ? "" : "s"}
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ======== SECTION 5: Regulatory Catalysts ======== */}
        {(peers.stateContext || precedentsByFactor.length > 0) && (
          <div className="section-card" style={cardStyle}>
            <h2 style={sectionHeading}>Regulatory Catalysts</h2>
            {peers.stateContext && (
              <div
                style={{
                  marginBottom: 18,
                  padding: "14px 16px",
                  background: "rgba(3,105,161,0.08)",
                  borderLeft: "3px solid #0369a1",
                  borderRadius: 4,
                }}
              >
                <div style={{ ...labelStyle, color: "#0369a1", marginBottom: 8 }}>
                  {peers.stateContext.stateName.toUpperCase()} STATE POSTURE
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: "#d0d0d0" }}>
                  <div>
                    Enforcement: <strong>{peers.stateContext.enforcementPosture}</strong>
                    {" · "}DOT AAM: <strong>{peers.stateContext.dotAamEngagement}</strong>
                    {peers.stateContext.aamOfficeEstablished && " · AAM office established"}
                  </div>
                  {peers.stateContext.keyLegislation && (
                    <div style={{ marginTop: 6 }}>
                      Key legislation: <em>{peers.stateContext.keyLegislation}</em>
                    </div>
                  )}
                </div>
              </div>
            )}
            {precedentsByFactor.length > 0 && (
              <div>
                <p style={{ fontSize: 12, color: "#888", marginBottom: 14 }}>
                  Regulatory documents currently driving this market&apos;s scores.
                  Momentum direction signals whether the catalyst is tailwind or headwind
                  for portfolio companies.
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
                            {p.issuingAuthority} · {p.publishedDate} · {p.momentumDirection} momentum
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

        {/* ======== SECTION 6: Portfolio Diversification Peers ======== */}
        {(peers.sameState.length > 0 ||
          (peers.regional && peers.regional.markets.length > 0) ||
          peers.sameTier.length > 0) && (
          <div className="section-card" style={cardStyle}>
            <h2 style={sectionHeading}>Portfolio Diversification Peers</h2>
            <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
              Markets with correlated or comparable investment dynamics. Use as
              diversification anchors — in-state peers share regulatory framework
              risk, regional peers share corridor economics, tier peers share
              operator-readiness correlation.
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
                    {tier} TIER PEERS
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

        {/* ======== SECTION 7: Catalysts — Next 60-90 Days ======== */}
        {(forward.near.length > 0 || forward.medium.length > 0) && (
          <div className="section-card" style={cardStyle}>
            <h2 style={sectionHeading}>Catalysts — Next 60–180 Days</h2>
            <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
              Forward-looking signals relevant to portfolio-company earnings,
              route-approval timing, and sector re-rates. Confidence tiers reflect
              the strength of the underlying signal classification.
            </p>
            {forward.near.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ ...labelStyle, marginBottom: 10 }}>NEAR-TERM (≤60 DAYS)</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
                  {forward.near.slice(0, 4).map((s, i) => (
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
            {forward.medium.length > 0 && (
              <div>
                <div style={{ ...labelStyle, marginBottom: 10 }}>MEDIUM-TERM (60–180 DAYS)</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
                  {forward.medium.slice(0, 4).map((s, i) => (
                    <li key={i} style={{ color: "#ddd", marginBottom: 8 }}>
                      <strong>{s.description}</strong>
                      <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                        {s.windowLabel} · {s.confidence} confidence
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ======== SECTION 8: Coverage CTA ======== */}
        <div
          className="section-card"
          style={{
            ...cardStyle,
            background: "rgba(3,105,161,0.08)",
            border: "1px solid rgba(3,105,161,0.3)",
          }}
        >
          <h2 style={sectionHeading}>Research Coverage</h2>
          <p style={{ fontSize: 13, color: "#ddd", lineHeight: 1.75, margin: "0 0 14px" }}>
            This briefing is a single-market sample of AirIndex&apos;s sector
            intelligence. For institutional investors and analysts covering UAM:
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
              <strong>Portfolio market scorecard</strong> — all 25 tracked markets with
              score, trajectory, operator density, and capital-flow summaries
            </li>
            <li>
              <strong>Operator capital-flow alerts</strong> — daily surfacing of
              financing rounds, SEC filings, and strategic partnerships for
              portfolio companies
            </li>
            <li>
              <strong>Regulatory catalyst watch</strong> — federal + state filings
              with quarterly-reporting timeline relevance, routed to coverage teams
            </li>
            <li>
              <strong>Re-rate signal feed</strong> — forward signals with projected
              score impact windows for any market in the index
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
            <a href="mailto:sales@airindex.io" style={{ color: "#0369a1", fontWeight: 600 }}>
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
            <strong style={{ color: "#888" }}>Data sources:</strong> Factor Knowledge
            Base (FKB), Operator Intelligence Database (OID) operator + financing
            layers, Market Context Store (MCS), Regulatory Precedent Library (RPL),
            Federal Programs Intelligence Store (FPIS), AirIndex Forward Signals
            pipeline, SEC EDGAR, AirIndex Score History.
          </div>
          <div>
            This briefing does not constitute investment advice. Score movements
            and signal confidence tiers are automated outputs from a documented
            methodology published at{" "}
            <Link href="/methodology" style={{ color: "#0369a1" }}>
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
