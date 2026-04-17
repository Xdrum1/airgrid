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
        <div style={S.eyebrow}>System Architecture</div>
        <h1 style={S.h1}>How AirIndex works.</h1>
        <p style={S.lead}>
          AirIndex detects regulatory, infrastructure, and operator signals from
          primary government sources — classifies them, scores them against a
          published 7-factor methodology, and delivers auditable market-readiness
          ratings to the teams making capital, policy, and coverage decisions.
        </p>

        {/* ── The core loop ── */}
        <h2 style={S.h2}>The core loop</h2>
        <p style={S.p}>
          Every day at 06:00 UTC, AirIndex ingests data from primary-source APIs.
          Each signal passes through a five-step pipeline before it affects a score.
        </p>

        <StepCard num="01" title="Ingestion" desc="Raw records pulled from government APIs — LegiScan, Federal Register, SEC EDGAR, Congress.gov, Regulations.gov, FAA NASR 5010. Deduplicated against existing records." />
        <StepCard num="02" title="Classification" desc="AI classifier reads each record and determines: which market does this affect? Which scoring factor does it touch? What's the confidence level?" />
        <StepCard num="03" title="Override generation" desc="High-confidence classifications generate scoring overrides. Each override specifies: city, factor, new value, reason, source link." />
        <StepCard num="04" title="Score update" desc="The scoring engine recomputes the city's AIS from the 7 weighted factors. Deterministic — same inputs always produce the same score." />
        <StepCard num="05" title="Snapshot" desc="The full score breakdown is captured with a timestamp. This creates the historical record that makes every score auditable over time." />

        {/* ── Primary sources ── */}
        <h2 style={S.h2}>Primary sources</h2>
        <p style={S.p}>
          Every score change traces to a specific source document. AirIndex draws
          exclusively from primary government and regulatory databases.
        </p>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Source</th>
              <th style={S.th}>What it provides</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["LegiScan", "State-level AAM legislation across all 50 states"],
              ["Federal Register", "FAA rulemaking, powered-lift SFARs, airspace actions"],
              ["SEC EDGAR", "Operator financial filings, 8-K disclosures"],
              ["Congress.gov", "Federal AAM bills, committee actions"],
              ["Regulations.gov", "FAA docket activity, proposed rules"],
              ["FAA NASR 5010", "5,647 registered heliports mapped to metros"],
            ].map(([src, desc]) => (
              <tr key={src}>
                <td style={{ ...S.td, fontWeight: 600, color: LT.textPrimary, whiteSpace: "nowrap" }}>{src}</td>
                <td style={S.td}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Scoring ── */}
        <h2 style={S.h2}>The AirIndex Score (AIS)</h2>
        <p style={S.p}>
          7 factors. 100 points. Each factor has a published weight and a clear
          rationale for why it carries that weight. The full methodology — including
          factor rationale, tier definitions, and missing-data treatment — is{" "}
          <Link href="/methodology" style={{ color: LT.accent, textDecoration: "none", fontWeight: 600 }}>
            published at airindex.io/methodology
          </Link>.
        </p>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Factor</th>
              <th style={{ ...S.th, textAlign: "right" }}>Weight</th>
              <th style={S.th}>Type</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["State Legislation", "20", "Graduated"],
              ["Active Pilot Program", "15", "Binary"],
              ["Approved Vertiport", "15", "Binary"],
              ["Active Operator Presence", "15", "Binary"],
              ["Vertiport Zoning", "15", "Binary"],
              ["Regulatory Posture", "10", "Graduated"],
              ["Weather Infrastructure", "10", "Graduated"],
            ].map(([f, w, t]) => (
              <tr key={f}>
                <td style={{ ...S.td, fontWeight: 600, color: LT.textPrimary }}>{f}</td>
                <td style={{ ...S.td, textAlign: "right", fontFamily: LT.fontMono }}>{w}</td>
                <td style={S.td}>{t}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={S.p}>
          Scores map to four tiers: <strong>ADVANCED</strong> (75–100),{" "}
          <strong>MODERATE</strong> (50–74), <strong>EARLY</strong> (30–49),{" "}
          <strong>NASCENT</strong> (0–29). Each tier has a published operational
          definition describing what distinguishes it.
        </p>

        {/* ── Forward signals ── */}
        <h2 style={S.h2}>Forward signals</h2>
        <p style={S.p}>
          On top of scoring, AirIndex tracks events that haven&apos;t resolved yet
          but have a defined decision window — FAA aeronautical studies in progress,
          state bills advancing through committee, operator market-entry announcements.
          Each forward signal has a predicted factor impact and a time horizon. When
          signals resolve, the accuracy is logged.
        </p>

        {/* ── Container model ── */}
        <h2 style={S.h2}>Buyer-specific delivery</h2>
        <p style={S.p}>
          One scoring engine. Six purpose-built outputs. Each container delivers
          the same underlying intelligence in the form a specific decision-maker
          uses — operators, insurers, developers, cities, and investors each see
          the data shaped to their world.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", gap: 10, marginBottom: 20 }}>
          {[
            ["Operator Intelligence", "Market-by-market deployment readiness"],
            ["Infrastructure Developer", "Gap-to-readiness with cost + timeline"],
            ["Municipality", "Peer benchmarking, federal program alignment"],
            ["Insurance", "Compliance audit, RiskIndex facility assessments"],
            ["Investor", "Thesis timing, catalyst mapping"],
            ["RiskIndex Site Assessment", "Per-facility risk with underwriting recommendation"],
          ].map(([name, desc]) => (
            <div key={name} style={S.card}>
              <div style={{ fontWeight: 600, color: LT.textPrimary, fontSize: 14, marginBottom: 4 }}>{name}</div>
              <div style={{ color: LT.textTertiary, fontSize: 13 }}>{desc}</div>
            </div>
          ))}
        </div>

        {/* ── Audit trail ── */}
        <h2 style={S.h2}>Audit trail</h2>
        <p style={S.p}>
          Every AIS score is fully auditable. Score snapshots capture the full
          7-factor breakdown at every update. Every override logs: source record,
          reason, confidence, origin (classifier / analyst / admin), and applied date.
          The Data Confidence flag surfaces markets where source data exceeds the
          60-day verification window.
        </p>
        <p style={S.p}>
          If someone asks &ldquo;why is Phoenix at 40 AIS?&rdquo; — the system shows:
          legislation factor = 0 (override applied April 10, source: LegiScan AZ SB1827,
          reason: failed 6-12 in House Appropriations, confidence: high, origin: classifier).
        </p>

        {/* ── Closing ── */}
        <h2 style={S.h2}>What this is</h2>
        <p style={S.p}>
          AirIndex applies a Moody&apos;s-style rating discipline to vertical flight
          markets — published methodology, auditable overrides, and continuously
          updated scores. The system detects and responds to market-moving signals
          in real time. The output goes directly into underwriting files, planning
          documents, and investment memos.
        </p>
        <p style={S.p}>
          Not a dashboard. Not a quarterly report. A stateful, event-driven
          intelligence system with historical memory.
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
