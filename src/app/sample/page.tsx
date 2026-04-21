import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import TrackPageView from "@/components/TrackPageView";

export const metadata: Metadata = {
  title: "Sample Assessment — AirIndex",
  description:
    "See what an AirIndex facility assessment reveals — compliance, physical feasibility, and operational exposure that standard evaluations miss.",
};

const S = {
  page: { minHeight: "100vh", background: "#ffffff", fontFamily: "'Inter', sans-serif" } as React.CSSProperties,
  main: { maxWidth: 680, margin: "0 auto", padding: "clamp(40px, 6vw, 72px) 24px 80px" } as React.CSSProperties,
};

function FindingCard({
  label,
  severity,
  severityColor,
  detail,
}: {
  label: string;
  severity: string;
  severityColor: string;
  detail: string;
}) {
  return (
    <div
      style={{
        padding: "18px 22px",
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderLeft: `4px solid ${severityColor}`,
        borderRadius: "0 8px 8px 0",
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#0a2540" }}>{label}</div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            color: severityColor,
            padding: "2px 8px",
            border: `1px solid ${severityColor}30`,
            borderRadius: 4,
          }}
        >
          {severity}
        </div>
      </div>
      <div style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>{detail}</div>
    </div>
  );
}

export default function SamplePage() {
  return (
    <div style={S.page}>
      <TrackPageView page="/sample" />
      <SiteNav theme="light" />

      <main style={S.main}>
        {/* Eyebrow */}
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 10,
            letterSpacing: "0.14em",
            color: "#5B8DB8",
            textTransform: "uppercase" as const,
            marginBottom: 16,
          }}
        >
          AirIndex RiskIndex &middot; Sample Assessment
        </div>

        {/* Hook */}
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "clamp(24px, 4vw, 32px)",
            fontWeight: 700,
            color: "#0a2540",
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            marginBottom: 12,
          }}
        >
          This heliport is FAA-approved.
          <br />
          It may not be operationally viable.
        </h1>
        <p style={{ fontSize: 15, color: "#666", lineHeight: 1.7, maxWidth: 580, marginBottom: 40 }}>
          Standard facility evaluations check regulatory compliance. AirIndex evaluates three
          layers most assessments miss — data reliability, physical feasibility, and operational
          exposure.
        </p>

        {/* Facility snapshot */}
        <div
          style={{
            background: "#f9fbfd",
            border: "1px solid #e3e8ee",
            borderRadius: 10,
            padding: "20px 24px",
            marginBottom: 28,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "#8792a2", textTransform: "uppercase" as const, marginBottom: 4 }}>
                Facility
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#0a2540" }}>
                Hospital Rooftop Heliport
              </div>
              <div style={{ fontSize: 12, color: "#697386", marginTop: 2 }}>
                Major metro area &middot; Southeast U.S. &middot; Rooftop &middot; 50&times;50 ft concrete pad
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "#8792a2", textTransform: "uppercase" as const, marginBottom: 4 }}>
                Activated
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: "#0a2540" }}>
                1964
              </div>
              <div style={{ fontSize: 11, color: "#b91c1c" }}>62 years ago</div>
            </div>
          </div>
        </div>

        {/* What we found */}
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.12em",
            color: "#8792a2",
            textTransform: "uppercase" as const,
            fontWeight: 700,
            marginBottom: 14,
          }}
        >
          What the assessment found
        </div>

        <FindingCard
          label="Data Reliability (DQS)"
          severity="Low"
          severityColor="#b91c1c"
          detail="FAA record activated 1964 — built under standards that predate modern TLOF/FATO terminology. Recorded pad dimensions may not represent what current standards define. Position data last verified 2017."
        />

        <FindingCard
          label="Regulatory Compliance"
          severity="Pass"
          severityColor="#10b981"
          detail="Active FAA NASR 5010 registration. State enforcement posture rated strong. No major registration deficiencies on file."
        />

        <FindingCard
          label="Dimensional Constraint"
          severity="Constrained"
          severityColor="#f59e0b"
          detail="Current pad meets legacy heliport standards (1.5D). Does not meet EB-105A eVTOL dimensional requirements (2D load-bearing FATO). Expansion gap: 70 ft beyond recorded pad for eVTOL operations."
        />

        <FindingCard
          label="Obstruction Environment (OES)"
          severity="Elevated"
          severityColor="#f59e0b"
          detail="Multiple structures above 100 ft within 500m. Buildings in the prevailing wind path create potential channeling. 8:1 approach surface analysis identifies penetration risk."
        />

        <FindingCard
          label="Operational Exposure (OEL)"
          severity="High"
          severityColor="#ef4444"
          detail="Hospital rooftop configuration with likely proximity to HVAC intake systems. Surrounding structures may create airflow disruption and exhaust recirculation not captured in FAA records."
        />

        {/* Punchline */}
        <div
          style={{
            margin: "32px 0",
            padding: "20px 24px",
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 8,
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#78350f",
              lineHeight: 1.6,
              marginBottom: 10,
            }}
          >
            This site passes compliance. That does not mean it is operationally viable.
          </div>
          <div style={{ fontSize: 13, color: "#92400e", lineHeight: 1.6 }}>
            Most facility decisions today rely on FAA records that are often incomplete or outdated.
            40% of heliports in tracked markets were built before the FAA established the dimensional
            terminology still in use. AirIndex structures that evaluation before capital or
            underwriting decisions are made.
          </div>
        </div>

        {/* Three questions */}
        <div style={{ display: "flex", gap: 10, marginBottom: 32 }}>
          <div style={{ flex: 1, padding: "14px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, textAlign: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#166534", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 4 }}>Is it allowed?</div>
            <div style={{ fontSize: 11, color: "#15803d" }}>Compliance</div>
          </div>
          <div style={{ flex: 1, padding: "14px 16px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, textAlign: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#92400e", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 4 }}>Can it work?</div>
            <div style={{ fontSize: 11, color: "#b45309" }}>Feasibility</div>
          </div>
          <div style={{ flex: 1, padding: "14px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, textAlign: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#991b1b", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 4 }}>Will it behave?</div>
            <div style={{ fontSize: 11, color: "#b91c1c" }}>Exposure</div>
          </div>
        </div>

        {/* CTA */}
        <div
          style={{
            textAlign: "center",
            padding: "32px 24px",
            background: "#f9fbfd",
            border: "1px solid #e3e8ee",
            borderRadius: 10,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, color: "#0a2540", marginBottom: 6 }}>
            Have facilities you&apos;re evaluating?
          </div>
          <div style={{ fontSize: 13, color: "#697386", marginBottom: 16, lineHeight: 1.6 }}>
            Send us 2&ndash;3 sites and we&apos;ll run an assessment. Full output includes
            compliance grid, dimensional pre-screen, obstruction scoring, operational exposure
            flagging, and an explicit underwriting recommendation.
          </div>
          <Link
            href="/contact"
            style={{
              display: "inline-block",
              padding: "14px 32px",
              background: "#5B8DB8",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textDecoration: "none",
              borderRadius: 6,
            }}
          >
            Send Us Your Sites
          </Link>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 10 }}>
            Assessments delivered within 24 hours.
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{ marginTop: 24, fontSize: 10, color: "#bbb", textAlign: "center", lineHeight: 1.5 }}>
          This is a representative sample based on a real U.S. heliport. Facility details
          are partially anonymized. Full assessments include facility identification, satellite
          imagery, per-question compliance breakdown, and peer benchmarking.
        </div>
      </main>

      <SiteFooter theme="light" />
    </div>
  );
}
