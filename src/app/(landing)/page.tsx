import Link from "next/link";
import Image from "next/image";
import { MARKET_COUNT } from "@/data/seed";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import ScrollReveal from "@/components/landing/ScrollReveal";
import StatNumber from "@/components/landing/StatNumber";
import PulseSubscribe from "@/components/PulseSubscribe";

// ─────────────────────────────────────────────────────────
// Conversion-focused homepage.
//
// Structure follows the advisor framework:
// Hero → Stats → Framework → Dashboard (proof) → Products → Urgency → Sample → Buyers → API → Pulse → CTA
//
// Split intentionally preserved: dashboard is dark, marketing is light.
// ─────────────────────────────────────────────────────────

export default async function LandingPage() {
  // ── Design tokens ──
  const T = {
    bg: "#ffffff",
    subtleBg: "#f6f9fc",
    textPrimary: "#0a2540",
    textSecondary: "#425466",
    textTertiary: "#697386",
    accent: "#5B8DB8",
    accentDeep: "#0a4068",
    cardBorder: "#e3e8ee",
    divider: "rgba(10,37,64,0.08)",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        fontFamily: "'Inter', sans-serif",
        color: T.textPrimary,
      }}
    >
      <SiteNav theme="light" />

      {/* ════════════════════════════════════════════════════ */}
      {/* 1. HERO                                               */}
      {/* ════════════════════════════════════════════════════ */}
      <div
        style={{
          position: "relative",
          background:
            "linear-gradient(150deg, rgba(91,141,184,0.14) 0%, rgba(167,139,250,0.08) 28%, rgba(45,212,191,0.06) 54%, rgba(255,255,255,0) 82%)",
          overflow: "hidden",
        }}
      >
        {/* Decorative glows */}
        <div
          aria-hidden="true"
          className="hero-glow"
          style={{
            position: "absolute",
            top: -160,
            right: -80,
            width: 520,
            height: 520,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(91,141,184,0.18) 0%, rgba(91,141,184,0) 68%)",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden="true"
          className="hero-glow hero-glow--slow"
          style={{
            position: "absolute",
            top: 120,
            left: -120,
            width: 380,
            height: 380,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(167,139,250,0.14) 0%, rgba(167,139,250,0) 68%)",
            pointerEvents: "none",
          }}
        />

        {/* Concentric airspace circles */}
        <svg
          aria-hidden="true"
          viewBox="0 0 600 600"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -52%)",
            width: "min(720px, 92vw)",
            height: "auto",
            pointerEvents: "none",
            zIndex: 0,
            opacity: 0.55,
          }}
        >
          <defs>
            <radialGradient id="airspaceFade" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#5B8DB8" stopOpacity="0.22" />
              <stop offset="60%" stopColor="#5B8DB8" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#5B8DB8" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="300" cy="300" r="280" fill="none" stroke="#5B8DB8" strokeWidth="0.8" opacity="0.18" />
          <circle cx="300" cy="300" r="220" fill="none" stroke="#5B8DB8" strokeWidth="0.8" opacity="0.22" />
          <circle cx="300" cy="300" r="160" fill="none" stroke="#5B8DB8" strokeWidth="0.8" opacity="0.28" />
          <circle cx="300" cy="300" r="100" fill="none" stroke="#5B8DB8" strokeWidth="0.9" opacity="0.36" />
          <circle cx="300" cy="300" r="48" fill="url(#airspaceFade)" />
          <line x1="300" y1="20" x2="300" y2="100" stroke="#5B8DB8" strokeWidth="0.8" opacity="0.25" strokeLinecap="round" />
          <line x1="300" y1="500" x2="300" y2="580" stroke="#5B8DB8" strokeWidth="0.8" opacity="0.25" strokeLinecap="round" />
          <line x1="20" y1="300" x2="100" y2="300" stroke="#5B8DB8" strokeWidth="0.8" opacity="0.25" strokeLinecap="round" />
          <line x1="500" y1="300" x2="580" y2="300" stroke="#5B8DB8" strokeWidth="0.8" opacity="0.25" strokeLinecap="round" />
          <g className="hero-radar-sweep">
            <defs>
              <linearGradient id="radarBeam" x1="50%" y1="50%" x2="50%" y2="0%">
                <stop offset="0%" stopColor="#5B8DB8" stopOpacity="0" />
                <stop offset="85%" stopColor="#5B8DB8" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#5B8DB8" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line x1="300" y1="300" x2="300" y2="20" stroke="url(#radarBeam)" strokeWidth="1.4" strokeLinecap="round" />
          </g>
          <circle className="hero-radar-ping" cx="300" cy="300" r="280" fill="none" stroke="#5B8DB8" strokeWidth="1" />
          <circle className="hero-radar-ping hero-radar-ping--delay" cx="300" cy="300" r="280" fill="none" stroke="#2dd4bf" strokeWidth="0.8" />
        </svg>

        <section
          style={{
            position: "relative",
            maxWidth: 980,
            margin: "0 auto",
            padding: "clamp(64px, 9vw, 120px) 24px clamp(40px, 6vw, 72px)",
            textAlign: "center",
          }}
        >
          {/* Domain chip */}
          <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "center", marginBottom: 22 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 16px",
                borderRadius: 999,
                background: "#ffffff",
                border: `1px solid ${T.cardBorder}`,
                boxShadow: "0 1px 2px rgba(10,37,64,0.04)",
                fontFamily: "'Space Mono', monospace",
                fontSize: 10.5,
                letterSpacing: "0.12em",
                color: T.textSecondary,
                textTransform: "uppercase",
              }}
            >
              <span aria-hidden="true" style={{
                display: "inline-block",
                width: 7,
                height: 7,
                borderRadius: 999,
                background: "#2dd4bf",
                boxShadow: "0 0 0 3px rgba(45,212,191,0.2)",
              }} />
              Urban Air Mobility · Heliports · Vertiports
            </span>
          </div>

          <h1
            style={{
              position: "relative",
              zIndex: 1,
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(34px, 5vw, 56px)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              margin: "0 auto 22px",
              maxWidth: 820,
              color: T.textPrimary,
            }}
          >
            Not every approved site is operationally viable.{" "}
            <span style={{ color: T.accent }}>AirIndex shows the difference.</span>
          </h1>
          <p
            style={{
              position: "relative",
              zIndex: 1,
              color: T.textSecondary,
              fontSize: "clamp(16px, 1.6vw, 19px)",
              lineHeight: 1.6,
              maxWidth: 660,
              margin: "0 auto 36px",
              fontWeight: 400,
            }}
          >
            AirIndex helps operators, insurers, and infrastructure teams determine
            where urban air mobility can actually work — before capital or engineering
            is committed.
          </p>
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <Link
              href="/contact"
              className="cta-primary"
              style={{
                display: "inline-block",
                padding: "16px 32px",
                background: T.textPrimary,
                color: "#ffffff",
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: "0.01em",
                textDecoration: "none",
                borderRadius: 8,
              }}
            >
              Send Us Your Sites <span className="arrow" aria-hidden="true">→</span>
            </Link>
            <p
              style={{
                color: T.textTertiary,
                fontSize: 13,
                margin: 0,
              }}
            >
              Have 2–3 sites you&apos;re evaluating? We&apos;ll run a structured assessment.
            </p>
            <Link
              href="/sample"
              className="cta-secondary"
              style={{
                display: "inline-block",
                padding: "12px 24px",
                border: `1px solid ${T.cardBorder}`,
                color: T.textPrimary,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                borderRadius: 8,
                background: "#ffffff",
              }}
            >
              View Sample Assessment <span className="arrow" aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </div>

      {/* ════════════════════════════════════════════════════ */}
      {/* Stats strip — proof in numbers                        */}
      {/* ════════════════════════════════════════════════════ */}
      <section
        style={{
          maxWidth: 1040,
          margin: "0 auto",
          padding: "clamp(24px, 4vw, 48px) 24px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 1,
            background: T.divider,
            border: `1px solid ${T.divider}`,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {[
            { value: MARKET_COUNT, suffix: "", display: undefined as string | undefined, label: "U.S. markets scored", accent: "#5B8DB8", delay: 0 },
            { value: 5647, suffix: "", display: "5,647" as string | undefined, label: "Heliports mapped", accent: "#2dd4bf", delay: 150 },
            { value: 7, suffix: "", display: undefined as string | undefined, label: "Scoring factors", accent: "#a78bfa", delay: 300 },
            { value: 496, suffix: "+", display: undefined as string | undefined, label: "Regulatory precedents", accent: "#f59e0b", delay: 450 },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "#ffffff",
                padding: "28px 20px",
                textAlign: "center",
                position: "relative",
              }}
            >
              <div
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: 32,
                  color: T.textPrimary,
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                }}
              >
                <StatNumber value={s.value} suffix={s.suffix} display={s.display} delay={s.delay} />
              </div>
              <div
                aria-hidden="true"
                style={{
                  width: 28,
                  height: 2,
                  background: s.accent,
                  borderRadius: 2,
                  margin: "10px auto 0",
                }}
              />
              <div
                style={{
                  fontSize: 12,
                  color: T.textTertiary,
                  marginTop: 10,
                  letterSpacing: "0.02em",
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════ */}
      {/* 2. THE CORE FRAMEWORK — three questions                */}
      {/* ════════════════════════════════════════════════════ */}
      <ScrollReveal>
        <section
          style={{
            maxWidth: 1040,
            margin: "0 auto",
            padding: "clamp(40px, 5vw, 64px) 24px",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                letterSpacing: "0.14em",
                color: T.accent,
                marginBottom: 12,
                textTransform: "uppercase",
              }}
            >
              The Framework
            </div>
            <h2
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(24px, 3vw, 34px)",
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                margin: "0 0 12px",
                color: T.textPrimary,
              }}
            >
              Every deployment decision comes down to three questions.
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))",
              gap: 18,
            }}
          >
            {[
              {
                q: "Is it allowed?",
                desc: "Regulatory status, legislation, and market readiness.",
                color: "#5B8DB8",
                num: "01",
              },
              {
                q: "Can it work?",
                desc: "Facility dimensions, obstruction environment, and physical feasibility.",
                color: "#2dd4bf",
                num: "02",
              },
              {
                q: "Will it behave?",
                desc: "Airflow exposure, rooftop risk, and operational conditions.",
                color: "#f59e0b",
                num: "03",
              },
            ].map((item) => (
              <div
                key={item.q}
                style={{
                  padding: "28px 26px",
                  borderRadius: 12,
                  border: `1px solid ${T.cardBorder}`,
                  borderTop: `3px solid ${item.color}`,
                  background: "#ffffff",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 11,
                    color: item.color,
                    letterSpacing: "0.1em",
                    marginBottom: 10,
                  }}
                >
                  {item.num}
                </div>
                <div
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700,
                    fontSize: 22,
                    color: T.textPrimary,
                    marginBottom: 8,
                  }}
                >
                  {item.q}
                </div>
                <div style={{ fontSize: 14, color: T.textSecondary, lineHeight: 1.6 }}>
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </section>
      </ScrollReveal>

      {/* ════════════════════════════════════════════════════ */}
      {/* Platform proof — framed dashboard preview              */}
      {/* ════════════════════════════════════════════════════ */}
      <ScrollReveal>
        <section
          style={{
            background: T.subtleBg,
            padding: "clamp(56px, 7vw, 96px) 24px",
            position: "relative",
          }}
        >
          <div style={{ maxWidth: 1040, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h2
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: "clamp(24px, 3vw, 34px)",
                  letterSpacing: "-0.02em",
                  margin: "0 0 12px",
                  color: T.textPrimary,
                  lineHeight: 1.2,
                }}
              >
                What we actually see when evaluating a market or facility.
              </h2>
              <p
                style={{
                  color: T.textSecondary,
                  fontSize: 16,
                  lineHeight: 1.6,
                  maxWidth: 620,
                  margin: "0 auto",
                }}
              >
                Market readiness, facility viability, and operational exposure — structured in one system.
              </p>
            </div>

            <div
              style={{
                position: "relative",
                borderRadius: 14,
                overflow: "hidden",
                border: `1px solid ${T.cardBorder}`,
                boxShadow: "0 30px 60px -20px rgba(10,37,64,0.15), 0 8px 24px -8px rgba(10,37,64,0.08)",
                background: "#050508",
              }}
            >
              {/* Callout annotations */}
              <div
                style={{
                  position: "absolute",
                  top: "12%",
                  left: 24,
                  zIndex: 2,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {[
                  { label: "Market Score (AIS)", color: "#5B8DB8" },
                  { label: "Facility Risk (RiskIndex)", color: "#2dd4bf" },
                  { label: "Obstruction Exposure (OES)", color: "#f59e0b" },
                ].map((callout) => (
                  <span
                    key={callout.label}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 12px",
                      borderRadius: 6,
                      background: "rgba(5,5,8,0.75)",
                      backdropFilter: "blur(8px)",
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 10,
                      letterSpacing: "0.06em",
                      color: "#ffffff",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        display: "inline-block",
                        width: 6,
                        height: 6,
                        borderRadius: 6,
                        background: callout.color,
                      }}
                    />
                    {callout.label}
                  </span>
                ))}
              </div>
              <Image
                src="/images/dashboard-preview.png"
                alt="AirIndex intelligence platform — market readiness scoring, facility risk, and obstruction exposure in one view"
                width={1920}
                height={1080}
                style={{ width: "100%", height: "auto", display: "block" }}
                priority
              />
            </div>

            <p
              style={{
                textAlign: "center",
                marginTop: 20,
                color: T.textSecondary,
                fontSize: 15,
                lineHeight: 1.6,
                maxWidth: 600,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              This is how we determine whether a site is actually operable — not just approved.
            </p>
          </div>
        </section>
      </ScrollReveal>

      {/* ════════════════════════════════════════════════════ */}
      {/* 3. PRODUCT SIMPLIFIED — three layers                   */}
      {/* ════════════════════════════════════════════════════ */}
      <ScrollReveal>
        <section
          style={{
            background: T.subtleBg,
            padding: "clamp(56px, 7vw, 96px) 24px",
          }}
        >
          <div style={{ maxWidth: 1040, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  color: T.accent,
                  marginBottom: 12,
                  textTransform: "uppercase",
                }}
              >
                The Platform
              </div>
              <h2
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: "clamp(26px, 3.2vw, 36px)",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.15,
                  margin: "0 0 14px",
                  color: T.textPrimary,
                }}
              >
                One platform. Three layers of intelligence.
              </h2>
              <p
                style={{
                  color: T.textSecondary,
                  fontSize: 16,
                  lineHeight: 1.6,
                  maxWidth: 600,
                  margin: "0 auto",
                }}
              >
                Built from primary government, regulatory, and market sources.
                Cross-referenced, classified, and delivered in the form your decision requires.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))",
                gap: 20,
              }}
            >
              {[
                {
                  name: "Market Readiness",
                  tag: "AIS",
                  desc: "Scores cities and states based on legislation, infrastructure, and operator activity.",
                  bullets: [
                    `${MARKET_COUNT} U.S. markets scored 0–100 on 7 factors`,
                    "Regulatory posture, operator presence, zoning, weather infrastructure",
                    "Score changes traced to specific actions — fully auditable",
                  ],
                  color: "#5B8DB8",
                  href: "/methodology",
                },
                {
                  name: "Facility Viability",
                  tag: "RiskIndex",
                  desc: "Evaluates individual heliports and vertiports for compliance, data quality, and operational feasibility.",
                  bullets: [
                    "5,647 FAA-registered heliports mapped and classified",
                    "Data quality scoring, dimensional analysis, AC era classification",
                    "Hospital misclassification detection, surface condition, staleness",
                  ],
                  color: "#2dd4bf",
                  href: "/sample",
                },
                {
                  name: "Operational Exposure",
                  tag: "OES + OEL",
                  desc: "Identifies obstruction risks, airflow issues, and conditions that impact real-world operations.",
                  bullets: [
                    "8:1 approach surface analysis, FATO zone intrusions",
                    "Wind path obstructions, rooftop thermal risk flagging",
                    "Environmental context layer with low-altitude weather data",
                  ],
                  color: "#f59e0b",
                  href: "/contact",
                },
              ].map((layer) => (
                <div
                  key={layer.name}
                  className="container-card"
                  style={{
                    background: "#ffffff",
                    border: `1px solid ${T.cardBorder}`,
                    borderTop: `4px solid ${layer.color}`,
                    borderRadius: 14,
                    padding: "28px 26px 24px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 10,
                      letterSpacing: "0.12em",
                      color: layer.color,
                      marginBottom: 10,
                      textTransform: "uppercase",
                    }}
                  >
                    {layer.tag}
                  </div>
                  <h3
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: 700,
                      fontSize: 22,
                      color: T.textPrimary,
                      margin: "0 0 10px",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {layer.name}
                  </h3>
                  <p
                    style={{
                      color: T.textSecondary,
                      fontSize: 14,
                      lineHeight: 1.6,
                      margin: "0 0 18px",
                    }}
                  >
                    {layer.desc}
                  </p>
                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: "0 0 20px",
                      flex: 1,
                    }}
                  >
                    {layer.bullets.map((b, i) => (
                      <li
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          color: T.textSecondary,
                          fontSize: 13,
                          lineHeight: 1.55,
                          padding: "7px 0",
                          borderBottom: `1px solid ${T.divider}`,
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            width: 4,
                            height: 4,
                            borderRadius: 4,
                            background: layer.color,
                            marginTop: 7,
                            flexShrink: 0,
                          }}
                        />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={layer.href}
                    className="link-arrow"
                    style={{
                      color: T.accentDeep,
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: "none",
                      marginTop: "auto",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    Learn more <span className="arrow" aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>→</span>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ════════════════════════════════════════════════════ */}
      {/* 4. URGENCY — the data problem                         */}
      {/* ════════════════════════════════════════════════════ */}
      <ScrollReveal>
        <section
          style={{
            maxWidth: 820,
            margin: "0 auto",
            padding: "clamp(56px, 7vw, 96px) 24px",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                letterSpacing: "0.14em",
                color: "#dc2626",
                marginBottom: 12,
                textTransform: "uppercase",
              }}
            >
              The Data Problem
            </div>
            <h2
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(24px, 3vw, 32px)",
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
                margin: "0 0 20px",
                color: T.textPrimary,
              }}
            >
              Most infrastructure decisions rely on incomplete or outdated facility data.
            </h2>
          </div>
          <div
            style={{
              color: T.textSecondary,
              fontSize: 16,
              lineHeight: 1.7,
              textAlign: "center",
            }}
          >
            <p style={{ margin: "0 0 16px" }}>
              Many heliports have not been updated in years.
              Dimensional standards have changed.
              Operational risks like airflow and obstruction exposure are
              rarely captured in structured datasets.
            </p>
            <p
              style={{
                margin: 0,
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: 20,
                color: T.textPrimary,
              }}
            >
              Approved does not mean operable.
            </p>
          </div>
        </section>
      </ScrollReveal>

      {/* ════════════════════════════════════════════════════ */}
      {/* 5. SAMPLE / PROOF — see what we find                   */}
      {/* ════════════════════════════════════════════════════ */}
      <ScrollReveal>
        <section
          style={{
            background: T.subtleBg,
            padding: "clamp(56px, 7vw, 96px) 24px",
          }}
        >
          <div
            style={{
              maxWidth: 880,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))",
              gap: 40,
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  color: T.accent,
                  marginBottom: 12,
                  textTransform: "uppercase",
                }}
              >
                See What We Find
              </div>
              <h2
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: "clamp(22px, 2.8vw, 30px)",
                  letterSpacing: "-0.01em",
                  margin: "0 0 14px",
                  color: T.textPrimary,
                  lineHeight: 1.2,
                }}
              >
                A single facility assessment shows what traditional data misses.
              </h2>
              <p
                style={{
                  color: T.textSecondary,
                  fontSize: 15,
                  lineHeight: 1.6,
                  margin: "0 0 24px",
                }}
              >
                Compliance gaps, dimensional constraints, data staleness,
                obstruction exposure — structured into a format underwriters
                and operators can act on immediately.
              </p>
              <Link
                href="/sample"
                className="cta-primary"
                style={{
                  display: "inline-block",
                  padding: "14px 28px",
                  background: T.textPrimary,
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                  borderRadius: 8,
                }}
              >
                View Sample Assessment <span className="arrow" aria-hidden="true">→</span>
              </Link>
            </div>

            {/* Preview card — mimics the assessment output */}
            <div
              style={{
                background: "#ffffff",
                border: `1px solid ${T.cardBorder}`,
                borderRadius: 12,
                padding: "24px",
                boxShadow: "0 8px 24px -8px rgba(10,37,64,0.1)",
              }}
            >
              {[
                { label: "Data Quality", value: "Low", color: "#dc2626" },
                { label: "Compliance", value: "Pass", color: "#16a34a" },
                { label: "Dimensional", value: "Constrained", color: "#f59e0b" },
                { label: "Obstruction Score", value: "Elevated", color: "#f59e0b" },
                { label: "Operational Exposure", value: "High", color: "#dc2626" },
              ].map((finding, i) => (
                <div
                  key={finding.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 0",
                    borderBottom: i < 4 ? `1px solid ${T.divider}` : "none",
                  }}
                >
                  <span style={{ fontSize: 14, color: T.textSecondary }}>{finding.label}</span>
                  <span
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 12,
                      fontWeight: 700,
                      color: finding.color,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {finding.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ════════════════════════════════════════════════════ */}
      {/* 6. WHO IT'S FOR — buyer self-identification            */}
      {/* ════════════════════════════════════════════════════ */}
      <ScrollReveal>
        <section
          style={{
            maxWidth: 1040,
            margin: "0 auto",
            padding: "clamp(56px, 7vw, 96px) 24px",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(26px, 3.2vw, 36px)",
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                margin: "0 0 12px",
                color: T.textPrimary,
              }}
            >
              Built for teams making real decisions.
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
              gap: 16,
            }}
          >
            {[
              { who: "Operators", decision: "Where to deploy", accent: "#2dd4bf" },
              { who: "Insurers", decision: "What risk actually exists", accent: "#f59e0b" },
              { who: "Infrastructure Teams", decision: "What needs to change", accent: "#5B8DB8" },
              { who: "Government / AHJ", decision: "What\u2019s coming and what\u2019s not ready", accent: "#a78bfa" },
            ].map((buyer) => (
              <div
                key={buyer.who}
                style={{
                  padding: "22px 24px",
                  background: "#ffffff",
                  border: `1px solid ${T.cardBorder}`,
                  borderLeft: `3px solid ${buyer.accent}`,
                  borderRadius: 10,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700,
                    fontSize: 16,
                    color: T.textPrimary,
                    marginBottom: 4,
                  }}
                >
                  {buyer.who}
                </div>
                <div style={{ fontSize: 14, color: T.textSecondary, lineHeight: 1.5 }}>
                  {buyer.decision}
                </div>
              </div>
            ))}
          </div>
        </section>
      </ScrollReveal>

      {/* ════════════════════════════════════════════════════ */}
      {/* 7. API / TECH — integration mention                    */}
      {/* ════════════════════════════════════════════════════ */}
      <section
        style={{
          maxWidth: 820,
          margin: "0 auto",
          padding: "clamp(48px, 6vw, 80px) 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            padding: "24px 32px",
            borderRadius: 12,
            background: T.subtleBg,
            border: `1px solid ${T.cardBorder}`,
          }}
        >
          <h3
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 20,
              color: T.textPrimary,
              margin: "0 0 8px",
            }}
          >
            Integrate directly into your workflow.
          </h3>
          <p
            style={{
              color: T.textSecondary,
              fontSize: 15,
              lineHeight: 1.6,
              margin: "0 0 16px",
            }}
          >
            AirIndex data is available via API for planning systems,
            analytics platforms, and internal tools.
          </p>
          <Link
            href="/api"
            className="link-arrow"
            style={{
              fontSize: 14,
              color: T.accentDeep,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            API Documentation <span className="arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════ */}
      {/* Pulse subscribe                                       */}
      {/* ════════════════════════════════════════════════════ */}
      <section
        style={{
          background:
            "linear-gradient(180deg, " + T.subtleBg + " 0%, rgba(245,158,11,0.06) 100%)",
          padding: "clamp(48px, 7vw, 96px) 24px",
          position: "relative",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background:
              "linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.4) 50%, transparent 100%)",
          }}
        />
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.14em",
              color: "#b45309",
              marginBottom: 14,
              textTransform: "uppercase",
            }}
          >
            UAM Market Pulse · Research
          </div>
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(22px, 2.8vw, 30px)",
              letterSpacing: "-0.01em",
              margin: "0 0 12px",
              color: T.textPrimary,
            }}
          >
            Weekly intelligence, no noise.
          </h2>
          <p
            style={{
              color: T.textSecondary,
              fontSize: 15,
              lineHeight: 1.6,
              margin: "0 0 24px",
            }}
          >
            Scoring changes, regulatory milestones, operator moves. Free and
            public — the credibility layer of the platform.
          </p>
          <PulseSubscribe source="homepage" theme="light" />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════ */}
      {/* 8. FINAL CTA — start with a real site                  */}
      {/* ════════════════════════════════════════════════════ */}
      <section
        style={{
          background:
            "linear-gradient(135deg, #0a2540 0%, #0d3a5e 50%, #0a2540 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -120,
            right: -120,
            width: 480,
            height: 480,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(91,141,184,0.35) 0%, rgba(91,141,184,0) 65%)",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: -140,
            left: -80,
            width: 420,
            height: 420,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(167,139,250,0.22) 0%, rgba(167,139,250,0) 65%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            padding: "clamp(64px, 8vw, 120px) 24px",
            textAlign: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.14em",
              color: "#7fb8e0",
              marginBottom: 18,
              textTransform: "uppercase",
            }}
          >
            Get Started
          </div>
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(26px, 3.4vw, 38px)",
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              margin: "0 0 18px",
              color: "#ffffff",
            }}
          >
            Start with a real site.
          </h2>
          <p
            style={{
              color: "#b8c5d6",
              fontSize: 16,
              lineHeight: 1.6,
              margin: "0 0 32px",
            }}
          >
            Send us 2–3 facilities you&apos;re evaluating and we&apos;ll run
            a structured assessment. No commitment, no sales pitch — just data.
          </p>
          <Link
            href="/contact"
            className="cta-primary"
            style={{
              display: "inline-block",
              padding: "16px 36px",
              background: "#ffffff",
              color: T.textPrimary,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              borderRadius: 8,
              boxShadow: "0 10px 30px rgba(91,141,184,0.3)",
            }}
          >
            Send Us Your Sites <span className="arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <SiteFooter theme="light" />
    </div>
  );
}
