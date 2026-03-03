import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserTier } from "@/lib/billing";
import { hasInstitutionalAccess } from "@/lib/billing-shared";
import TrackPageView from "@/components/TrackPageView";

export const metadata: Metadata = {
  title: "API Reference — AirIndex",
  description:
    "Full API v1 reference documentation for AirIndex Institutional and Enterprise subscribers. Endpoints, schemas, authentication, and code examples.",
};

// -------------------------------------------------------
// Shared styles
// -------------------------------------------------------

const mono = "'Space Mono', monospace";
const grotesk = "'Space Grotesk', sans-serif";
const inter = "'Inter', sans-serif";

const linkStyle = {
  color: "#888",
  fontSize: 11,
  letterSpacing: "0.06em",
  textDecoration: "none" as const,
  fontFamily: mono,
};

const sectionTitleStyle = {
  fontFamily: grotesk,
  fontWeight: 700 as const,
  fontSize: 20,
  color: "#fff",
  marginBottom: 20,
  paddingBottom: 12,
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};

const cardStyle = {
  background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 8,
  padding: "16px 20px",
  marginBottom: 16,
};

const codeBlockStyle = {
  background: "rgba(0,0,0,0.4)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 8,
  padding: "16px 20px",
  fontFamily: mono,
  fontSize: 12,
  lineHeight: 1.8,
  color: "#ccc",
  overflowX: "auto" as const,
  marginBottom: 16,
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse" as const,
  fontSize: 13,
  marginBottom: 16,
};

const thStyle = {
  fontFamily: mono,
  fontSize: 10,
  letterSpacing: 1.5,
  color: "#555",
  textTransform: "uppercase" as const,
  textAlign: "left" as const,
  padding: "8px 12px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
};

const tdStyle = {
  padding: "8px 12px",
  borderBottom: "1px solid rgba(255,255,255,0.04)",
  color: "#ccc",
  verticalAlign: "top" as const,
};

// -------------------------------------------------------
// Upgrade wall component
// -------------------------------------------------------

function UpgradeWall() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050508",
        color: "#ccc",
        fontFamily: inter,
        fontSize: 14,
        lineHeight: 1.7,
        overflow: "auto",
      }}
    >
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px clamp(20px, 5vw, 64px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
          <img src="/images/logo/airindex-wordmark.svg" alt="AirIndex" style={{ height: 26 }} />
        </Link>
        <Link href="/api" style={linkStyle}>API OVERVIEW</Link>
      </nav>

      <main
        style={{
          maxWidth: 520,
          margin: "0 auto",
          padding: "120px clamp(20px, 5vw, 32px) 80px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: mono,
            fontSize: 10,
            letterSpacing: 1.5,
            color: "#7c3aed",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          Institutional &amp; Enterprise
        </div>
        <h1
          style={{
            fontFamily: grotesk,
            fontWeight: 700,
            fontSize: 28,
            color: "#fff",
            marginBottom: 16,
          }}
        >
          API Reference Documentation
        </h1>
        <p style={{ color: "#888", fontSize: 15, marginBottom: 32, lineHeight: 1.7 }}>
          Full API documentation including schemas, response structures, code examples,
          and authentication details is available on Institutional and Enterprise plans.
        </p>
        <Link
          href="/pricing"
          style={{
            display: "inline-block",
            background: "#7c3aed",
            color: "#fff",
            padding: "12px 32px",
            borderRadius: 6,
            fontFamily: grotesk,
            fontWeight: 600,
            fontSize: 14,
            textDecoration: "none",
            marginBottom: 16,
          }}
        >
          Upgrade to Access
        </Link>
        <div style={{ fontSize: 12, color: "#555" }}>
          Already subscribed?{" "}
          <Link href="/login" style={{ color: "#00d4ff", textDecoration: "none" }}>
            Sign in
          </Link>
        </div>
      </main>
    </div>
  );
}

// -------------------------------------------------------
// JSON response block
// -------------------------------------------------------

function JsonBlock({ children }: { children: string }) {
  return (
    <pre style={codeBlockStyle}>
      <code>{children}</code>
    </pre>
  );
}

// -------------------------------------------------------
// Section component
// -------------------------------------------------------

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: 48 }}>
      <h2 style={sectionTitleStyle}>{title}</h2>
      {children}
    </section>
  );
}

