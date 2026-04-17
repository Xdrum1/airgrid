/**
 * Insurance Briefing — per-market deliverable for aviation underwriters,
 * brokers, and risk managers.
 *
 * Scope: city-scoped compliance audit (5-question framework applied to
 * heliports in this metro), state regulatory posture from MCS, regulatory
 * precedents driving the posture, peer insurance-risk markets, forward
 * signals, and portfolio exposure framing.
 *
 * Audience: aviation liability carriers (Global Aerospace, Starr, Aviation
 * Specialty, Lloyd's syndicates), brokers (Gallagher, Marsh, Willis Towers
 * Watson), and infrastructure owners evaluating exposure.
 *
 * Distribution: licensed clients only. Link not public; sent under NDA or
 * as a proof artifact supporting negotiated engagements.
 */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getCitiesWithOverrides, CITIES } from "@/data/seed";
import { calculateReadinessScoreFromFkb, getScoreTier, getScoreColor } from "@/lib/scoring";
import { getPeerContextWithMcs } from "@/lib/gap-analysis";
import { getPrecedentsForCityByFactor } from "@/lib/rpl-precedents";
import { getForwardSignals } from "@/lib/forward-signals";
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
    title: `${city.city}, ${city.state} — Insurance Briefing | AirIndex`,
    description: `Insurance briefing for ${city.city}. Heliport compliance audit, state regulatory posture, regulatory precedents, peer exposure markets.`,
    robots: "noindex, nofollow",
  };
}

