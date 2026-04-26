import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import TrackPageView from "@/components/TrackPageView";
import BuyerTypeSelector from "@/components/BuyerTypeSelector";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { PRODUCTS, type Product } from "@/lib/products";

export const metadata: Metadata = {
  title: "Market Intelligence Briefings — AirIndex",
  description:
    "Custom UAM market analysis — from single-city snapshots to multi-market strategic assessments. Purpose-built methodology for operators, infrastructure developers, government agencies, insurance underwriters, and investors.",
};

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

// Persona briefings come from the catalog — every product whose format is "briefing"
const BRIEFING_PRODUCTS = PRODUCTS.filter(
  (p) => p.format === "briefing" && p.container !== "cross-cutting",
);

// Question framing per persona — used to set the hero text on each card
const PERSONA_QUESTIONS: Record<string, string> = {
  "infra-developer": "Can I build here and what will it take?",
  municipality: "Where do we stand vs peers and how do we close the gap?",
  insurance: "What's my exposure on this portfolio?",
  operator: "Should I deploy my fleet here, and when?",
  investor: "Which markets prove or invalidate the UAM thesis?",
};

function PersonaCard({ product }: { product: Product }) {
  const question = PERSONA_QUESTIONS[product.container] ?? product.pitch;
  return (
    <div
      style={{
        background: "#f9fbfd",
        border: "1px solid #e3e8ee",
        borderLeft: `3px solid ${product.accent}`,
        borderRadius: 8,
        padding: "20px 22px 18px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 9,
            letterSpacing: 2,
            color: product.accent,
            textTransform: "uppercase",
          }}
        >
          {product.containerLabel}
        </div>
        {product.badge && (
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 8,
              letterSpacing: 1,
              color: "#050508",
              background: product.accent,
              padding: "2px 6px",
              borderRadius: 3,
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            {product.badge}
          </span>
        )}
      </div>
      <div
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 15,
          fontWeight: 600,
          color: "#0a2540",
          lineHeight: 1.4,
          margin: "0 0 10px",
        }}
      >
        &ldquo;{question}&rdquo;
      </div>
      <div style={{ fontSize: 11, color: "#697386", marginBottom: 8 }}>
        <strong style={{ color: "#425466" }}>For:</strong> {product.audience}
      </div>
      <div style={{ fontSize: 11, color: "#697386", lineHeight: 1.6, marginBottom: 12 }}>
        {product.description}
      </div>
      <div
        style={{
          fontSize: 11,
          fontFamily: "'Space Mono', monospace",
          color: "#425466",
          marginBottom: 14,
        }}
      >
        {product.price}
        {product.priceNote ? ` · ${product.priceNote}` : ""}
        {product.turnaround ? ` · ${product.turnaround}` : ""}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
        {product.sampleRoute && (
          <Link
            href={product.sampleRoute}
            style={{
              display: "inline-block",
              padding: "8px 14px",
              border: `1px solid ${product.accent}`,
              borderRadius: 5,
              color: product.accent,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            View Sample →
          </Link>
        )}
        <Link
          href={`/contact?product=${product.id}&ref=briefings`}
          style={{
            display: "inline-block",
            padding: "8px 14px",
            background: product.accent,
            borderRadius: 5,
            color: "#ffffff",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          {product.cta}
        </Link>
      </div>
    </div>
  );
}

export default function BriefingsPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        color: "#0a2540",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <TrackPageView page="briefings" />
      <SiteNav theme="light" />

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
              color: "#5B8DB8",
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
              color: "#0a2540",
              margin: "0 0 14px",
              lineHeight: 1.2,
            }}
          >
            Market Intelligence Briefings
          </h1>
          <p
            style={{
              color: "#697386",
              fontSize: 15,
              margin: "0 0 16px",
              lineHeight: 1.6,
            }}
          >
            Custom analysis of the markets that matter to your decision.
          </p>
          <p
            style={{
              color: "#425466",
              fontSize: 14,
              margin: 0,
              lineHeight: 1.7,
              maxWidth: 680,
            }}
          >
            AirIndex scores tell you where a market stands. A Market
            Intelligence Briefing tells you why — and what it would take to
            change it. Choose the briefing framed for the question your team is
            actually asking.
          </p>
        </div>

        {/* ── Platform Preview ──────────────────────── */}
        <div
          style={{
            marginBottom: 56,
            borderRadius: 10,
            overflow: "hidden",
            border: "1px solid #e3e8ee",
            boxShadow: "0 0 60px rgba(91,141,184,0.04)",
            maxWidth: 400,
            margin: "0 auto 56px",
          }}
        >
          <Image
            src="/images/detail-panel-phoenix.png"
            alt="AirIndex city detail panel — Phoenix at 50 with factor breakdown, citations, score timeline, and gap analysis"
            width={400}
            height={900}
            style={{ width: "100%", height: "auto", display: "block" }}
          />
          <div
            style={{
              padding: "10px 16px",
              background: "#f9fbfd",
              borderTop: "1px solid #e3e8ee",
              textAlign: "center",
            }}
          >
            <span style={{ color: "#8792a2", fontSize: 10 }}>
              Factor breakdown, source citations, score timeline, and gap analysis — Phoenix, AZ
            </span>
          </div>
        </div>

        {/* ── Buyer Type Selector ───────────────────── */}
        <BuyerTypeSelector />

        {/* ── Persona Briefings — driven from catalog ─────── */}
        <section style={{ marginBottom: 64 }}>
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 20,
              color: "#0a2540",
              marginBottom: 8,
              paddingBottom: 12,
              borderBottom: "1px solid #e3e8ee",
            }}
          >
            Persona Briefings
          </h2>
          <p
            style={{
              color: "#697386",
              fontSize: 13,
              lineHeight: 1.7,
              margin: "0 0 24px",
              maxWidth: 720,
            }}
          >
            Audience-specific per-market deliverables, each pulling from the
            same intelligence pipeline but framed for the questions a specific
            buyer actually asks. Preview the live sample for any briefing
            below; all 25 tracked markets are available on request.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 14,
            }}
          >
            {BRIEFING_PRODUCTS.map((p) => (
              <PersonaCard key={p.id} product={p} />
            ))}
          </div>
        </section>

        {/* ── What's Inside ──────────────────────────── */}
        <section style={{ marginBottom: 64 }}>
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 20,
              color: "#0a2540",
              marginBottom: 20,
              paddingBottom: 12,
              borderBottom: "1px solid #e3e8ee",
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
                  background: "#f9fbfd",
                  border: "1px solid #e3e8ee",
                  borderRadius: 8,
                  padding: "20px 20px 18px",
                }}
              >
                <h3
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700,
                    fontSize: 14,
                    color: "#0a2540",
                    margin: "0 0 8px",
                  }}
                >
                  {section.title}
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: "#425466",
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
            borderTop: "1px solid #e3e8ee",
          }}
        >
          <p
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 18,
              color: "#0a2540",
              marginBottom: 16,
            }}
          >
            Looking for the full catalog?
          </p>
          <p
            style={{
              color: "#697386",
              fontSize: 13,
              lineHeight: 1.6,
              margin: "0 auto 20px",
              maxWidth: 480,
            }}
          >
            Beyond market briefings, we offer site-level risk assessments,
            jurisdiction-level audits, portfolio monitoring, and API access.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/pricing"
              style={{
                display: "inline-block",
                padding: "12px 28px",
                background: "#5B8DB8",
                color: "#ffffff",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 700,
                fontSize: 13,
                borderRadius: 6,
                textDecoration: "none",
                letterSpacing: 0.3,
              }}
            >
              See All Products
            </Link>
            <Link
              href="/contact?ref=briefings"
              style={{
                display: "inline-block",
                padding: "12px 28px",
                border: "1px solid #5B8DB8",
                color: "#5B8DB8",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 700,
                fontSize: 13,
                borderRadius: 6,
                textDecoration: "none",
                letterSpacing: 0.3,
              }}
            >
              Talk to Us
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter theme="light" />
    </div>
  );
}