// -------------------------------------------------------
// Page
// -------------------------------------------------------

export default async function ApiDocsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return <UpgradeWall />;
  }

  const tier = await getUserTier(session.user.id);
  if (!hasInstitutionalAccess(tier)) {
    return <UpgradeWall />;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050508",
        color: "#ccc",
        fontFamily: inter,
        fontSize: 14,
        lineHeight: 1.7,
        overflow: "auto",
      }}
    >
      <TrackPageView page="/api/docs" />

      {/* Nav */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(5,5,8,0.85)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px clamp(20px, 5vw, 64px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
          <img src="/images/logo/airindex-wordmark.svg" alt="AirIndex" style={{ height: 26 }} />
        </Link>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <Link href="/api" style={linkStyle}>API OVERVIEW</Link>
          <Link href="/dashboard" style={linkStyle}>DASHBOARD</Link>
        </div>
      </nav>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px clamp(20px, 5vw, 32px) 80px" }}>
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div
            style={{
              fontFamily: mono,
              fontSize: 10,
              letterSpacing: 2,
              color: "#555",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            API Reference &middot; v1.0 &middot; March 2026
          </div>
          <h1
            style={{
              fontFamily: grotesk,
              fontWeight: 700,
              fontSize: "clamp(28px, 5vw, 36px)",
              color: "#fff",
              lineHeight: 1.2,
              marginBottom: 16,
            }}
          >
            AirIndex API Reference
          </h1>
          <p style={{ fontSize: 15, color: "#999", lineHeight: 1.7, maxWidth: 600 }}>
            Full reference for the AirIndex API v1. All endpoints, authentication,
            response schemas, error handling, and code examples.
          </p>
        </div>

        {/* Details table */}
        <div style={{ ...cardStyle, marginBottom: 48 }}>
          <table style={tableStyle}>
            <tbody>
              {[
                ["Base URL", "https://airindex.io/api/v1"],
                ["Authentication", "Bearer token via Authorization header"],
                ["Format", "JSON \u2014 all responses"],
                ["Timestamps", "ISO-8601 (e.g. 2026-03-03T06:00:00Z)"],
                ["Market IDs", "snake_case slugs (e.g. los_angeles, dallas)"],
                ["Methodology", "v1.0 \u2014 included in every response meta block"],
                ["Rate Limits", "Institutional: 1,000 req/hr  |  Enterprise: 10,000 req/hr"],
                ["Support", "api@airindex.io"],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td style={{ ...tdStyle, color: "#888", fontFamily: mono, fontSize: 12, whiteSpace: "nowrap", width: 160 }}>
                    {label}
                  </td>
                  <td style={{ ...tdStyle, color: "#fff", fontFamily: mono, fontSize: 12 }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Authentication */}
        <Section id="authentication" title="Authentication">
          <p style={{ marginBottom: 16 }}>
            All API requests require a valid API key passed as a Bearer token in the
            Authorization header. API keys are issued from the AirIndex dashboard
            under <strong style={{ color: "#fff" }}>Settings &gt; API Keys</strong>.
          </p>
          <JsonBlock>{`Authorization: Bearer aix_xxxxxxxxxxxxxxxxxxxx`}</JsonBlock>
          <p style={{ marginBottom: 16 }}>Example request:</p>
          <JsonBlock>{`curl -X GET https://airindex.io/api/v1/markets \\
  -H "Authorization: Bearer aix_xxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json"`}</JsonBlock>
          <p style={{ color: "#888", fontSize: 13 }}>
            API keys are prefixed with <code style={{ color: "#00d4ff", fontFamily: mono }}>aix_</code>.
            Never expose API keys in client-side code or public repositories.
          </p>
        </Section>

        {/* Readiness Tiers */}
        <Section id="tiers" title="Readiness Tiers">
          <p style={{ marginBottom: 16 }}>
            Every market is assigned one of four readiness tiers based on its composite
            score. Tier labels are canonical &mdash; use them verbatim when citing AirIndex ratings.
          </p>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Tier</th>
                <th style={thStyle}>Score</th>
                <th style={thStyle}>Meaning</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["ADVANCED", "75\u2013100", "Commercial UAM operations are viable. Active operator presence, approved infrastructure, and supportive regulatory environment.", "#00ff88"],
                ["MODERATE", "50\u201374", "Market conditions are developing. Key infrastructure or regulatory milestones are pending but trajectory is positive.", "#00d4ff"],
                ["EARLY", "30\u201349", "Early-stage signals present. Policy interest and limited operator activity, but no operational infrastructure.", "#f59e0b"],
                ["NASCENT", "0\u201329", "Minimal or no UAM readiness activity. Market has not yet initiated the regulatory or infrastructure development required.", "#ff4444"],
              ].map(([tier, range, meaning, color]) => (
                <tr key={tier}>
                  <td style={{ ...tdStyle, fontFamily: mono, fontSize: 12, color }}>{tier}</td>
                  <td style={{ ...tdStyle, fontFamily: mono, fontSize: 12, whiteSpace: "nowrap" }}>{range}</td>
                  <td style={{ ...tdStyle, fontSize: 13 }}>{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* Response envelope */}
        <Section id="envelope" title="Response Envelope">
          <p style={{ marginBottom: 16 }}>
            All successful responses are wrapped in a consistent envelope with a{" "}
            <code style={{ color: "#00d4ff", fontFamily: mono }}>meta</code> block and a{" "}
            <code style={{ color: "#00d4ff", fontFamily: mono }}>data</code> payload.
          </p>
          <JsonBlock>{`{
  "meta": {
    "rated_by": "airindex_v1",
    "methodology_version": "1.0",
    "last_updated": "2026-03-03T06:00:00Z",
    "market_count": 20
  },
  "data": [...]
}`}</JsonBlock>
          <p style={{ color: "#888", fontSize: 13 }}>
            Error responses replace <code style={{ fontFamily: mono }}>data</code> with
            an <code style={{ fontFamily: mono }}>error</code> string.
          </p>
        </Section>

        {/* GET /markets */}
        <Section id="markets" title="List All Markets">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: 1, color: "#00ff88", background: "rgba(0,255,136,0.08)", padding: "2px 8px", borderRadius: 3 }}>GET</span>
            <code style={{ fontFamily: mono, fontSize: 14, color: "#fff" }}>/api/v1/markets</code>
          </div>
          <p style={{ marginBottom: 16 }}>Returns current readiness ratings for all 20 rated U.S. markets.</p>
          <JsonBlock>{`{
  "meta": { "rated_by": "airindex_v1", "methodology_version": "1.0", ... },
  "data": [
    {
      "id": "los_angeles",
      "city": "Los Angeles",
      "metro": "Greater Los Angeles Metro",
      "state": "CA",
      "coordinates": { "lat": 34.0522, "lng": -118.2437 },
      "score": 100,
      "tier": "ADVANCED",
      "tier_color": "#00ff88",
      "breakdown": {
        "active_pilot_program": 20,
        "approved_vertiport": 20,
        "active_operator_presence": 15,
        "vertiport_zoning": 15,
        "regulatory_posture": 10,
        "state_legislation": 10,
        "laanc_coverage": 10
      },
      "regulatory_posture": "friendly",
      "posture_label": "FRIENDLY",
      "operator_count": 3,
      "vertiport_count": 3,
      "last_updated": "2026-02-26"
    }
  ]
}`}</JsonBlock>
        </Section>

        {/* GET /markets/{city_id} */}
        <Section id="market-detail" title="Get Single Market">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: 1, color: "#00ff88", background: "rgba(0,255,136,0.08)", padding: "2px 8px", borderRadius: 3 }}>GET</span>
            <code style={{ fontFamily: mono, fontSize: 14, color: "#fff" }}>/api/v1/markets/&#123;city_id&#125;</code>
          </div>
          <p style={{ marginBottom: 16 }}>
            Returns full rating detail for a single market including operators, vertiports,
            corridors, tier history, source citations, and milestones.
          </p>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Parameter</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ ...tdStyle, fontFamily: mono, fontSize: 12, color: "#00d4ff" }}>city_id</td>
                <td style={{ ...tdStyle, fontFamily: mono, fontSize: 12 }}>string</td>
                <td style={tdStyle}>Market slug (e.g. <code style={{ fontFamily: mono }}>los_angeles</code>, <code style={{ fontFamily: mono }}>dallas</code>)</td>
              </tr>
            </tbody>
          </table>
          <JsonBlock>{`{
  "meta": { ... },
  "data": {
    "id": "los_angeles",
    "city": "Los Angeles",
    "score": 100,
    "tier": "ADVANCED",
    "breakdown": { ... },
    "operators": [
      {
        "id": "op_joby",
        "name": "Joby Aviation",
        "type": "evtol_manufacturer",
        "faa_cert_status": "in_progress",
        "aircraft": ["Joby S4"],
        "website": "https://www.jobyaviation.com"
      }
    ],
    "vertiports": [
      {
        "id": "vp_lax_adjacent",
        "name": "LAX Adjacent Vertiport",
        "status": "permitted",
        "site_type": "airport_adjacent",
        "coordinates": { "lat": 33.9425, "lng": -118.408 },
        "pad_count": 4,
        "charging_capable": true
      }
    ],
    "corridors": [
      {
        "id": "cor_lax_dtla",
        "name": "LAX to Downtown LA",
        "status": "authorized",
        "distance_km": 25.1,
        "estimated_flight_minutes": 15
      }
    ],
    "tier_history": [
      { "score": 100, "tier": "ADVANCED", "captured_at": "2026-03-01T..." }
    ],
    "score_sources": {
      "active_pilot_program": {
        "citation": "Joby and Archer targeting 2026 LA commercial launch",
        "date": "2025-01",
        "url": "https://www.jobyaviation.com/news/"
      }
    },
    "score_weights": {
      "active_pilot_program": 20,
      "approved_vertiport": 20,
      "active_operator_presence": 15,
      "vertiport_zoning": 15,
      "regulatory_posture": 10,
      "state_legislation": 10,
      "laanc_coverage": 10
    },
    "notes": "Primary U.S. launch market for Joby and Archer...",
    "key_milestones": [
      "Joby launches commercial service in Dubai (Feb 2026)"
    ]
  }
}`}</JsonBlock>
        </Section>

        {/* GET /markets/{city_id}/history */}
        <Section id="history" title="Get Market Score History">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: 1, color: "#00ff88", background: "rgba(0,255,136,0.08)", padding: "2px 8px", borderRadius: 3 }}>GET</span>
            <code style={{ fontFamily: mono, fontSize: 14, color: "#fff" }}>/api/v1/markets/&#123;city_id&#125;/history</code>
          </div>
          <p style={{ marginBottom: 16 }}>
            Returns timestamped score history with triggering event attribution. Every
            score change is linked to the filing or event that caused it.
          </p>
          <JsonBlock>{`{
  "meta": { "market_id": "los_angeles", "entries": 12, ... },
  "data": [
    {
      "score": 100,
      "tier": "ADVANCED",
      "breakdown": {
        "active_pilot_program": 20,
        "approved_vertiport": 20,
        "active_operator_presence": 15,
        "vertiport_zoning": 15,
        "regulatory_posture": 10,
        "state_legislation": 10,
        "laanc_coverage": 10
      },
      "captured_at": "2026-03-03T06:00:00Z",
      "triggering_event_id": null,
      "filing_ingested_at": null,
      "triggering_event": null
    },
    {
      "score": 90,
      "tier": "ADVANCED",
      "breakdown": { ... },
      "captured_at": "2026-02-15T06:00:00Z",
      "triggering_event_id": "evt_123",
      "triggering_event": {
        "summary": "Joby LAX Adjacent Vertiport permit filed",
        "source_url": "https://...",
        "change_type": "new_filing",
        "timestamp": "2026-02-15T06:00:00Z"
      }
    }
  ]
}`}</JsonBlock>
          <div
            style={{
              background: "rgba(0,212,255,0.04)",
              border: "1px solid rgba(0,212,255,0.12)",
              borderRadius: 8,
              padding: "16px 20px",
              marginBottom: 16,
            }}
          >
            <div style={{ fontFamily: grotesk, fontWeight: 600, fontSize: 13, color: "#00d4ff", marginBottom: 6 }}>
              Attribution Trail
            </div>
            <p style={{ color: "#888", fontSize: 13, margin: 0, lineHeight: 1.6 }}>
              The <code style={{ fontFamily: mono, color: "#00d4ff" }}>triggering_event</code> field
              links every score change to the specific filing, regulatory event, or infrastructure
              update that caused it. This causal chain is not available from any other UAM data source.
            </p>
          </div>
        </Section>

        {/* GET /markets/export */}
        <Section id="export" title="Bulk Export">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: 1, color: "#00ff88", background: "rgba(0,255,136,0.08)", padding: "2px 8px", borderRadius: 3 }}>GET</span>
            <code style={{ fontFamily: mono, fontSize: 14, color: "#fff" }}>/api/v1/markets/export</code>
          </div>
          <p style={{ marginBottom: 16 }}>
            Returns a full JSON dump of all 20 markets with complete detail. Same shape
            as the single market endpoint. Optimized for data pipeline ingestion.
          </p>
          <p style={{ color: "#888", fontSize: 13 }}>
            The export endpoint counts as a single request regardless of market count.
          </p>
        </Section>

        {/* Error handling */}
        <Section id="errors" title="Error Handling">
          <p style={{ marginBottom: 16 }}>
            All errors return a consistent JSON structure with the meta envelope and an
            error message.
          </p>
          <JsonBlock>{`{
  "meta": {
    "rated_by": "airindex_v1",
    "methodology_version": "1.0",
    "last_updated": "2026-03-03T06:00:00Z"
  },
  "error": "Invalid or revoked API key"
}`}</JsonBlock>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>HTTP</th>
                <th style={thStyle}>Meaning</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["401", "Missing or invalid API key"],
                ["403", "Your tier does not have access to this endpoint"],
                ["404", "The requested market does not exist"],
                ["429", "Rate limit exceeded"],
                ["500", "Server error \u2014 contact api@airindex.io"],
              ].map(([code, meaning]) => (
                <tr key={code}>
                  <td style={{ ...tdStyle, fontFamily: mono, fontSize: 12, color: "#ff4444" }}>{code}</td>
                  <td style={tdStyle}>{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* Rate limiting */}
        <Section id="rate-limits" title="Rate Limiting">
          <p style={{ marginBottom: 16 }}>
            API requests are rate limited per key. Every response includes rate limit headers.
          </p>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Tier</th>
                <th style={thStyle}>Limit</th>
                <th style={thStyle}>Window</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Institutional", "1,000 requests", "1 hour"],
                ["Enterprise", "10,000 requests", "1 hour"],
              ].map(([tier, limit, window]) => (
                <tr key={tier}>
                  <td style={{ ...tdStyle, fontFamily: mono, fontSize: 12, color: "#fff" }}>{tier}</td>
                  <td style={{ ...tdStyle, fontFamily: mono, fontSize: 12 }}>{limit}</td>
                  <td style={{ ...tdStyle, fontFamily: mono, fontSize: 12 }}>{window}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ color: "#888", fontSize: 13, marginBottom: 12 }}>Response headers:</p>
          <JsonBlock>{`X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1709500800`}</JsonBlock>
        </Section>

        {/* Quick start */}
        <Section id="quickstart" title="Quick Start">
          <p style={{ marginBottom: 16 }}>
            Get rated market data into your environment in under 5 minutes.
          </p>

          {/* Python */}
          <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: 1, color: "#555", textTransform: "uppercase", marginBottom: 8 }}>Python</div>
          <JsonBlock>{`import requests

API_KEY = "aix_xxxxxxxxxxxxxxxxxxxx"
BASE = "https://airindex.io/api/v1"
headers = {"Authorization": f"Bearer {API_KEY}"}

# Get all ADVANCED markets
r = requests.get(f"{BASE}/markets", headers=headers)
markets = r.json()["data"]

for m in markets:
    if m["tier"] == "ADVANCED":
        print(f"{m['city']}: {m['score']} ({m['tier']})")`}</JsonBlock>

          {/* JavaScript */}
          <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: 1, color: "#555", textTransform: "uppercase", marginBottom: 8 }}>JavaScript / Node</div>
          <JsonBlock>{`const API_KEY = "aix_xxxxxxxxxxxxxxxxxxxx";
const BASE = "https://airindex.io/api/v1";

const res = await fetch(\`\${BASE}/markets/los_angeles/history\`, {
  headers: { "Authorization": \`Bearer \${API_KEY}\` }
});
const { data, meta } = await res.json();
console.log(\`\${data.length} snapshots\`);`}</JsonBlock>

          {/* cURL */}
          <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: 1, color: "#555", textTransform: "uppercase", marginBottom: 8 }}>cURL</div>
          <JsonBlock>{`# All markets
curl https://airindex.io/api/v1/markets \\
  -H "Authorization: Bearer aix_xxxxxxxxxxxxxxxxxxxx"

# Single market detail
curl https://airindex.io/api/v1/markets/dallas \\
  -H "Authorization: Bearer aix_xxxxxxxxxxxxxxxxxxxx"

# Bulk export
curl https://airindex.io/api/v1/markets/export \\
  -H "Authorization: Bearer aix_xxxxxxxxxxxxxxxxxxxx"`}</JsonBlock>
        </Section>

        {/* Citation */}
        <Section id="citation" title="Citation">
          <p style={{ marginBottom: 12 }}>
            When publishing analysis or reports that incorporate AirIndex API data,
            please use the following citation format:
          </p>
          <div
            style={{
              background: "rgba(0, 212, 255, 0.04)",
              border: "1px solid rgba(0, 212, 255, 0.12)",
              borderRadius: 8,
              padding: "20px 24px",
              fontFamily: mono,
              fontSize: 13,
              color: "#00d4ff",
              lineHeight: 1.8,
              marginBottom: 16,
            }}
          >
            AirIndex. (2026). UAM Market Readiness Ratings [Data set].
            <br />
            Retrieved [date] from https://airindex.io/api/v1.
            <br />
            Methodology: https://airindex.io/methodology
          </div>
          <p style={{ color: "#888", fontSize: 13 }}>
            All API responses include a <code style={{ fontFamily: mono, color: "#00d4ff" }}>meta</code> block
            with <code style={{ fontFamily: mono }}>rated_by</code>, <code style={{ fontFamily: mono }}>methodology_version</code>,
            and methodology URL. Attribution travels with the data by design.
          </p>
        </Section>

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
          <Link href="/api" style={{ color: "#00d4ff", textDecoration: "none" }}>
            API Overview
          </Link>
          <Link href="/dashboard" style={{ color: "#555", textDecoration: "none" }}>
            Dashboard
          </Link>
          <Link href="/methodology" style={{ color: "#555", textDecoration: "none" }}>
            Methodology
          </Link>
          <Link href="/" style={{ color: "#555", textDecoration: "none" }}>
            Home
          </Link>
        </div>
      </main>
    </div>
  );
}
