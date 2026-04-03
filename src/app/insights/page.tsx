import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Insights — AirIndex",
  description:
    "Market commentary, methodology deep-dives, and industry analysis from the AirIndex research team.",
};

// -------------------------------------------------------
// Insight entries — newest first
// -------------------------------------------------------

interface Insight {
  date: string;
  category: "market" | "methodology" | "industry" | "signal" | "platform";
  title: string;
  summary: string;
  body: string[];
  link?: { label: string; href: string };
}

const CATEGORY_COLORS: Record<Insight["category"], string> = {
  market: "#00ff88",
  methodology: "#5B8DB8",
  industry: "#f59e0b",
  signal: "#7c3aed",
  platform: "#14b8a6",
};

const CATEGORY_LABELS: Record<Insight["category"], string> = {
  market: "MARKET COMMENTARY",
  methodology: "METHODOLOGY",
  industry: "INDUSTRY ANALYSIS",
  signal: "DATA SIGNAL",
  platform: "PLATFORM",
};

const INSIGHTS: Insight[] = [
  {
    date: "2026-03-25",
    category: "industry",
    title: "The Data Gap Holding Back Urban Air Mobility",
    summary:
      "The eVTOL aircraft are certified or nearly certified. The regulatory frameworks are forming. But the industry still lacks a single, systematic source of truth on which markets are actually ready. That's the gap AirIndex was built to close.",
    body: [
      "Urban air mobility is generating enormous quantities of fragmented public data — FAA filings, state legislation, city planning documents, operator disclosures, SEC filings. No single entity was aggregating it into organized, auditable intelligence. City planners were making infrastructure decisions without knowing what peer markets had already done. Operators were evaluating market entry without systematic readiness data. Investors were conducting due diligence on UAM companies without understanding the regulatory landscape those companies would operate in.",
      "AirIndex approaches this the way a ratings agency approaches credit markets. We score every major US UAM market across seven standardized, weighted factors — state legislation, pilot programs, vertiport infrastructure, operator presence, zoning frameworks, regulatory posture, and weather infrastructure. Every score is traceable to primary source evidence. Every change is timestamped and auditable.",
      "The result is a platform that city planners use to benchmark against peers, operators use to prioritize market entry, and investors use for due diligence. The score is free. The intelligence behind the score — factor breakdowns, trend analysis, corridor tracking, regulatory monitoring — is what professionals pay for.",
    ],
    link: { label: "Explore the methodology", href: "/methodology" },
  },
  {
    date: "2026-03-24",
    category: "methodology",
    title: "Why We Weight Legislation at 20%",
    summary:
      "State-level legislation is the single highest-weighted factor in the AirIndex scoring model. Here's the reasoning — and what Rex, our design partner in vertiport development, taught us about why it matters.",
    body: [
      "In version 1.3 of our scoring methodology, state legislation carries a 20% weight — the highest of any single factor. This isn't arbitrary. It reflects a structural reality: without enabling state legislation, no amount of operator interest or vertiport construction can create a commercially viable UAM market.",
      "We learned this directly from Rex, a vertiport developer who stress-tests our 7-factor model against real capital allocation decisions. His feedback was clear: when he evaluates a market for vertiport investment, the first question isn't 'are there operators here?' It's 'does the state legal framework allow what we need to build?' Legislation creates the floor that everything else stands on.",
      "The graduated scoring (enacted legislation = full points, actively moving = partial, nothing = zero) captures the reality that legislative progress is a spectrum, not a binary. A state with a UAM bill in committee is meaningfully different from one with no activity at all — and both are different from one where comprehensive frameworks are already signed into law.",
      "This weighting has proven predictive. Markets with enacted legislation (Texas, Florida, Nevada) consistently cluster at the top of our index, while markets with strong operator interest but no legislative framework (several Northeast cities) score lower than their press coverage would suggest.",
    ],
    link: { label: "Read the full methodology", href: "/methodology" },
  },
  {
    date: "2026-03-13",
    category: "signal",
    title: "Federal Register Activity Up 1,580% After Backfill — What It Means",
    summary:
      "Our Federal Register pipeline expansion from 90 to 730 days surfaced 84 filings (up from 5). The data tells a clear story: federal regulatory attention to powered lift and UAM has been accelerating since mid-2024.",
    body: [
      "When we expanded our Federal Register ingestion window from 90 days to 730 days and added new search terms ('powered lift', SFAR), the results were striking. We went from 5 tracked federal filings to 84 — a 1,580% increase in our regulatory signal coverage.",
      "More important than the raw number is the distribution. Filing activity has clearly accelerated over the past 18 months. The FAA's powered lift rulemaking, Part 135 certificate applications from operators like Joby, and city-level UAM integration plans appearing in the Federal Register all point to a regulatory environment that is moving faster than most market participants realize.",
      "One filing in particular triggered a score change: Archer Aviation's White House Urban Air Mobility Pilot Program, which we had missed in our 90-day window. That single filing validated Miami's active pilot program status and moved the city's score from 80 to 100. This is exactly why comprehensive historical coverage matters — a single missed filing can mean a 20-point scoring error.",
      "Our classification pipeline now runs across four primary sources — Federal Register, LegiScan, SEC EDGAR, and operator news — with 1,340 total records and an ~80% accuracy rate on our AI-assisted classification layer.",
    ],
  },
  {
    date: "2026-03-03",
    category: "market",
    title: "5,647 Heliports: The Hidden Infrastructure Advantage",
    summary:
      "We integrated the FAA's NASR 5010 heliport database into AirIndex. The data reveals a significant and underappreciated infrastructure advantage that varies dramatically by market.",
    body: [
      "The conventional narrative around UAM infrastructure focuses on purpose-built vertiports — new facilities designed from the ground up for eVTOL operations. But there's an existing infrastructure layer that most analyses overlook: the 5,647 FAA-registered heliports already operating across the United States.",
      "Los Angeles leads with 146 heliports. Houston has 137. New York metro area, despite its regulatory complexity, has over 100. These aren't all convertible to eVTOL operations, but they represent permitted aviation sites with existing community acceptance, airspace integration, and in many cases the physical footprint needed for vertiport conversion.",
      "For infrastructure developers evaluating market entry, this data reframes the question from 'where do we build from scratch?' to 'where can we convert existing infrastructure?' Markets with dense heliport networks may have a 12-18 month head start on those requiring greenfield development. We've added heliport counts to every market profile and will be publishing a deeper analysis of conversion potential in the coming weeks.",
    ],
    link: { label: "View market data", href: "/dashboard" },
  },
  {
    date: "2026-02-28",
    category: "industry",
    title: "Weather Intelligence Is the Missing Layer in AAM",
    summary:
      "No market in our index scores 100 on weather readiness. That's not a bug — it reflects a genuine infrastructure gap that companies like TruWeather Solutions are working to close.",
    body: [
      "When we introduced graduated weather scoring in methodology v1.3, no US market achieved full marks. Even Los Angeles and Dallas — our highest-scoring markets at 95 — carry a weather infrastructure gap. The reason: comprehensive, low-altitude weather sensing networks designed for AAM operations don't exist yet at scale in any US market.",
      "This matters because weather conditions at 500-2,000 feet AGL (the altitude band where most eVTOL operations will occur) are fundamentally different from what conventional aviation weather systems measure. Microbursts, wind shear at rooftop level, turbulence from urban heat islands — these are phenomena that existing METAR stations and NWS forecasts don't adequately capture for the precision that autonomous or semi-autonomous flight requires.",
      "The companies building this infrastructure layer — hyperlocal weather sensing, low-altitude turbulence modeling, real-time wind data for vertiport operations — will be as foundational to AAM as ADS-B was to conventional aviation. Our scoring will evolve as this infrastructure deploys, and markets that invest early in weather sensing networks will see their scores reflect that advantage.",
    ],
  },
];

