import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import PulseSubscribe from "@/components/PulseSubscribe";
import {
  ONE_MARKET_MONDAY_ISSUES,
  getIssueBySlug,
} from "@/data/one-market-monday";
import { CITIES } from "@/data/seed";
import {
  calculateReadinessScore,
  getScoreColor,
  getScoreTier,
  SCORE_WEIGHTS,
} from "@/lib/scoring";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return ONE_MARKET_MONDAY_ISSUES.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const issue = getIssueBySlug(slug);
  if (!issue) return { title: "One Market Monday — AirIndex" };
  return {
    title: `${issue.headline} — AirIndex`,
    description: issue.subhead,
    openGraph: {
      title: issue.headline,
      description: issue.subhead,
      type: "article",
      publishedTime: issue.publishDate,
    },
  };
}

const FACTOR_LABELS: Record<keyof typeof SCORE_WEIGHTS, string> = {
  stateLegislation: "State Legislation",
  activePilotProgram: "Active Pilot Program",
  approvedVertiport: "Approved Vertiport",
  activeOperatorPresence: "Active Operators",
  vertiportZoning: "Vertiport Zoning",
  regulatoryPosture: "Regulatory Posture",
  weatherInfrastructure: "Weather Infrastructure",
};

const FACTOR_ORDER: (keyof typeof SCORE_WEIGHTS)[] = [
  "stateLegislation",
  "activePilotProgram",
  "activeOperatorPresence",
  "approvedVertiport",
  "vertiportZoning",
  "regulatoryPosture",
  "weatherInfrastructure",
];

function formatDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function OneMarketMondayIssuePage({ params }: PageProps) {
  const { slug } = await params;
  const issue = getIssueBySlug(slug);
  if (!issue) notFound();

  const city = CITIES.find((c) => c.id === issue.cityId);
  if (!city) notFound();

  const { score, breakdown } = calculateReadinessScore(city);
  const tier = getScoreTier(score);
  const scoreColor = getScoreColor(score);

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
        {/* Series meta */}
        <div style={{ marginBottom: 24 }}>
          <Link
            href="/insights"
            style={{
              color: "#666",
              fontSize: 12,
              textDecoration: "none",
              letterSpacing: "0.04em",
            }}
          >
            ← Insights
          </Link>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "#5B8DB8",
              background: "rgba(91,141,184,0.1)",
              border: "1px solid rgba(91,141,184,0.25)",
              borderRadius: 3,
              padding: "4px 10px",
            }}
          >
            ONE MARKET MONDAY · ISSUE {String(issue.issueNumber).padStart(2, "0")}
          </span>
          <span
            style={{
              color: "#555",
              fontSize: 12,
              fontFamily: "'Space Mono', monospace",
            }}
          >
            {formatDate(issue.publishDate)}
          </span>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "clamp(28px, 4.5vw, 40px)",
            fontWeight: 700,
            color: "#ffffff",
            margin: "0 0 20px",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}
        >
          {issue.headline}
        </h1>

        {/* Subhead / lede */}
        <p
          style={{
            color: "#bbb",
            fontSize: 17,
            lineHeight: 1.75,
            margin: "0 0 48px",
            fontStyle: "italic",
            borderLeft: "3px solid #5B8DB8",
            paddingLeft: 20,
          }}
        >
          {issue.subhead}
        </p>

        {/* Score card */}
        <div
          style={{
            padding: "28px 32px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 24,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#ffffff",
                  margin: 0,
                }}
              >
                {city.city}, {city.state}
              </div>
              <div
                style={{
                  color: "#777",
                  fontSize: 12,
                  marginTop: 4,
                  fontFamily: "'Space Mono', monospace",
                }}
              >
                AirIndex Readiness Score · v1.3 methodology
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 48,
                  fontWeight: 700,
                  color: scoreColor,
                  lineHeight: 1,
                }}
              >
                {score}
              </div>
              <div
                style={{
                  color: scoreColor,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  marginTop: 6,
                }}
              >
                {tier}
              </div>
            </div>
          </div>

          {/* Factor breakdown chart */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {FACTOR_ORDER.map((key) => {
              const value = breakdown[key];
              const max = SCORE_WEIGHTS[key];
              const pct = (value / max) * 100;
              return (
                <div key={key}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 4,
                      fontSize: 11,
                      fontFamily: "'Space Mono', monospace",
                    }}
                  >
                    <span style={{ color: "#aaa" }}>{FACTOR_LABELS[key]}</span>
                    <span style={{ color: "#666" }}>
                      {value} / {max}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      background: "rgba(255,255,255,0.05)",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: pct >= 100 ? "#5B8DB8" : pct > 0 ? "#5B8DB8" : "transparent",
                        opacity: pct >= 100 ? 1 : pct > 0 ? 0.55 : 0,
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: "1px solid rgba(255,255,255,0.06)",
              fontSize: 11,
              color: "#666",
              fontFamily: "'Space Mono', monospace",
            }}
          >
            Last updated {city.lastUpdated} ·{" "}
            <Link
              href={`/city/${city.id}`}
              style={{ color: "#5B8DB8", textDecoration: "none" }}
            >
              view full market profile →
            </Link>
          </div>
        </div>

        {/* Sections */}
        {issue.sections.map((section, i) => (
          <section key={i} style={{ marginBottom: 40 }}>
            <h2
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 22,
                fontWeight: 700,
                color: "#ffffff",
                margin: "0 0 20px",
                letterSpacing: "-0.01em",
              }}
            >
              {section.heading}
            </h2>
            {section.paragraphs.map((p, j) => (
              <p
                key={j}
                style={{
                  color: "#bbb",
                  fontSize: 15,
                  lineHeight: 1.85,
                  margin: "0 0 18px",
                }}
              >
                {p}
              </p>
            ))}
          </section>
        ))}

        {/* Footer note */}
        <div
          style={{
            marginTop: 56,
            paddingTop: 28,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            fontSize: 13,
            color: "#888",
            lineHeight: 1.75,
          }}
        >
          {issue.footerNote}
        </div>

        {/* Subscribe CTA */}
        <div style={{ marginTop: 48, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
          <PulseSubscribe source="one-market-monday" compact />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
