import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import TrackPageView from "@/components/TrackPageView";
import { LT } from "@/lib/landing-theme";

export const metadata: Metadata = {
  title: "How AirIndex Works — AIS System Architecture",
  description:
    "How the AirIndex Score (AIS) detects, classifies, and scores real-world signals into auditable market-readiness ratings for vertical flight.",
  robots: "index, follow",
};

const S = {
  page: {
    background: LT.bg,
    color: LT.textPrimary,
    fontFamily: LT.fontBody,
    minHeight: "100vh",
  } as React.CSSProperties,
  main: {
    maxWidth: 760,
    margin: "0 auto",
    padding: "clamp(48px, 7vw, 88px) 24px 80px",
  } as React.CSSProperties,
  eyebrow: {
    fontFamily: LT.fontMono,
    fontSize: 11,
    letterSpacing: "0.14em",
    color: LT.accent,
    textTransform: "uppercase" as const,
    marginBottom: 16,
  } as React.CSSProperties,
  h1: {
    fontFamily: LT.fontDisplay,
    fontWeight: 700,
    fontSize: "clamp(30px, 4.2vw, 42px)",
    lineHeight: 1.1,
    letterSpacing: "-0.02em",
    color: LT.textPrimary,
    margin: "0 0 18px",
  } as React.CSSProperties,
  lead: {
    color: LT.textSecondary,
    fontSize: 17,
    lineHeight: 1.65,
    margin: "0 0 40px",
    maxWidth: 640,
  } as React.CSSProperties,
  h2: {
    fontFamily: LT.fontDisplay,
    fontWeight: 700,
    fontSize: 22,
    color: LT.textPrimary,
    margin: "48px 0 16px",
    paddingBottom: 10,
    borderBottom: `1px solid ${LT.cardBorder}`,
  } as React.CSSProperties,
  h3: {
    fontFamily: LT.fontDisplay,
    fontWeight: 600,
    fontSize: 16,
    color: LT.textPrimary,
    margin: "24px 0 8px",
  } as React.CSSProperties,
  p: {
    color: LT.textSecondary,
    fontSize: 15,
    lineHeight: 1.7,
    margin: "0 0 16px",
  } as React.CSSProperties,
  card: {
    background: LT.subtleBg,
    border: `1px solid ${LT.cardBorder}`,
    borderRadius: 10,
    padding: "18px 22px",
    marginBottom: 12,
  } as React.CSSProperties,
  mono: {
    fontFamily: LT.fontMono,
    fontSize: 12,
    letterSpacing: "0.06em",
  } as React.CSSProperties,
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: 14,
    marginBottom: 20,
  } as React.CSSProperties,
  th: {
    textAlign: "left" as const,
    padding: "10px 14px",
    borderBottom: `2px solid ${LT.cardBorder}`,
    color: LT.textPrimary,
    fontWeight: 600,
    fontSize: 12,
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
  } as React.CSSProperties,
  td: {
    padding: "10px 14px",
    borderBottom: `1px solid ${LT.cardBorder}`,
    color: LT.textSecondary,
    verticalAlign: "top" as const,
  } as React.CSSProperties,
};

