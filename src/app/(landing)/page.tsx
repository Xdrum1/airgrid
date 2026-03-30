import Link from "next/link";
import Image from "next/image";
import { getCitiesWithOverrides, MARKET_COUNT } from "@/data/seed";
import { calculateReadinessScore, getScoreTier, getScoreColor } from "@/lib/scoring";
import { getPublishedFeedItems } from "@/lib/feed";
import ScrollReveal from "@/components/landing/ScrollReveal";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

// -------------------------------------------------------
// Market intelligence notes (manually curated)
// -------------------------------------------------------
const MARKET_NOTES: Record<string, string> = {
  los_angeles: "Joby + Archer targeting 2026 launch. CA SB 944 enacted. 146 heliports.",
  dallas: "Wisk autonomous testing active. TX HB 1735 enacted. 69 heliports.",
  miami: "Archer White House Pilot Program. FL AAM Act signed. Joby operating via Blade acquisition.",
  orlando: "Lake Nona smart city pilot. FDOT-funded vertiport feasibility. FL AAM Act applies statewide.",
  san_francisco: "Joby Golden Gate demo flight completed. CA SB 944 applies. Neutral regulatory posture.",
  new_york: "Joby operating NYC air taxi routes. No state UAM legislation. Complex Class B airspace.",
  phoenix: "SB1826 + SB1827 advancing — AAM office + funding. Potential tier shift if enacted.",
  austin: "TX HB 1735 applies. No active pilot program. Strong legislative framework.",
  houston: "137 heliports — highest infrastructure density. TX HB 1735 applies.",
  san_diego: "Crossed into Moderate. SoCal corridor build continuing quietly.",
};

