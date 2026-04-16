import type { Metadata } from "next";
import Link from "next/link";
import TrackPageView from "@/components/TrackPageView";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Heliport Infrastructure Audit — AirIndex",
  description:
    "State-level heliport compliance screening across 5,647 FAA-registered facilities. Five-question audit covering FAA registration, airspace determinations, NFPA 418 adoption, and eVTOL viability.",
};

const CHECKLIST = [
  {
    q: "Q1: FAA Registration",
    desc: "Does the facility have a current FAA NASR 5010 registration?",
    source: "FAA NASR 28-day subscription",
    status: "Live",
  },
  {
    q: "Q2: Airspace Determination",
    desc: "Is there an FAA OE/AAA airspace determination on file? Conditional or objectionable determinations are flagged — 3,868 conditional and 42 objectionable determinations exist nationwide.",
    source: "FAA OE/AAA Determined Cases",
    status: "Integration in progress",
  },
  {
    q: "Q3: State Enforcement Posture",
    desc: "Does the state actively enforce heliport/vertiport standards? States with strong enforcement have lower compliance risk across the portfolio.",
    source: "AirIndex Market Context Store",
    status: "Live — 17 states",
  },
  {
    q: "Q4: NFPA 418 Adoption",
    desc: "Is NFPA 418 (Standard for Heliports) referenced in the local fire or building code? Absence means the facility may not meet current safety standards.",
    source: "Municipality ordinance audit",
    status: "5 markets audited",
  },
  {
    q: "Q5: eVTOL Dimensional Viability",
    desc: "Can the TLOF/FATO accommodate eVTOL minimum dimensions (50\u00d750 ft)? Most hospital helipads were built to a 40\u00d740 ft standard and cannot expand.",
    source: "FAA NASR site classification",
    status: "Live — hospital sites flagged",
  },
];

const BUYERS = [
  {
    title: "State DOTs & Aviation Divisions",
    desc: "Baseline the heliport infrastructure you already have. Identify which facilities are compliant, which need remediation, and which are data quality issues in the FAA system.",
    price: "$25,000\u2013$50,000 per state",
  },
  {
    title: "Insurance Carriers & Underwriters",
    desc: "Screen your portfolio against five compliance criteria. Stop pricing risk based on self-reported documentation. Know which sites are compliant, conditional, or objectionable before renewal.",
    price: "$75,000\u2013$150,000 portfolio screening",
  },
  {
    title: "Airport Authorities",
    desc: "Audit heliport assets under your jurisdiction. Identify facilities that don\u2019t meet current AC 150/5390-2D standards before the FAA\u2019s unified Advisory Circular takes effect.",
    price: "$15,000\u2013$25,000",
  },
  {
    title: "Infrastructure Developers",
    desc: "Site selection starts with verified data, not FAA 5010 records known to be inaccurate. Know which existing heliports can support eVTOL conversion and which are greenfield only.",
    price: "Included with market briefing",
  },
];

