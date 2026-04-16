import Link from "next/link";
import Image from "next/image";
import { getCitiesWithOverrides, MARKET_COUNT } from "@/data/seed";
import { calculateReadinessScoreFromFkb } from "@/lib/scoring";
import { liveContainers } from "@/lib/containers";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import ScrollReveal from "@/components/landing/ScrollReveal";
import StatNumber from "@/components/landing/StatNumber";
import PulseSubscribe from "@/components/PulseSubscribe";

// ─────────────────────────────────────────────────────────
// Stripe-direction light homepage.
//
// Centerpiece: container cards. Each card names the audience, lists
// the data delivered, and offers a single CTA. No pricing on the
// marketing site — institutional access is negotiated.
//
// Split intentionally preserved: dashboard is dark, marketing is light.
// ─────────────────────────────────────────────────────────

// Short "what you get" bullets per container — 3 lines each.
const CONTAINER_DATA_LINES: Record<string, string[]> = {
  operator: [
    "Market-by-market readiness scoring across 25 U.S. metros",
    "Regulatory posture, vertiport pipeline, operator-graph intelligence",
    "Forward signals for route planning and deployment sequencing",
  ],
  infrastructure: [
    "Gap-to-readiness analysis per market with cost + timeline framing",
    "Jurisdictional permitting landscape and regulatory precedents",
    "Peer-market benchmarking on zoning, legislation, and enforcement",
  ],
  municipality: [
    "Peer-city benchmarking against same-tier and same-state markets",
    "Federal program alignment and legislative-activity tracking",
    "Economic-development positioning and infrastructure readiness",
  ],
  insurance: [
    "City-level aviation liability exposure audit",
    "Heliport compliance framework + state regulatory burden layer",
    "Precedent-driven exposure framing and peer-market comparisons",
  ],
  investor: [
    "Market and operator deployment intelligence for thesis timing",
    "Forward signals across regulatory, operator, and federal channels",
    "Pulse-quality synthesis with source-traced primary data",
  ],
  "risk-site": [
    "Single-facility risk assessment with 4-tier classification",
    "FAA registry + 5-question compliance + airspace determinations",
    "Underwriting recommendation, peer benchmark, satellite visualization",
  ],
};

const CONTAINER_AUDIENCE_LABEL: Record<string, string> = {
  operator: "For eVTOL Operators",
  infrastructure: "For Infrastructure Developers",
  municipality: "For Cities & State Agencies",
  insurance: "For Aviation Insurance",
  investor: "For Institutional Investors",
  "risk-site": "For Underwriters & Facility Owners",
};

// Order containers to put the warmest / most-relevant first
const CONTAINER_ORDER: Record<string, number> = {
  insurance: 1,
  "risk-site": 2,
  infrastructure: 3,
  operator: 4,
  municipality: 5,
  investor: 6,
};

// Per-persona accent color (card top-border stripe)
const CONTAINER_ACCENT: Record<string, string> = {
  insurance: "#f59e0b",       // warm amber — compliance / risk
  "risk-site": "#f97316",     // coral — facility-level risk
  infrastructure: "#5B8DB8",  // brand blue — building / planning
  operator: "#2dd4bf",        // mint — motion / deployment
  municipality: "#0a2540",    // deep navy — civic authority
  investor: "#a78bfa",        // soft lavender — capital markets
};

