import Link from "next/link";
import Image from "next/image";
import { OPERATORS, CORRIDORS, getCitiesWithOverrides, MARKET_COUNT } from "@/data/seed";
import CountUpStats from "@/components/landing/CountUpStats";
import LiveActivityFeed from "@/components/landing/LiveActivityFeed";

import LiveFilingsFeed from "@/components/landing/LiveFilingsFeed";
import ScrollReveal from "@/components/landing/ScrollReveal";
import HeroFlightPath from "@/components/landing/HeroFlightPath";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

// -------------------------------------------------------
// Solutions section data
// -------------------------------------------------------
const SOLUTIONS = [
  {
    id: "infrastructure-developers",
    label: "INFRASTRUCTURE DEVELOPERS",
    accent: "#00ff88",
    headline: "Know which markets are ready before you break ground.",
    copy: "AirIndex scores every U.S. UAM market across the factors that determine infrastructure viability \u2014 state legislation, vertiport zoning, pilot program activity, and regulatory posture. When a market\u2019s legislative framework is moving, the watch list flags it before the score changes. Site selection decisions backed by live, auditable intelligence.",
    cta: { label: "View market scores", href: "/dashboard" },
  },
  {
    id: "operators",
    label: "OPERATORS & OEMs",
    accent: "#00d4ff",
    headline: "Prioritize markets based on what\u2019s actually in place.",
    copy: "AirIndex tracks operator presence, corridor authorizations, pilot program status, and regulatory posture across 21 US markets. Score history shows trajectory \u2014 not just where a market is today, but how fast it\u2019s moving. Competitive analysis across markets without building your own research function.",
    cta: { label: "Explore the index", href: "/dashboard" },
  },
  {
    id: "investors",
    label: "INVESTORS & ANALYSTS",
    accent: "#f59e0b",
    headline: "Market timing signals from a live readiness index.",
    copy: "Score trends reveal which markets are building toward commercial readiness and which are stalling. Factor-level breakdowns show exactly what\u2019s changing and why. Every score change is sourced and timestamped \u2014 the audit trail institutional due diligence requires.",
    cta: { label: "Request access", href: "/pricing" },
  },
  {
    id: "city-planners",
    label: "CITY PLANNERS & POLICY",
    accent: "#7c3aed",
    headline: "Benchmark your market against peer cities.",
    copy: "See exactly where your city stands across seven verified readiness factors and what peer markets have done differently. The gap analysis shows what your market needs to move up a tier \u2014 and which federal programs are available to help get there.",
    cta: { label: "Find your city", href: "/dashboard" },
  },
  {
    id: "research",
    label: "RESEARCH & ACADEMIC",
    accent: "#14b8a6",
    headline: "Cite the index. Build on the methodology.",
    copy: "AirIndex data and scores are free to cite in publications, reports, and analysis. The full methodology is published at airindex.io/methodology including data sources, classification logic, confidence tiering, and version history. Research access and data collaborations available.",
    cta: { label: "Read the methodology", href: "/methodology" },
  },
  {
    id: "press",
    label: "PRESS & MEDIA",
    accent: "#e879f9",
    headline: "The UAM readiness benchmark the industry cites.",
    copy: "AirIndex provides market readiness scores, trend data, and market intelligence for aviation and urban mobility coverage. Scores are updated daily based on primary source monitoring. Press inquiries and data access at info@airindex.io.",
    cta: { label: "Contact us", href: "mailto:info@airindex.io" },
  },
] as const;

// -------------------------------------------------------
// Sample data for live feed teasers
// -------------------------------------------------------
const SAMPLE_FILINGS = [
  { title: "FAA Notice: Part 135 Air Carrier Certificate Application — Joby Aviation", source: "Federal Register", date: "Feb 2026", accent: "#ff6b35" },
  { title: "City of Orlando — Urban Air Mobility Integration Plan Public Comment Period", source: "Federal Register", date: "Feb 2026", accent: "#ff6b35" },
  { title: "EASA Special Condition for VTOL — Reciprocal Recognition Request", source: "Federal Register", date: "Jan 2026", accent: "#ff6b35" },
];

