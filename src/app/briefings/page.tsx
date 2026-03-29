import type { Metadata } from "next";
import Link from "next/link";
import TrackPageView from "@/components/TrackPageView";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Market Intelligence Briefings — AirIndex",
  description:
    "Custom UAM market analysis — from single-city snapshots to multi-market strategic assessments. Purpose-built methodology for operators, infrastructure developers, and government agencies.",
};

const TIERS = [
  {
    name: "Market Snapshot",
    accent: "#00d4ff",
    badge: null,
    scope: "1 city, 5\u20137 pages",
    turnaround: "5 business days",
    access: "Includes platform access for 1 market",
    includes: [
      "Market overview",
      "Factor breakdown",
      "Score trajectory",
    ],
    cta: "Request a Snapshot",
    href: "/contact?tier=snapshot&ref=briefings",
  },
  {
    name: "Market Briefing",
    accent: "#00ff88",
    badge: "MOST POPULAR",
    scope: "2\u20133 cities, 12\u201318 pages",
    turnaround: "10 business days",
    access: "Includes platform access for all 21 markets",
    includes: [
      "Everything in Snapshot",
      "Operator & infra landscape",
      "Tailored recommendations",
    ],
    cta: "Book a Discovery Call",
    href: "/contact?tier=briefing&ref=briefings",
  },
  {
    name: "Strategic Assessment",
    accent: "#7c3aed",
    badge: null,
    scope: "4\u201321 cities, 25\u201335 pages",
    turnaround: "3\u20134 weeks",
    access: "12-month subscription + quarterly calls + slide deck",
    includes: [
      "Everything in Briefing",
      "Investment-grade summary",
      "Executive slide deck",
    ],
    cta: "Request a Scoping Call",
    href: "/contact?tier=strategic&ref=briefings",
  },
];

const SECTIONS = [
  {
    title: "Market Overview",
    description:
      "Current AirIndex score, tier placement, and a plain-language summary of where the market stands relative to commercial UAM readiness.",
  },
  {
    title: "Factor Breakdown",
    description:
      "Deep dive into all seven scoring factors — what is present, what is missing, and how each factor contributes to the overall score.",
  },
  {
    title: "Score Trajectory",
    description:
      "Historical score movement with key inflection points annotated. Shows momentum direction and the events driving change.",
  },
  {
    title: "Operator & Infra Landscape",
    description:
      "Which operators are active or engaged, existing heliport and vertiport infrastructure, and corridor development status.",
  },
  {
    title: "Recommendations",
    description:
      "Specific, actionable steps the market (or your organization) can take to improve readiness — prioritized by impact and feasibility.",
  },
  {
    title: "Investment-Grade Summary",
    description:
      "Executive-level synthesis designed for board decks, investment memos, and internal strategy documents. Includes risk factors and timeline estimates.",
  },
];

export default function BriefingsPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050508",
        color: "#e0e0e0",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <TrackPageView page="briefings" />
      <SiteNav />

      <main
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "48px 24px 80px",
        }}
      >
        {/* ── Header ─────────────────────────────────── */}
        <div style={{ marginBottom: 56 }}>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 9,
              letterSpacing: 2,
              color: "#00d4ff",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            MARKET INTELLIGENCE
          </div>
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(28px, 4vw, 36px)",
              color: "#fff",
              margin: "0 0 14px",
              lineHeight: 1.2,
            }}
          >
            Market Intelligence Briefings
          </h1>
          <p
            style={{
              color: "#777",
              fontSize: 15,
              margin: "0 0 16px",
              lineHeight: 1.6,
            }}
          >
            Custom analysis of the markets that matter to your decision.
          </p>
          <p
            style={{
              color: "#999",
              fontSize: 14,
              margin: 0,
              lineHeight: 1.7,
              maxWidth: 680,
            }}
          >
            AirIndex scores tell you where a market stands. A Market
            Intelligence Briefing tells you why — and what it would take to
            change it. Choose the scope that fits your decision.
          </p>
        </div>

        {/* ── Tier Cards ─────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
            gap: 20,
            marginBottom: 64,
          }}
        >
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderTop: `3px solid ${tier.accent}`,
                borderRadius: 8,
                padding: "28px 24px 24px",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {tier.badge && (
                <span
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 8,
                    letterSpacing: 1.5,
                    color: "#050508",
                    background: tier.accent,
                    padding: "3px 8px",
                    borderRadius: 3,
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  {tier.badge}
                </span>
              )}

              <h3
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: 18,
                  color: "#fff",
                  margin: "0 0 6px",
                }}
              >
                {tier.name}
              </h3>

              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  letterSpacing: 0.5,
                  color: "#888",
                  marginBottom: 16,
                }}
              >
                Contact for pricing
              </div>

              <div style={{ fontSize: 13, color: "#aaa", marginBottom: 4 }}>
                {tier.scope}
              </div>
              <div style={{ fontSize: 13, color: "#aaa", marginBottom: 4 }}>
                {tier.turnaround} turnaround
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#aaa",
                  marginBottom: 18,
                }}
              >
                {tier.access}
              </div>

              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 9,
                  letterSpacing: 1.5,
                  color: "#555",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                INCLUDES
              </div>
              <ul
                style={{
                  margin: "0 0 24px",
                  padding: "0 0 0 16px",
                  flex: 1,
                }}
              >
                {tier.includes.map((item) => (
                  <li
                    key={item}
                    style={{
                      fontSize: 13,
                      color: "#ccc",
                      marginBottom: 6,
                      lineHeight: 1.5,
                    }}
                  >
                    {item}
                  </li>
                ))}
              </ul>

              <Link
                href={tier.href}
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "10px 0",
                  background: tier.accent,
                  color: "#050508",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: 13,
                  borderRadius: 6,
                  textDecoration: "none",
                  letterSpacing: 0.3,
                }}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* ── What's Inside ──────────────────────────── */}
        <section style={{ marginBottom: 64 }}>
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 20,
              color: "#fff",
              marginBottom: 20,
              paddingBottom: 12,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            What&rsquo;s Inside
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
              gap: 16,
            }}
          >
            {SECTIONS.map((section) => (
              <div
                key={section.title}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8,
                  padding: "20px 20px 18px",
                }}
              >
                <h3
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700,
                    fontSize: 14,
                    color: "#fff",
                    margin: "0 0 8px",
                  }}
                >
                  {section.title}
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: "#999",
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  {section.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Bottom CTA ─────────────────────────────── */}
        <div
          style={{
            textAlign: "center",
            padding: "40px 0 0",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <p
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 18,
              color: "#fff",
              marginBottom: 16,
            }}
          >
            Not sure which tier fits? Talk to us.
          </p>
          <Link
            href="/contact?ref=briefings"
            style={{
              display: "inline-block",
              padding: "12px 32px",
              background: "#00d4ff",
              color: "#050508",
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              borderRadius: 6,
              textDecoration: "none",
              letterSpacing: 0.3,
            }}
          >
            Get in Touch
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
