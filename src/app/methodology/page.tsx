import type { Metadata } from "next";
import Link from "next/link";
import TrackPageView from "@/components/TrackPageView";
import SiteNav from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "Ratings Methodology — AirIndex",
  description:
    "How the AirIndex UAM Market Readiness Rating is calculated. A proprietary 7-factor ratings methodology covering pilot programs, zoning, operators, regulation, and infrastructure across 25 US markets.",
};

// -------------------------------------------------------
// Score factor definitions
// -------------------------------------------------------
const FACTORS = [
  {
    key: "activePilotProgram",
    label: "Active Pilot Program",
    weight: 15,
    description:
      "Has the market launched or hosted an active UAM pilot program? Pilot programs demonstrate real-world operational commitment — not just regulatory intent, but aircraft flying in the airspace under FAA-approved conditions. This is the strongest signal of market readiness because it requires simultaneous coordination of regulatory approval, operator participation, infrastructure access, and community engagement.",
    qualifies:
      "FAA-approved pilot program active or completed within the market area. Includes UAS Integration Pilot Program (IPP) participation, BEYOND program selection, Part 135 commercial eVTOL operations, or FAA-sanctioned demonstration flights with a defined operational area.",
    doesNotQualify:
      "Announced partnerships without FAA operational approval. MOU signings. Feasibility studies. Operator interest without flights in the airspace.",
    actionable:
      "Host or participate in an FAA-sanctioned pilot program. Coordinate with operators who have active type certification programs and need flight test environments.",
    sources: "FAA UAS Integration Pilot Program (IPP) records, BEYOND program designations, operator announcements, local government press releases.",
  },
  {
    key: "approvedVertiport",
    label: "Approved Vertiport",
    weight: 15,
    description:
      "Does the market have at least one permitted, under-construction, or operational vertiport site? Vertiports are the physical infrastructure that makes commercial UAM possible. A market with approved vertiport sites has cleared the hardest regulatory and zoning hurdles — environmental review, community input, building permits, and FAA airspace coordination.",
    qualifies:
      "One or more vertiport sites that have received municipal permits, are under construction, or are operational. Heliport conversions with documented eVTOL adaptation plans also qualify.",
    doesNotQualify:
      "Sites in the planning or feasibility stage without permits filed. Announced locations without municipal approval. Existing heliports without documented UAM conversion plans.",
    actionable:
      "Advance vertiport sites through the permitting process. Fast-track environmental review for vertiport-zoned parcels. Partner with operators on site selection and FAA engineering briefs.",
    sources: "Municipal planning records, FAA vertiport engineering briefs, operator filings, local zoning board decisions. Site counts reflect FAA-registered heliport and landing facilities per NASR 5010 records. Emergency Helicopter Landing Facilities (EHLFs) are excluded as they do not require FAA Form 7480 registration and are not captured in the NASR database. Total vertical flight infrastructure in any market may exceed the registered site count.",
  },
  {
    key: "activeOperatorPresence",
    label: "Active Operator Presence",
    weight: 15,
    description:
      "Is at least one eVTOL manufacturer or air taxi operator actively engaged in the market? Operator presence is a market signal — operators choose launch markets based on regulatory readiness, infrastructure availability, demand projections, and competitive positioning. An operator committing resources to a market validates the other readiness factors.",
    qualifies:
      "One or more operators with announced partnerships, signed agreements, test flights, or commercial intent specific to the market. Includes eVTOL manufacturers (Joby, Archer, Wisk), air taxi platforms (Blade), and cargo/delivery operators with UAM-adjacent infrastructure.",
    doesNotQualify:
      "General statements of interest without market-specific commitments. Operators listing the market in investor materials without operational plans. Conference appearances or trade show presence.",
    actionable:
      "Establish operator engagement programs. Create incentive packages for eVTOL operators to select the market for early commercial routes. Reduce regulatory friction to attract operator commitments.",
    sources: "Operator press releases, partnership announcements, SEC filings (for public operators like Joby and Archer), airline partnership disclosures.",
  },
  {
    key: "vertiportZoning",
    label: "Vertiport Zoning",
    weight: 15,
    description:
      "Has the city or county adopted zoning provisions that accommodate vertiport development? Zoning is the earliest and most controllable municipal signal of UAM readiness. Markets that have proactively updated land-use codes to permit vertiports are removing barriers before operators arrive — signaling institutional readiness and reducing timeline risk for commercial deployments.",
    qualifies:
      "Municipality has enacted or amended zoning ordinances to permit vertiport or heliport-equivalent use in at least one zoning district. Includes conditional use permits, overlay zones, or specific vertiport land-use categories.",
    doesNotQualify:
      "General aviation zoning without vertiport-specific provisions. Draft ordinances not yet adopted. Study commissions without enacted code changes.",
    actionable:
      "Amend local zoning codes to define vertiport as a permitted or conditional use. Identify suitable zoning districts (commercial, industrial, transit-adjacent). Streamline conditional use permit processes for vertiport applications.",
    sources: "Municipal code databases, city council meeting minutes, zoning board records, urban planning documents.",
  },
  {
    key: "regulatoryPosture",
    label: "Regulatory Posture",
    weight: 10,
    graduated: true,
    description:
      "What is the overall regulatory stance toward UAM at the municipal level? This is the only graduated factor in the model. Rather than binary yes/no, regulatory posture is assessed on a three-level scale: Friendly (10 points), Neutral (5 points), or Restrictive (0 points). This reflects the reality that regulatory environments exist on a spectrum — a city can be passively permissive without being actively supportive. Note: Regulatory posture scoring reflects the observable framework of state and local regulations governing vertical flight infrastructure. The FAA does not hold enforcement authority over private-use heliports. Conditional and objectionable airspace determinations issued by the FAA carry no mandatory compliance mechanism for private-use facilities. REG scores reflect regulatory framework strength, not verified compliance rates.",
    qualifies:
      "Friendly: City has formed a UAM task force, joined federal programs (e.g., NASA AAM National Campaign), issued public statements of support, or allocated staff/budget to UAM planning. Neutral: No active opposition or support; standard permitting processes apply without UAM-specific provisions. Restrictive: City has enacted ordinances limiting drone/eVTOL operations, issued public opposition, or created regulatory barriers beyond standard requirements.",
    doesNotQualify:
      "N/A — all markets receive a posture assessment. The assessment is based on documented actions, not inferred attitudes.",
    actionable:
      "Move from Neutral to Friendly: form a UAM advisory committee, participate in federal engagement programs, issue a public statement of support, or designate a point of contact for UAM operators.",
    sources: "City government publications, mayor/council public statements, FAA Community Engagement records, USDOT participation records, local ordinances.",
  },
  {
    key: "stateLegislation",
    label: "State Legislation",
    weight: 20,
    graduated: true,
    description:
      "What is the state of UAM-enabling legislation? This factor uses a graduated three-tier model: Enacted (20 pts) — UAM-specific legislation signed into law; Actively Moving (10 pts) — UAM-specific bills in late legislative stages with real momentum; None (0 pts) — no meaningful UAM legislative activity. State-level legislation creates the legal framework that allows (or blocks) commercial UAM at scale. States with enacted legislation signal long-term institutional commitment. States with actively moving bills show community preparedness — a leading indicator of future enactment. This factor was doubled from 10 to 20 points in v1.3 based on field validation showing that legislation functions as a prerequisite — infrastructure developers require a legislative framework before committing capital.",
    qualifies:
      "Enacted (full points): State-level UAM or AAM legislation signed into law — enabling acts, task force creation with legislative mandate, state DOT integration directives, or dedicated AAM appropriations. Actively Moving (partial points): UAM-specific bills in late stages — transmit to house, second reading, ordered enrolled, governor's desk, or committee recommendation for passage. Must show coordinated legislative activity, not just a single early-stage referral.",
    doesNotQualify:
      "Bills introduced but stalled in early committee without movement. Resolutions without legal force (classified as Actively Moving at most, not Enacted). Executive orders without legislative backing. General aviation or drone legislation without UAM-specific provisions.",
    actionable:
      "Advocate for state-level AAM enabling legislation. Support bills that define vertiports in state building codes, establish state-level UAM task forces, or direct state DOTs to integrate AAM into transportation planning. States with coordinated multi-bill UAM legislative clusters (e.g., Arizona's 2026 pattern) are 12–18 months from enacted legislation.",
    sources: "State legislature records (LegiScan), governor's office press releases, state DOT publications, legislative tracking services.",
  },
  {
    key: "weatherInfrastructure",
    label: "Weather Infrastructure",
    weight: 10,
    graduated: true,
    description:
      "Weather infrastructure readiness tracks low-altitude weather sensing at the city level. The USDOT AAM National Strategy identifies weather as one of four infrastructure pillars alongside physical, energy, and spectrum — making it a federally recognized prerequisite for commercial AAM operations, not an AirIndex-specific judgment. Weather remains the most uncertain and uncontrollable factor that will impact schedule reliability and operator dispatch rates, especially in built-up urban areas where confused winds will impact vertiport vehicle spacing and throughput. Better weather infrastructure will increase weather and wind certainty, contributing to a safer and more efficient airspace and vertiport ecosystem. States are a key enabler in closing the weather infrastructure gap. Weather data at or below 500 feet AGL is critical for eVTOL operations — standard airport weather stations (ASOS/AWOS) report conditions at runway level but do not capture the wind shear, turbulence, and microclimate data required for vertiport approach corridors. This factor uses a graduated three-tier model: Full (10 pts) — dedicated low-altitude sensing deployed in the market; Partial (5 pts) — standard airport weather infrastructure exists but lacks UAM-specific coverage; None (0 pts) — no meaningful weather infrastructure for low-altitude operations. As dedicated sensor networks expand across US markets, this factor will increasingly differentiate markets that have invested in operational weather infrastructure from those relying on general aviation coverage.",
    qualifies:
      "Full: Dedicated low-altitude weather sensors, eIPP (enhanced Instrument Performance Products) deployments, or UAM-specific weather observation networks operating within the metropolitan area. Partial: ASOS/AWOS weather stations at airports within the metro area providing surface-level observations applicable to nearby vertiport operations. None: No weather observation infrastructure relevant to low-altitude UAM operations.",
    doesNotQualify:
      "Upper-atmosphere weather monitoring without surface/low-altitude component. Weather forecast services without local observation infrastructure. Radar-only coverage without surface wind data.",
    actionable:
      "Deploy dedicated low-altitude weather sensing at planned vertiport sites. Partner with weather technology providers (e.g., eIPP networks) to establish sub-500ft observation coverage. Heliports and vertiports are not currently required to have weather stations — proactive deployment is a competitive differentiator.",
    sources: "FAA ASOS/AWOS station registry, eIPP deployment maps, airport authority records, weather technology provider deployment data.",
  },
];

