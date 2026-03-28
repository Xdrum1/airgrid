import Link from "next/link";
import Image from "next/image";
import { MARKET_COUNT } from "@/data/seed";
import ScrollReveal from "@/components/landing/ScrollReveal";
import HeroFlightPath from "@/components/landing/HeroFlightPath";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

// -------------------------------------------------------
// Who uses AirIndex
// -------------------------------------------------------
const AUDIENCES = [
  {
    label: "Operators & OEMs",
    accent: "#00d4ff",
    description: "Prioritize markets based on verified readiness data — not assumptions.",
  },
  {
    label: "Infrastructure Developers",
    accent: "#00ff88",
    description: "Site selection and capital allocation backed by auditable market intelligence.",
  },
  {
    label: "Government & Municipal",
    accent: "#7c3aed",
    description: "Benchmark your market against peer cities and identify what moves the score.",
  },
  {
    label: "Aerospace & Defense",
    accent: "#f59e0b",
    description: "Track market readiness across the AAM ecosystem as programs scale.",
  },
  {
    label: "Insurance & Risk",
    accent: "#ef4444",
    description: "Standardized infrastructure risk data across portfolios and markets.",
  },
  {
    label: "Investors & Analysts",
    accent: "#14b8a6",
    description: "Score trends, factor-level breakdowns, and sourced audit trails for due diligence.",
  },
] as const;

// -------------------------------------------------------
// What the platform delivers
// -------------------------------------------------------
const CAPABILITIES = [
  {
    icon: "◈",
    accent: "#00ff88",
    title: "Market Readiness Scoring",
    description: "0-100 composite index across 7 weighted factors. Every market scored, tiered, and ranked with full source tracing.",
  },
  {
    icon: "⟿",
    accent: "#00d4ff",
    title: "Corridor & Operator Intelligence",
    description: "Database-backed flight corridors, operator tracking, and vertiport data with status monitoring and change detection.",
  },
  {
    icon: "◉",
    accent: "#ff6b35",
    title: "Regulatory & Filing Intelligence",
    description: "Automated pipeline monitoring federal, state, and operator filings across primary sources. Every signal classified, sourced, and timestamped.",
  },
  {
    icon: "⟋",
    accent: "#f59e0b",
    title: "Gap Analysis & Reports",
    description: "Market-level gap reports showing what each city needs to advance. Downloadable snapshots and pre-feasibility assessments.",
  },
  {
    icon: "⊘",
    accent: "#7c3aed",
    title: "Score History & Trajectories",
    description: "Weekly automated snapshots with sparkline trends. A city moving 30 to 45 over six months is a different signal than a city flat at 45.",
  },
  {
    icon: "⚡",
    accent: "#14b8a6",
    title: "API & Data Access",
    description: "RESTful API with market data, score history, and export capabilities for organizations embedding UAM intelligence into their workflows.",
  },
] as const;