// -------------------------------------------------------
// Page
// -------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function InsightsPage() {
  return (
    <div
      style={{
        background: "#050508",
        color: "#e0e0e0",
        minHeight: "100vh",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <SiteNav />

      <main
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "120px 24px 80px",
        }}
      >
        {/* Page header */}
        <div style={{ marginBottom: 56 }}>
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 700,
              color: "#ffffff",
              margin: "0 0 12px",
              letterSpacing: "-0.02em",
            }}
          >
            Insights
          </h1>
          <p
            style={{
              color: "#888",
              fontSize: 15,
              lineHeight: 1.7,
              margin: 0,
              maxWidth: 560,
            }}
          >
            Market commentary, methodology deep-dives, and data signals from
            the AirIndex research team.
          </p>
        </div>

        {/* Featured report */}
        <div style={{
          marginBottom: 40,
          padding: "24px 28px",
          background: "rgba(91,141,184,0.04)",
          border: "1px solid rgba(91,141,184,0.15)",
          borderRadius: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "#5B8DB8",
              background: "rgba(91,141,184,0.1)",
              border: "1px solid rgba(91,141,184,0.25)",
              borderRadius: 3,
              padding: "3px 10px",
            }}>
              MONTHLY REPORT
            </span>
            <span style={{
              color: "#555",
              fontSize: 12,
              fontFamily: "'Space Mono', monospace",
            }}>
              March 2026
            </span>
          </div>
          <Link
            href="/reports/march-2026"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "clamp(18px, 2vw, 22px)",
              fontWeight: 700,
              color: "#fff",
              textDecoration: "none",
              display: "block",
              marginBottom: 8,
            }}
          >
            UAM Market Readiness Report — March 2026
          </Link>
          <p style={{ color: "#888", fontSize: 13, lineHeight: 1.7, marginBottom: 12 }}>
            Score movements, methodology v1.3, corridor intelligence, and operator analysis across US metro markets.
          </p>
          <Link
            href="/reports/march-2026"
            style={{
              color: "#5B8DB8",
              fontSize: 12,
              fontWeight: 600,
              textDecoration: "none",
              letterSpacing: "0.04em",
            }}
          >
            Read the report &rarr;
          </Link>
        </div>

        {/* Articles */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {INSIGHTS.map((insight, i) => (
            <article
              key={i}
              style={{
                padding: "40px 0",
                borderBottom:
                  i < INSIGHTS.length - 1
                    ? "1px solid rgba(255,255,255,0.06)"
                    : "none",
              }}
            >
              {/* Meta */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <span
                  style={{
                    color: CATEGORY_COLORS[insight.category],
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    background: `${CATEGORY_COLORS[insight.category]}12`,
                    border: `1px solid ${CATEGORY_COLORS[insight.category]}30`,
                    borderRadius: 3,
                    padding: "3px 10px",
                  }}
                >
                  {CATEGORY_LABELS[insight.category]}
                </span>
                <span
                  style={{
                    color: "#555",
                    fontSize: 12,
                    fontFamily: "'Space Mono', monospace",
                  }}
                >
                  {formatDate(insight.date)}
                </span>
              </div>

              {/* Title */}
              <h2
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "clamp(20px, 2.5vw, 26px)",
                  fontWeight: 700,
                  color: "#ffffff",
                  margin: "0 0 12px",
                  lineHeight: 1.3,
                }}
              >
                {insight.title}
              </h2>

              {/* Summary */}
              <p
                style={{
                  color: "#aaa",
                  fontSize: 15,
                  lineHeight: 1.8,
                  margin: "0 0 20px",
                  fontStyle: "italic",
                }}
              >
                {insight.summary}
              </p>

              {/* Body paragraphs */}
              {insight.body.map((paragraph, j) => (
                <p
                  key={j}
                  style={{
                    color: "#999",
                    fontSize: 14,
                    lineHeight: 1.85,
                    margin: "0 0 16px",
                  }}
                >
                  {paragraph}
                </p>
              ))}

              {/* Optional link */}
              {insight.link && (
                <Link
                  href={insight.link.href}
                  style={{
                    display: "inline-block",
                    marginTop: 4,
                    color: "#5B8DB8",
                    fontSize: 12,
                    textDecoration: "none",
                    letterSpacing: "0.04em",
                    fontWeight: 600,
                    transition: "opacity 0.15s",
                  }}
                >
                  {insight.link.label} &rarr;
                </Link>
              )}
            </article>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
