import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { OPERATORS, CORRIDORS, getCitiesWithOverrides } from "@/data/seed";
import CountUpStats from "@/components/landing/CountUpStats";
import LiveActivityFeed from "@/components/landing/LiveActivityFeed";
import CityScoreLookup from "@/components/landing/CityScoreLookup";
import LiveTicker from "@/components/landing/LiveTicker";
import LiveFilingsFeed from "@/components/landing/LiveFilingsFeed";

// -------------------------------------------------------
// Pricing tier data
// -------------------------------------------------------
const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "",
    accent: "#00d4ff",
    badge: null,
    features: [
      "Dashboard map with city markers",
      "Current readiness scores",
      "City rankings",
      "Basic market overview per city",
    ],
    yearlyNote: "Free forever.",
    cta: { label: "Sign up free", href: "/login?mode=signup" },
  },
  {
    name: "Pro",
    price: "$149",
    period: "/month",
    accent: "#00ff88",
    badge: null,
    features: [
      "Everything in Free, plus:",
      "Score history & factor breakdowns",
      "Corridor intelligence & operator tracker",
      "Market Watch & analyst outlook notes",
      "SEC filings & email alerts",
    ],
    yearlyNote: "$1,490/year (2 months free)",
    cta: { label: "Join waitlist", href: "/contact?tier=pro" },
    highlight: true,
  },
  {
    name: "Institutional",
    price: "$499",
    period: "/month",
    accent: "#7c3aed",
    badge: null,
    features: [
      "Everything in Pro, plus:",
      "API access & data export",
      "3 seats included (+$99/seat/mo)",
      "Custom alerts & priority support",
    ],
    yearlyNote: "$4,990/year (2 months free)",
    cta: { label: "Learn more", href: "/contact?tier=institutional" },
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    accent: "#f59e0b",
    badge: null,
    features: [
      "Everything in Institutional, plus:",
      "White-label endpoints & webhooks",
      "Embedded widgets & direct data feeds",
    ],
    yearlyNote: "For organizations embedding UAM data",
    cta: { label: "Contact us", href: "/contact?tier=enterprise" },
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
  const session = await auth();
  const isAuthed = !!session?.user;
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
        fontFamily: "'Space Mono', monospace",
        color: "#fff",
      }}
    >
      {/* ======== Nav ======== */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(5,5,8,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "0 20px",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src="/images/logo/airindex-wordmark.svg"
              alt="AirIndex"
              style={{ height: 28 }}
            />
          </div>
          <div className="landing-nav-buttons" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link
              href="/about"
              className="nav-hide-mobile"
              style={{
                color: "#888",
                fontSize: 11,
                letterSpacing: "0.06em",
                textDecoration: "none",
                padding: "8px 16px",
                transition: "all 0.15s",
              }}
            >
              About
            </Link>
            <Link
              href="/pricing"
              className="nav-hide-mobile"
              style={{
                color: "#888",
                fontSize: 11,
                letterSpacing: "0.06em",
                textDecoration: "none",
                padding: "8px 16px",
                transition: "all 0.15s",
              }}
            >
              Pricing
            </Link>
            <Link
              href="/api"
              className="nav-hide-mobile"
              style={{
                color: "#888",
                fontSize: 11,
                letterSpacing: "0.06em",
                textDecoration: "none",
                padding: "8px 16px",
                transition: "all 0.15s",
              }}
            >
              API
            </Link>
            {isAuthed ? (
              <Link
                href="/dashboard"
                className="nav-hide-mobile"
                style={{
                  color: "#888",
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  textDecoration: "none",
                  padding: "8px 16px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 6,
                  transition: "all 0.15s",
                }}
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  style={{
                    color: "#888",
                    fontSize: 11,
                    letterSpacing: "0.06em",
                    textDecoration: "none",
                    padding: "8px 16px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 6,
                    transition: "all 0.15s",
                  }}
                >
                  Sign in
                </Link>
                <Link
                  href="/login?mode=signup"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: "'Syne', sans-serif",
                    letterSpacing: "0.06em",
                    textDecoration: "none",
                    padding: "8px 20px",
                    background: "#00d4ff",
                    color: "#050508",
                    borderRadius: 6,
                    transition: "opacity 0.15s",
                  }}
                >
                  Sign up free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ======== Hero ======== */}
      <section
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "clamp(48px, 8vw, 80px) 20px 40px",
          textAlign: "center",
        }}
      >
        <div style={{ marginBottom: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
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
                fontFamily: "'Syne', sans-serif",
                fontStyle: "italic",
                fontSize: 13,
                letterSpacing: 1,
                color: "#777",
              }}
            >
              Rate the sky.
            </span>
          </div>
        </div>
        <LiveTicker
          fallbackText={`Continuously updated · ${CITIES.length} markets · ${OPERATORS.length} operators · ${CORRIDORS.length} corridors`}
          marketCount={CITIES.length}
          operatorCount={OPERATORS.length}
          corridorCount={CORRIDORS.length}
        />
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
          21 US cities scored for UAM market readiness — updated in real time.
          Regulatory posture, infrastructure, operator presence, and corridor authorizations in one place.
        </p>
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
              fontFamily: "'Syne', sans-serif",
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

        {/* City Score Lookup */}
        <div style={{ marginTop: 32 }}>
          <CityScoreLookup
            cities={CITIES.map((c) => ({
              id: c.id,
              city: c.city,
              state: c.state,
              score: c.score ?? 0,
              regulatoryPosture: c.regulatoryPosture,
            }))}
          />
        </div>
      </section>

      {/* ======== Stats Bar ======== */}
      <section
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "0 20px",
        }}
      >
        <CountUpStats stats={stats} />
      </section>

      {/* ======== Feature Explainer ======== */}
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
            Rating system capabilities
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
              icon: "◉",
              accent: "#ff6b35",
              title: "Regulatory Ingestion",
              description:
                "Automated data from Federal Register, LegiScan, FAA LAANC, and SEC EDGAR. Filings surfaced by market with source attribution.",
            },
            {
              icon: "⚡",
              accent: "#14b8a6",
              title: "Alerts & Subscriptions",
              description:
                "Market-level and corridor-level change notifications. Subscribe to the markets and corridors you care about — get notified when the data moves.",
            },
            {
              icon: "◆",
              accent: "#e879f9",
              title: "Market Watch & Analyst Outlook",
              description:
                "Moody\u2019s-style watch status and 6-month outlook on every rated market. Know which cities are on the move before scores change \u2014 with analyst notes explaining the signal.",
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

      {/* ======== Dashboard Preview ======== */}
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
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: "0.06em",
                  color: "#fff",
                }}>
                  Explore the dashboard &rarr;
                </span>
                <span style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 9,
                  letterSpacing: 2,
                  color: "#00d4ff",
                }}>
                  FREE WITH SIGNUP
                </span>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* ======== Live Data Teaser ======== */}
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

      {/* ======== Monthly Market Report ======== */}
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
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: 2, color: "#00d4ff", textTransform: "uppercase" }}>
                Monthly Market Report
              </div>
              <div style={{
                background: "rgba(0,212,255,0.15)",
                border: "1px solid rgba(0,212,255,0.3)",
                borderRadius: 4,
                fontFamily: "'Space Mono', monospace",
                fontSize: 8,
                letterSpacing: 1,
                color: "#00d4ff",
                padding: "3px 8px",
              }}>
                ISSUE 001 — FEBRUARY 2026
              </div>
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: "#aaa", letterSpacing: 1 }}>
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
                headline insight. Want the full breakdown? All 21 markets, factor analysis, corridor
                updates, and operator tracker are in the Pro report.
              </p>

              {/* Tags */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
                {["Market Rankings", "Corridor Intelligence", "Operator Watch", "Regulatory Filings", "What to Watch"].map(tag => (
                  <div key={tag} style={{
                    border: "1px solid rgba(0,212,255,0.2)",
                    borderRadius: 4,
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 8,
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
                    fontFamily: "'Syne', sans-serif",
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
                    fontFamily: "'Syne', sans-serif",
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
              {([["Los Angeles", 100], ["Dallas", 100], ["Orlando", 85], ["Las Vegas", 85], ["Miami", 80]] as [string, number][]).map(([city, score]) => (
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

      {/* ======== Who It's For ======== */}
      <section
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "0 20px 64px",
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
            Who it&apos;s for
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", color: "#888", fontSize: 13, margin: 0 }}>
            One rating system, three audiences.
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))",
            gap: 16,
          }}
        >
          {[
            {
              title: "Investors & Analysts",
              accent: "#00d4ff",
              items: [
                "Due diligence on UAM market readiness",
                "Operator and infrastructure tracking",
                "Market timing signals from score trends",
                "Regulatory risk assessment by market",
              ],
            },
            {
              title: "Operators & OEMs",
              accent: "#00ff88",
              items: [
                "Competitive analysis across markets",
                "Market entry strategy and prioritization",
                "Corridor status and infrastructure gaps",
                "Regulatory landscape comparison",
              ],
            },
            {
              title: "City Planners & Policy",
              accent: "#7c3aed",
              items: [
                "Benchmarking against peer cities",
                "Infrastructure planning data",
                "Regulatory comparison and best practices",
                "Stakeholder reporting and public data",
              ],
            },
          ].map((card) => (
            <div
              key={card.title}
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
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 600,
                  fontSize: 15,
                  color: card.accent,
                  marginBottom: 16,
                }}
              >
                {card.title}
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {card.items.map((item) => (
                  <li
                    key={item}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 12.5,
                      lineHeight: 1.6,
                      color: "#aaa",
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        color: card.accent,
                        fontSize: 6,
                        marginTop: 6,
                        flexShrink: 0,
                        display: "inline-block",
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: card.accent,
                        opacity: 0.6,
                      }}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ======== Pricing ======== */}
      <section id="pricing" style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 20px clamp(60px, 8vw, 100px)", scrollMarginTop: 80 }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(24px, 3vw, 36px)",
              margin: "0 0 12px",
            }}
          >
            Free access during beta. Paid plans launching soon.
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", color: "#999", fontSize: 13, margin: 0 }}>
            All features available free while we validate with early users.{" "}
            <Link href="/pricing" style={{ color: "#00d4ff", textDecoration: "none" }}>
              View full pricing →
            </Link>
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))",
            gap: 20,
            maxWidth: 1120,
            margin: "0 auto",
            alignItems: "stretch",
          }}
        >
          {TIERS.map((tier) => {
            const isHighlight = "highlight" in tier && tier.highlight;
            return (
              <div
                key={tier.name}
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  background: isHighlight ? "rgba(0,255,136,0.03)" : "rgba(255,255,255,0.02)",
                  border: isHighlight
                    ? `1px solid ${tier.accent}44`
                    : "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 12,
                  padding: "36px 24px 28px",
                  transition: "border-color 0.2s",
                }}
              >
                {/* Top accent line */}
                <div
                  style={{
                    position: "absolute",
                    top: -1,
                    left: 28,
                    right: 28,
                    height: 2,
                    background: tier.accent,
                    borderRadius: "2px 2px 0 0",
                  }}
                />

                {/* Badge */}
                {tier.badge && (
                  <div
                    style={{
                      position: "absolute",
                      top: -11,
                      right: 20,
                      background: "linear-gradient(135deg, #00d4ff, #7c3aed)",
                      color: "#000",
                      fontSize: 8,
                      fontWeight: 700,
                      fontFamily: "'Syne', sans-serif",
                      letterSpacing: "0.1em",
                      padding: "4px 10px",
                      borderRadius: 4,
                    }}
                  >
                    {tier.badge}
                  </div>
                )}

                {/* Tier name */}
                <div
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 700,
                    fontSize: 16,
                    color: "#ccc",
                    marginBottom: 8,
                  }}
                >
                  {tier.name}
                </div>

                {/* Price */}
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                  <span
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: 700,
                      fontSize: 36,
                      color: "#fff",
                    }}
                  >
                    {tier.price}
                  </span>
                  <span style={{ color: "#888", fontSize: 13 }}>{tier.period}</span>
                </div>
                {"yearlyNote" in tier && tier.yearlyNote && (
                  <div style={{ color: "#aaa", fontSize: 10, marginBottom: 20 }}>
                    {tier.yearlyNote}
                  </div>
                )}
                {!("yearlyNote" in tier) && <div style={{ marginBottom: 20 }} />}

                {/* Features */}
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", flex: 1 }}>
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        color: "#888",
                        fontSize: 12,
                        lineHeight: 1.6,
                        marginBottom: 8,
                      }}
                    >
                      {f.endsWith(":") ? null : (
                        <span style={{ color: tier.accent, fontSize: 10, marginTop: 3, flexShrink: 0 }}>
                          ✓
                        </span>
                      )}
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {tier.cta.href.startsWith("mailto:") ? (
                  <a
                    href={tier.cta.href}
                    style={{
                      display: "block",
                      textAlign: "center",
                      padding: "12px 0",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "'Syne', sans-serif",
                      letterSpacing: "0.06em",
                      textDecoration: "none",
                      transition: "opacity 0.15s",
                      ...(isHighlight
                        ? { background: tier.accent, color: "#050508" }
                        : { background: `${tier.accent}15`, border: `1px solid ${tier.accent}44`, color: tier.accent }
                      ),
                    }}
                  >
                    {tier.cta.label}
                  </a>
                ) : (
                  <Link
                    href={tier.cta.href}
                    style={{
                      display: "block",
                      textAlign: "center",
                      padding: "12px 0",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "'Syne', sans-serif",
                      letterSpacing: "0.06em",
                      textDecoration: "none",
                      transition: "opacity 0.15s",
                      ...(isHighlight
                        ? { background: tier.accent, color: "#050508" }
                        : { background: `${tier.accent}15`, border: `1px solid ${tier.accent}44`, color: tier.accent }
                      ),
                    }}
                  >
                    {tier.cta.label}
                  </Link>
                )}
                {tier.name !== "Free" && (
                  <div
                    style={{
                      textAlign: "center",
                      marginTop: 8,
                      fontSize: 9,
                      color: "#555",
                      letterSpacing: 0.5,
                    }}
                  >
                    Coming soon
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ======== Closing CTA ======== */}
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
            Free access to market scores, rankings, and the interactive map.
          </p>
          <Link
            href="/login?mode=signup"
            style={{
              display: "inline-block",
              padding: "14px 36px",
              background: "#00d4ff",
              color: "#050508",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "'Syne', sans-serif",
              letterSpacing: "0.06em",
              textDecoration: "none",
              borderRadius: 6,
              transition: "opacity 0.15s",
            }}
          >
            Sign up free
          </Link>
        </div>
      </section>

      {/* ======== Footer ======== */}
      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "40px 20px",
          maxWidth: 1120,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src="/images/logo/airindex-wordmark.svg"
              alt="AirIndex"
              style={{ height: 18, opacity: 0.7 }}
            />
          </div>
          <div className="landing-footer-links" style={{ display: "flex", gap: 24 }}>
            <Link
              href="/about"
              style={{ color: "#888", fontSize: 10, letterSpacing: 1, textDecoration: "none" }}
            >
              ABOUT
            </Link>
            <Link
              href="/methodology"
              style={{ color: "#888", fontSize: 10, letterSpacing: 1, textDecoration: "none" }}
            >
              METHODOLOGY
            </Link>
            <Link
              href="/api"
              style={{ color: "#888", fontSize: 10, letterSpacing: 1, textDecoration: "none" }}
            >
              API
            </Link>
            <Link
              href="/pricing"
              style={{ color: "#888", fontSize: 10, letterSpacing: 1, textDecoration: "none" }}
            >
              PRICING
            </Link>
            <Link
              href="/contact"
              style={{ color: "#888", fontSize: 10, letterSpacing: 1, textDecoration: "none" }}
            >
              CONTACT
            </Link>
            <a
              href="https://x.com/AirIndexHQ"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#888", fontSize: 10, letterSpacing: 1, textDecoration: "none" }}
            >
              X (TWITTER)
            </a>
            <a
              href="https://www.linkedin.com/company/AirIndexHQ"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#888", fontSize: 10, letterSpacing: 1, textDecoration: "none" }}
            >
              LINKEDIN
            </a>
            <Link
              href="/terms"
              style={{ color: "#888", fontSize: 10, letterSpacing: 1, textDecoration: "none" }}
            >
              TERMS
            </Link>
            <Link
              href="/privacy"
              style={{ color: "#888", fontSize: 10, letterSpacing: 1, textDecoration: "none" }}
            >
              PRIVACY
            </Link>
          </div>
          <div style={{ color: "#999", fontSize: 9, letterSpacing: 1 }}>
            &copy; {new Date().getFullYear()} AIRINDEX
          </div>
        </div>
      </footer>
    </div>
  );
}