export default async function InsuranceBriefingPage({
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

  // Heliport counts for this market. Heliport.cityId is the strict tracked-
  // market mapping; HeliportCompliance.marketId is looser (nearest tracked
  // metro). The briefing shows both values separately to avoid a confusing
  // >100% coverage display.
  const [complianceRows, stateHeliportCount] = await Promise.all([
    prisma.heliportCompliance.findMany({
      where: { marketId: cityId },
      select: {
        facilityId: true,
        facilityName: true,
        siteType: true,
        complianceStatus: true,
        complianceScore: true,
        q2AirspaceDetermination: true,
        q4Nfpa418: true,
        q5EvtolViability: true,
      },
    }),
    prisma.heliport.count({ where: { state: city.state } }),
  ]);

  const compliance = {
    total: complianceRows.length,
    compliant: complianceRows.filter((r) => r.complianceStatus === "compliant").length,
    conditional: complianceRows.filter((r) => r.complianceStatus === "conditional").length,
    unknown: complianceRows.filter((r) => r.complianceStatus === "unknown").length,
    q2OnFile: complianceRows.filter((r) => r.q2AirspaceDetermination === "on_file").length,
    q2Unknown: complianceRows.filter((r) => r.q2AirspaceDetermination === "unknown").length,
    q4Adopted: complianceRows.filter((r) => r.q4Nfpa418 === "adopted").length,
    q4Unknown: complianceRows.filter((r) => r.q4Nfpa418 === "unknown").length,
    hospital: complianceRows.filter((r) => r.siteType === "hospital").length,
    hospitalAtRisk: complianceRows.filter(
      (r) => r.siteType === "hospital" && r.q5EvtolViability === "at_risk",
    ).length,
  };

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const nearTermSignals = forward.near.slice(0, 4);

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
        .section-card a { color: #b45309 !important; }
      } @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');`}</style>

      <TrackPageView page={`briefing-insurance:${cityId}`} entityType="briefing" />
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
            <strong style={{ color: "#b45309" }}>AIRINDEX</strong> · Insurance Briefing
          </span>
          <span>
            CONFIDENTIAL · {today.toUpperCase()}
          </span>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              color: "#b45309",
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            INSURANCE BRIEFING · UAM INFRASTRUCTURE EXPOSURE
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
            Heliport compliance audit, state regulatory posture, and exposure context
            for aviation liability carriers underwriting facilities in this market.
          </p>
        </div>

        <FreshnessBar today={today} cityId={cityId} />

        {/* ======== SECTION 1: Market Summary ======== */}
        <div className="section-card" style={cardStyle}>
          <h2 style={sectionHeading}>Market Summary</h2>
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
              <div style={statVal}>{stateHeliportCount.toLocaleString()}</div>
              <div style={statLabel}>Heliports in {city.state}</div>
              <div style={statSub}>FAA NASR 5010</div>
            </div>
            <div>
              <div style={statVal}>{compliance.total.toLocaleString()}</div>
              <div style={statLabel}>Compliance-Assessed</div>
              <div style={statSub}>
                {compliance.total > 0
                  ? `nearest-metro mapping to ${city.city}`
                  : "Assessment in progress"}
              </div>
            </div>
            <div>
              <div style={{ ...statVal, color: "#b45309" }}>{compliance.hospital.toLocaleString()}</div>
              <div style={statLabel}>Hospital Heliports</div>
              <div style={statSub}>
                {compliance.hospitalAtRisk > 0
                  ? `${compliance.hospitalAtRisk} at eVTOL dimensional risk`
                  : "eVTOL assessment pending"}
              </div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: "#bbb", lineHeight: 1.7, margin: "16px 0 0" }}>
            {city.city} scored {score}/100 on the AirIndex UAM Market Readiness Index ({tier} tier).
            {" "}{stateHeliportCount.toLocaleString()} heliports are FAA-registered in {city.state}.
            {compliance.total > 0 && (
              <>
                {" "}AirIndex has mapped {compliance.total} of them to the {city.city} metro via
                nearest-market assignment and assessed each against a five-question compliance
                framework. Of those, {compliance.compliant} pass on all five questions,
                {" "}{compliance.conditional} are conditional, and {compliance.unknown} have
                insufficient verified data.
              </>
            )}
          </p>
        </div>

        {/* ======== SECTION 2: State Regulatory Posture ======== */}
        {peers.stateContext && (
          <div className="section-card" style={cardStyle}>
            <h2 style={sectionHeading}>State Regulatory Posture</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 14,
                marginBottom: 18,
              }}
            >
              <div>
                <div style={statLabel}>Enforcement Posture</div>
                <div
                  style={{
                    ...statVal,
                    fontSize: 20,
                    marginTop: 6,
                    color:
                      peers.stateContext.enforcementPosture === "strong"
                        ? "#00ff88"
                        : peers.stateContext.enforcementPosture === "moderate"
                        ? "#5B8DB8"
                        : "#b45309",
                  }}
                >
                  {peers.stateContext.enforcementPosture.toUpperCase()}
                </div>
              </div>
              <div>
                <div style={statLabel}>DOT AAM Engagement</div>
                <div style={{ ...statVal, fontSize: 20, marginTop: 6 }}>
                  {peers.stateContext.dotAamEngagement.toUpperCase()}
                </div>
              </div>
              <div>
                <div style={statLabel}>State AAM Office</div>
                <div
                  style={{
                    ...statVal,
                    fontSize: 20,
                    marginTop: 6,
                    color: peers.stateContext.aamOfficeEstablished ? "#00ff88" : "#666",
                  }}
                >
                  {peers.stateContext.aamOfficeEstablished ? "ESTABLISHED" : "—"}
                </div>
              </div>
            </div>

            {peers.stateContext.keyLegislation && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ ...labelStyle, marginBottom: 4 }}>Key Legislation</div>
                <div style={{ fontSize: 13, color: "#ddd" }}>
                  {peers.stateContext.keyLegislation}
                </div>
              </div>
            )}
            {peers.stateContext.regulatoryBurdenLevel && (
              <div
                style={{
                  marginBottom: 12,
                  padding: "12px 14px",
                  background:
                    peers.stateContext.regulatoryBurdenLevel === "severe"
                      ? "rgba(220,38,38,0.08)"
                      : peers.stateContext.regulatoryBurdenLevel === "high"
                      ? "rgba(180,83,9,0.08)"
                      : "rgba(91,141,184,0.06)",
                  borderLeft: `3px solid ${
                    peers.stateContext.regulatoryBurdenLevel === "severe"
                      ? "#dc2626"
                      : peers.stateContext.regulatoryBurdenLevel === "high"
                      ? "#b45309"
                      : peers.stateContext.regulatoryBurdenLevel === "moderate"
                      ? "#5B8DB8"
                      : "#00ff88"
                  }`,
                  borderRadius: 4,
                }}
              >
                <div style={{ ...labelStyle, marginBottom: 6 }}>
                  Regulatory Burden: <strong style={{ color: "#ddd", letterSpacing: 0 }}>
                    {peers.stateContext.regulatoryBurdenLevel.toUpperCase()}
                  </strong>
                </div>
                {peers.stateContext.regulatoryBurdenNote && (
                  <div style={{ fontSize: 12, color: "#ccc", lineHeight: 1.6 }}>
                    {peers.stateContext.regulatoryBurdenNote}
                  </div>
                )}
                <div style={{ fontSize: 10, color: "#888", marginTop: 8, fontStyle: "italic" }}>
                  Distinct from posture. Measures process friction for establishing infrastructure — how cumbersome the state&apos;s regulations, statutes, and ordinances are for AAM site approval.
                </div>
              </div>
            )}
            {peers.stateContext.enforcementNote && (
              <div>
                <div style={{ ...labelStyle, marginBottom: 4 }}>Analyst Note</div>
                <div style={{ fontSize: 12, color: "#999", lineHeight: 1.6 }}>
                  {peers.stateContext.enforcementNote}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======== SECTION 3: 5-Question Compliance Audit ======== */}
        {compliance.total > 0 && (
          <div className="section-card" style={cardStyle}>
            <h2 style={sectionHeading}>Compliance Audit — This Market</h2>
            <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
              AirIndex scores every assessed heliport against a five-question framework
              derived from FAA Advisory Circular 150/5390-2D and NFPA 418.
              Gaps are the insurance-exposure signal — FAA ACs are routinely cited
              as the standard of care in civil litigation.
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
                    Question
                  </th>
                  <th
                    style={{
                      background: "#1a1a2e",
                      padding: "8px 10px",
                      textAlign: "right",
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      color: "#00ff88",
                      width: 70,
                    }}
                  >
                    Pass
                  </th>
                  <th
                    style={{
                      background: "#1a1a2e",
                      padding: "8px 10px",
                      textAlign: "right",
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      color: "#ff5470",
                      width: 70,
                    }}
                  >
                    Gap
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    q: "Q2: FAA airspace determination on file",
                    pass: compliance.q2OnFile,
                    gap: compliance.q2Unknown,
                  },
                  {
                    q: "Q4: NFPA 418 adopted in local fire code",
                    pass: compliance.q4Adopted,
                    gap: compliance.q4Unknown,
                  },
                  {
                    q: "Q5: eVTOL dimensional viability (hospitals)",
                    pass: compliance.hospital - compliance.hospitalAtRisk,
                    gap: compliance.hospitalAtRisk,
                  },
                ].map((row) => (
                  <tr key={row.q}>
                    <td style={{ padding: "10px", borderBottom: "1px solid #1a1a2e", color: "#ddd" }}>
                      {row.q}
                    </td>
                    <td
                      style={{
                        padding: "10px",
                        borderBottom: "1px solid #1a1a2e",
                        textAlign: "right",
                        fontFamily: "'Space Mono', monospace",
                        color: "#00ff88",
                      }}
                    >
                      {row.pass}
                    </td>
                    <td
                      style={{
                        padding: "10px",
                        borderBottom: "1px solid #1a1a2e",
                        textAlign: "right",
                        fontFamily: "'Space Mono', monospace",
                        color: row.gap > 0 ? "#ff5470" : "#666",
                      }}
                    >
                      {row.gap}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ======== SECTION 4: Regulatory Precedents ======== */}
        {precedentsByFactor.length > 0 && (
          <div className="section-card" style={cardStyle}>
            <h2 style={sectionHeading}>Regulatory Precedents</h2>
            <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
              The specific documents driving this market&apos;s regulatory posture score,
              from the AirIndex Regulatory Precedent Library. Each carries a momentum
              direction (positive/negative/neutral/mixed) and a significance tier.
            </p>
            {precedentsByFactor.map((group) => (
              <div key={group.factorCode} style={{ marginBottom: 16 }}>
                <div style={{ ...labelStyle, color: "#5B8DB8", marginBottom: 8 }}>
                  DRIVES {group.factorLabel.toUpperCase()}
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.75 }}>
                  {group.precedents.slice(0, 4).map((p) => (
                    <li key={p.id} style={{ color: "#ddd", marginBottom: 4 }}>
                      <strong>{p.shortTitle ?? p.title.slice(0, 90)}</strong>
                      {" — "}
                      <span style={{ color: "#888" }}>
                        {p.issuingAuthority} · {p.publishedDate} · {p.significance} significance · {p.momentumDirection} momentum
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* ======== SECTION 5: Peer Exposure Markets ======== */}
        {(peers.sameState.length > 0 || (peers.regional && peers.regional.markets.length > 0)) && (
          <div className="section-card" style={cardStyle}>
            <h2 style={sectionHeading}>Peer Exposure Markets</h2>
            <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
              Markets with comparable regulatory and infrastructure exposure.
              Use as benchmarks when evaluating portfolio diversification or
              pricing consistency across jurisdictions.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  peers.sameState.length > 0 && peers.regional ? "1fr 1fr" : "1fr",
                gap: 16,
              }}
            >
              {peers.sameState.length > 0 && (
                <div>
                  <div style={{ ...labelStyle, marginBottom: 8 }}>
                    IN-STATE PEERS ({city.state})
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
            </div>
          </div>
        )}

        {/* ======== SECTION 6: What to Watch ======== */}
        {nearTermSignals.length > 0 && (
          <div className="section-card" style={cardStyle}>
            <h2 style={sectionHeading}>What to Watch — Next 60 Days</h2>
            <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
              Near-term signals from the AirIndex Forward Signals pipeline.
              Relevant for re-underwriting decisions and book-of-business re-rating.
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
              {nearTermSignals.map((s, i) => (
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

        {/* ======== SECTION 7: Portfolio Engagement ======== */}
        <div
          className="section-card"
          style={{
            ...cardStyle,
            background: "rgba(180,83,9,0.06)",
            border: "1px solid rgba(180,83,9,0.3)",
          }}
        >
          <h2 style={sectionHeading}>Portfolio Engagement</h2>
          <p style={{ fontSize: 13, color: "#ddd", lineHeight: 1.75, margin: "0 0 14px" }}>
            This briefing is a single-market sample of AirIndex&apos;s compliance
            and risk intelligence data. For carriers operating across multiple
            jurisdictions, portfolio-level licensing provides:
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
              <strong>Book-of-business screening</strong> — all assessed heliports
              scored against the 5-question framework, ranked by exposure
            </li>
            <li>
              <strong>Per-state regulatory posture feed</strong> — enforcement,
              DOT engagement, legislative momentum
            </li>
            <li>
              <strong>Regulatory precedent alerts</strong> — new documents affecting
              AC compliance or NFPA 418 adoption, surfaced as they ingest
            </li>
            <li>
              <strong>Forward-signal watch list</strong> — near-term changes that
              affect underwriting assumptions in tracked markets
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
            <a href="mailto:sales@airindex.io" style={{ color: "#b45309", fontWeight: 600 }}>
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
            <strong style={{ color: "#888" }}>Data sources:</strong> FAA NASR 5010
            heliport registry, FAA OE/AAA airspace determinations, MCS state context
            database, Regulatory Precedent Library (Federal Register, LegiScan,
            Congress.gov, Regulations.gov), AirIndex Forward Signals pipeline.
          </div>
          <div>
            This briefing does not constitute legal or underwriting advice.
            Compliance assessments are automated pre-screening based on publicly
            available data and are supplemented by credentialed inspection on
            request. Methodology published at{" "}
            <Link href="/methodology" style={{ color: "#b45309" }}>
              airindex.io/methodology
            </Link>
            .
          </div>
        </div>
      </div>

      {/* E&O / provenance footer */}
      <div
        style={{
          maxWidth: 780,
          margin: "0 auto",
          padding: "16px 26px 24px",
          fontSize: 11,
          color: "#697386",
          lineHeight: 1.65,
        }}
      >
        This briefing is designed for underwriting documentation and is auditable
        against primary regulatory and compliance sources. AirIndex Score (AIS)
        reflects current regulatory, infrastructure, and operational signals. All
        score changes are timestamped and traceable to source events.
      </div>

      <div className="screen-only">
        <SiteFooter />
      </div>
    </div>
  );
}
