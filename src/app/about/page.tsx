import type { Metadata } from "next";
import Link from "next/link";
import TrackPageView from "@/components/TrackPageView";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { MARKET_COUNT } from "@/data/seed";
import { SCORE_WEIGHTS } from "@/lib/scoring";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "About AirIndex — UAM Market Intelligence by Vertical Data Group",
  description:
    "AirIndex is the independent market readiness rating system for Urban Air Mobility — the only platform that scores U.S. cities on the ground conditions that determine where commercial eVTOL operations launch.",
};

const WEIGHT_LABELS: Record<string, { label: string; desc: string }> = {
  stateLegislation: { label: "State Legislation", desc: "Enacted, in-progress, or absent UAM-enabling legislation" },
  activePilotProgram: { label: "Active Pilot Program", desc: "FAA eIPP participation or equivalent demonstration flights" },
  approvedVertiport: { label: "Approved Vertiport", desc: "Permitted or operational eVTOL-capable facilities" },
  activeOperatorPresence: { label: "Operator Presence", desc: "eVTOL manufacturers with active market commitments" },
  vertiportZoning: { label: "Vertiport Zoning", desc: "City-level zoning frameworks for vertiport development" },
  regulatoryPosture: { label: "Regulatory Posture", desc: "Friendly, neutral, or restrictive municipal stance" },
  weatherInfrastructure: { label: "Weather Infrastructure", desc: "Low-altitude weather sensing and ASOS/AWOS coverage" },
};

const AUDIENCES = [
  { type: "eVTOL Operators", desc: "Market entry timing, corridor readiness, competitive landscape" },
  { type: "Infrastructure Developers", desc: "Site selection, gap analysis, heliport conversion potential" },
  { type: "City Planners & Airport Authorities", desc: "Peer benchmarking, readiness gap closure, policy guidance" },
  { type: "Investment & Finance", desc: "Due diligence on market-level readiness and trajectory" },
  { type: "Defense & Aerospace", desc: "AAM landscape intelligence for strategic planning" },
  { type: "Policy & Government", desc: "Federal program alignment, legislative tracking, state comparisons" },
  { type: "Economic Development Alliances", desc: "Regional readiness benchmarking and investment attraction" },
  { type: "Weather & Sensor Companies", desc: "Market coverage mapping and infrastructure gap identification" },
];

const DATA_SOURCES = [
  { name: "Federal Register", desc: "FAA rulemaking, powered lift SFARs, airspace actions" },
  { name: "LegiScan", desc: "State-level UAM legislation across all 50 states" },
  { name: "SEC EDGAR", desc: "Operator financial filings, 8-K disclosures, market signals" },
  { name: "Congress.gov", desc: "Federal AAM bills, hearings, committee actions via API v3" },
  { name: "Regulations.gov", desc: "FAA docket activity, proposed rules, public comment tracking" },
  { name: "FAA NASR 5010", desc: "FAA-registered heliports mapped to all tracked metros" },
  { name: "Operator Activity", desc: "Press releases, partnership announcements, certification milestones" },
];