// -------------------------------------------------------
// Page (Server Component — fetches live data)
// -------------------------------------------------------
export default async function LandingPage() {
  const cities = await getCitiesWithOverrides();
  const scored = cities.map((city) => {
    const { score } = calculateReadinessScore(city);
    return { ...city, score };
  }).sort((a, b) => b.score - a.score);

  // Top 10 for the market snapshot
  const topMarkets = scored.slice(0, 10);

  // Live signals from the feed pipeline
  let signals: { title: string; category: string; publishedAt: string; cities: { name: string }[] }[] = [];
  try {
    const { items } = await getPublishedFeedItems({ limit: 8 });
    signals = items;
  } catch {
    // Fallback: empty signals on error
  }

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

      {/* ======== Hero (short) ======== */}
      <section
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "clamp(48px, 6vw, 80px) 20px 0",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(24px, 3.5vw, 40px)",
            lineHeight: 1.2,
            margin: "0 auto 14px",
            maxWidth: 700,
            color: "#fff",
          }}
        >
          The intelligence infrastructure for urban air mobility.
        </h1>
        <p
          style={{
            color: "#666",
            fontSize: "clamp(12px, 1.3vw, 15px)",
            lineHeight: 1.7,
            maxWidth: 520,
            margin: "0 auto 28px",
          }}
        >
          Market readiness data across {MARKET_COUNT}+ U.S. markets. Updated continuously from primary sources.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          <Link
            href="/request-access"
            style={{
              display: "inline-block",
              padding: "12px 32px",
              background: "#00d4ff",
              color: "#050508",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textDecoration: "none",
              borderRadius: 6,
            }}
          >
            Request Access
          </Link>
          <Link
            href="/methodology"
            style={{
              display: "inline-block",
              padding: "12px 32px",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#888",
              fontSize: 11,
              letterSpacing: "0.06em",
              textDecoration: "none",
              borderRadius: 6,
            }}
          >
            Methodology
          </Link>
        </div>
      </section>

      {/* ======== Dashboard Preview ======== */}
      <ScrollReveal>
        <section style={{ maxWidth: 1120, margin: "0 auto", padding: "clamp(32px, 5vw, 48px) 20px 0" }}>
          <div
            style={{
              position: "relative",
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 0 80px rgba(0,212,255,0.06), 0 0 160px rgba(124,58,237,0.04)",
            }}
          >
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
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "0.06em", color: "#fff" }}>
                    Request access to the full platform &rarr;
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </section>
      </ScrollReveal>

      {/* ======== What is AirIndex ======== */}
      <ScrollReveal>
        <section style={{ maxWidth: 680, margin: "0 auto", padding: "clamp(32px, 5vw, 56px) 20px 0", textAlign: "center" }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: 2, color: "#00d4ff", display: "block", marginBottom: 16 }}>WHAT IS AIRINDEX</span>
          <p style={{ color: "#999", fontSize: 14, lineHeight: 1.8, margin: "0 0 10px" }}>
            Built for operators, infrastructure developers, government agencies, and investors
            making capital allocation decisions in advanced air mobility.
          </p>
          <p style={{ color: "#666", fontSize: 13, lineHeight: 1.7, margin: "0 0 28px" }}>
            We track readiness conditions across 21+ U.S. markets — scoring legislation,
            infrastructure, operator activity, and regulatory posture against a published
            7-factor methodology. Updated continuously from primary sources.
          </p>
          <div style={{
            borderRadius: 10,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 0 60px rgba(0,212,255,0.04)",
            maxWidth: 360,
            margin: "0 auto",
          }}>
            <Image
              src="/images/detail-panel-phoenix.png"
              alt="AirIndex city intelligence — factor breakdown, source citations, and score timeline for Phoenix, AZ"
              width={360}
              height={810}
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>
        </section>
      </ScrollReveal>

      {/* ======== Briefings CTA ======== */}
      <ScrollReveal>
        <section style={{ maxWidth: 1120, margin: "0 auto", padding: "clamp(32px, 5vw, 48px) 20px 0" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(360px, 100%), 1fr))",
            gap: 24,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(124,58,237,0.12)",
            borderRadius: 12,
            padding: "clamp(24px, 4vw, 36px)",
          }}>
            <div>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: 2, color: "#7c3aed" }}>MARKET INTELLIGENCE BRIEFINGS</span>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, color: "#fff", margin: "12px 0 10px" }}>
                Need a custom market analysis?
              </h3>
              <p style={{ color: "#888", fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                AirIndex scores tell you where a market stands. A Market Intelligence Briefing tells you why — and what it would take to change it.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { tier: "Market Snapshot", desc: "1 city · 5 days", href: "/briefings" },
                { tier: "Market Briefing", desc: "2–3 cities · 10 days", href: "/briefings" },
                { tier: "Strategic Assessment", desc: "4–21 cities · 3–4 weeks", href: "/briefings" },
              ].map((t) => (
                <Link
                  key={t.tier}
                  href={t.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 6,
                    textDecoration: "none",
                    transition: "border-color 0.15s",
                  }}
                >
                  <div>
                    <div style={{ color: "#eee", fontSize: 12, fontWeight: 600 }}>{t.tier}</div>
                    <div style={{ color: "#666", fontSize: 10, marginTop: 2 }}>{t.desc}</div>
                  </div>
                  <span style={{ color: "#7c3aed", fontSize: 10, letterSpacing: 0.5 }}>
                    Learn more →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Divider */}
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "clamp(24px, 4vw, 48px) 20px 0" }}>
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06) 20%, rgba(255,255,255,0.06) 80%, transparent)" }} />
      </div>

      {/* ======== Market Snapshot (live scores) ======== */}
      <ScrollReveal>
        <section style={{ maxWidth: 1120, margin: "0 auto", padding: "clamp(32px, 5vw, 56px) 20px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: 2, color: "#00d4ff" }}>MARKET SNAPSHOT</span>
              <span style={{ color: "#333", fontSize: 9, marginLeft: 12 }}>|</span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: 1, color: "#555", marginLeft: 12 }}>
                {MARKET_COUNT} MARKETS · AVG {Math.round(scored.reduce((s, c) => s + c.score, 0) / scored.length)}
              </span>
            </div>
            <Link href="/request-access" style={{ fontSize: 10, color: "#555", textDecoration: "none", letterSpacing: 1 }}>
              FULL INDEX →
            </Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))", gap: 12 }}>
            {topMarkets.map((city) => {
              const tier = getScoreTier(city.score);
              const color = getScoreColor(city.score);
              const note = MARKET_NOTES[city.id];
              return (
                <Link
                  key={city.id}
                  href={`/city/${city.id}`}
                  style={{
                    display: "block",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: 8,
                    padding: "16px 18px",
                    textDecoration: "none",
                    transition: "border-color 0.15s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ color: "#eee", fontSize: 14, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>
                        {city.city}
                      </div>
                      <div style={{ color: "#555", fontSize: 10, marginTop: 2 }}>{city.state}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color, fontSize: 20, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>
                        {city.score}
                      </div>
                      <div style={{ color, fontSize: 8, letterSpacing: 1, fontWeight: 600 }}>{tier}</div>
                    </div>
                  </div>
                  {note && (
                    <div style={{ color: "#666", fontSize: 11, lineHeight: 1.55 }}>
                      {note}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      </ScrollReveal>

      {/* Divider */}
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "clamp(24px, 4vw, 48px) 20px 0" }}>
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06) 20%, rgba(255,255,255,0.06) 80%, transparent)" }} />
      </div>

      {/* ======== Two-column: Pulse + Signals ======== */}
      <ScrollReveal>
        <section style={{ maxWidth: 1120, margin: "0 auto", padding: "clamp(32px, 5vw, 56px) 20px 0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(440px, 100%), 1fr))", gap: 24 }}>

            {/* Market Pulse (inline) */}
            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(0,212,255,0.12)",
              borderRadius: 10,
              overflow: "hidden",
            }}>
              <div style={{
                background: "rgba(0,212,255,0.05)",
                borderBottom: "1px solid rgba(0,212,255,0.08)",
                padding: "12px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: 2, color: "#00d4ff" }}>UAM MARKET PULSE</span>
                <span style={{ fontSize: 9, color: "#555", letterSpacing: 1 }}>ISSUE 3 · MAR 27, 2026</span>
              </div>
              <div style={{ padding: "20px 20px 24px" }}>
                <p style={{ color: "#ccc", fontSize: 13, lineHeight: 1.75, margin: "0 0 14px" }}>
                  AirIndex updated its scoring model this week — v1.3 — and the most important thing it revealed: <strong style={{ color: "#fff" }}>no tracked U.S. market currently achieves full weather infrastructure coverage for low-altitude UAM operations.</strong>
                </p>
                <p style={{ color: "#888", fontSize: 12, lineHeight: 1.7, margin: "0 0 14px" }}>
                  That one change affected 15 of 21 markets. New York saw the largest single adjustment — 70 to 55. San Diego is the only market that moved up, crossing into Moderate at 50.
                </p>
                <p style={{ color: "#888", fontSize: 12, lineHeight: 1.7, margin: "0 0 18px" }}>
                  Arizona is the most consequential state-level story right now. SB1826 and SB1827 both advanced in committee. Joby&apos;s first production-conforming aircraft flew this week.
                </p>
                <Link href="/insights" style={{
                  display: "inline-block",
                  padding: "10px 24px",
                  background: "rgba(0,212,255,0.08)",
                  border: "1px solid rgba(0,212,255,0.2)",
                  borderRadius: 6,
                  fontSize: 11,
                  color: "#00d4ff",
                  textDecoration: "none",
                  letterSpacing: 0.5,
                  fontWeight: 700,
                }}>
                  Read the full Pulse →
                </Link>
              </div>
            </div>

            {/* Recent Signals (live from pipeline) */}
            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 10,
              overflow: "hidden",
            }}>
              <div style={{
                background: "rgba(255,255,255,0.02)",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                padding: "12px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: 2, color: "#ff6b35" }}>RECENT SIGNALS</span>
                <span style={{ fontSize: 9, color: "#555", letterSpacing: 1 }}>LIVE PIPELINE</span>
              </div>
              <div style={{ padding: "8px 0" }}>
                {signals.length > 0 ? signals.map((signal, i) => {
                  const catColor = signal.category === "Regulatory" ? "#ff6b35" : signal.category === "Legislative" ? "#00ff88" : signal.category === "Operator" ? "#00d4ff" : "#f59e0b";
                  const date = new Date(signal.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  return (
                    <div key={i} style={{
                      padding: "12px 20px",
                      borderBottom: i < signals.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 7, letterSpacing: 1.5, color: catColor, fontWeight: 700 }}>{signal.category?.toUpperCase()}</span>
                        {signal.cities?.[0] && <span style={{ fontSize: 8, color: "#555" }}>· {signal.cities[0].name}</span>}
                        <span style={{ fontSize: 8, color: "#444", marginLeft: "auto" }}>{date}</span>
                      </div>
                      <div style={{ color: "#999", fontSize: 11, lineHeight: 1.5 }}>
                        {signal.title}
                      </div>
                    </div>
                  );
                }) : (
                  <div style={{ padding: "40px 20px", textAlign: "center" }}>
                    <p style={{ color: "#555", fontSize: 11 }}>Signal pipeline loading...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Divider */}
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "clamp(24px, 4vw, 48px) 20px 0" }}>
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06) 20%, rgba(255,255,255,0.06) 80%, transparent)" }} />
      </div>

      {/* ======== Latest from AirIndex (research) ======== */}
      <ScrollReveal>
        <section style={{ maxWidth: 1120, margin: "0 auto", padding: "clamp(32px, 5vw, 56px) 20px 0" }}>
          <div style={{ marginBottom: 24 }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: 2, color: "#7c3aed" }}>LATEST FROM AIRINDEX</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 16 }}>
            {[
              {
                label: "MONTHLY REPORT",
                title: "UAM Market Readiness Report — March 2026",
                description: "Full analysis across 21 markets. Scoring methodology v1.3, operator consolidation, federal activity tracking, and heliport infrastructure data.",
                href: "/reports/march-2026",
                accent: "#00d4ff",
              },
              {
                label: "METHODOLOGY",
                title: "7-Factor Readiness Scoring",
                description: "Published methodology covering data sources, factor weights, classification logic, and confidence tiering. Designed for independent validation.",
                href: "/methodology",
                accent: "#00ff88",
              },
              {
                label: "PLATFORM UPDATE",
                title: "Causal Intelligence Layer Shipped",
                description: "Every score is now traceable to a source event. Score timelines, factor citations, and interactive scenario modeling — see why markets score what they do and what would change them.",
                href: "/updates",
                accent: "#f59e0b",
              },
            ].map((item) => (
              <Link
                key={item.title}
                href={item.href}
                style={{
                  display: "block",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 10,
                  padding: "24px 22px",
                  textDecoration: "none",
                  borderTop: `2px solid ${item.accent}`,
                  transition: "border-color 0.15s",
                }}
              >
                <div style={{ fontSize: 8, letterSpacing: 2, color: item.accent, marginBottom: 10, fontWeight: 600 }}>{item.label}</div>
                <div style={{ color: "#eee", fontSize: 14, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 8, lineHeight: 1.3 }}>
                  {item.title}
                </div>
                <div style={{ color: "#777", fontSize: 11.5, lineHeight: 1.6 }}>
                  {item.description}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </ScrollReveal>

      {/* Divider */}
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "clamp(24px, 4vw, 48px) 20px 0" }}>
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06) 20%, rgba(255,255,255,0.06) 80%, transparent)" }} />
      </div>

      {/* ======== Who Uses + Closing CTA ======== */}
      <ScrollReveal>
        <section style={{ maxWidth: 1120, margin: "0 auto", padding: "clamp(32px, 5vw, 56px) 20px clamp(60px, 8vw, 100px)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginBottom: 40 }}>
            {[
              "Operators & OEMs",
              "Infrastructure Developers",
              "Government & Municipal",
              "Aerospace & Defense",
              "Insurance & Risk",
              "Investors & Analysts",
            ].map((audience) => (
              <span
                key={audience}
                style={{
                  fontSize: 10,
                  letterSpacing: 1,
                  color: "#555",
                  padding: "6px 14px",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 4,
                }}
              >
                {audience}
              </span>
            ))}
          </div>
          <div style={{ textAlign: "center" }}>
            <h2
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(18px, 2.5vw, 26px)",
                margin: "0 0 12px",
                color: "#fff",
              }}
            >
              Ready to see your market?
            </h2>
            <p style={{ color: "#555", fontSize: 12, margin: "0 0 28px", lineHeight: 1.7, maxWidth: 440, marginLeft: "auto", marginRight: "auto" }}>
              Market readiness scores, gap analysis, corridor intelligence, regulatory filings, and API access for your team.
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
                letterSpacing: "0.06em",
                textDecoration: "none",
                borderRadius: 6,
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
