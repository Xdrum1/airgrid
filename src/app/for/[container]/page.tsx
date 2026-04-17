import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import TrackPageView from "@/components/TrackPageView";
import { LT } from "@/lib/landing-theme";

// ─────────────────────────────────────────────────────────
// Per-container conviction page content
// ─────────────────────────────────────────────────────────

interface ContainerPage {
  slug: string;
  eyebrow: string;
  headline: string;
  problem: string[];
  whatAisDoes: string[];
  decisionSupported: string[];
  withoutIt: string;
  sampleLabel: string;
  sampleBullets: string[];
  cta: string;
  accentColor: string;
}

const PAGES: Record<string, ContainerPage> = {
  insurance: {
    slug: "insurance",
    eyebrow: "For Aviation Insurance",
    headline:
      "How aviation underwriters structure defensible facility-level risk assessments.",
    problem: [
      "Underwriting aviation facilities requires pulling fragmented data across FAA records, state enforcement posture, airspace determinations, and fire-code adoption — from multiple agencies, in multiple formats.",
      "Most of it is manual. Most of it is undocumented in the file. When a loss event occurs, the question becomes: what did you know, and when did you know it?",
    ],
    whatAisDoes: [
      "AirIndex produces a RiskIndex Assessment for each facility — a single document that composes FAA registry data, 5-question compliance framework, airspace determinations, state regulatory burden, and peer benchmarking into an underwriting-ready artifact with an explicit coverage recommendation.",
      "Every assessment is AIS-backed: derived from the same real-time scoring methodology published at airindex.io/methodology. All data points are auditable against primary sources.",
    ],
    decisionSupported: [
      "Coverage terms and conditions",
      "Renewal-contingent endorsements",
      "E&O defensibility of the underwriting file",
      "Portfolio-level facility risk aggregation",
    ],
    withoutIt:
      "Facilities are underwritten with incomplete compliance documentation, increasing exposure to post-event review. Gaps that are invisible without systematic assessment become liabilities after a loss event.",
    sampleLabel: "What the output looks like",
    sampleBullets: [
      "4-tier risk classification (LOW / MODERATE / ELEVATED / CRITICAL)",
      "AIS-backed underwriting recommendation with suggested conditions",
      "5-question compliance grid with per-question status",
      "Risk factors with severity, remediation path, and tier impact",
      "Peer benchmark (percentile ranking among in-state facilities)",
      "Satellite visualization of the facility and surrounding airspace",
    ],
    cta: "We can run this on your facilities within 24 hours.",
    accentColor: "#f59e0b",
  },

  "risk-assessment": {
    slug: "risk-assessment",
    eyebrow: "For Underwriters & Facility Owners",
    headline:
      "What a facility-level risk assessment looks like before it enters an underwriting file.",
    problem: [
      "Every aviation facility has a compliance profile — FAA registration status, airspace determination, fire-code adoption, dimensional viability. Today, assembling that profile for a single facility takes 4-6 hours of manual research across fragmented sources.",
      "Most underwriting files don't contain this data at all. The gap isn't visible until a loss event forces the question.",
    ],
    whatAisDoes: [
      "The RiskIndex Assessment compresses that 4-6 hour research task into a single AIS-backed document delivered within 24 hours. Compliance grid, airspace flags, state context, satellite imagery, and an explicit underwriting recommendation — formatted for direct inclusion in the file.",
      "\"Unknown\" indicates no verifiable record found in primary sources and is treated as a compliance gap. Every data point traces to FAA NASR 5010, OE/AAA records, or state regulatory sources.",
    ],
    decisionSupported: [
      "Underwriting documentation and file completion",
      "Conditional coverage endorsements",
      "Portfolio risk aggregation across insured facilities",
      "Compliance gap identification before renewal",
    ],
    withoutIt:
      "Each facility is researched from scratch — or not researched at all. The compliance gaps that drive loss events remain invisible in the file until they matter most.",
    sampleLabel: "Assessment contents",
    sampleBullets: [
      "ELEVATED / CRITICAL / MODERATE / LOW tier with 0-100 risk score",
      "Underwriting Recommendation (AIS-Based) with 4 stances",
      "Suggested Conditions — copy-paste ready for policy endorsements",
      "Remediation path + tier impact per risk factor",
      "Peer benchmark — \"cleaner than X% of in-state peers\"",
      "Delivered within 24 hours of facility submission",
    ],
    cta: "Send us 3-5 facilities. We return AIS-backed assessments within 24 hours.",
    accentColor: "#f97316",
  },

  infrastructure: {
    slug: "infrastructure",
    eyebrow: "For Infrastructure Developers",
    headline:
      "How developers identify the binding constraint on infrastructure deployment.",
    problem: [
      "Vertiport and heliport development decisions depend on regulatory posture, zoning frameworks, state legislation, and FAA coordination — all of which vary by market and change over time.",
      "Most developers scope projects using incomplete information: press coverage, conference conversations, and outdated feasibility studies. The binding constraint on deployment is often invisible until capital is already committed.",
    ],
    whatAisDoes: [
      "AirIndex produces a gap-to-readiness analysis for each market that identifies the specific factor suppressing readiness — whether it's legislation, zoning, operator presence, or weather infrastructure — with cost and timeline to resolution.",
      "Every analysis is AIS-backed: the same 7-factor scoring model that updates as real-world signals change. Peer-market benchmarking shows why comparable markets are advancing faster.",
    ],
    decisionSupported: [
      "Market selection and capital allocation",
      "Project scoping and entitlement timeline estimation",
      "State-level infrastructure audit and gap identification",
      "Competitive positioning against peer markets",
    ],
    withoutIt:
      "Capital gets committed to markets where the binding constraint isn't legislation or operator presence — it's the zoning framework that doesn't exist yet. That gap costs 12-24 months of entitlement work that could have been identified in advance.",
    sampleLabel: "What the output includes",
    sampleBullets: [
      "AIS score with 7-factor breakdown per market",
      "Gap-to-readiness analysis with binding constraint identified",
      "Cost and timeline framing per gap",
      "Peer-market benchmarking (why others advance faster)",
      "State regulatory burden context (process friction, not just posture)",
      "Forward signals with decision windows",
    ],
    cta: "Send us a market you're evaluating. We return a gap assessment within 48 hours.",
    accentColor: "#5B8DB8",
  },

  operator: {
    slug: "operator",
    eyebrow: "For eVTOL Operators",
    headline:
      "How operators prioritize market entry and route sequencing.",
    problem: [
      "Market entry is a capital commitment — aircraft, facilities, regulatory coordination, workforce. Choosing the wrong market first costs 18-24 months and millions in misallocated resources.",
      "Most market-selection decisions are driven by operator announcements and press coverage, not structured readiness data. The result: capital concentrates in the same 3-4 markets while viable alternatives go unscored.",
    ],
    whatAisDoes: [
      "AirIndex scores 25 U.S. markets on the ground conditions that determine where commercial eVTOL operations actually launch — legislation, pilot programs, vertiport approvals, zoning, regulatory posture, and weather infrastructure.",
      "Forward signals identify markets approaching readiness inflection points before consensus forms. AIS updates as signals change — legislation passes, bills fail, operators commit.",
    ],
    decisionSupported: [
      "Market entry sequencing and timing",
      "Route planning against readiness infrastructure",
      "Competitive positioning vs. other operators",
      "Capital allocation across deployment candidates",
    ],
    withoutIt:
      "Market entry decisions are made on announcements and intent — not on the structural prerequisites that determine whether operations can actually launch. Markets that score well on press coverage can score poorly on buildability.",
    sampleLabel: "Intelligence delivered",
    sampleBullets: [
      "Market-by-market AIS scoring across 25 U.S. metros",
      "7-factor breakdown showing exactly what's present and what's missing",
      "Forward signals with predicted factor impact and decision windows",
      "Operator-graph intelligence (who's committed where)",
      "Regulatory posture + legislative trajectory per state",
    ],
    cta: "Tell us which markets you're evaluating. We return a readiness comparison within 48 hours.",
    accentColor: "#2dd4bf",
  },

  municipality: {
    slug: "municipality",
    eyebrow: "For Cities & State Agencies",
    headline:
      "Why some cities advance and others stall — and what closes the gap.",
    problem: [
      "Cities competing for eVTOL operations face a readiness gap they can't easily measure. Peer cities pass legislation, attract operators, and build infrastructure — but there's no standardized way to benchmark progress or identify what's actually missing.",
      "Economic development teams cite \"AAM readiness\" without a framework to define what that means or how to improve it. The result: policy conversations happen without operational data.",
    ],
    whatAisDoes: [
      "AirIndex scores every tracked market on the same 7-factor framework and publishes the methodology. Cities see exactly where they rank, which peers are advancing faster, and what specific actions close each gap.",
      "Federal program alignment shows which grants, pilots, and DOT initiatives map to a city's current readiness profile. Gap-to-readiness roadmaps provide actionable steps — not just scores.",
    ],
    decisionSupported: [
      "Economic development positioning and attraction strategy",
      "Federal program targeting and grant alignment",
      "Peer benchmarking against same-tier and same-state markets",
      "Zoning and legislative action prioritization",
    ],
    withoutIt:
      "Cities make AAM-readiness claims without a standardized framework. Peer cities advance on specific factors (legislation, zoning, pilot programs) while others invest in the wrong priorities — or don't invest at all.",
    sampleLabel: "What cities receive",
    sampleBullets: [
      "AIS score with factor-level comparison against 5 peer cities",
      "Gap analysis showing which factors suppress the score",
      "Specific actions that move each factor (with precedent examples)",
      "Federal program map showing alignment opportunities",
      "State legislative context and regulatory burden assessment",
    ],
    cta: "Tell us your city. We return a peer-benchmarked readiness assessment.",
    accentColor: "#0a2540",
  },

  investor: {
    slug: "investor",
    eyebrow: "For Institutional Investors",
    headline:
      "How investors time capital deployment in emerging infrastructure markets.",
    problem: [
      "AAM investment decisions depend on market-level readiness — not just aircraft certification. When infrastructure prerequisites aren't met, operator timelines slip, returns delay, and capital sits idle.",
      "Most investor diligence relies on operator presentations and press coverage. Structured, auditable readiness data across markets doesn't exist in standard research products.",
    ],
    whatAisDoes: [
      "AirIndex provides scored, source-traced market intelligence identifying when infrastructure readiness actually supports capital deployment — not when operators say it does.",
      "Forward signals track regulatory, infrastructure, and operator events with predicted timing. Every data point traces to primary sources — not analyst opinion, not press aggregation.",
    ],
    decisionSupported: [
      "Thesis timing and deployment-window identification",
      "Downside framework (what breaks the thesis in each market)",
      "Cross-market comparison for portfolio allocation",
      "Catalyst tracking with defined decision windows",
    ],
    withoutIt:
      "Capital deployment timing is based on operator announcements and consensus timing — both of which routinely slip. Markets that score well on narrative can score poorly on infrastructure readiness, and that gap isn't visible in standard diligence.",
    sampleLabel: "Intelligence delivered",
    sampleBullets: [
      "AIS scores across 25 markets with factor-level decomposition",
      "Forward signals with predicted impact and timing",
      "Operator deployment graph (who's committed where, with what)",
      "Catalyst map — events that confirm or invalidate the thesis",
      "Methodology fully published and auditable at airindex.io/methodology",
    ],
    cta: "Tell us which markets are in your thesis. We return a readiness assessment.",
    accentColor: "#a78bfa",
  },
};