function StepCard({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div style={{ display: "flex", gap: 16, ...S.card }}>
      <div
        style={{
          fontFamily: LT.fontMono,
          fontSize: 22,
          fontWeight: 700,
          color: LT.accent,
          opacity: 0.5,
          lineHeight: 1,
          marginTop: 2,
          flexShrink: 0,
          width: 28,
        }}
      >
        {num}
      </div>
      <div>
        <div style={{ fontWeight: 600, color: LT.textPrimary, marginBottom: 4, fontSize: 15 }}>{title}</div>
        <div style={{ color: LT.textSecondary, fontSize: 14, lineHeight: 1.6 }}>{desc}</div>
      </div>
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <div style={S.page}>
      <TrackPageView page="/how-it-works" />
      <SiteNav theme="light" />

      <main style={S.main}>
        <div style={S.eyebrow}>How It Works</div>
        <h1 style={S.h1}>How AirIndex works.</h1>
        <p style={S.lead}>
          AirIndex evaluates regulatory readiness, physical feasibility, and
          potential operational exposure — helping determine whether a market or
          facility is likely to be operationally viable, not just approved.
        </p>

        {/* ── Three questions ── */}
        <h2 style={S.h2}>Three questions most assessments don&apos;t answer</h2>
        <p style={S.p}>
          Every site and market is evaluated across three layers:
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, margin: "20px 0 32px" }}>
          <div style={{ padding: "16px 20px", background: "#f6f9fc", borderLeft: "3px solid #10b981", borderRadius: "0 8px 8px 0" }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#10b981", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>01 — IS IT ALLOWED?</div>
            <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.6 }}>Regulatory compliance, FAA records, airspace determinations, state and local requirements. The baseline that most assessments cover — necessary but not sufficient.</div>
          </div>
          <div style={{ padding: "16px 20px", background: "#f6f9fc", borderLeft: "3px solid #5B8DB8", borderRadius: "0 8px 8px 0" }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#5B8DB8", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>02 — CAN IT WORK?</div>
            <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.6 }}>Physical feasibility, dimensional constraints, pad geometry, and obstruction environment. A site can be fully compliant and still be physically unable to support the operations it was approved for.</div>
          </div>
          <div style={{ padding: "16px 20px", background: "#f6f9fc", borderLeft: "3px solid #f59e0b", borderRadius: "0 8px 8px 0" }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#f59e0b", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>03 — WILL IT BEHAVE?</div>
            <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.6 }}>Potential operational exposure — airflow, ventilation, wind interaction, and site-level environmental conditions that are not captured in FAA records or standard compliance checks.</div>
          </div>
        </div>
        <p style={S.p}>
          Most assessments stop at the first question. AirIndex evaluates all three.
        </p>

        {/* ── The AIS ── */}
        <h2 style={S.h2}>The AirIndex Score (AIS)</h2>
        <p style={S.p}>
          At the market level, AirIndex produces a 0–100 readiness score across
          seven independently weighted factors covering legislation, infrastructure,
          operator commitment, regulatory posture, and weather readiness.
          Scores map to four published tiers, each with an operational definition
          describing what distinguishes it. The full methodology — including factor
          rationale, tier definitions, and missing-data treatment — is{" "}
          <Link href="/methodology" style={{ color: LT.accent, textDecoration: "none", fontWeight: 600 }}>
            published at airindex.io/methodology
          </Link>.
        </p>
        <p style={S.p}>
          Scores update continuously as AirIndex detects changes in regulatory,
          infrastructure, and operator signals. Every score change traces to a
          specific primary-source document and is fully auditable over time.
        </p>

        {/* ── Primary sources ── */}
        <h2 style={S.h2}>Primary sources</h2>
        <p style={S.p}>
          AirIndex draws exclusively from primary government and regulatory
          databases — state legislatures, federal agencies, FAA registries, and
          regulatory filings. No third-party aggregators. No unverified reports.
          Every data point traces to its origin.
        </p>

        {/* ── Facility-level ── */}
        <h2 style={S.h2}>Facility-level assessment</h2>
        <p style={S.p}>
          At the facility level, AirIndex produces RiskIndex Assessments — structured
          evaluations that go beyond market readiness into site-specific compliance,
          dimensional feasibility, and operational exposure. The output is formatted
          for direct inclusion in underwriting files, planning documents, and
          investment memos.
        </p>

        {/* ── Buyer-specific ── */}
        <h2 style={S.h2}>Buyer-specific delivery</h2>
        <p style={S.p}>
          One scoring engine. Multiple purpose-built outputs. Each delivers
          the same underlying intelligence in the form a specific decision-maker
          uses — operators, insurers, developers, cities, and investors each see
          the data shaped to their world.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", gap: 10, marginBottom: 20 }}>
          {[
            ["Operator Intelligence", "Market-by-market deployment readiness"],
            ["Infrastructure Developer", "Gap-to-readiness analysis"],
            ["Municipality", "Peer benchmarking, gap identification"],
            ["Insurance", "Facility-level risk assessment with underwriting recommendation"],
            ["Investor", "Capital deployment timing and catalyst mapping"],
            ["RiskIndex Site Assessment", "Per-facility operability assessment"],
          ].map(([name, desc]) => (
            <div key={name} style={S.card}>
              <div style={{ fontWeight: 600, color: LT.textPrimary, fontSize: 14, marginBottom: 4 }}>{name}</div>
              <div style={{ color: LT.textTertiary, fontSize: 13 }}>{desc}</div>
            </div>
          ))}
        </div>

        {/* ── Closing ── */}
        <h2 style={S.h2}>What this is</h2>
        <p style={S.p}>
          AirIndex applies a ratings-agency discipline to vertical flight
          infrastructure — published methodology, continuously updated scores,
          and auditable history. The system detects and responds to market-moving
          signals from primary sources. The output goes directly into the documents
          where decisions are made.
        </p>
        <p style={S.p}>
          Not a dashboard. Not a quarterly report. An intelligence system that
          answers whether a market is ready and whether a site is actually operable.
        </p>

        <div style={{ marginTop: 40, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link
            href="/methodology"
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
            Read the methodology <span className="arrow">→</span>
          </Link>
          <Link
            href="/contact"
            className="cta-secondary"
            style={{
              display: "inline-block",
              padding: "14px 28px",
              border: `1px solid ${LT.cardBorder}`,
              color: LT.textPrimary,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              borderRadius: 8,
              background: LT.bg,
            }}
          >
            Talk to us <span className="arrow">→</span>
          </Link>
        </div>
      </main>

      <SiteFooter theme="light" />
    </div>
  );
}