export default async function AboutPage() {
  // Pull live stats from DB
  let recordCount = 1_797;
  let heliportCount = 5_647;
  try {
    const [records, heliports] = await Promise.all([
      prisma.ingestedRecord.count(),
      prisma.heliport.count(),
    ]);
    recordCount = records;
    heliportCount = heliports;
  } catch {
    // Fallback to hardcoded values if DB is unavailable
  }
  return (
    <div
      style={{
        background: "#ffffff",
        color: "#e0e0e0",
        minHeight: "100vh",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <TrackPageView page="about" />
      <SiteNav theme="light" />

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* ═══ Hero ═══ */}
        <div style={{ marginBottom: 56 }}>
          <div style={{
            fontSize: 9,
            letterSpacing: 3,
            color: "#5B8DB8",
            fontFamily: "'Space Mono', monospace",
            marginBottom: 16,
          }}>
            RATE THE SKY.
          </div>
          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "clamp(28px, 4vw, 40px)",
            fontWeight: 700,
            color: "#0a2540",
            margin: "0 0 16px",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}>
            The eVTOL aircraft are ready. The question is where they&apos;ll fly first.
          </h1>
          <p style={{ color: "#697386", fontSize: 15, lineHeight: 1.7, maxWidth: 600 }}>
            AirIndex is the independent market readiness rating system for Urban Air Mobility —
            scoring {MARKET_COUNT} U.S. cities on the ground conditions that determine where commercial
            eVTOL operations actually launch.
          </p>
        </div>

        {/* ═══ Who We Are ═══ */}
        <section style={{ marginBottom: 48, padding: "32px 0", borderBottom: "1px solid #e3e8ee" }}>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 22,
            fontWeight: 700,
            color: "#0a2540",
            marginBottom: 20,
          }}>
            Who We Are
          </h2>
          <div style={{ color: "#425466", fontSize: 14, lineHeight: 1.85 }}>
            <p style={{ marginBottom: 14 }}>
              AirIndex is built by{" "}
              <a
                href="https://verticaldatagroup.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#5B8DB8", textDecoration: "none" }}
              >
                Vertical Data Group, LLC
              </a>
              , a South Carolina-based data intelligence company founded in 2026. We are not an
              aviation company. We are not a software company. We are a data intelligence company
              that builds systematic, auditable intelligence infrastructure for emerging markets.
            </p>
            <p style={{ marginBottom: 14 }}>
              AirIndex is our first product — the UAM market readiness index we built because it
              didn&apos;t exist and the industry needed it. Where others track the aircraft and the
              companies building them, AirIndex tracks the geography — the regulatory, infrastructure,
              and political conditions that determine which markets win the race to commercial operations.
            </p>
            <p style={{ marginBottom: 14 }}>
              Our scoring methodology is developed in consultation with infrastructure developers,
              weather intelligence providers, and industry organizations active across multiple US
              markets. Factor weights and thresholds are field-validated against real capital allocation
              decisions — not theoretical models.
            </p>
            <p>
              AirIndex does not represent operators, municipalities, or investors.
              Our ratings are independent. That independence is the foundation of their value.
            </p>
          </div>
        </section>

        {/* ═══ Our Mission ═══ */}
        <section style={{ marginBottom: 48, padding: "32px 0", borderBottom: "1px solid #e3e8ee" }}>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 22,
            fontWeight: 700,
            color: "#0a2540",
            marginBottom: 20,
          }}>
            Our Mission
          </h2>
          <div style={{ color: "#425466", fontSize: 14, lineHeight: 1.85 }}>
            <p style={{ marginBottom: 14 }}>
              Urban air mobility is generating enormous quantities of fragmented public data — FAA
              filings, state legislation, city planning documents, operator disclosures, SEC filings.
              No single entity was aggregating it into organized, auditable intelligence.
            </p>
            <p style={{ marginBottom: 14 }}>
              City planners were making infrastructure decisions without knowing what peer markets had
              already done. Operators were evaluating market entry without systematic readiness data.
              Investors were conducting due diligence on UAM companies without understanding the
              regulatory landscape those companies would operate in.
            </p>
            <p>
              AirIndex exists to close that gap. We approach UAM market intelligence the way a ratings
              agency approaches credit markets — every score is standardized, every change is sourced
              and timestamped, and the methodology is public. Not a forecast. Not a projection. A live
              index built on what is actually happening.
            </p>
          </div>
        </section>

        {/* ═══ What We Track ═══ */}
        <section style={{ marginBottom: 48, padding: "32px 0", borderBottom: "1px solid #e3e8ee" }}>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 22,
            fontWeight: 700,
            color: "#0a2540",
            marginBottom: 8,
          }}>
            What We Track
          </h2>
          <p style={{ color: "#697386", fontSize: 13, lineHeight: 1.7, marginBottom: 24 }}>
            Every market receives a 0-100 readiness score computed from seven weighted factors.
            Scores update continuously as conditions change. Methodology v1.3 is{" "}
            <Link href="/methodology" style={{ color: "#5B8DB8", textDecoration: "none" }}>
              fully published
            </Link>.
          </p>

          {/* 7-Factor Model */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 32 }}>
            {Object.entries(SCORE_WEIGHTS).map(([key, weight]) => {
              const info = WEIGHT_LABELS[key];
              return (
                <div key={key} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 16px",
                  background: "#f9fbfd",
                  border: "1px solid #e3e8ee",
                  borderRadius: 6,
                }}>
                  <span style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#5B8DB8",
                    minWidth: 28,
                  }}>
                    {weight}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#0a2540", fontSize: 13, fontWeight: 500 }}>
                      {info?.label || key}
                    </div>
                    <div style={{ color: "#8792a2", fontSize: 11, marginTop: 2 }}>
                      {info?.desc}
                    </div>
                  </div>
                  <div style={{ width: 80, height: 3, borderRadius: 2, background: "#e3e8ee", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${weight * 5}%`,
                      background: "rgba(91,141,184,0.4)",
                      borderRadius: 2,
                    }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Data Sources */}
          <h3 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 16,
            fontWeight: 700,
            color: "#0a2540",
            marginBottom: 14,
          }}>
            Data Sources
          </h3>
          <p style={{ color: "#697386", fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>
            Our data comes from primary sources — every score change is sourced, timestamped, and
            traceable. We do not rate cities on press releases or announcements. We rate them on
            verifiable facts.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {DATA_SOURCES.map((s) => (
              <div key={s.name} style={{
                padding: "12px 16px",
                background: "#f9fbfd",
                border: "1px solid #e3e8ee",
                borderRadius: 6,
              }}>
                <div style={{ color: "#0a2540", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  {s.name}
                </div>
                <div style={{ color: "#8792a2", fontSize: 11, lineHeight: 1.5 }}>
                  {s.desc}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
            }}>
              {[
                { value: String(MARKET_COUNT), label: "Markets" },
                { value: recordCount.toLocaleString(), label: "Records" },
                { value: heliportCount.toLocaleString(), label: "Heliports" },
                { value: "v1.3", label: "Methodology" },
              ].map((m) => (
                <div key={m.label} style={{ textAlign: "center", minWidth: 80 }}>
                  <div style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#5B8DB8",
                  }}>
                    {m.value}
                  </div>
                  <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#8792a2", marginTop: 2 }}>
                    {m.label.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ Intelligence Architecture ═══ */}
        <section style={{ marginBottom: 48, padding: "32px 0", borderBottom: "1px solid #e3e8ee" }}>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 22,
            fontWeight: 700,
            color: "#0a2540",
            marginBottom: 8,
          }}>
            Intelligence Architecture
          </h2>
          <p style={{ color: "#697386", fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
            AirIndex scores are backed by a five-container intelligence system — each container stores
            a different class of structured evidence. Scores are traceable through the full chain: from
            the raw regulatory filing to the factor it affects to the market score it changes.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { name: "Factor Knowledge Base", code: "FKB", desc: "Factor definitions, weights, per-market scores with confidence levels and audit trail" },
              { name: "Regulatory Precedent Library", code: "RPL", desc: "Structured regulatory documents — federal rules, state legislation, FAA orders — with factor mappings and momentum tracking" },
              { name: "Market Context Store", code: "MCS", desc: "State-level enforcement posture, regional clusters, and peer market groupings for benchmarking" },
              { name: "Operator Intelligence Database", code: "OID", desc: "Operator deployment stages, certifications, financing history, and vertiport commitments per market" },
              { name: "Federal Programs Intelligence", code: "FPIS", desc: "Federal grant and SBIR programs mapped to scoring factors — surfaces funding pathways in gap analysis" },
            ].map((c) => (
              <div key={c.code} style={{
                padding: "14px 16px",
                background: "#f9fbfd",
                border: "1px solid #e3e8ee",
                borderRadius: 6,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 10,
                    color: "#5B8DB8",
                    padding: "2px 6px",
                    background: "rgba(91,141,184,0.08)",
                    borderRadius: 3,
                    letterSpacing: 1,
                  }}>
                    {c.code}
                  </span>
                  <span style={{ color: "#0a2540", fontSize: 12, fontWeight: 600 }}>{c.name}</span>
                </div>
                <div style={{ color: "#8792a2", fontSize: 11, lineHeight: 1.5 }}>
                  {c.desc}
                </div>
              </div>
            ))}
          </div>
          <p style={{ color: "#8792a2", fontSize: 11, lineHeight: 1.7, marginTop: 16 }}>
            This architecture ensures that every score change has a paper trail — from source document
            to factor impact to market score. When a state enacts AAM legislation, the document enters
            RPL, maps to the LEG factor in FKB, and the market score updates with full provenance.
            See our{" "}
            <Link href="/terminology" style={{ color: "#5B8DB8", textDecoration: "none" }}>
              terminology reference
            </Link>{" "}
            for standardized definitions used across the platform.
          </p>
        </section>

        {/* ═══ Who We Serve ═══ */}
        <section style={{ marginBottom: 48, padding: "32px 0", borderBottom: "1px solid #e3e8ee" }}>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 22,
            fontWeight: 700,
            color: "#0a2540",
            marginBottom: 8,
          }}>
            Who We Serve
          </h2>
          <p style={{ color: "#697386", fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
            AirIndex serves professionals making decisions in the UAM ecosystem. The index is designed
            to be the benchmark the industry cites — an open, auditable standard that grows more useful
            as more people use it and challenge it.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {AUDIENCES.map((a) => (
              <div key={a.type} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ color: "#5B8DB8", fontSize: 8, marginTop: 5, flexShrink: 0 }}>&#9646;</span>
                <div>
                  <div style={{ color: "#0a2540", fontSize: 12, fontWeight: 600 }}>{a.type}</div>
                  <div style={{ color: "#8792a2", fontSize: 11, lineHeight: 1.5 }}>{a.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ CTAs ═══ */}
        <section style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 48,
        }}>
          <Link
            href="/dashboard"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              background: "#5B8DB8",
              color: "#050508",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textDecoration: "none",
              borderRadius: 6,
            }}
          >
            View the Ratings
          </Link>
          <Link
            href="/methodology"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              border: "1px solid #e3e8ee",
              color: "#0a2540",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textDecoration: "none",
              borderRadius: 6,
            }}
          >
            Read the Methodology
          </Link>
          <Link
            href="/contact?ref=about"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              border: "1px solid #e3e8ee",
              color: "#0a2540",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textDecoration: "none",
              borderRadius: 6,
            }}
          >
            Talk to Us
          </Link>
        </section>

        {/* ═══ Contact ═══ */}
        <section style={{
          padding: "24px 0",
          borderTop: "1px solid #e3e8ee",
        }}>
          <div style={{ color: "#8792a2", fontSize: 12, lineHeight: 1.8 }}>
            <p>
              Research access, data partnerships, API inquiries:{" "}
              <a href="mailto:info@airindex.io" style={{ color: "#5B8DB8", textDecoration: "none" }}>info@airindex.io</a>
            </p>
            <p>
              Platform and subscription questions:{" "}
              <a href="mailto:hello@airindex.io" style={{ color: "#5B8DB8", textDecoration: "none" }}>hello@airindex.io</a>
            </p>
            <p>
              Legal and terms:{" "}
              <a href="mailto:legal@airindex.io" style={{ color: "#5B8DB8", textDecoration: "none" }}>legal@airindex.io</a>
            </p>
          </div>
        </section>

        {/* ═══ Footer meta ═══ */}
        <div style={{
          borderTop: "1px solid #e3e8ee",
          paddingTop: 24,
          marginTop: 8,
          fontSize: 11,
          color: "#cbd5e1",
          lineHeight: 1.6,
        }}>
          <p>
            <a href="https://verticaldatagroup.com" target="_blank" rel="noopener noreferrer" style={{ color: "#cbd5e1", textDecoration: "none" }}>
              Vertical Data Group, LLC
            </a>{" "}
            &middot; PO Box 31172 &middot; Myrtle Beach, SC 29588
          </p>
          <p style={{ marginTop: 4, color: "#3a3a3a" }}>
            SAM.gov Registered &middot; UEI RB63W8RYCHY3 &middot; CAGE 1AUW7 &middot; South Carolina LLC
          </p>
          <p style={{ marginTop: 4 }}>
            <Link href="/" style={{ color: "#cbd5e1", textDecoration: "none" }}>airindex.io</Link>
            {" "}&middot;{" "}
            <Link href="/terms" style={{ color: "#cbd5e1", textDecoration: "none" }}>Terms</Link>
            {" "}&middot;{" "}
            <Link href="/privacy" style={{ color: "#cbd5e1", textDecoration: "none" }}>Privacy</Link>
          </p>
        </div>
      </main>

      <SiteFooter theme="light" />
    </div>
  );
}
