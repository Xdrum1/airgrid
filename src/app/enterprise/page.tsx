import Link from "next/link";
import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Enterprise — AirIndex",
  description:
    "Custom UAM data infrastructure — white-label endpoints, webhooks, embedded widgets, and direct data feeds built around your organization's requirements.",
};

const CAPABILITIES = [
  {
    title: "White-Label API",
    description:
      "Branded endpoints that serve AirIndex data under your domain. Custom response schemas and field mapping to match your internal data models.",
  },
  {
    title: "Webhooks & Event Streams",
    description:
      "Real-time push notifications for score changes, regulatory signals, and market events. Subscribe to specific markets, factors, or threshold triggers.",
  },
  {
    title: "Embedded Widgets",
    description:
      "Drop-in components for readiness scores, market maps, and factor breakdowns. Embed AirIndex intelligence directly into your platform or internal tools.",
  },
  {
    title: "Direct Data Feeds",
    description:
      "Scheduled bulk data delivery in your preferred format. Daily, weekly, or custom cadence with full historical backfill.",
  },
  {
    title: "Custom SLA",
    description:
      "Guaranteed uptime, dedicated support channel, and incident response commitments tailored to your operational requirements.",
  },
  {
    title: "Data Licensing",
    description:
      "Flexible licensing terms for redistribution, derivative works, and internal use. Annual agreements with clear scope and renewal terms.",
  },
];

const USE_CASES = [
  {
    title: "Aviation Consulting Firms",
    description:
      "Embed readiness scores into client presentations, market assessments, and strategic advisory deliverables. White-label reports under your brand.",
  },
  {
    title: "Airport Authorities & MPOs",
    description:
      "Integrate market readiness tracking into long-range transportation plans, capital improvement programs, and federal grant applications.",
  },
  {
    title: "Data & Analytics Platforms",
    description:
      "Add UAM readiness intelligence as a data layer alongside your existing infrastructure, real estate, or transportation datasets.",
  },
];

export default async function EnterprisePage() {
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

      {/* Hero */}
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
            color: "#7c3aed",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          ENTERPRISE
        </div>
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(28px, 4vw, 40px)",
            margin: "0 0 16px",
            lineHeight: 1.3,
            color: "#fff",
          }}
        >
          Custom data infrastructure for advanced air mobility
        </h1>
        <p
          style={{
            color: "#888",
            fontSize: 15,
            margin: "0 auto",
            lineHeight: 1.7,
            maxWidth: 620,
          }}
        >
          White-label endpoints, webhooks, embedded widgets, and direct data
          feeds — built around your organization&apos;s requirements.
        </p>
      </section>

      {/* Capabilities */}
      <section
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "clamp(48px, 6vw, 80px) 20px 0",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 20,
          }}
        >
          {CAPABILITIES.map((cap) => (
            <div
              key={cap.title}
              style={{
                background: "#0a0a12",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 12,
                padding: "28px 24px",
              }}
            >
              <h3
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: 15,
                  color: "#fff",
                  margin: "0 0 10px",
                }}
              >
                {cap.title}
              </h3>
              <p
                style={{
                  color: "#888",
                  fontSize: 13,
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {cap.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Use Cases */}
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
            fontSize: "clamp(20px, 3vw, 28px)",
            textAlign: "center",
            color: "#fff",
            margin: "0 0 32px",
          }}
        >
          Built for
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 20,
          }}
        >
          {USE_CASES.map((uc) => (
            <div
              key={uc.title}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 12,
                padding: "28px 24px",
              }}
            >
              <h3
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: 15,
                  color: "#fff",
                  margin: "0 0 10px",
                }}
              >
                {uc.title}
              </h3>
              <p
                style={{
                  color: "#888",
                  fontSize: 13,
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {uc.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How we work together */}
      <section
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: "clamp(48px, 6vw, 80px) 20px 0",
        }}
      >
        <h2
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(20px, 3vw, 28px)",
            textAlign: "center",
            color: "#fff",
            margin: "0 0 24px",
          }}
        >
          How we work together
        </h2>
        <p
          style={{
            color: "#888",
            fontSize: 14,
            lineHeight: 1.8,
            margin: "0 0 16px",
            textAlign: "center",
          }}
        >
          Enterprise partnerships start with a technical discovery call to
          understand your data requirements, integration architecture, and use
          case. We scope a custom solution, agree on licensing terms, and deliver
          a production-ready integration — typically within 4-6 weeks.
        </p>
        <p
          style={{
            color: "#888",
            fontSize: 14,
            lineHeight: 1.8,
            margin: 0,
            textAlign: "center",
          }}
        >
          Pricing is based on data scope, delivery method, and redistribution
          rights. Minimum engagement starts at $2,500/month.
        </p>
      </section>

      {/* CTA */}
      <section
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: "clamp(48px, 6vw, 80px) 20px",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(22px, 3vw, 32px)",
            color: "#fff",
            margin: "0 0 24px",
            lineHeight: 1.3,
          }}
        >
          Let&apos;s build your UAM data infrastructure
        </h2>
        <Link
          href="/contact?tier=enterprise"
          style={{
            display: "inline-block",
            background: "#7c3aed",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            padding: "14px 32px",
            borderRadius: 8,
            textDecoration: "none",
            letterSpacing: 0.3,
          }}
        >
          Schedule a Discovery Call
        </Link>
        <p style={{ color: "#666", fontSize: 13, marginTop: 16 }}>
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
        </p>
      </section>

      {/* Trust line */}
      <section
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: "0 20px 48px",
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
          Serving organizations across eVTOL operations, infrastructure
          development, government, and financial services.
        </p>
      </section>

      <SiteFooter />
    </div>
  );
}
