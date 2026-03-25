import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Institutional — AirIndex",
  description:
    "API access, data export, and dedicated support for organizations embedding UAM market readiness intelligence into their workflows.",
};

// -------------------------------------------------------
// Card style helpers
// -------------------------------------------------------
const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 12,
  padding: "28px 28px 32px",
};

const cardTitleStyle: React.CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontWeight: 700,
  fontSize: 15,
  color: "#e0e0e0",
  margin: "0 0 12px",
};

const cardBodyStyle: React.CSSProperties = {
  color: "#888",
  fontSize: 13,
  lineHeight: 1.7,
  margin: 0,
};

// -------------------------------------------------------
// Data
// -------------------------------------------------------
const INCLUDED = [
  {
    title: "API Access",
    body: "RESTful endpoints for readiness scores, factor breakdowns, corridor data, and historical snapshots. Dedicated rate limits (1,000 req/hr). Bearer token authentication with team key management.",
  },
  {
    title: "Data Export",
    body: "JSON export of all tracked markets with full factor-level detail. Score history and trajectory data for trend analysis and internal reporting.",
  },
  {
    title: "Gap Analysis Reports",
    body: "Downloadable per-city gap reports with factor breakdown, competitive context, priority matrix, and federal grant language. Branded for your organization.",
  },
];

const BUILT_FOR = [
  {
    title: "eVTOL Operators",
    body: "Monitor market readiness conditions across all 20+ tracked metros. Integrate score trajectories into market entry timing models.",
  },
  {
    title: "Infrastructure Developers",
    body: "Site selection intelligence with factor-level detail on zoning, permitting, and vertiport readiness per market.",
  },
  {
    title: "Investment & Finance",
    body: "Due diligence data for UAM-adjacent investments. Historical score trends, regulatory signal tracking, and competitive benchmarking.",
  },
  {
    title: "Government & Policy",
    body: "Federal program alignment, legislative tracking across 5+ states, and standardized benchmarking against peer markets.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Schedule a walkthrough",
    body: "30-minute overview of the platform, API, and how teams are using AirIndex data.",
  },
  {
    num: "02",
    title: "Onboarding & integration",
    body: "Dedicated setup support, API key provisioning, and data orientation for your team.",
  },
  {
    num: "03",
    title: "Ongoing intelligence",
    body: "Daily pipeline updates, monthly reports, priority support, and quarterly methodology reviews.",
  },
];

// -------------------------------------------------------
// Page
// -------------------------------------------------------
export default async function InstitutionalPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050508",
        fontFamily: "'Inter', sans-serif",
        color: "#e0e0e0",
      }}
    >
      <SiteNav />

      {/* ---- Hero ---- */}
      <section
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: "clamp(48px, 6vw, 80px) 20px 0",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 3,
            color: "#00d4ff",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          INSTITUTIONAL
        </div>
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(28px, 4vw, 40px)",
            margin: "0 0 20px",
            lineHeight: 1.3,
            color: "#e0e0e0",
          }}
        >
          UAM intelligence infrastructure for teams and organizations
        </h1>
        <p
          style={{
            color: "#888",
            fontSize: 15,
            margin: "0 auto",
            lineHeight: 1.7,
            maxWidth: 660,
          }}
        >
          Structured API access, data export, and dedicated support for
          organizations embedding market readiness data into investment,
          planning, and operational workflows.
        </p>
      </section>

      {/* ---- What's included ---- */}
      <section
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "clamp(48px, 6vw, 80px) 20px 0",
        }}
      >
        <h2
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(20px, 3vw, 26px)",
            textAlign: "center",
            marginBottom: 40,
            color: "#e0e0e0",
          }}
        >
          What&apos;s included
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          {INCLUDED.map((item) => (
            <div key={item.title} style={cardStyle}>
              <h3 style={cardTitleStyle}>{item.title}</h3>
              <p style={cardBodyStyle}>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Built for ---- */}
      <section
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "clamp(48px, 6vw, 80px) 20px 0",
        }}
      >
        <h2
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(20px, 3vw, 26px)",
            textAlign: "center",
            marginBottom: 40,
            color: "#e0e0e0",
          }}
        >
          Built for
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 20,
          }}
        >
          {BUILT_FOR.map((item) => (
            <div key={item.title} style={cardStyle}>
              <h3 style={cardTitleStyle}>{item.title}</h3>
              <p style={cardBodyStyle}>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- How it works ---- */}
      <section
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "clamp(48px, 6vw, 80px) 20px 0",
        }}
      >
        <h2
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(20px, 3vw, 26px)",
            textAlign: "center",
            marginBottom: 40,
            color: "#e0e0e0",
          }}
        >
          How it works
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          {STEPS.map((step) => (
            <div key={step.num} style={cardStyle}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 2,
                  color: "#00d4ff",
                  marginBottom: 12,
                }}
              >
                STEP {step.num}
              </div>
              <h3 style={cardTitleStyle}>{step.title}</h3>
              <p style={cardBodyStyle}>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Pricing ---- */}
      <section
        style={{
          maxWidth: 640,
          margin: "0 auto",
          padding: "clamp(48px, 6vw, 80px) 20px 0",
        }}
      >
        <div
          style={{
            ...cardStyle,
            textAlign: "center",
            padding: "40px 36px",
          }}
        >
          <div
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(24px, 3.5vw, 32px)",
              color: "#e0e0e0",
              marginBottom: 8,
            }}
          >
            $499/month or $4,990/year
          </div>
          <div
            style={{
              color: "#888",
              fontSize: 13,
              marginBottom: 24,
            }}
          >
            3 seats included (+$99/seat)
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              alignItems: "center",
            }}
          >
            {[
              "Full API access with 1,000 req/hr",
              "Data export (JSON)",
              "Gap analysis reports",
              "Priority support & onboarding",
              "Annual plans include quarterly methodology review calls",
            ].map((line) => (
              <div
                key={line}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  color: "#888",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                <span
                  style={{
                    color: "#00d4ff",
                    fontSize: 8,
                    flexShrink: 0,
                  }}
                >
                  &#9646;
                </span>
                {line}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: "clamp(48px, 6vw, 80px) 20px 0",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(22px, 3vw, 30px)",
            marginBottom: 28,
            color: "#e0e0e0",
          }}
        >
          Ready to integrate UAM readiness data?
        </h2>
        <Link
          href="/contact?tier=institutional"
          style={{
            display: "inline-block",
            background: "#00d4ff",
            color: "#050508",
            fontWeight: 700,
            fontSize: 14,
            padding: "14px 36px",
            borderRadius: 8,
            textDecoration: "none",
            letterSpacing: 0.3,
          }}
        >
          Schedule a Walkthrough
        </Link>
        <div style={{ marginTop: 16, color: "#888", fontSize: 13 }}>
          or email{" "}
          <a
            href="mailto:sales@airindex.io"
            style={{
              color: "#00d4ff",
              textDecoration: "none",
              borderBottom: "1px solid rgba(0,212,255,0.3)",
            }}
          >
            sales@airindex.io
          </a>
        </div>
      </section>

      {/* ---- Trust line ---- */}
      <section
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: "clamp(48px, 6vw, 80px) 20px 40px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            color: "#555",
            fontSize: 12,
            letterSpacing: 0.3,
            margin: 0,
          }}
        >
          Built for teams in eVTOL operations, infrastructure development,
          government, and investment.
        </p>
      </section>

      <SiteFooter />
    </div>
  );
}