export default async function LandingPage() {
  const cities = await getCitiesWithOverrides();
  const scoredUnsorted = await Promise.all(
    cities.map(async (city) => {
      const { score } = await calculateReadinessScoreFromFkb(city);
      return { ...city, score };
    })
  );
  const scored = scoredUnsorted.sort((a, b) => b.score - a.score);

  const containers = liveContainers().sort(
    (a, b) => (CONTAINER_ORDER[a.id] ?? 99) - (CONTAINER_ORDER[b.id] ?? 99),
  );

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
      {/* Hero — with diagonal gradient wash                    */}
      {/* ════════════════════════════════════════════════════ */}
      <div
        style={{
          position: "relative",
          background:
            "linear-gradient(150deg, rgba(91,141,184,0.14) 0%, rgba(167,139,250,0.08) 28%, rgba(45,212,191,0.06) 54%, rgba(255,255,255,0) 82%)",
          overflow: "hidden",
        }}
      >
        {/* Decorative glow — slow drift for subtle life */}
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
      <section
        style={{
          position: "relative",
          maxWidth: 980,
          margin: "0 auto",
          padding: "clamp(64px, 9vw, 120px) 24px clamp(40px, 6vw, 72px)",
          textAlign: "center",
        }}
      >
        {/* Concentric airspace circles — radar-like cue behind the hero */}
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
          {/* Cardinal sweep lines */}
          <line x1="300" y1="20" x2="300" y2="100" stroke="#5B8DB8" strokeWidth="0.8" opacity="0.25" strokeLinecap="round" />
          <line x1="300" y1="500" x2="300" y2="580" stroke="#5B8DB8" strokeWidth="0.8" opacity="0.25" strokeLinecap="round" />
          <line x1="20" y1="300" x2="100" y2="300" stroke="#5B8DB8" strokeWidth="0.8" opacity="0.25" strokeLinecap="round" />
          <line x1="500" y1="300" x2="580" y2="300" stroke="#5B8DB8" strokeWidth="0.8" opacity="0.25" strokeLinecap="round" />

          {/* Radar sweep — rotating beam */}
          <g className="hero-radar-sweep">
            <defs>
              <linearGradient id="radarBeam" x1="50%" y1="50%" x2="50%" y2="0%">
                <stop offset="0%" stopColor="#5B8DB8" stopOpacity="0" />
                <stop offset="85%" stopColor="#5B8DB8" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#5B8DB8" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line
              x1="300"
              y1="300"
              x2="300"
              y2="20"
              stroke="url(#radarBeam)"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </g>

          {/* Expanding ping — two, staggered */}
          <circle
            className="hero-radar-ping"
            cx="300" cy="300" r="280"
            fill="none"
            stroke="#5B8DB8"
            strokeWidth="1"
          />
          <circle
            className="hero-radar-ping hero-radar-ping--delay"
            cx="300" cy="300" r="280"
            fill="none"
            stroke="#2dd4bf"
            strokeWidth="0.8"
          />
        </svg>

        {/* Domain chip — explicit aviation signal */}
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
          The market-readiness rating for vertical flight.
        </h1>
        <p
          style={{
            position: "relative",
            zIndex: 1,
            color: T.textSecondary,
            fontSize: "clamp(16px, 1.6vw, 19px)",
            lineHeight: 1.6,
            maxWidth: 620,
            margin: "0 auto 40px",
            fontWeight: 400,
          }}
        >
          Market intelligence for the operators, insurers, developers, cities,
          and investors shaping where eVTOL launches.
        </p>
        <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <Link
            href="/request-access"
            className="cta-primary"
            style={{
              display: "inline-block",
              padding: "14px 28px",
              background: T.textPrimary,
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "0.01em",
              textDecoration: "none",
              borderRadius: 8,
            }}
          >
            Request Access <span className="arrow" aria-hidden="true">→</span>
          </Link>
          <Link
            href="/methodology"
            className="cta-secondary"
            style={{
              display: "inline-block",
              padding: "14px 28px",
              border: `1px solid ${T.cardBorder}`,
              color: T.textPrimary,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              borderRadius: 8,
              background: "#ffffff",
            }}
          >
            Methodology <span className="arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
      </div>

      {/* ════════════════════════════════════════════════════ */}
      {/* Stats strip                                           */}
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
            { value: MARKET_COUNT, suffix: "", display: undefined as string | undefined, label: "U.S. markets tracked", accent: "#5B8DB8", delay: 0 },
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
      {/* Container cards — the centerpiece                    */}
      {/* ════════════════════════════════════════════════════ */}
      <ScrollReveal>
        <section
          id="products"
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "clamp(64px, 8vw, 120px) 24px clamp(32px, 5vw, 56px)",
            scrollMarginTop: 80,
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 56, maxWidth: 720, marginLeft: "auto", marginRight: "auto" }}>
            <h2
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(28px, 3.6vw, 40px)",
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                margin: "0 0 16px",
                color: T.textPrimary,
              }}
            >
              Six products. One data platform.
            </h2>
            <p
              style={{
                color: T.textSecondary,
                fontSize: 17,
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Each container is shaped to a specific decision. Pick yours.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))",
              gap: 20,
            }}
          >
            {containers.map((c) => {
              const accent = CONTAINER_ACCENT[c.id] ?? T.accent;
              return (
              <div
                key={c.id}
                className="container-card"
                style={{
                  background: "#ffffff",
                  border: `1px solid ${T.cardBorder}`,
                  borderTop: `4px solid ${accent}`,
                  borderRadius: 14,
                  padding: "24px 26px 28px",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 320,
                  boxShadow: `0 1px 2px rgba(10,37,64,0.04)`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    color: accent,
                    marginBottom: 12,
                    textTransform: "uppercase",
                  }}
                >
                  {CONTAINER_AUDIENCE_LABEL[c.id] ?? c.audience}
                </div>
                <h3
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700,
                    fontSize: 22,
                    color: T.textPrimary,
                    margin: "0 0 12px",
                    letterSpacing: "-0.01em",
                    lineHeight: 1.2,
                  }}
                >
                  {c.name}
                </h3>
                <p
                  style={{
                    color: T.textSecondary,
                    fontSize: 14,
                    lineHeight: 1.6,
                    margin: "0 0 18px",
                  }}
                >
                  {c.audience}
                </p>

                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: "0 0 28px",
                    flex: 1,
                  }}
                >
                  {(CONTAINER_DATA_LINES[c.id] ?? []).map((line, i) => (
                    <li
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        color: T.textSecondary,
                        fontSize: 13.5,
                        lineHeight: 1.55,
                        padding: "8px 0",
                        borderTop: i === 0 ? `1px solid ${T.divider}` : "none",
                        borderBottom: `1px solid ${T.divider}`,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          width: 4,
                          height: 4,
                          borderRadius: 4,
                          background: T.accent,
                          marginTop: 8,
                          flexShrink: 0,
                        }}
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/request-access"
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
                  Request access
                  <span className="arrow" aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>→</span>
                </Link>
              </div>
              );
            })}
          </div>
        </section>
      </ScrollReveal>

      {/* ════════════════════════════════════════════════════ */}
      {/* Platform proof — dashboard preview                    */}
      {/* ════════════════════════════════════════════════════ */}
      <ScrollReveal>
        <section
          style={{
            background:
              "linear-gradient(180deg, rgba(45,212,191,0.08) 0%, rgba(91,141,184,0.04) 30%, " + T.subtleBg + " 60%)",
            padding: "clamp(64px, 9vw, 120px) 24px",
            marginTop: 40,
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
              height: 3,
              background:
                "linear-gradient(90deg, transparent 0%, #2dd4bf 20%, #5B8DB8 50%, #a78bfa 80%, transparent 100%)",
              opacity: 0.6,
            }}
          />
          <div style={{ maxWidth: 1040, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  color: "#0d9488",
                  marginBottom: 16,
                  textTransform: "uppercase",
                }}
              >
                The Platform · Live
              </div>
              <h2
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: "clamp(26px, 3.4vw, 36px)",
                  letterSpacing: "-0.02em",
                  margin: "0 0 14px",
                  color: T.textPrimary,
                }}
              >
                One source of truth underneath every container.
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
                Continuously ingested from primary government, regulatory,
                and market sources. Cross-referenced, classified, and delivered
                in the form each container is built for.
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
              <Image
                src="/images/dashboard-preview.png"
                alt="AirIndex intelligence platform — market readiness scoring across U.S. markets"
                width={1920}
                height={1080}
                style={{ width: "100%", height: "auto", display: "block" }}
                priority
              />
            </div>
            <div
              style={{
                fontSize: 12,
                color: T.textTertiary,
                textAlign: "center",
                marginTop: 14,
                fontStyle: "italic",
              }}
            >
              Live terminal view — accessible to licensed clients and design partners.
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ════════════════════════════════════════════════════ */}
      {/* Top-market ticker                                     */}
      {/* ════════════════════════════════════════════════════ */}
      <ScrollReveal>
        <section
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "clamp(64px, 8vw, 96px) 24px clamp(32px, 4vw, 56px)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 32,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  color: T.accent,
                  marginBottom: 10,
                  textTransform: "uppercase",
                }}
              >
                Market Snapshot · Public
              </div>
              <h2
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: "clamp(22px, 2.6vw, 28px)",
                  color: T.textPrimary,
                  margin: 0,
                  letterSpacing: "-0.01em",
                }}
              >
                Top 6 U.S. markets by readiness
              </h2>
            </div>
            <Link
              href="/request-access"
              className="link-arrow"
              style={{
                fontSize: 13,
                color: T.accentDeep,
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Full index (licensed) <span className="arrow" aria-hidden="true">→</span>
            </Link>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(240px, 100%), 1fr))",
              gap: 12,
            }}
          >
            {scored.slice(0, 6).map((city) => (
              <div
                key={city.id}
                style={{
                  background: "#ffffff",
                  border: `1px solid ${T.cardBorder}`,
                  borderRadius: 10,
                  padding: "18px 20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    gap: 10,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontWeight: 700,
                        fontSize: 17,
                        color: T.textPrimary,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {city.city}
                    </div>
                    <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 2 }}>{city.state}</div>
                  </div>
                  <div
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: 700,
                      fontSize: 28,
                      color: T.textPrimary,
                      lineHeight: 1,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {city.score}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </ScrollReveal>

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
      {/* Closing CTA — deep navy panel to break the white     */}
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
            Request Access
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
            The intelligence layer for the decisions that shape the sky.
          </h2>
          <p
            style={{
              color: "#b8c5d6",
              fontSize: 16,
              lineHeight: 1.6,
              margin: "0 0 32px",
            }}
          >
            Licensed access begins with a conversation about your specific
            decision and the data gap you need closed.
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
            Talk to Us <span className="arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <SiteFooter theme="light" />
    </div>
  );
}