export default function HeliportAuditPage() {
  return (
    <div
      style={{
        background: "#ffffff",
        color: "#0a2540",
        minHeight: "100vh",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <TrackPageView page="heliport-audit" />
      <SiteNav theme="light" />

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* Hero */}
        <div style={{ marginBottom: 48 }}>
          <div style={{
            fontSize: 9,
            letterSpacing: 3,
            color: "#5B8DB8",
            fontFamily: "'Space Mono', monospace",
            marginBottom: 16,
          }}>
            HELIPORT INFRASTRUCTURE AUDIT
          </div>
          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "clamp(28px, 4vw, 38px)",
            fontWeight: 700,
            color: "#0a2540",
            margin: "0 0 16px",
            letterSpacing: "-0.02em",
          }}>
            The FAA doesn&apos;t know what&apos;s on its own heliport registry.
          </h1>
          <p style={{ color: "#697386", fontSize: 14, lineHeight: 1.8, maxWidth: 640 }}>
            Of the 5,647 FAA-registered heliports in the US, hundreds no longer exist, thousands have
            inaccurate data, and none have been verified against current standards. AirIndex screens
            every facility against five compliance questions — then tells you exactly which sites
            need remediation, what the liability exposure looks like, and how to prioritize action.
          </p>
        </div>

        {/* Stats */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 48,
          padding: "28px 24px",
          background: "#f9fbfd",
          border: "1px solid #e3e8ee",
          borderRadius: 10,
        }}>
          {[
            { value: "5,647", label: "FAA-Registered Heliports" },
            { value: "3,868", label: "Conditional Determinations" },
            { value: "42", label: "Objectionable Determinations" },
            { value: "50", label: "States Coverable" },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 22,
                fontWeight: 700,
                color: "#5B8DB8",
              }}>
                {s.value}
              </div>
              <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#8792a2", marginTop: 4 }}>
                {s.label.toUpperCase()}
              </div>
            </div>
          ))}
        </div>

        {/* The Problem */}
        <div style={{
          padding: "24px",
          background: "rgba(91,141,184,0.04)",
          border: "1px solid rgba(91,141,184,0.12)",
          borderRadius: 10,
          marginBottom: 48,
        }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#5B8DB8", fontFamily: "'Space Mono', monospace", marginBottom: 12 }}>
            WHY THIS MATTERS
          </div>
          <p style={{ color: "#0a2540", fontSize: 13, lineHeight: 1.8, margin: 0 }}>
            FAA Advisory Circulars are used as the &ldquo;standard of care&rdquo; in civil aviation lawsuits.
            Deviation from the standard equals negligence exposure. Insurance carriers are covering heliport
            assets they have never verified. State DOTs are planning AAM corridors anchored to heliports
            that may not meet current standards. And the FAA is expected to publish a unified vertical
            flight infrastructure Advisory Circular around June 2026 — facilities that aren&apos;t compliant
            when it takes effect face immediate regulatory exposure.
          </p>
        </div>

        {/* 5-Question Checklist */}
        <div style={{ marginBottom: 48 }}>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 22,
            fontWeight: 700,
            color: "#0a2540",
            marginBottom: 8,
          }}>
            Five-Question Compliance Checklist
          </h2>
          <p style={{ color: "#8792a2", fontSize: 12, lineHeight: 1.6, marginBottom: 24 }}>
            Every heliport is assessed against five questions. The output is a three-tier classification:
            COMPLIANT, CONDITIONAL, or OBJECTIONABLE.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {CHECKLIST.map((q) => (
              <div key={q.q} style={{
                padding: "16px 20px",
                background: "#f9fbfd",
                border: "1px solid #e3e8ee",
                borderRadius: 8,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ color: "#0a2540", fontSize: 13, fontWeight: 600 }}>{q.q}</span>
                  <span style={{
                    fontSize: 9,
                    fontFamily: "'Space Mono', monospace",
                    letterSpacing: 1,
                    color: q.status.startsWith("Live") ? "#00ff88" : "#f59e0b",
                    whiteSpace: "nowrap",
                  }}>
                    {q.status.toUpperCase()}
                  </span>
                </div>
                <p style={{ color: "#697386", fontSize: 12, lineHeight: 1.6, margin: "0 0 4px" }}>
                  {q.desc}
                </p>
                <div style={{ color: "#8792a2", fontSize: 10 }}>
                  Source: {q.source}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Output Tiers */}
        <div style={{ marginBottom: 48 }}>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 22,
            fontWeight: 700,
            color: "#0a2540",
            marginBottom: 20,
          }}>
            Compliance Tiers
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              {
                tier: "COMPLIANT",
                color: "#00ff88",
                def: "Passes all five compliance questions. All data verified — no unknowns remain.",
                implication: "Defensible coverage basis. Standard renewal recommended.",
              },
              {
                tier: "PRESUMED COMPLIANT",
                color: "#5B8DB8",
                def: "No failures identified, but one or more questions remain unanswered due to data gaps (e.g., airspace determination not yet matched, eVTOL viability not physically assessed).",
                implication: "Likely compliant but not verified. Recommend Level 2 screening to resolve unknowns before relying on this status for coverage decisions.",
              },
              {
                tier: "CONDITIONAL",
                color: "#f59e0b",
                def: "Fails one or more questions but gaps are remediable. Specific remediation requirements identified.",
                implication: "Coverage conditional on remediation timeline. Known risk with documented basis.",
              },
              {
                tier: "OBJECTIONABLE",
                color: "#ff4444",
                def: "Fails multiple questions or has a critical gap. Physical verification confirms significant compliance deficit.",
                implication: "Unquantified liability exposure. Coverage not recommended without remediation plan.",
              },
            ].map((t) => (
              <div key={t.tier} style={{
                display: "flex",
                gap: 16,
                padding: "16px 20px",
                background: "#f9fbfd",
                border: "1px solid #e3e8ee",
                borderLeft: `3px solid ${t.color}`,
                borderRadius: 8,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  color: t.color,
                  letterSpacing: 1,
                  minWidth: 100,
                  paddingTop: 2,
                }}>
                  {t.tier}
                </div>
                <div>
                  <div style={{ color: "#0a2540", fontSize: 12, lineHeight: 1.6, marginBottom: 4 }}>{t.def}</div>
                  <div style={{ color: "#8792a2", fontSize: 11, lineHeight: 1.5, fontStyle: "italic" }}>{t.implication}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Who it's for */}
        <div style={{ marginBottom: 48 }}>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 22,
            fontWeight: 700,
            color: "#0a2540",
            marginBottom: 20,
          }}>
            Who This Is For
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {BUYERS.map((b) => (
              <div key={b.title} style={{
                padding: "20px",
                background: "#f9fbfd",
                border: "1px solid #e3e8ee",
                borderRadius: 8,
              }}>
                <div style={{ color: "#0a2540", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{b.title}</div>
                <div style={{ color: "#697386", fontSize: 11, lineHeight: 1.6, marginBottom: 10 }}>{b.desc}</div>
                <div style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 10,
                  color: "#5B8DB8",
                  letterSpacing: 0.5,
                }}>
                  {b.price}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sample + Physical Verification */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 48,
        }}>
          <div style={{
            padding: "24px",
            background: "#f9fbfd",
            border: "1px solid #e3e8ee",
            borderRadius: 10,
          }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "#5B8DB8", fontFamily: "'Space Mono', monospace", marginBottom: 12 }}>
              SAMPLE REPORT
            </div>
            <p style={{ color: "#697386", fontSize: 12, lineHeight: 1.6, marginBottom: 16 }}>
              View live audit reports — South Carolina (49 heliports) or Florida (381 heliports,
              including the Miami metro with 315 facilities). Both scored against all five
              compliance questions with statewide pass rates and flagged facilities.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <Link
                href="/reports/audit/FL"
                style={{
                  display: "inline-block",
                  padding: "10px 20px",
                  background: "rgba(91,141,184,0.1)",
                  border: "1px solid rgba(91,141,184,0.25)",
                  borderRadius: 6,
                  color: "#5B8DB8",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textDecoration: "none",
                }}
              >
                View FL Audit Report
              </Link>
              <Link
                href="/reports/audit/SC"
                style={{
                  display: "inline-block",
                  padding: "10px 20px",
                  background: "#f6f9fc",
                  border: "1px solid #e3e8ee",
                  borderRadius: 6,
                  color: "#697386",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textDecoration: "none",
                }}
              >
                View SC Audit Report
              </Link>
            </div>
          </div>
          <div style={{
            padding: "24px",
            background: "#f9fbfd",
            border: "1px solid #e3e8ee",
            borderRadius: 10,
          }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "#ff6b35", fontFamily: "'Space Mono', monospace", marginBottom: 12 }}>
              PHYSICAL VERIFICATION
            </div>
            <p style={{ color: "#697386", fontSize: 12, lineHeight: 1.6, marginBottom: 16 }}>
              For sites flagged in pre-screening, physical verification is recommended by a qualified
              heliport inspector. AirIndex provides the automated screening layer &mdash; on-site SMS
              risk analysis, obstruction surveys, and TLOF/FATO measurement are performed by
              credentialed infrastructure consultants.
            </p>
            <div style={{ color: "#8792a2", fontSize: 10, lineHeight: 1.6 }}>
              Standards applied: Title 14 CFR Part 5, ICAO Annex 14, ISO 31000, AC 150/5390-2D
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{
          textAlign: "center",
          padding: "32px 0",
          borderTop: "1px solid #e3e8ee",
        }}>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 22,
            fontWeight: 700,
            color: "#0a2540",
            marginBottom: 12,
          }}>
            Request an audit for your state or portfolio
          </h2>
          <p style={{ color: "#8792a2", fontSize: 13, marginBottom: 20 }}>
            All engagements begin with a discovery call. Pricing confirmed after scope validation.
          </p>
          <Link
            href="/contact?inquiry=heliport-audit"
            style={{
              display: "inline-block",
              padding: "14px 32px",
              background: "#5B8DB8",
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textDecoration: "none",
              borderRadius: 6,
            }}
          >
            Talk to Us
          </Link>
        </div>
      </main>

      <SiteFooter theme="light" />
    </div>
  );
}
