import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { OPERATORS, VERTIPORTS, CORRIDORS, getCitiesWithOverrides } from "@/data/seed";

// -------------------------------------------------------
// Pricing tier data
// -------------------------------------------------------
const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    accent: "linear-gradient(135deg, #00d4ff, #7c3aed)",
    badge: null,
    features: [
      "Interactive map & market rankings",
      "Readiness scores & 7-factor breakdown",
      "City detail pages",
      "Federal Register filings feed",
      "Activity & changelog tracking",
      "Analytics dashboard",
      "Corridor intelligence",
      "Watchlists & email alerts",
    ],
    cta: { label: "Get started — it's free", href: "/login" },
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    yearlyNote: "For teams and organizations",
    accent: "#7c3aed",
    badge: null,
    features: [
      "Everything in Free, plus:",
      "REST API access",
      "Embeddable widgets",
      "Team seats & permissions",
      "Custom market reports",
      "Dedicated account manager",
    ],
    cta: { label: "Contact us", href: "mailto:sales@airindex.io" },
  },
] as const;

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
    { value: VERTIPORTS.length, label: "Vertiports" },
    { value: CORRIDORS.length, label: "Corridors" },
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
              {isAuthed ? "Go to Dashboard" : "View Dashboard"}
            </Link>
            {!isAuthed && (
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
                  href="/login"
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
          padding: "clamp(60px, 10vw, 100px) 20px 40px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 10,
            letterSpacing: 2,
            color: "#555",
            textTransform: "uppercase",
            marginBottom: 20,
          }}
        >
          Tracking the build-out of urban air mobility in real time
        </div>
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(32px, 5vw, 56px)",
            lineHeight: 1.1,
            margin: "0 auto 20px",
            maxWidth: 720,
            color: "#fff",
          }}
        >
          The intelligence layer for Urban Air Mobility
        </h1>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            color: "#777",
            fontSize: "clamp(13px, 1.4vw, 16px)",
            lineHeight: 1.7,
            maxWidth: 560,
            margin: "0 auto 40px",
          }}
        >
          Track {CITIES.length} US markets, {OPERATORS.length} operators,
          regulatory filings, and readiness scores — all in one place.
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
            Explore the map
          </Link>
          <Link
            href="#pricing"
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
            View pricing
          </Link>
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
        <div
          className="landing-stats-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 1,
            background: "rgba(255,255,255,0.04)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                background: "#050508",
                padding: "28px 24px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: 32,
                  color: "#00d4ff",
                  lineHeight: 1,
                  marginBottom: 6,
                }}
              >
                {s.value}
              </div>
              <div style={{ color: "#555", fontSize: 10, letterSpacing: 2 }}>
                {s.label.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ======== Feature Explainer ======== */}
      <section
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "48px 20px 0",
        }}
      >
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
              title: "Market Readiness Scores",
              description:
                "7-factor scoring model tracking pilot programs, zoning, operators, regulation, and infrastructure across 20 US markets.",
            },
            {
              icon: "⟿",
              title: "Corridor Intelligence",
              description:
                "Real-time tracking of proposed and authorized UAM flight corridors — from FAA filings to operator clearances.",
            },
            {
              icon: "◉",
              title: "Regulatory Filings",
              description:
                "Federal Register filings, state legislation, and FAA updates aggregated into a single searchable feed.",
            },
          ].map((card) => (
            <div
              key={card.title}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 10,
                padding: "28px 24px",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  border: "1px solid rgba(0,212,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  color: "#00d4ff",
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
                  color: "#666",
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
                color: "#555",
              }}
            >
              airindex.io/dashboard
            </div>
          </div>
          <Image
            src="/images/dashboard-preview.png"
            alt="AirIndex dashboard showing an interactive map of US UAM markets with readiness scores"
            width={1920}
            height={1080}
            style={{ width: "100%", height: "auto", display: "block" }}
            priority
          />
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
            Full access. No credit card required.
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", color: "#666", fontSize: 13, margin: 0 }}>
            Everything you need to track the UAM market — free forever.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))",
            gap: 24,
            maxWidth: 720,
            margin: "0 auto",
            alignItems: "stretch",
          }}
        >
          {TIERS.map((tier) => {
            const isFree = tier.name === "Free";
            return (
              <div
                key={tier.name}
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  background: "rgba(255,255,255,0.02)",
                  border: isFree
                    ? "1px solid rgba(0,212,255,0.3)"
                    : "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 12,
                  padding: "36px 28px 32px",
                  transition: "border-color 0.2s",
                }}
              >
                {/* Top accent line */}
                <div
                  style={{
                    position: "absolute",
                    top: -1,
                    left: 32,
                    right: 32,
                    height: 2,
                    background: typeof tier.accent === "string" && tier.accent.startsWith("linear")
                      ? tier.accent
                      : tier.accent,
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
                  <span style={{ color: "#555", fontSize: 13 }}>{tier.period}</span>
                </div>
                {"yearlyNote" in tier && tier.yearlyNote && (
                  <div style={{ color: "#444", fontSize: 10, marginBottom: 20 }}>
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
                        <span style={{ color: "#00d4ff", fontSize: 10, marginTop: 3, flexShrink: 0 }}>
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
                      padding: "12px 24px",
                      background: isFree
                        ? "#00d4ff"
                        : "rgba(255,255,255,0.04)",
                      border: isFree ? "none" : "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 6,
                      color: isFree ? "#050508" : "#aaa",
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "'Syne', sans-serif",
                      letterSpacing: "0.06em",
                      textDecoration: "none",
                      transition: "opacity 0.15s",
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
                      padding: "12px 24px",
                      background: isFree
                        ? "#00d4ff"
                        : "rgba(255,255,255,0.04)",
                      border: isFree ? "none" : "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 6,
                      color: isFree ? "#050508" : "#aaa",
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "'Syne', sans-serif",
                      letterSpacing: "0.06em",
                      textDecoration: "none",
                      transition: "opacity 0.15s",
                    }}
                  >
                    {tier.cta.label}
                  </Link>
                )}
              </div>
            );
          })}
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
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: "#444", letterSpacing: 1 }}>
              FREE DOWNLOAD — NO SIGNUP REQUIRED
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
                color: "#666",
                fontSize: 13,
                lineHeight: 1.7,
                margin: "0 0 24px",
                maxWidth: 520,
              }}>
                Monthly intelligence covering UAM market readiness rankings, corridor authorizations,
                vertiport construction status, operator timelines, and regulatory filings — all in one
                place. Published the first week of every month.
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

              {/* Download button */}
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
                ↓ DOWNLOAD FEBRUARY 2026 REPORT
              </a>
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
              <div style={{ fontSize: 6, color: "#444", letterSpacing: 0.5, marginBottom: 12, borderBottom: "1px solid #1a1a2e", paddingBottom: 8 }}>
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
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #1a1a2e", fontSize: 5.5, color: "#333", letterSpacing: 0.5 }}>
                airindex.io
              </div>
            </div>
          </div>
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
            The UAM industry moves fast. Stay ahead of it.
          </h2>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              color: "#555",
              fontSize: 13,
              margin: "0 0 32px",
            }}
          >
            Free access to market scores, rankings, and the interactive map.
          </p>
          <Link
            href="/login"
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
              href="/dashboard"
              style={{ color: "#888", fontSize: 10, letterSpacing: 1, textDecoration: "none" }}
            >
              DASHBOARD
            </Link>
            <Link
              href="/login"
              style={{ color: "#888", fontSize: 10, letterSpacing: 1, textDecoration: "none" }}
            >
              SIGN IN
            </Link>
            <a
              href="mailto:sales@airindex.io"
              style={{ color: "#888", fontSize: 10, letterSpacing: 1, textDecoration: "none" }}
            >
              CONTACT
            </a>
            <a
              href="https://x.com/AirIndexHQ"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#888", fontSize: 10, letterSpacing: 1, textDecoration: "none" }}
            >
              @AIRINDEXHQ
            </a>
          </div>
          <div style={{ color: "#666", fontSize: 9, letterSpacing: 1 }}>
            &copy; {new Date().getFullYear()} AIRINDEX
          </div>
        </div>
      </footer>
    </div>
  );
}