const SAMPLE_ACTIVITY = [
  { summary: "Dallas score updated: 95 → 100", type: "score_change", time: "2d ago", accent: "#00ff88" },
  { summary: "New corridor authorized: LAX → Santa Monica", type: "new_corridor", time: "5d ago", accent: "#00d4ff" },
  { summary: "Joby Aviation Part 135 certificate application filed", type: "new_filing", time: "1w ago", accent: "#ff6b35" },
  { summary: "Orlando vertiport construction permit approved", type: "status_change", time: "1w ago", accent: "#7c3aed" },
  { summary: "Nevada state UAM legislation signed into law", type: "new_law", time: "2w ago", accent: "#00ff88" },
];

// -------------------------------------------------------
// Page
// -------------------------------------------------------
export default async function LandingPage() {
  const CITIES = await getCitiesWithOverrides();

  const stats = [
    { value: CITIES.length, label: "Markets" },
    { value: OPERATORS.length, label: "Operators" },
    { value: CORRIDORS.length, label: "Corridors" },
    { value: 4, label: "Data sources" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050508",
        fontFamily: "'Inter', sans-serif",
        color: "#fff",
      }}
    >
      {/* ======== Nav ======== */}
      <SiteNav />

      {/* ======== Hero ======== */}
      <section
        style={{
          position: "relative",
          maxWidth: 1120,
          margin: "0 auto",
          padding: "clamp(48px, 8vw, 80px) 20px 40px",
          textAlign: "center",
          overflow: "hidden",
        }}
      >
        <HeroFlightPath />
        <div style={{ position: "relative", marginBottom: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <img
            src="/images/logo/airindex-icon.svg"
            alt=""
            style={{ width: 72, height: 72, opacity: 0.9 }}
          />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                fontSize: 28,
                letterSpacing: 6,
                color: "#fff",
              }}
            >
              AIRINDEX
            </span>
            <span
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: 1,
                color: "#777",
              }}
            >
              Rate the sky.
            </span>
          </div>
        </div>
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(28px, 4.5vw, 50px)",
            lineHeight: 1.12,
            margin: "0 auto 20px",
            maxWidth: 780,
            color: "#fff",
          }}
        >
          The eVTOL aircraft are ready. Which cities are?
        </h1>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            color: "#aaa",
            fontSize: "clamp(13px, 1.4vw, 16px)",
            lineHeight: 1.7,
            maxWidth: 600,
            margin: "0 auto 40px",
          }}
        >
          The authoritative intelligence layer for UAM market readiness. {MARKET_COUNT} US cities scored
          daily across 7 verified factors — built on a systematic pipeline monitoring federal regulatory
          filings, state legislation, operator disclosures, and infrastructure data.
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: "6px 16px",
            marginBottom: 40,
          }}
        >
          {[
            "Infrastructure Developers",
            "Operators & OEMs",
            "City Planners",
            "Investors & Analysts",
            "Defense & Aerospace",
            "Policy & Government",
          ].map((buyer, i) => (
            <span
              key={buyer}
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 10,
                letterSpacing: 1,
                color: "#555",
              }}
            >
              {buyer}{i < 5 ? <span style={{ color: "#333", margin: "0 0 0 16px" }}>/</span> : ""}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <Link
            href="/dashboard"
            style={{
              display: "inline-block",
              padding: "14px 32px",
              background: "#00d4ff",
              color: "#050508",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "'Inter', sans-serif",
              letterSpacing: "0.06em",
              textDecoration: "none",
              borderRadius: 6,
              transition: "opacity 0.15s",
            }}
          >
            Explore the dashboard
          </Link>
          <Link
            href="#live-data"
            style={{
              display: "inline-block",
              padding: "14px 32px",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#aaa",
              fontSize: 12,
              letterSpacing: "0.06em",
              textDecoration: "none",
              borderRadius: 6,
              transition: "all 0.15s",
            }}
          >
            See live data
          </Link>
        </div>

      </section>

      {/* ======== Stats Bar ======== */}
      <ScrollReveal>
        <section
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "0 20px",
          }}
        >
          <CountUpStats stats={stats} />
        </section>
      </ScrollReveal>

      {/* ======== Capabilities ======== */}
      <ScrollReveal>
      <section
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "48px 20px 0",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(22px, 2.5vw, 32px)",
              margin: "0 0 10px",
              color: "#fff",
            }}
          >
            How the intelligence layer works
          </h2>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))",
            gap: 16,
          }}
        >
          {[
            {
              icon: "◈",
              accent: "#00ff88",
              title: "Readiness Scoring",
              description:
                "0–100 composite index across 7 weighted factors. Every market scored, tiered, and ranked — designed to be the benchmark the industry cites.",
            },
            {
              icon: "◎",
              accent: "#00d4ff",
              title: "Interactive Map",
              description:
                "Vertiports, flight corridors, operator coverage areas, and tier-based market visualization on a live, explorable map interface.",
            },
            {
              icon: "⟿",
              accent: "#7c3aed",
              title: "Corridor Intelligence",
              description:
                "Database-backed flight corridors with status tracking, operator assignment, altitude data, and per-corridor subscriptions.",
            },
            {
              icon: "⟋",
              accent: "#f59e0b",
              title: "Historical Score Tracking",
              description:
                "Weekly automated snapshots with sparkline trends. Track how market readiness evolves as policies change and infrastructure develops.",
            },
            {
              icon: "⊘",
              accent: "#ef4444",
              title: "Market Watch & Outlook",
              description:
                "Watch status and 6-month outlook on every rated market. Surfaces momentum signals — advancing legislation, pending overrides, elevated activity — before scores move. Know which cities are on the move with analyst notes explaining the signal.",
            },
            {
              icon: "◉",
              accent: "#ff6b35",
              title: "Regulatory & Filing Intelligence",
              description:
                "Automated pipeline monitoring federal, state, and operator filings across multiple primary sources. Every signal classified by market, sourced, and timestamped.",
            },
            {
              icon: "⚡",
              accent: "#14b8a6",
              title: "Alerts & Subscriptions",
              description:
                "Market-level and corridor-level change notifications. Subscribe to the markets and corridors you care about — get notified when the data moves.",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="landing-feature-card"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 10,
                padding: "28px 24px",
                borderTop: `2px solid ${card.accent}`,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  border: `1px solid ${card.accent}33`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  color: card.accent,
                  marginBottom: 16,
                }}
              >
                {card.icon}
              </div>
              <div
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 600,
                  fontSize: 15,
                  color: "#eee",
                  marginBottom: 8,
                }}
              >
                {card.title}
              </div>
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12.5,
                  lineHeight: 1.65,
                  color: "#999",
                }}
              >
                {card.description}
              </div>
            </div>
          ))}
        </div>
      </section>

      </ScrollReveal>

      {/* ======== Dashboard Preview ======== */}
      <ScrollReveal>
      <section
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "clamp(40px, 8vw, 80px) 20px",
        }}
      >
        <div
          style={{
            position: "relative",
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 0 80px rgba(0,212,255,0.08), 0 0 160px rgba(124,58,237,0.05)",
          }}
        >
          {/* Browser chrome */}
          <div
            style={{
              background: "#0d0d1a",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
            <div
              style={{
                flex: 1,
                marginLeft: 12,
                background: "rgba(255,255,255,0.04)",
                borderRadius: 4,
                padding: "5px 12px",
                fontSize: 10,
                color: "#888",
              }}
            >
              airindex.io/dashboard
            </div>
          </div>
          <Link href="/dashboard" className="dashboard-preview-link" style={{ display: "block", position: "relative" }}>
            <Image
              src="/images/dashboard-preview.png"
              alt="AirIndex dashboard showing an interactive map of US UAM markets with readiness scores"
              width={1920}
              height={1080}
              style={{ width: "100%", height: "auto", display: "block" }}
              priority
            />
            <div className="dashboard-preview-overlay">
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}>
                <span style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: "0.06em",
                  color: "#fff",
                }}>
                  Explore the dashboard &rarr;
                </span>
                <span style={{
                  fontSize: 9,
                  fontWeight: 500,
                  letterSpacing: 2,
                  color: "#00d4ff",
                }}>
                  FREE — NO SIGNUP REQUIRED
                </span>
              </div>
            </div>
          </Link>
        </div>
      </section>

      </ScrollReveal>

      {/* ======== Live Data Teaser ======== */}
      <ScrollReveal>
      <section
        id="live-data"
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "0 20px 64px",
          scrollMarginTop: 80,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(22px, 2.5vw, 32px)",
              margin: "0 0 10px",
              color: "#fff",
            }}
          >
            Live regulatory tracking
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", color: "#888", fontSize: 13, margin: 0 }}>
            Every filing, authorization, and market change — surfaced automatically.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))",
            gap: 20,
          }}
        >
          {/* Filings Feed — live from API */}
          <LiveFilingsFeed fallback={SAMPLE_FILINGS} />

          {/* Activity Feed — live from API */}
          <LiveActivityFeed fallback={SAMPLE_ACTIVITY} />
        </div>
      </section>

      </ScrollReveal>

      {/* ======== Intel Feed CTA ======== */}
      <ScrollReveal>
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "0 20px 80px" }}>
        <div
          style={{
            border: "1px solid rgba(124,58,237,0.2)",
            borderRadius: 12,
            padding: "48px 32px",
            background: "rgba(124,58,237,0.03)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 9,
              letterSpacing: 3,
              color: "#7c3aed",
              marginBottom: 16,
              fontWeight: 500,
            }}
          >
            INTEL FEED
          </div>
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(20px, 2.5vw, 28px)",
              margin: "0 0 12px",
              color: "#fff",
            }}
          >
            Latest UAM Intelligence
          </h2>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              color: "#888",
              fontSize: 13,
              margin: "0 0 28px",
              maxWidth: 520,
              marginLeft: "auto",
              marginRight: "auto",
              lineHeight: 1.6,
            }}
          >
            Curated intelligence on FAA rulings, city policy, operator expansions,
            and infrastructure developments shaping UAM market readiness.
          </p>
          <Link
            href="/feed"
            style={{
              display: "inline-block",
              padding: "12px 32px",
              border: "1px solid #7c3aed",
              borderRadius: 6,
              color: "#7c3aed",
              fontSize: 11,
              letterSpacing: 2,
              textDecoration: "none",
              transition: "all 0.2s",
              fontWeight: 600,
            }}
          >
            READ THE FEED &rarr;
          </Link>
        </div>
      </section>

      </ScrollReveal>

      {/* ======== Monthly Market Report ======== */}
      <ScrollReveal>
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "0 20px 80px" }}>
        <div style={{
          border: "1px solid rgba(0,212,255,0.15)",
          borderRadius: 12,
          overflow: "hidden",
          background: "rgba(0,212,255,0.02)",
        }}>
          {/* Header bar */}
          <div style={{
            background: "rgba(0,212,255,0.06)",
            borderBottom: "1px solid rgba(0,212,255,0.1)",
            padding: "20px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2, color: "#00d4ff", textTransform: "uppercase" }}>
                Monthly Market Report
              </div>
              <div style={{
                background: "rgba(0,212,255,0.15)",
                border: "1px solid rgba(0,212,255,0.3)",
                borderRadius: 4,
                fontSize: 8,
                fontWeight: 500,
                letterSpacing: 1,
                color: "#00d4ff",
                padding: "3px 8px",
              }}>
                ISSUE 001 — FEBRUARY 2026
              </div>
            </div>
            <div style={{ fontSize: 8, fontWeight: 500, color: "#aaa", letterSpacing: 1 }}>
              FEBRUARY PREVIEW FREE · FULL REPORTS PRO
            </div>
          </div>

          {/* Body */}
          <div style={{
            padding: "36px 32px",
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 40,
            alignItems: "center",
          }}>
            <div>
              <h2 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(20px, 2.5vw, 28px)",
                color: "#fff",
                margin: "0 0 12px",
                lineHeight: 1.2,
              }}>
                The AirIndex UAM Market Report
              </h2>
              <p style={{
                fontFamily: "'Inter', sans-serif",
                color: "#999",
                fontSize: 13,
                lineHeight: 1.7,
                margin: "0 0 24px",
                maxWidth: 520,
              }}>
                Get the free monthly summary — top market movers, biggest regulatory shifts, and one
                headline insight. Want the full breakdown? All {MARKET_COUNT} markets, factor analysis, corridor
                updates, and operator tracker are in the Pro report.
              </p>

              {/* Tags */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
                {["Market Rankings", "Corridor Intelligence", "Operator Watch", "Regulatory Filings", "What to Watch"].map(tag => (
                  <div key={tag} style={{
                    border: "1px solid rgba(0,212,255,0.2)",
                    borderRadius: 4,
                    fontSize: 8,
                    fontWeight: 500,
                    letterSpacing: 1,
                    color: "#00d4ff",
                    padding: "4px 10px",
                    background: "rgba(0,212,255,0.04)",
                  }}>
                    {tag.toUpperCase()}
                  </div>
                ))}
              </div>

              {/* Download buttons */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                <a
                  href="/reports/AirIndex-Market-Report-February-2026.pdf"
                  download
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "12px 24px",
                    background: "#00d4ff",
                    color: "#050508",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textDecoration: "none",
                    borderRadius: 6,
                  }}
                >
                  ↓ PREVIEW: FEBRUARY 2026
                </a>
                <a
                  href="/pricing"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "12px 24px",
                    background: "transparent",
                    border: "1px solid rgba(0,255,136,0.4)",
                    color: "#00ff88",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textDecoration: "none",
                    borderRadius: 6,
                  }}
                >
                  FULL REPORT — PRO
                </a>
              </div>
            </div>

            {/* Mini preview thumbnail */}
            <div style={{
              width: 160,
              flexShrink: 0,
              background: "#0a0a1a",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              padding: "16px 14px",
              fontFamily: "'Space Mono', monospace",
            }}>
              <div style={{ fontSize: 7, color: "#00d4ff", letterSpacing: 1, marginBottom: 8 }}>AIRINDEX</div>
              <div style={{ fontSize: 6, color: "#aaa", letterSpacing: 0.5, marginBottom: 12, borderBottom: "1px solid #1a1a2e", paddingBottom: 8 }}>
                UAM MARKET REPORT · FEB 2026
              </div>
              {([["Los Angeles", 100], ["Dallas", 100], ["Miami", 100], ["Orlando", 85], ["New York", 70]] as [string, number][]).map(([city, score]) => (
                <div key={city} style={{ marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ fontSize: 6, color: "#888" }}>{city}</span>
                    <span style={{ fontSize: 6, color: "#00ff88" }}>{score}</span>
                  </div>
                  <div style={{ height: 3, background: "#1a1a2e", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${score}%`, background: score >= 75 ? "#00ff88" : "#00d4ff", borderRadius: 2 }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #1a1a2e", fontSize: 5.5, color: "#999", letterSpacing: 0.5 }}>
                airindex.io
              </div>
            </div>
          </div>
        </div>
      </section>

      </ScrollReveal>

      {/* ======== Solutions Sections ======== */}
      {SOLUTIONS.map((solution, idx) => (
        <ScrollReveal key={solution.id}>
          <section
            id={solution.id}
            style={{
              maxWidth: 1120,
              margin: "0 auto",
              padding: idx === 0 ? "0 20px 40px" : "20px 20px 40px",
              scrollMarginTop: 80,
            }}
          >
            <div style={{
              border: `1px solid ${solution.accent}22`,
              borderRadius: 12,
              overflow: "hidden",
              background: `${solution.accent}04`,
            }}>
              {/* Section header */}
              <div style={{
                background: `${solution.accent}08`,
                borderBottom: `1px solid ${solution.accent}15`,
                padding: "14px 32px",
              }}>
                <div style={{
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: 3,
                  color: solution.accent,
                }}>
                  {solution.label}
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: "36px 32px" }}>
                <h2 style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: "clamp(20px, 2.2vw, 28px)",
                  color: "#fff",
                  margin: "0 0 16px",
                  lineHeight: 1.25,
                }}>
                  {solution.headline}
                </h2>
                <p style={{
                  fontFamily: "'Inter', sans-serif",
                  color: "#999",
                  fontSize: 13,
                  lineHeight: 1.75,
                  margin: "0 0 28px",
                  maxWidth: 640,
                }}>
                  {solution.copy}
                </p>
                {solution.cta.href.startsWith("mailto:") ? (
                  <a
                    href={solution.cta.href}
                    style={{
                      display: "inline-block",
                      padding: "10px 24px",
                      border: `1px solid ${solution.accent}66`,
                      borderRadius: 6,
                      color: solution.accent,
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "'Inter', sans-serif",
                      letterSpacing: "0.06em",
                      textDecoration: "none",
                      transition: "all 0.15s",
                    }}
                  >
                    {solution.cta.label} &rarr;
                  </a>
                ) : (
                  <Link
                    href={solution.cta.href}
                    style={{
                      display: "inline-block",
                      padding: "10px 24px",
                      border: `1px solid ${solution.accent}66`,
                      borderRadius: 6,
                      color: solution.accent,
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "'Inter', sans-serif",
                      letterSpacing: "0.06em",
                      textDecoration: "none",
                      transition: "all 0.15s",
                    }}
                  >
                    {solution.cta.label} &rarr;
                  </Link>
                )}
              </div>
            </div>
          </section>
        </ScrollReveal>
      ))}

      {/* ======== Pricing link ======== */}
      <ScrollReveal>
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "20px 20px 40px", textAlign: "center" }}>
        <p style={{
          fontFamily: "'Inter', sans-serif",
          color: "#888",
          fontSize: 13,
          margin: 0,
        }}>
          Full dashboard access is free.{" "}
          <Link href="/pricing" style={{ color: "#00d4ff", textDecoration: "none" }}>
            View paid plans &rarr;
          </Link>
        </p>
      </section>
      </ScrollReveal>

      {/* ======== Closing CTA ======== */}
      <ScrollReveal>
      <section
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "0 20px clamp(60px, 8vw, 100px)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: 72,
          }}
        >
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(20px, 2.5vw, 30px)",
              margin: "0 0 12px",
              color: "#fff",
            }}
          >
            Rate the sky.
          </h2>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              color: "#888",
              fontSize: 13,
              margin: "0 0 32px",
            }}
          >
            Free access to market scores, rankings, and the interactive map. No signup required.
          </p>
          <Link
            href="/dashboard"
            style={{
              display: "inline-block",
              padding: "14px 36px",
              background: "#00d4ff",
              color: "#050508",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "'Inter', sans-serif",
              letterSpacing: "0.06em",
              textDecoration: "none",
              borderRadius: 6,
              transition: "opacity 0.15s",
            }}
          >
            Explore the dashboard
          </Link>
        </div>
      </section>

      </ScrollReveal>

      {/* ======== Footer ======== */}
      <SiteFooter />
    </div>
  );
}