const VALID_SLUGS = Object.keys(PAGES);

export function generateStaticParams() {
  return VALID_SLUGS.map((container) => ({ container }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ container: string }>;
}): Promise<Metadata> {
  const { container } = await params;
  const page = PAGES[container];
  if (!page) return { title: "Not Found — AirIndex" };
  return {
    title: `${page.eyebrow} — AirIndex`,
    description: page.headline,
    robots: "index, follow",
  };
}

export default async function ContainerPage({
  params,
}: {
  params: Promise<{ container: string }>;
}) {
  const { container } = await params;
  const page = PAGES[container];
  if (!page) notFound();

  return (
    <div style={{ background: LT.bg, color: LT.textPrimary, fontFamily: LT.fontBody, minHeight: "100vh" }}>
      <TrackPageView page={`/for/${page.slug}`} entityType="container-page" />
      <SiteNav theme="light" />

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "clamp(48px, 7vw, 88px) 24px 80px" }}>

        {/* Hero */}
        <div
          style={{
            fontFamily: LT.fontMono,
            fontSize: 11,
            letterSpacing: "0.14em",
            color: page.accentColor,
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          {page.eyebrow}
        </div>
        <h1
          style={{
            fontFamily: LT.fontDisplay,
            fontWeight: 700,
            fontSize: "clamp(28px, 4vw, 38px)",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            color: LT.textPrimary,
            margin: "0 0 32px",
          }}
        >
          {page.headline}
        </h1>

        {/* The problem */}
        <div
          style={{
            borderLeft: `3px solid ${page.accentColor}`,
            paddingLeft: 20,
            marginBottom: 36,
          }}
        >
          {page.problem.map((p, i) => (
            <p
              key={i}
              style={{
                color: LT.textSecondary,
                fontSize: 16,
                lineHeight: 1.7,
                margin: i < page.problem.length - 1 ? "0 0 14px" : "0",
              }}
            >
              {p}
            </p>
          ))}
        </div>

        {/* What AIS does */}
        <h2
          style={{
            fontFamily: LT.fontDisplay,
            fontWeight: 700,
            fontSize: 20,
            color: LT.textPrimary,
            margin: "0 0 14px",
          }}
        >
          What AirIndex delivers.
        </h2>
        {page.whatAisDoes.map((p, i) => (
          <p
            key={i}
            style={{
              color: LT.textSecondary,
              fontSize: 15,
              lineHeight: 1.7,
              margin: "0 0 14px",
            }}
          >
            {p}
          </p>
        ))}

        {/* Authority signal */}
        <div style={{ fontSize: 12, color: LT.textTertiary, fontStyle: "italic", marginBottom: 24 }}>
          Designed for direct inclusion in decision workflows. Not a dashboard — a decision artifact.
        </div>

        {/* Sample output */}
        <div
          style={{
            background: LT.subtleBg,
            border: `1px solid ${LT.cardBorder}`,
            borderTop: `3px solid ${page.accentColor}`,
            borderRadius: 10,
            padding: "22px 26px",
            margin: "28px 0",
          }}
        >
          <div
            style={{
              fontFamily: LT.fontMono,
              fontSize: 10,
              letterSpacing: "0.12em",
              color: page.accentColor,
              textTransform: "uppercase",
              marginBottom: 14,
              fontWeight: 700,
            }}
          >
            {page.sampleLabel}
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {page.sampleBullets.map((b, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "8px 0",
                  borderBottom: i < page.sampleBullets.length - 1 ? `1px solid ${LT.divider}` : "none",
                  color: LT.textSecondary,
                  fontSize: 14,
                  lineHeight: 1.55,
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 5,
                    background: page.accentColor,
                    marginTop: 7,
                    flexShrink: 0,
                  }}
                />
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Decision supported */}
        <h2
          style={{
            fontFamily: LT.fontDisplay,
            fontWeight: 700,
            fontSize: 20,
            color: LT.textPrimary,
            margin: "32px 0 14px",
          }}
        >
          What decision this supports.
        </h2>
        <ul style={{ margin: "0 0 24px", paddingLeft: 20 }}>
          {page.decisionSupported.map((d, i) => (
            <li
              key={i}
              style={{
                color: LT.textSecondary,
                fontSize: 15,
                lineHeight: 1.7,
                marginBottom: 6,
              }}
            >
              {d}
            </li>
          ))}
        </ul>

        {/* Without it */}
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            padding: "16px 20px",
            marginBottom: 32,
            fontSize: 14,
            color: "#991b1b",
            lineHeight: 1.65,
          }}
        >
          <strong>Without it.</strong> {page.withoutIt}
        </div>

        {/* CTA */}
        <div
          style={{
            background: LT.subtleBg,
            border: `1px solid ${LT.cardBorder}`,
            borderRadius: 10,
            padding: "24px 28px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: LT.fontDisplay,
              fontWeight: 600,
              fontSize: 17,
              color: LT.textPrimary,
              margin: "0 0 16px",
            }}
          >
            {page.cta}
          </p>
          <Link
            href="/contact"
            className="cta-primary"
            style={{
              display: "inline-block",
              padding: "14px 28px",
              background: LT.textPrimary,
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              borderRadius: 8,
            }}
          >
            Talk to us <span className="arrow">→</span>
          </Link>
        </div>

        {/* AIS anchor */}
        <div
          style={{
            marginTop: 32,
            paddingTop: 16,
            borderTop: `1px solid ${LT.cardBorder}`,
            fontSize: 12,
            color: LT.textTertiary,
            lineHeight: 1.6,
          }}
        >
          All outputs derived from the AirIndex Score (AIS) — a real-time,
          auditable market-readiness rating.{" "}
          <Link href="/methodology" style={{ color: LT.accent, textDecoration: "none" }}>
            Methodology
          </Link>{" "}
          ·{" "}
          <Link href="/how-it-works" style={{ color: LT.accent, textDecoration: "none" }}>
            How AIS works
          </Link>
        </div>
      </main>

      <SiteFooter theme="light" />
    </div>
  );
}
