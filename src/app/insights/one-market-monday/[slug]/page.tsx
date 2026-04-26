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
        background: "#ffffff",
        color: "#0a2540",
        minHeight: "100vh",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <SiteNav theme="light" />

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
              color: "#697386",
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
              background: "rgba(91,141,184,0.08)",
              border: "1px solid rgba(91,141,184,0.25)",
              borderRadius: 3,
              padding: "4px 10px",
            }}
          >
            ONE MARKET MONDAY · ISSUE {String(issue.issueNumber).padStart(2, "0")}
          </span>
          <span
            style={{
              color: "#697386",
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
            color: "#0a2540",
            margin: "0 0 20px",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}
        >
          {issue.headline}
        </h1>

        {/* Lede — Hook (new) replaces subhead when present */}
        {issue.hook ? (
          <div
            style={{
              borderLeft: "3px solid #5B8DB8",
              paddingLeft: 20,
              margin: "0 0 48px",
            }}
          >
            {issue.hook.map((line, i) => (
              <p
                key={i}
                style={{
                  color: "#425466",
                  fontSize: 17,
                  lineHeight: 1.7,
                  margin: "0 0 10px",
                  fontStyle: "italic",
                }}
              >
                {line}
              </p>
            ))}
          </div>
        ) : (
          <p
            style={{
              color: "#425466",
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
        )}

        {/* Score card */}
        <div
          style={{
            padding: "28px 32px",
            background: "#f6f9fc",
            border: "1px solid #e3e8ee",
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
                  color: "#0a2540",
                  margin: 0,
                }}
              >
                {city.city}, {city.state}
              </div>
              <div
                style={{
                  color: "#697386",
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
                    <span style={{ color: "#425466" }}>{FACTOR_LABELS[key]}</span>
                    <span style={{ color: "#697386" }}>
                      {value} / {max}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      background: "#e3e8ee",
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
              borderTop: "1px solid #e3e8ee",
              fontSize: 11,
              color: "#697386",
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

        {/* Sections — discriminated by `kind` */}
        {issue.sections.map((section, i) => {
          // Legacy prose (kind absent) for issues #1-#3
          if (!("kind" in section) || section.kind === undefined || section.kind === "prose") {
            return (
              <section key={i} style={{ marginBottom: 40 }}>
                <h2
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#0a2540",
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
                      color: "#425466",
                      fontSize: 15,
                      lineHeight: 1.85,
                      margin: "0 0 18px",
                    }}
                  >
                    {p}
                  </p>
                ))}
              </section>
            );
          }
          if (section.kind === "snapshot") {
            return (
              <section
                key={i}
                style={{
                  marginBottom: 40,
                  borderTop: "1px solid #e3e8ee",
                  borderBottom: "1px solid #e3e8ee",
                  padding: "18px 0",
                }}
              >
                {section.rows.map((row, j) => (
                  <div
                    key={j}
                    style={{
                      display: "flex",
                      padding: "8px 0",
                      borderBottom:
                        j < section.rows.length - 1
                          ? "1px solid #f0f3f7"
                          : "none",
                    }}
                  >
                    <div
                      style={{
                        width: 130,
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#5B8DB8",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                      }}
                    >
                      {row.label}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        fontSize: 16,
                        fontWeight: 600,
                        color: "#0a2540",
                      }}
                    >
                      {row.value}
                    </div>
                  </div>
                ))}
              </section>
            );
          }
          if (section.kind === "signalEvent") {
            return (
              <section key={i} style={{ marginBottom: 40 }}>
                <h2
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#0a2540",
                    margin: "0 0 20px",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {section.heading}
                </h2>
                <p
                  style={{
                    color: "#425466",
                    fontSize: 15,
                    lineHeight: 1.85,
                    margin: "0 0 22px",
                  }}
                >
                  {section.event}
                </p>
                <p
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#5B8DB8",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    margin: "0 0 10px",
                  }}
                >
                  Why it matters
                </p>
                <p
                  style={{
                    color: "#425466",
                    fontSize: 15,
                    lineHeight: 1.85,
                    margin: 0,
                  }}
                >
                  {section.whyItMatters}
                </p>
              </section>
            );
          }
          if (section.kind === "modelNote") {
            return (
              <section
                key={i}
                style={{
                  marginBottom: 40,
                  background: "rgba(91,141,184,0.06)",
                  borderLeft: "3px solid #5B8DB8",
                  borderRadius: 4,
                  padding: "20px 24px",
                }}
              >
                <p
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#5B8DB8",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    margin: "0 0 12px",
                  }}
                >
                  {section.heading ?? "Model Note"}
                </p>
                {section.paragraphs.map((p, j) => (
                  <p
                    key={j}
                    style={{
                      color: "#425466",
                      fontSize: 14,
                      lineHeight: 1.8,
                      margin: j < section.paragraphs.length - 1 ? "0 0 12px" : 0,
                    }}
                  >
                    {p}
                  </p>
                ))}
              </section>
            );
          }
          if (section.kind === "watchItems") {
            return (
              <section key={i} style={{ marginBottom: 40 }}>
                <h2
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#0a2540",
                    margin: "0 0 20px",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {section.heading}
                </h2>
                {section.intro && (
                  <p
                    style={{
                      color: "#425466",
                      fontSize: 15,
                      lineHeight: 1.85,
                      margin: "0 0 22px",
                    }}
                  >
                    {section.intro}
                  </p>
                )}
                {section.items.map((item, j) => (
                  <div key={j} style={{ marginBottom: 22 }}>
                    <p
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: 17,
                        fontWeight: 700,
                        color: "#0a2540",
                        margin: "0 0 6px",
                      }}
                    >
                      <span style={{ color: "#5B8DB8" }}>{j + 1}.</span>{" "}
                      {item.headline}
                    </p>
                    <p
                      style={{
                        color: "#697386",
                        fontSize: 14,
                        lineHeight: 1.75,
                        margin: 0,
                        paddingLeft: 22,
                      }}
                    >
                      {item.support}
                    </p>
                  </div>
                ))}
              </section>
            );
          }
          if (section.kind === "finalTake") {
            return (
              <section
                key={i}
                style={{
                  marginBottom: 40,
                  background: "rgba(91,141,184,0.08)",
                  border: "1px solid rgba(91,141,184,0.25)",
                  borderRadius: 8,
                  padding: "24px 28px",
                }}
              >
                <p
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#5B8DB8",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    margin: "0 0 14px",
                  }}
                >
                  Final Take
                </p>
                {section.lines.map((line, j) => (
                  <p
                    key={j}
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 18,
                      fontWeight: 600,
                      color: "#0a2540",
                      lineHeight: 1.5,
                      margin: j < section.lines.length - 1 ? "0 0 12px" : 0,
                    }}
                  >
                    {line}
                  </p>
                ))}
              </section>
            );
          }
          return null;
        })}

        {/* Footer note */}
        <div
          style={{
            marginTop: 56,
            paddingTop: 28,
            borderTop: "1px solid #e3e8ee",
            fontSize: 13,
            color: "#697386",
            lineHeight: 1.75,
          }}
        >
          {issue.footerNote}
        </div>

        {/* Subscribe CTA */}
        <div style={{ marginTop: 48, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
          <PulseSubscribe source="one-market-monday" compact theme="light" />
        </div>
      </main>

      <SiteFooter theme="light" />
    </div>
  );
}
