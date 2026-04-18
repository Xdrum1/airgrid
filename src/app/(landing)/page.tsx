import Link from "next/link";
import Image from "next/image";
import { getCitiesWithOverrides, MARKET_COUNT } from "@/data/seed";
import { calculateReadinessScoreFromFkb } from "@/lib/scoring";
import { liveContainers } from "@/lib/containers";
import { getFactorMovements, type FactorMovement } from "@/lib/editorial/factor-movements";
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
    "Market-by-market readiness scoring to prioritize deployment sequencing",
    "Regulatory posture, vertiport pipeline, and operator-graph intelligence",
    "Forward signals identifying when infrastructure supports capital commitment",
  ],
  infrastructure: [
    "Gap-to-readiness analysis identifying the binding constraint on deployment",
    "Jurisdictional permitting landscape with cost and timeline to resolution",
    "Peer-market benchmarking showing why comparable markets advance faster",
  ],
  municipality: [
    "Peer-city benchmarking showing why comparable markets are advancing faster",
    "Federal program alignment and legislative-activity tracking",
    "Gap-to-readiness roadmap with specific actions that close each gap",
  ],
  insurance: [
    "City-level aviation liability exposure audit identifying undocumented compliance risk",
    "Heliport compliance framework + state regulatory burden layer",
    "Precedent-driven exposure framing tied to real underwriting outcomes",
  ],
  investor: [
    "Market and operator deployment intelligence identifying when readiness supports capital",
    "Forward signals across regulatory, operator, and federal channels",
    "Source-traced primary data — not analyst opinion, not press aggregation",
  ],
  "risk-site": [
    "Single-facility risk assessment with AIS-backed underwriting recommendation",
    "FAA registry + 5-question compliance + airspace determinations",
    "Delivered within 24 hours, formatted for direct inclusion in underwriting files",
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

  // Factor movements for "Biggest Movers This Week" — from tonight's ledger infra
  let movements: FactorMovement[] = [];
  try {
    movements = await getFactorMovements({ windowDays: 7 });
  } catch {
    // Non-blocking — page renders without movements on failure
  }

  // Punchline generator — computes one tension line per city from scoring breakdown
  function getPunchline(city: { id: string; city: string; state: string; score: number; weatherInfraLevel?: string; stateLegislationStatus?: string; hasActivePilotProgram?: boolean; activeOperators?: string[]; hasVertiportZoning?: boolean; regulatoryPosture?: string }): string {
    const s = city.score;
    // Check for recent movements first
    const m = movements.find((mv) => mv.cityId === city.id);
    if (m) {
      const dir = m.pointsDelta > 0 ? "↑" : "↓";
      return `${m.factorLabel} ${dir}${Math.abs(m.pointsDelta)} → ${m.reason.split("—")[0].trim().slice(0, 80)}`;
    }
    // Static punchlines from factor gaps
    if (s === 0) return `The regulatory capital of the U.S. has zero readiness signals.`;
    if (s >= 90 && city.weatherInfraLevel !== "full") return `Only weather infrastructure prevents a perfect score.`;
    if (!city.hasActivePilotProgram && s >= 50) return `No active pilot program despite strong fundamentals.`;
    if ((city.activeOperators?.length ?? 0) === 0 && s >= 30) return `Zero operator presence — capital hasn't committed yet.`;
    if (city.stateLegislationStatus === "none" && s >= 30) return `No enacted AAM legislation — the gating factor.`;
    if (!city.hasVertiportZoning && s >= 50) return `Vertiport zoning not adopted — next project is a variance fight.`;
    if (city.weatherInfraLevel === "none") return `No low-altitude weather infrastructure coverage.`;
    return `${s} AIS — ${city.state} market.`;
  }

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
          Which cities are ready for vertical flight — and what&apos;s holding them back.
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
          AirIndex scores 25 U.S. markets on eVTOL operational readiness —
          city level today, vertiport and corridor level on the grid.
        </p>
        <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <Link
            href="/contact"
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
            Talk to Us <span className="arrow" aria-hidden="true">→</span>
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
      {/* Top-market ticker — scoring made visible above the fold */}
      {/* ════════════════════════════════════════════════════ */}
      <ScrollReveal>
        <section
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "clamp(48px, 6vw, 72px) 24px clamp(16px, 2vw, 24px)",
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
                  margin: "0 0 6px",
                  letterSpacing: "-0.01em",
                }}
              >
                Top 6 U.S. markets by readiness
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: T.textSecondary,
                  lineHeight: 1.55,
                  maxWidth: 640,
                }}
              >
                Scores update continuously as AirIndex detects changes in
                regulatory, infrastructure, and operator signals. Full
                index of 25 markets available to licensed clients.
              </p>
            </div>
            <Link
              href="/contact"
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
                    {city.score} <span style={{ fontSize: 11, fontWeight: 500, color: T.textTertiary, letterSpacing: "0.06em" }}>AIS</span>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 10,
                    borderTop: `1px solid ${T.divider}`,
                    fontSize: 12,
                    color: T.textSecondary,
                    lineHeight: 1.5,
                  }}
                >
                  {getPunchline(city)}
                </div>
              </div>
            ))}
          </div>
        </section>
      </ScrollReveal>

      {/* ════════════════════════════════════════════════════ */}
      {/* Biggest Movers This Week — live competitive pressure */}
      {/* ════════════════════════════════════════════════════ */}
      {movements.length > 0 && (
        <ScrollReveal>
          <section
            style={{
              maxWidth: 1120,
              margin: "0 auto",
              padding: "clamp(24px, 3vw, 40px) 24px 0",
            }}
          >
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                letterSpacing: "0.14em",
                color: T.accent,
                marginBottom: 14,
                textTransform: "uppercase",
              }}
            >
              Biggest Movers This Week
            </div>
            <div style={{ fontSize: 12, color: T.textTertiary, marginBottom: 14 }}>
              AIS updates as signals change. Each movement is auto-detected and scored.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {movements.slice(0, 4).map((m) => {
                const up = m.pointsDelta > 0;
                const color = up ? "#16a34a" : "#dc2626";
                const arrow = up ? "↑" : "↓";
                const daysAgo = Math.floor((Date.now() - m.appliedAt.getTime()) / (24 * 60 * 60 * 1000));
                const timeLabel = daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo}d ago`;
                return (
                  <div
                    key={m.cityId + m.field}
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 12,
                      padding: "12px 16px",
                      background: T.bg,
                      border: `1px solid ${T.cardBorder}`,
                      borderLeft: `3px solid ${color}`,
                      borderRadius: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary }}>
                      {m.cityName}, {m.state}
                    </span>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 14, color }}>
                      {arrow}{Math.abs(m.pointsDelta)}
                    </span>
                    <span style={{ fontSize: 13, color: T.textSecondary }}>
                      — {m.reason.split("—")[0].trim().slice(0, 60)}
                    </span>
                    <span style={{ fontSize: 11, color: T.textTertiary, marginLeft: "auto" }}>
                      {timeLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </ScrollReveal>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* How to improve — the policy-pressure unlock          */}
      {/* ════════════════════════════════════════════════════ */}
      <ScrollReveal>
        <section
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "clamp(40px, 5vw, 64px) 24px clamp(24px, 3vw, 40px)",
          }}
        >
          <div
            style={{
              background: T.subtleBg,
              border: `1px solid ${T.cardBorder}`,
              borderRadius: 14,
              padding: "clamp(24px, 3vw, 36px)",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))",
              gap: 28,
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
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                How Markets Improve
              </div>
              <h2
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: "clamp(20px, 2.4vw, 26px)",
                  color: T.textPrimary,
                  margin: "0 0 12px",
                  letterSpacing: "-0.01em",
                }}
              >
                Markets improve their AirIndex score by unlocking three signals.
              </h2>
              <p style={{ color: T.textSecondary, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                Every score change is traceable to a specific action.
                Full gap analysis available to licensed clients.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { signal: "Vertiport zoning approval", detail: "Codified municipal pathway — not a one-off variance" },
                { signal: "Active pilot programs", detail: "FAA-recognized operational demonstration in the market" },
                { signal: "Federal regulatory alignment", detail: "State legislation enacted + proactive regulatory posture" },
              ].map((s) => (
                <div
                  key={s.signal}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "12px 16px",
                    background: T.bg,
                    border: `1px solid ${T.cardBorder}`,
                    borderRadius: 8,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: T.accent,
                      marginTop: 6,
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, color: T.textPrimary, fontSize: 14 }}>{s.signal}</div>
                    <div style={{ color: T.textTertiary, fontSize: 12, marginTop: 2 }}>{s.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

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
              One scoring system. Six decision outputs.
            </h2>
            <p
              style={{
                color: T.textSecondary,
                fontSize: 17,
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              All outputs derived from the AirIndex Score (AIS) — a real-time,
              auditable market-readiness rating. Each one shaped to a specific decision.
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
                  href={`/for/${c.id === "risk-site" ? "risk-assessment" : c.id}`}
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
                  See how it&apos;s used
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
            Talk to Us
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