const TIERS = [
  { label: "ADVANCED", range: "75\u2013100", color: "#00ff88", description: "Market has most or all infrastructure, regulatory, and operator requirements in place. Commercial UAM operations are imminent or active." },
  { label: "MODERATE", range: "50\u201374", color: "#5B8DB8", description: "Significant progress across multiple factors. Key pieces are in place but gaps remain \u2014 typically missing infrastructure or operator commitment." },
  { label: "EARLY", range: "30\u201349", color: "#f59e0b", description: "Some foundational elements present. Regulatory posture may be favorable but physical infrastructure and operator activity are limited." },
  { label: "NASCENT", range: "0\u201329", color: "#ff4444", description: "Minimal UAM readiness. Market may have partial weather infrastructure or early regulatory signals but lacks substantive infrastructure or operator engagement." },
];

// -------------------------------------------------------
// Section wrapper
// -------------------------------------------------------
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: 56 }}>
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
        {title}
      </h2>
      {children}
    </section>
  );
}

// -------------------------------------------------------
// Metadata label
// -------------------------------------------------------
function MetaLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: 9,
        letterSpacing: 1.5,
        color: "#8792a2",
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

// -------------------------------------------------------
// Page
// -------------------------------------------------------
export default function MethodologyPage() {
  const totalWeight = FACTORS.reduce((s, f) => s + f.weight, 0);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        color: "#0a2540",
        fontFamily: "'Inter', sans-serif",
        fontSize: 14,
        lineHeight: 1.7,
        overflow: "auto",
      }}
    >
      <TrackPageView page="/methodology" />

      <SiteNav theme="light" />

      {/* Content */}
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px clamp(20px, 5vw, 32px) 80px" }}>
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              letterSpacing: 2,
              color: "#8792a2",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            Scoring Methodology &middot; v1.3 &middot; Revised March 29, 2026
          </div>
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(28px, 5vw, 36px)",
              color: "#0a2540",
              lineHeight: 1.2,
              marginBottom: 16,
            }}
          >
            UAM Market Readiness Index
          </h1>
          <p style={{ color: "#777", fontSize: 15, lineHeight: 1.7, maxWidth: 600 }}>
            The AirIndex UAM Readiness Score measures a market&apos;s structural readiness for
            commercial urban air mobility operations across seven independently verified factors.
            It is not a forecast &mdash; it reflects current, documented conditions.
          </p>
          <p style={{ color: "#777", fontSize: 15, lineHeight: 1.7, maxWidth: 600, marginTop: 12 }}>
            The Index is designed as a replicable decision-support framework for regulators,
            municipal planners, operators, and researchers evaluating UAM market entry conditions.
            The methodology is published in full to enable independent validation and to support
            its adoption as an industry reference standard.
          </p>
          <p style={{ color: "#777", fontSize: 15, lineHeight: 1.7, maxWidth: 600, marginTop: 12 }}>
            Factor weights and scoring thresholds are validated through ongoing consultation with
            infrastructure developers, weather intelligence providers, and vertiport operators
            active in multiple US markets. The v1.3 methodology reflects field-validated insights
            on legislative prerequisites and weather infrastructure requirements for commercial
            eVTOL operations.
          </p>
        </div>

        {/* Section 1: What the Score Measures */}
        <Section id="overview" title="What the Score Measures">
          <p style={{ marginBottom: 16 }}>
            The Readiness Score is a 0&ndash;{totalWeight} composite index that answers one question:
            how prepared is this metropolitan area, right now, for commercial eVTOL operations?
            Each market is evaluated against seven factors spanning physical infrastructure,
            operator commitment, and regulatory environment.
          </p>
          <p style={{ marginBottom: 16 }}>
            The score is evidence-based and reproducible. Every factor is verified against public
            records &mdash; FAA databases, federal and state filings, municipal zoning codes, and
            operator disclosures. Anyone with access to the same sources should arrive at the same
            number.
          </p>
          <p>
            This is not an investment recommendation, demand forecast, or prediction of commercial
            launch timelines. It measures structural readiness: the infrastructure, regulatory
            framework, and operator engagement that must be in place before commercial operations
            can begin. It is designed for use by transportation planners, regulatory bodies, and
            market participants requiring an objective, evidence-based readiness assessment.
          </p>
        </Section>

        {/* Section 2: The Seven Factors */}
        <Section id="factors" title="The Seven Factors">
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {FACTORS.map((f, i) => (
              <div
                key={f.key}
                style={{
                  background: "#f9fbfd",
                  border: "1px solid #e3e8ee",
                  borderRadius: 8,
                  padding: "24px 24px 20px",
                }}
              >
                {/* Factor header */}
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 10,
                        color: "#8792a2",
                        letterSpacing: 1,
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontWeight: 600,
                        fontSize: 16,
                        color: "#0a2540",
                      }}
                    >
                      {f.label}
                    </span>
                    {"graduated" in f && f.graduated && (
                      <span
                        style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: 9,
                          letterSpacing: 1,
                          color: "#f59e0b",
                          border: "1px solid rgba(245, 158, 11, 0.3)",
                          borderRadius: 3,
                          padding: "2px 6px",
                        }}
                      >
                        GRADUATED
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#5B8DB8",
                    }}
                  >
                    {f.weight} pts
                  </div>
                </div>

                {/* Weight bar */}
                <div
                  style={{
                    height: 3,
                    background: "#e3e8ee",
                    borderRadius: 2,
                    marginBottom: 16,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${(f.weight / totalWeight) * 100}%`,
                      height: "100%",
                      background: "#5B8DB8",
                      borderRadius: 2,
                    }}
                  />
                </div>

                {/* Description */}
                <p style={{ marginBottom: 16 }}>{f.description}</p>

                {/* What qualifies */}
                <div style={{ marginBottom: 12 }}>
                  <MetaLabel>What Qualifies</MetaLabel>
                  <p style={{ color: "#425466", fontSize: 13, marginTop: 4 }}>{f.qualifies}</p>
                </div>

                {/* What does not qualify */}
                <div style={{ marginBottom: 12 }}>
                  <MetaLabel>What Does Not Qualify</MetaLabel>
                  <p style={{ color: "#425466", fontSize: 13, marginTop: 4 }}>{f.doesNotQualify}</p>
                </div>

                {/* How to improve */}
                <div style={{ marginBottom: 12 }}>
                  <MetaLabel>How to Improve This Score</MetaLabel>
                  <p style={{ color: "#b0b0c0", fontSize: 13, marginTop: 4 }}>{f.actionable}</p>
                </div>

                {/* Sources */}
                <div>
                  <MetaLabel>Data Sources</MetaLabel>
                  <p style={{ color: "#425466", fontSize: 13, marginTop: 4 }}>{f.sources}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Section 3: Scoring Methodology */}
        <Section id="methodology" title="Scoring Methodology">
          {/* Binary model */}
          <h3
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
              fontSize: 15,
              color: "#0a2540",
              marginBottom: 12,
            }}
          >
            Binary Model
          </h3>
          <p style={{ marginBottom: 16 }}>
            Four of seven factors use binary scoring: a factor is either present or it isn&apos;t.
            This is a deliberate design choice. Binary scoring eliminates subjective grading,
            makes scores reproducible across analysts, and provides clear, actionable thresholds
            for city planners and operators. A market either has an approved vertiport or it
            doesn&apos;t &mdash; there is no partial credit for &ldquo;almost permitted.&rdquo;
          </p>
          <p style={{ marginBottom: 24 }}>
            Three factors use graduated scoring: Regulatory Posture (Friendly / Neutral / Restrictive),
            State Legislation (Enacted / Actively Moving / None), and Weather Infrastructure
            (Full / Partial / None). These reflect domains where a binary model would lose meaningful
            signal &mdash; regulatory environments, legislative progress, and weather observation
            infrastructure all exist on a spectrum. As reliable sub-indicators emerge for other
            factors, the graduated model may be extended.
          </p>

          {/* Differential weighting */}
          <h3
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
              fontSize: 15,
              color: "#0a2540",
              marginBottom: 12,
            }}
          >
            Differential Weighting
          </h3>
          <p style={{ marginBottom: 16 }}>
            Factors are not equally weighted. The model uses a three-tier weight structure that
            encodes a thesis about what drives commercial readiness:
          </p>
          <div
            style={{
              background: "#f9fbfd",
              border: "1px solid #e3e8ee",
              borderRadius: 8,
              padding: "20px 24px",
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ color: "#0a2540", fontSize: 13 }}>Legislative Framework</span>
                <span style={{ fontFamily: "'Space Mono', monospace", color: "#5B8DB8", fontSize: 13, fontWeight: 700 }}>20 pts</span>
              </div>
              <p style={{ color: "#425466", fontSize: 13, marginTop: -4 }}>
                State Legislation &mdash; elevated to the highest weight in v1.3 based on field validation. Legislation creates the legal framework infrastructure developers require before committing capital. Community preparedness, reflected in legislative activity, precedes and enables operator engagement.
              </p>
              <div style={{ height: 1, background: "#e3e8ee" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ color: "#0a2540", fontSize: 13 }}>Infrastructure &amp; Market Commitment</span>
                <span style={{ fontFamily: "'Space Mono', monospace", color: "#5B8DB8", fontSize: 13, fontWeight: 700 }}>15 pts each</span>
              </div>
              <p style={{ color: "#425466", fontSize: 13, marginTop: -4 }}>
                Pilot Program, Approved Vertiport, Active Operator Presence, Vertiport Zoning &mdash; the operational and infrastructure signals. These require real capital, real approvals, and real operator commitment.
              </p>
              <div style={{ height: 1, background: "#e3e8ee" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ color: "#0a2540", fontSize: 13 }}>Regulatory &amp; Environmental Readiness</span>
                <span style={{ fontFamily: "'Space Mono', monospace", color: "#5B8DB8", fontSize: 13, fontWeight: 700 }}>10 pts each</span>
              </div>
              <p style={{ color: "#425466", fontSize: 13, marginTop: -4 }}>
                Regulatory Posture, Weather Infrastructure &mdash; necessary but not sufficient. A friendly regulatory environment and weather sensing infrastructure support operations but do not alone make a market ready.
              </p>
            </div>
          </div>
          <p style={{ marginBottom: 24 }}>
            This hierarchy reflects current market conditions and field-validated insights from
            infrastructure developers and operators. Infrastructure and operational factors remain
            the strongest signals of near-term commercial readiness. State legislation was elevated
            to 20 points in v1.3 based on field validation showing that legislation functions as a
            prerequisite &mdash; infrastructure developers require a legislative framework before
            committing capital, and community preparedness, reflected in legislative activity, often
            precedes and enables operator engagement.
          </p>

          {/* Weight distribution visualization */}
          <div
            style={{
              display: "flex",
              height: 8,
              borderRadius: 4,
              overflow: "hidden",
              marginBottom: 16,
            }}
          >
            {FACTORS.map((f, i) => {
              const colors = ["#5B8DB8", "#00ff88", "#7c3aed", "#f59e0b", "#ff6b35", "#14b8a6", "#ff4444"];
              return (
                <div
                  key={f.key}
                  style={{
                    width: `${(f.weight / totalWeight) * 100}%`,
                    background: colors[i % colors.length],
                    opacity: 0.8,
                  }}
                />
              );
            })}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px", marginBottom: 24 }}>
            {FACTORS.map((f, i) => {
              const colors = ["#5B8DB8", "#00ff88", "#7c3aed", "#f59e0b", "#ff6b35", "#14b8a6", "#ff4444"];
              return (
                <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#697386" }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: colors[i % colors.length], opacity: 0.8 }} />
                  {f.label} ({f.weight}%)
                </div>
              );
            })}
          </div>

          {/* Readiness Tiers */}
          <h3
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
              fontSize: 15,
              color: "#0a2540",
              marginBottom: 12,
            }}
          >
            Readiness Tiers
          </h3>
          <p style={{ marginBottom: 20 }}>
            Scores map to four readiness tiers that provide at-a-glance context for where a
            market stands in its UAM journey.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
            {TIERS.map((t) => (
              <div
                key={t.label}
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "flex-start",
                  padding: "16px 20px",
                  background: "#f9fbfd",
                  border: "1px solid #e3e8ee",
                  borderRadius: 8,
                }}
              >
                <div style={{ minWidth: 90, flexShrink: 0 }}>
                  <div
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontWeight: 700,
                      fontSize: 13,
                      color: t.color,
                      letterSpacing: 1,
                    }}
                  >
                    {t.label}
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#8792a2", marginTop: 2 }}>
                    {t.range}
                  </div>
                </div>
                <p style={{ color: "#425466", fontSize: 13, lineHeight: 1.6 }}>{t.description}</p>
              </div>
            ))}
          </div>

          {/* Update frequency */}
          <h3
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
              fontSize: 15,
              color: "#0a2540",
              marginBottom: 12,
            }}
          >
            Update Frequency
          </h3>
          <p>
            Scores are updated continuously as new evidence is ingested and verified. Weekly
            snapshots capture the state of all rated markets for historical tracking. When underlying
            data changes &mdash; a new vertiport permit is approved, legislation is signed, an
            operator announces market entry &mdash; the affected market&apos;s score is recalculated
            and the change is logged in the AirIndex activity feed with a link to the source record.
          </p>
        </Section>

        {/* Section 4: Data Sources and Verification */}
        <Section id="sources" title="Data Sources and Verification">
          <p style={{ marginBottom: 16 }}>
            Every score change is traceable to a specific source document. AirIndex draws from
            five primary categories of public data:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Weather Infrastructure Registry", desc: "FAA ASOS/AWOS station registry, eIPP deployment maps, airport authority weather records, and weather technology provider deployment data for low-altitude sensing verification." },
              { label: "Federal Register", desc: "Proposed and final rulemaking, airspace designations, notices of availability, and FAA advisory circulars related to UAM and vertiport operations." },
              { label: "SEC EDGAR", desc: "10-K/10-Q filings, 8-K disclosures, and S-1 registrations from publicly traded operators (Joby Aviation, Archer Aviation, Blade Air Mobility) for market commitments and partnership announcements." },
              { label: "State Legislative Records", desc: "Bill tracking via LegiScan and state legislature databases for UAM/AAM enabling legislation, task force creation, and appropriations across all 50 states." },
              { label: "Municipal Records", desc: "City council minutes, zoning board decisions, planning commission records, and building permit databases for vertiport approvals and zoning amendments." },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  padding: "16px 20px",
                  background: "#f9fbfd",
                  border: "1px solid #e3e8ee",
                  borderRadius: 8,
                }}
              >
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14, color: "#0a2540", marginBottom: 4 }}>
                  {s.label}
                </div>
                <p style={{ color: "#425466", fontSize: 13, marginBottom: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>

          <h3
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
              fontSize: 15,
              color: "#0a2540",
              marginBottom: 12,
            }}
          >
            Verification Process
          </h3>
          <p style={{ marginBottom: 16 }}>
            New evidence enters the system through an ingestion pipeline that classifies source
            documents against the seven scoring factors. High-confidence classifications
            (unambiguous evidence matching a single factor and market) are applied automatically.
            Ambiguous or multi-factor evidence is flagged for manual review before any score
            change is made.
          </p>
          <p style={{ marginBottom: 16 }}>
            Source citations for each scored factor are displayed on individual market pages in
            the AirIndex dashboard. Every citation includes a verification date indicating when
            the underlying source was last confirmed. Markets are re-verified on a rolling basis,
            with high-activity markets reviewed more frequently.
          </p>
          <p style={{ marginBottom: 24 }}>
            This verification architecture is designed to meet the evidentiary standards required
            for use in regulatory filings, academic publications, and government procurement
            decisions. All source records are retained and available for audit upon request.
          </p>

          <h3
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
              fontSize: 15,
              color: "#0a2540",
              marginBottom: 12,
            }}
          >
            Classifier Prompt Version History
          </h3>
          <p style={{ marginBottom: 16 }}>
            The AI classification engine is iteratively refined based on accuracy audits and
            pipeline performance. Every prompt version is tracked with a commit hash, enabling
            precise reproducibility of any historical classification.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {[
              { version: "v1", date: "Feb 28, 2026", desc: "Initial classifier. Generic factor keys, basic event type taxonomy." },
              { version: "v2", date: "Mar 4, 2026", desc: "Field mapping standardization. Content enrichment (SEC 2K chars, news 1.5K chars)." },
              { version: "v3", date: "Mar 11, 2026", desc: "Confidence calibration. ~80% accuracy baseline established." },
              { version: "v4", date: "Mar 13, 2026", desc: "Stock-framed false negative fix, 17 metro area mappings, federal vs. state distinction. ~88\u201390% accuracy." },
              { version: "v5", date: "Mar 14, 2026", desc: "DOT/FAA pilot program examples, MarketScreener URL deduplication normalization." },
            ].map((p) => (
              <div
                key={p.version}
                style={{
                  display: "flex",
                  gap: 16,
                  padding: "12px 16px",
                  background: "#f9fbfd",
                  border: "1px solid #e3e8ee",
                  borderRadius: 6,
                  alignItems: "baseline",
                }}
              >
                <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 13, color: "#5B8DB8", minWidth: 28 }}>{p.version}</span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#8792a2", minWidth: 100, flexShrink: 0 }}>{p.date}</span>
                <span style={{ color: "#425466", fontSize: 13 }}>{p.desc}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Section 5: Limitations */}
        <Section id="limitations" title="Limitations and Future Development">
          <h3
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
              fontSize: 15,
              color: "#0a2540",
              marginBottom: 12,
            }}
          >
            What the Score Does Not Capture
          </h3>
          <p style={{ marginBottom: 16 }}>
            The Readiness Score measures structural conditions, not market dynamics. It does not
            account for consumer demand, operator financial health, airspace complexity, noise
            sensitivity, community opposition, or competitive intensity between markets. These
            factors matter for commercial success but are outside the scope of a readiness
            assessment. Weather infrastructure is captured as a structural factor (presence of
            observation equipment), not as a weather pattern or climate assessment.
          </p>

          <h3
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
              fontSize: 15,
              color: "#0a2540",
              marginBottom: 12,
            }}
          >
            Binary Model Tradeoffs
          </h3>
          <p style={{ marginBottom: 16 }}>
            The binary model intentionally trades granularity for verifiability. Two markets at the
            same score may differ in depth of readiness &mdash; a market with three committed
            operators scores the same on the Operator Presence factor as a market with one. This
            is a known limitation, and it is accepted because the alternative (graduated sub-scoring)
            would require defining and defending sub-factor weights that don&apos;t yet have empirical
            support.
          </p>
          <p style={{ marginBottom: 16 }}>
            Regulatory Posture, State Legislation, and Weather Infrastructure all use graduated
            scoring as of v1.3. As historical data accumulates and reliable sub-indicators emerge
            for other factors, the graduated model will be extended. Any such changes will be
            published as a new methodology version with a full changelog.
          </p>

          <h3
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
              fontSize: 15,
              color: "#0a2540",
              marginBottom: 12,
            }}
          >
            Geographic Scope
          </h3>
          <p>
            The current index covers 20+ US metropolitan areas selected for existing UAM activity,
            regulatory engagement, or operator commitments. International markets and smaller US
            markets are not currently tracked. Coverage expansion will be based on evidence of
            UAM activity rather than geographic completeness. A phased national expansion to all
            50 metropolitan statistical areas is planned as part of Vertical Data Group&apos;s
            ongoing research program.
          </p>
        </Section>

        {/* Research & Policy Applications */}
        <Section id="research" title="Research &amp; Policy Applications">
          <p style={{ marginBottom: 16 }}>
            The UAM Market Readiness Index is designed to support applied research and policy
            analysis across the UAM ecosystem. Federal and state agencies, metropolitan planning
            organizations, and academic researchers may use AirIndex data to:
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "Benchmark municipal UAM readiness against a standardized, evidence-based framework",
              "Identify regulatory and infrastructure gaps requiring targeted intervention",
              "Monitor market development over time through the historical score archive",
              "Support grant applications, transportation studies, and infrastructure investment decisions",
            ].map((item) => (
              <li
                key={item}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  fontSize: 14,
                  color: "#0a2540",
                  lineHeight: 1.6,
                }}
              >
                <span style={{ color: "#5B8DB8", flexShrink: 0, marginTop: 2 }}>&mdash;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p style={{ color: "#425466", fontSize: 14, lineHeight: 1.7 }}>
            Vertical Data Group actively supports research partnerships and data collaborations
            with government agencies, universities, and policy institutions. For research access
            or partnership inquiries, contact{" "}
            <a href="mailto:info@airindex.io" style={{ color: "#5B8DB8", textDecoration: "none" }}>
              info@airindex.io
            </a>
          </p>
        </Section>

        {/* Citation guidance */}
        <Section id="citation" title="Citing AirIndex Data">
          <p style={{ marginBottom: 12 }}>
            AirIndex data and readiness scores are free to cite in publications, reports, and
            analysis. When referencing AirIndex data, please use the following format:
          </p>
          <div
            style={{
              background: "rgba(91, 141, 184, 0.04)",
              border: "1px solid rgba(91, 141, 184, 0.12)",
              borderRadius: 8,
              padding: "20px 24px",
              fontFamily: "'Space Mono', monospace",
              fontSize: 13,
              color: "#5B8DB8",
              lineHeight: 1.8,
              marginBottom: 16,
            }}
          >
            Source: AirIndex UAM Market Readiness Index, v1.3 (airindex.io/methodology)
          </div>
          <p style={{ color: "#425466", fontSize: 13, marginBottom: 16 }}>
            A formal methodology paper with DOI assignment is forthcoming. Researchers requiring
            a citable reference should contact{" "}
            <a href="mailto:info@airindex.io" style={{ color: "#5B8DB8", textDecoration: "none" }}>
              info@airindex.io
            </a>
          </p>
          <p style={{ color: "#425466", fontSize: 13 }}>
            For press inquiries, data partnerships, or API access, contact{" "}
            <a href="mailto:info@airindex.io" style={{ color: "#5B8DB8", textDecoration: "none" }}>
              info@airindex.io
            </a>
          </p>
        </Section>

        {/* Back to dashboard */}
        <div
          style={{
            paddingTop: 32,
            borderTop: "1px solid #e3e8ee",
            display: "flex",
            gap: 24,
            fontSize: 12,
          }}
        >
          <Link href="/dashboard" style={{ color: "#5B8DB8", textDecoration: "none" }}>
            View Dashboard
          </Link>
          <Link href="/terminology" style={{ color: "#8792a2", textDecoration: "none" }}>
            Terminology Reference
          </Link>
          <Link href="/api" style={{ color: "#8792a2", textDecoration: "none" }}>
            API
          </Link>
          <Link href="/" style={{ color: "#8792a2", textDecoration: "none" }}>
            Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
