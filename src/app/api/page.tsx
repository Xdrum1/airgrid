import type { Metadata } from "next";
import Link from "next/link";
import TrackPageView from "@/components/TrackPageView";
import SiteNav from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "API — AirIndex",
  description:
    "Programmatic access to UAM market readiness ratings. The AirIndex API delivers scored market data, operator intelligence, and corridor tracking via clean REST endpoints.",
};

const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/v1/markets",
    description: "Current readiness ratings for all rated U.S. markets",
  },
  {
    method: "GET",
    path: "/api/v1/markets/{city_id}",
    description:
      "Full rating detail for a single market — operators, corridors, tier history, and source citations",
  },
  {
    method: "GET",
    path: "/api/v1/markets/{city_id}/history",
    description:
      "Timestamped score history with triggering event attribution for any market",
  },
  {
    method: "GET",
    path: "/api/v1/markets/export",
    description:
      "Bulk dump of all rated markets at current ratings, optimized for data pipeline ingestion",
  },
];

const FEATURES = [
  {
    label: "Seven-Factor Ratings",
    detail:
      "Every market scored on a transparent 0\u2013100 scale using the same methodology that powers the AirIndex dashboard.",
  },
  {
    label: "Attribution Trail",
    detail:
      "Every score change is linked to the specific filing, regulatory event, or infrastructure update that caused it.",
  },
  {
    label: "Real-Time Data",
    detail:
      "Ratings update as new FAA filings, state legislation, and operator milestones are ingested and classified.",
  },
  {
    label: "Clean REST Interface",
    detail:
      "JSON responses, snake_case keys, ISO-8601 timestamps, and a consistent meta envelope across every endpoint.",
  },
];

export default function ApiLandingPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050508",
        color: "#ccc",
        fontFamily: "'Inter', sans-serif",
        fontSize: 14,
        lineHeight: 1.7,
        overflow: "auto",
      }}
    >
      <TrackPageView page="/api" />

      <SiteNav />

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px clamp(20px, 5vw, 32px) 80px" }}>
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 10,
              letterSpacing: 2,
              color: "#555",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            API &middot; v1.0 &middot; March 2026
          </div>
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(28px, 5vw, 36px)",
              color: "#fff",
              lineHeight: 1.2,
              marginBottom: 16,
            }}
          >
            AirIndex API
          </h1>
          <p style={{ fontSize: 16, color: "#999", lineHeight: 1.7, maxWidth: 560 }}>
            Programmatic access to UAM market readiness ratings across 20+ U.S. cities.
            Every rating is independently scored using the AirIndex seven-factor methodology,
            built on primary data from the FAA, SEC EDGAR, Federal Register, and state
            legislative records.
          </p>
        </div>

        {/* Tier badge */}
        <div
          style={{
            background: "rgba(124, 58, 237, 0.06)",
            border: "1px solid rgba(124, 58, 237, 0.2)",
            borderRadius: 8,
            padding: "20px 24px",
            marginBottom: 48,
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 10,
              letterSpacing: 1.5,
              color: "#7c3aed",
              textTransform: "uppercase",
              background: "rgba(124, 58, 237, 0.12)",
              padding: "4px 10px",
              borderRadius: 4,
            }}
          >
            Institutional &amp; Enterprise
          </span>
          <span style={{ color: "#888", fontSize: 13 }}>
            API access is available to authorized organizations.
          </span>
          <Link
            href="/contact?ref=api"
            style={{
              color: "#7c3aed",
              fontSize: 12,
              textDecoration: "none",
              fontFamily: "'Inter', sans-serif",
              marginLeft: "auto",
            }}
          >
            REQUEST ACCESS &rarr;
          </Link>
        </div>

        {/* Endpoints */}
        <section style={{ marginBottom: 48 }}>
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
            Endpoints
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {ENDPOINTS.map((ep) => (
              <div
                key={ep.path}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8,
                  padding: "16px 20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 10,
                      letterSpacing: 1,
                      color: "#00ff88",
                      background: "rgba(0, 255, 136, 0.08)",
                      padding: "2px 8px",
                      borderRadius: 3,
                    }}
                  >
                    {ep.method}
                  </span>
                  <code
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 13,
                      color: "#fff",
                    }}
                  >
                    {ep.path}
                  </code>
                </div>
                <p style={{ color: "#888", fontSize: 13, margin: 0 }}>{ep.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section style={{ marginBottom: 48 }}>
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
            What You Get
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {FEATURES.map((f) => (
              <div
                key={f.label}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8,
                  padding: "16px 20px",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 600,
                    fontSize: 14,
                    color: "#fff",
                    marginBottom: 6,
                  }}
                >
                  {f.label}
                </div>
                <p style={{ color: "#888", fontSize: 13, margin: 0, lineHeight: 1.6 }}>{f.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Quick example */}
        <section style={{ marginBottom: 48 }}>
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
            Example Request
          </h2>
          <div
            style={{
              background: "rgba(91, 141, 184, 0.03)",
              border: "1px solid rgba(91, 141, 184, 0.1)",
              borderRadius: 8,
              padding: "20px 24px",
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              lineHeight: 1.8,
              color: "#ccc",
              overflowX: "auto",
            }}
          >
            <div style={{ color: "#555" }}>
              # Get all ADVANCED-tier markets
            </div>
            <div>
              <span style={{ color: "#5B8DB8" }}>curl</span> https://airindex.io/api/v1/markets \
            </div>
            <div style={{ paddingLeft: 16 }}>
              -H <span style={{ color: "#00ff88" }}>&quot;Authorization: Bearer your_api_key&quot;</span>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section
          style={{
            background: "rgba(124, 58, 237, 0.04)",
            border: "1px solid rgba(124, 58, 237, 0.15)",
            borderRadius: 12,
            padding: "32px",
            textAlign: "center",
            marginBottom: 48,
          }}
        >
          <h3
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 18,
              color: "#fff",
              marginBottom: 8,
            }}
          >
            Ready to integrate?
          </h3>
          <p style={{ color: "#888", fontSize: 13, marginBottom: 20, maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
            API access is available through Institutional and Enterprise agreements.
            Full reference documentation is available after onboarding.
          </p>
          <Link
            href="/contact?tier=institutional"
            style={{
              display: "inline-block",
              background: "#7c3aed",
              color: "#fff",
              padding: "10px 28px",
              borderRadius: 6,
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            Request Access
          </Link>
        </section>

        {/* Footer links */}
        <div
          style={{
            paddingTop: 32,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            gap: 24,
            fontSize: 12,
          }}
        >
          <Link href="/dashboard" style={{ color: "#5B8DB8", textDecoration: "none" }}>
            Dashboard
          </Link>
          <Link href="/methodology" style={{ color: "#555", textDecoration: "none" }}>
            Methodology
          </Link>
          <Link href="/pricing" style={{ color: "#555", textDecoration: "none" }}>
            Pricing
          </Link>
          <Link href="/" style={{ color: "#555", textDecoration: "none" }}>
            Home
          </Link>
          <Link href="/terms" style={{ color: "#555", textDecoration: "none" }}>
            Terms
          </Link>
          <Link href="/privacy" style={{ color: "#555", textDecoration: "none" }}>
            Privacy
          </Link>
        </div>
      </main>
    </div>
  );
}