// -------------------------------------------------------
// Page
// -------------------------------------------------------
export default async function LandingPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050508",
        fontFamily: "'Inter', sans-serif",
        color: "#fff",
      }}
    >
      <SiteNav />

      {/* ======== Hero ======== */}
      <section
        style={{
          position: "relative",
          maxWidth: 1120,
          margin: "0 auto",
          padding: "clamp(60px, 10vw, 120px) 20px 40px",
          textAlign: "center",
          overflow: "hidden",
        }}
      >
        <HeroFlightPath />
        <div style={{ position: "relative", marginBottom: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <img
            src="/images/logo/airindex-icon.svg"
            alt=""
            style={{ width: 64, height: 64, opacity: 0.9 }}
          />
          <span
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: 24,
              letterSpacing: 6,
              color: "#fff",
            }}
          >
            AIRINDEX
          </span>
        </div>
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(26px, 4vw, 46px)",
            lineHeight: 1.15,
            margin: "0 auto 20px",
            maxWidth: 800,
            color: "#fff",
          }}
        >
          The intelligence infrastructure for urban air mobility.
        </h1>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            color: "#888",
            fontSize: "clamp(13px, 1.4vw, 16px)",
            lineHeight: 1.7,
            maxWidth: 620,
            margin: "0 auto 40px",
          }}
        >
          UAM market readiness data for the institutions shaping where eVTOL operates.
        </p>

        {/* Static stat */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: 24,
            marginBottom: 48,
          }}
        >
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: 1, color: "#555" }}>
            Tracking {MARKET_COUNT}+ U.S. markets across 7 readiness factors
          </span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: 1, color: "#444" }}>
            |
          </span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: 1, color: "#555" }}>
            Updated continuously from primary sources
          </span>
        </div>

        {/* CTA */}
        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <Link
            href="/request-access"
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
            Request Access
          </Link>
          <Link
            href="/methodology"
            style={{
              display: "inline-block",
              padding: "14px 36px",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#aaa",
              fontSize: 12,
              letterSpacing: "0.06em",
              textDecoration: "none",
              borderRadius: 6,
              transition: "all 0.15s",
            }}
          >
            Read the methodology
          </Link>
        </div>
      </section>

      {/* ======== Who Uses AirIndex ======== */}
      <ScrollReveal>
        <section
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "clamp(40px, 6vw, 80px) 20px",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(22px, 2.5vw, 32px)",
                margin: "0 0 12px",
                color: "#fff",
              }}
            >
              Who uses AirIndex
            </h2>
            <p style={{ fontFamily: "'Inter', sans-serif", color: "#666", fontSize: 13, margin: 0, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
              The institutional intelligence layer for the AAM ecosystem.
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))",
              gap: 16,
            }}
          >
            {AUDIENCES.map((audience) => (
              <div
                key={audience.label}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 10,
                  padding: "24px 24px",
                  borderLeft: `3px solid ${audience.accent}`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 600,
                    fontSize: 14,
                    color: "#eee",
                    marginBottom: 8,
                  }}
                >
                  {audience.label}
                </div>
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 12.5,
                    lineHeight: 1.65,
                    color: "#888",
                  }}
                >
                  {audience.description}
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
            padding: "0 20px clamp(40px, 6vw, 80px)",
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
            <Link href="/request-access" className="dashboard-preview-link" style={{ display: "block", position: "relative" }}>
              <Image
                src="/images/dashboard-preview.png"
                alt="AirIndex intelligence platform — market readiness scoring across 20+ U.S. markets"
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
                    Request access to the full platform &rarr;
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </section>
      </ScrollReveal>

      {/* ======== Platform Capabilities ======== */}
      <ScrollReveal>
        <section
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "0 20px clamp(40px, 6vw, 80px)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(22px, 2.5vw, 32px)",
                margin: "0 0 12px",
                color: "#fff",
              }}
            >
              What the platform delivers
            </h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))",
              gap: 16,
            }}
          >
            {CAPABILITIES.map((card) => (
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
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    border: `1px solid ${card.accent}33`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    color: card.accent,
                    marginBottom: 14,
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

      {/* ======== Market Pulse (Public Research) ======== */}
      <ScrollReveal>
        <section style={{ maxWidth: 1120, margin: "0 auto", padding: "0 20px 80px" }}>
          <div style={{
            border: "1px solid rgba(0,212,255,0.15)",
            borderRadius: 12,
            overflow: "hidden",
            background: "rgba(0,212,255,0.02)",
          }}>
            <div style={{
              background: "rgba(0,212,255,0.06)",
              borderBottom: "1px solid rgba(0,212,255,0.1)",
              padding: "16px 32px",
            }}>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2, color: "#00d4ff", textTransform: "uppercase" }}>
                UAM Market Pulse — Public Research
              </div>
            </div>
            <div style={{ padding: "32px 32px" }}>
              <h2 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(20px, 2.5vw, 26px)",
                color: "#fff",
                margin: "0 0 12px",
                lineHeight: 1.2,
              }}>
                Weekly intelligence briefing
              </h2>
              <p style={{
                fontFamily: "'Inter', sans-serif",
                color: "#999",
                fontSize: 13,
                lineHeight: 1.7,
                margin: "0 0 24px",
                maxWidth: 560,
              }}>
                Market movements, regulatory signals, scoring updates, and the data behind them. Published weekly and freely available. The research layer that the AAM ecosystem cites.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                <Link
                  href="/insights"
                  style={{
                    display: "inline-block",
                    padding: "10px 24px",
                    border: "1px solid rgba(0,212,255,0.4)",
                    borderRadius: 6,
                    color: "#00d4ff",
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: "'Inter', sans-serif",
                    letterSpacing: "0.06em",
                    textDecoration: "none",
                  }}
                >
                  Read the Pulse &rarr;
                </Link>
                <Link
                  href="/methodology"
                  style={{
                    display: "inline-block",
                    padding: "10px 24px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 6,
                    color: "#888",
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: "'Inter', sans-serif",
                    letterSpacing: "0.06em",
                    textDecoration: "none",
                  }}
                >
                  Methodology
                </Link>
              </div>
            </div>
          </div>
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
              The intelligence infrastructure for urban air mobility.
            </h2>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                color: "#666",
                fontSize: 13,
                margin: "0 0 32px",
                maxWidth: 480,
                marginLeft: "auto",
                marginRight: "auto",
                lineHeight: 1.7,
              }}
            >
              Request access to the full platform — market readiness scores, gap analysis, corridor intelligence, regulatory filings, and the API.
            </p>
            <Link
              href="/request-access"
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
              Request Access
            </Link>
          </div>
        </section>
      </ScrollReveal>

      <SiteFooter />
    </div>
  );
}
