import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import PulseSubscribe from "@/components/PulseSubscribe";
import { CITIES, MARKET_COUNT } from "@/data/seed";
import { getScoreColor, getScoreTier } from "@/lib/scoring";
import { FAMILY, SIZE, WEIGHT } from "@/lib/email-typography";

export const metadata: Metadata = {
  title: "UAM Market Readiness Brief — April 2026 — AirIndex",
  description:
    "April 2026 market readiness brief. Federal program selection became a first-order score driver. Three markets repriced simultaneously on April 26 — the first synchronized federal-driven score event in AirIndex history.",
};

// -------------------------------------------------------
// Palette (light institutional theme)
// -------------------------------------------------------
const C = {
  bg: "#ffffff",
  bgSubtle: "#f6f9fc",
  border: "#e3e8ee",
  borderStrong: "#cbd6e2",
  primary: "#0a2540",
  secondary: "#425466",
  tertiary: "#697386",
  accent: "#0a4f8a",
  accentSoft: "#e8f0f9",
};

// -------------------------------------------------------
// Data — sourced from April snapshot diff + applied overrides
// -------------------------------------------------------

// End-of-month scores from the latest ScoreSnapshot per city (Apr 29, 2026).
// Static seed values are stale once overrides apply; rankings must reflect
// the score the system was actually showing at month-end.
const END_OF_MONTH_OVERRIDES: Record<string, number> = {
  charlotte: 45,
  houston: 65,
  atlanta: 25,
  washington_dc: 10,
};

const sorted = [...CITIES]
  .map((c) => ({ ...c, score: END_OF_MONTH_OVERRIDES[c.id] ?? c.score ?? 0 }))
  .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

const SCORE_MOVEMENTS = [
  {
    city: "Charlotte",
    state: "NC",
    from: 25,
    to: 45,
    delta: 20,
    cause: "USDOT approves NC's eVTOL proposals; Concord airport designated as first-phase site for state's electric air taxi network. Tier crossing — only crossing in April.",
  },
  {
    city: "Houston",
    state: "TX",
    from: 50,
    to: 65,
    delta: 15,
    cause: "TxDOT selected for the federal eVTOL Integration Pilot Program (eIPP). Operator presence factor lifted; intra-tier movement.",
  },
  {
    city: "Atlanta",
    state: "GA",
    from: 10,
    to: 25,
    delta: 15,
    cause: "Operator press flagged Atlanta as a target market via the activeOperatorPresence override pipeline. Tied to a non-tracked operator — treat as a soft federal-cohort signal pending validation.",
  },
  {
    city: "Washington D.C.",
    state: "DC",
    from: 0,
    to: 10,
    delta: 10,
    cause: "Admin override consolidated federal posture signals into the regulatory dimension. Adjacent to but not part of the Apr 26 federal cluster.",
  },
];

// PRIMARY SIGNAL — the dominant structural read of the month.
const PRIMARY_SIGNAL = {
  accent: "#16a34a",
  title: "Federal program selection now moves markets directly.",
  observation:
    "On April 26, three markets repriced inside a 2-hour window off three distinct federal channels firing the same day: TxDOT's selection for the federal eVTOL Integration Pilot Program, USDOT's approval of NC's eVTOL proposals + Concord airport designation, and an operator-press signal targeting Atlanta. AirIndex has not previously observed a synchronization of this size from federal activity.",
  call:
    "Next federal cohort announcement should move 3–5 additional markets, concentrated in the NASCENT→EARLY band. Site designations move infrastructure factors. Operator selections move presence factors. Corridor selections move both.",
};

// SECONDARY SIGNALS — supporting structural reads.
const SECONDARY_SIGNALS = [
  {
    accent: "#0a4f8a",
    title: "Legislative status is unstable.",
    observation:
      "Phoenix moved 50 → 40 → 50 inside 11 days. A stale 'enacted' classification was pulled when the bill was found in committee (-10). SB1457 then advanced to engrossing, applying the rebound (+10). One procedural change moved a market 10 points.",
    call:
      "Treat 'actively_moving' as a conditional read. ~30% of bills at this status revert to 'none' before passage. Re-validate at every committee milestone.",
  },
  {
    accent: "#b45309",
    title: "Media coverage decouples from readiness.",
    observation:
      "~50 articles on Joby's JFK demo cycle. New York's score did not move; it remains at 55. Vertiport zoning, state legislation, regulatory posture untouched — only operator presence, already at maximum.",
    call:
      "Demo cycles will keep generating coverage without shifting score. The NY floor moves on Albany, not Manhattan. Next NY trigger: state legislation or vertiport zoning action.",
  },
  {
    accent: "#6d28d9",
    title: "Tiers are sticky.",
    observation:
      "One tier crossing held in April: Charlotte (NASCENT → EARLY). Two same-day excursions to MODERATE reverted within 24 hours (Charlotte Apr 27, San Antonio Apr 28) as the override pipeline tested then re-validated signals. 693 new records, 1,549 classifications, 304 applied overrides.",
    call:
      "≤2 tier crossings per month under current methodology. Each crossing warrants analyst review. Most monthly movement is intra-tier creep; tier landscape is the horizon for genuine market evolution.",
  },
  {
    accent: "#b91c1c",
    title: "Federal reach is east, not west.",
    observation:
      "All four April movers east of and including Texas. West Coast — LA (95), SF (75), San Diego (50) — quiet. The federal program is reaching for capacity not yet on the leaderboard, not reinforcing existing leaders.",
    call:
      "California's silence in April is signal, not noise. The federal layer is filling capacity gaps east and south. Pattern continues through Q2 absent a West Coast operator-presence event.",
  },
];

// Market clusters — frame the 25-market field by structural posture.
const CLUSTERS = [
  {
    accent: "#16a34a",
    label: "Federally Accelerating",
    description: "Markets repriced in April off federal-channel triggers. Near-term ceiling depends on cohort follow-on activity.",
    cities: ["Charlotte, NC", "Houston, TX", "Atlanta, GA"],
  },
  {
    accent: "#0a4f8a",
    label: "Structurally Strong, Currently Static",
    description: "Top-of-leaderboard markets that did not move in April. Federal layer reached past them; further movement requires a new operator or vertiport event.",
    cities: ["Los Angeles, CA", "San Francisco, CA", "San Diego, CA"],
  },
  {
    accent: "#b45309",
    label: "Policy-Dependent",
    description: "Score floor is bounded by absent or unstable legislation. Movement is binary — gated on a single legislative milestone.",
    cities: ["Phoenix, AZ", "New York, NY"],
  },
];

// Index-wide constraints — what's actually holding the market back.
const CONSTRAINTS = [
  {
    label: "Federal dependency for momentum",
    body: "April's movement was almost entirely federally-triggered. Markets without federal-program adjacency have limited near-term paths to score change.",
  },
  {
    label: "Legislative instability",
    body: "State legislation is the highest-weighted factor and the most volatile. 'Actively_moving' status reverts ~30% of the time. The factor that moves markets most is also the one most likely to give back ground.",
  },
  {
    label: "Lack of infrastructure validation signals",
    body: "Vertiport approvals and FAA OE/AAA determinations remain rare. April produced one operational vertiport-relevant signal (the SkyGrid + Port San Antonio MOU — a partnership, not an approval). Until infrastructure milestones flow regularly, scores will be operator- and policy-driven.",
  },
];

const WATCHLIST = [
  {
    city: "Phoenix, AZ",
    horizon: "30 days",
    trigger: "SB1457 floor vote",
    impact:
      "If enacted, +10 from stateLegislationStatus moving to 'enacted'. If tabled or withdrawn, -10 from regression to 'none'. Confidence in directional move: medium-high.",
  },
  {
    city: "New York, NY",
    horizon: "60 days",
    trigger: "State legislative session",
    impact:
      "Albany has not introduced UAM-enabling legislation. NY's intra-tier ceiling is constrained without it; the next +5 to +20 move requires a state-level milestone, not operator activity.",
  },
  {
    city: "Charlotte, NC",
    horizon: "30 days",
    trigger: "Federal cohort follow-on; Concord airport site progress",
    impact:
      "Charlotte's April crossing into EARLY rests on USDOT proposal approval. The next score-moving event is a vertiport zoning action or a named-operator partnership — either would push toward MODERATE.",
  },
  {
    city: "San Antonio, TX",
    horizon: "30–90 days",
    trigger: "SkyGrid + Port San Antonio MOU → next milestone",
    impact:
      "April's MOU signing did not move score (a partnership is not an approval). A vertiport approval, FAA OE/AAA determination, or operator-named-partnership event would lift approvedVertiport. Watch the next Port San Antonio public meeting.",
  },
];

// -------------------------------------------------------
// Page
// -------------------------------------------------------

export default function AprilReportPage() {
  return (
    <div
      style={{
        background: C.bg,
        color: C.primary,
        minHeight: "100vh",
        fontFamily: FAMILY.sans,
      }}
    >
      <SiteNav theme="light" />

      <main style={{ maxWidth: 840, margin: "0 auto", padding: "100px 24px 80px" }}>

        {/* ═══ Header ═══ */}
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{
            fontSize: 9,
            letterSpacing: 3,
            color: C.accent,
            fontFamily: FAMILY.mono,
            marginBottom: 12,
          }}>
            APRIL 2026 &middot; ISSUE 3
          </div>
          <h1 style={{
            fontFamily: FAMILY.sans,
            fontSize: "clamp(28px, 4vw, 42px)",
            fontWeight: 700,
            color: C.primary,
            margin: "0 0 16px",
            letterSpacing: "-0.02em",
          }}>
            UAM Market Readiness Brief
          </h1>
          <p style={{ color: C.secondary, fontSize: 20, lineHeight: 1.7, maxWidth: 600, margin: "0 auto" }}>
            What the market is telling us. Forward calls grounded in {MARKET_COUNT}-market readiness data.
          </p>
          <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{
              background: C.accentSoft,
              border: `1px solid ${C.border}`,
              borderRadius: 4,
              padding: "4px 12px",
              fontSize: 10,
              fontFamily: FAMILY.mono,
              letterSpacing: 1,
              color: C.accent,
            }}>
              METHODOLOGY v1.3
            </span>
            <span style={{
              background: "#e8f5ec",
              border: "1px solid #c8e6cf",
              borderRadius: 4,
              padding: "4px 12px",
              fontSize: 10,
              fontFamily: FAMILY.mono,
              letterSpacing: 1,
              color: "#166534",
            }}>
              {MARKET_COUNT} MARKETS
            </span>
          </div>
        </div>

        {/* ═══ Opening Thesis ═══ */}
        <section style={{ marginBottom: 48, padding: "32px 0", borderBottom: `1px solid ${C.border}` }}>
          <h2 style={{
            fontFamily: FAMILY.sans,
            fontSize: SIZE.h2,
            fontWeight: 700,
            color: C.primary,
            marginBottom: 20,
          }}>
            Opening Thesis
          </h2>
          <div style={{ fontSize: 20, lineHeight: 1.5, fontWeight: 500, color: C.primary }}>
            <p style={{ marginBottom: 14 }}>
              April changed how markets move.
            </p>
            <p style={{ marginBottom: 14 }}>
              Federal program selection now drives readiness directly.
            </p>
            <p>
              Momentum is no longer state-driven — it is federally orchestrated.
            </p>
          </div>
        </section>

        {/* ═══ Key Metrics ═══ */}
        <section style={{ marginBottom: 48, padding: "32px 0", borderBottom: `1px solid ${C.border}` }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
          }}>
            {[
              { value: "4", label: "MOVERS", color: "#16a34a" },
              { value: "1", label: "TIER CROSSING", color: C.accent },
              { value: "APR 26", label: "FEDERAL CLUSTER", color: "#b45309" },
              { value: String(MARKET_COUNT), label: "MARKETS", color: "#6d28d9" },
            ].map((m) => (
              <div key={m.label} style={{
                background: C.bgSubtle,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "20px 16px",
                textAlign: "center",
              }}>
                <div style={{
                  fontFamily: FAMILY.sans,
                  fontSize: 28,
                  fontWeight: 800,
                  color: m.color,
                }}>
                  {m.value}
                </div>
                <div style={{
                  fontFamily: FAMILY.mono,
                  fontSize: 9,
                  letterSpacing: 2,
                  color: C.tertiary,
                  marginTop: 4,
                }}>
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ Score Movements ═══ */}
        <section style={{ marginBottom: 48, padding: "32px 0", borderBottom: `1px solid ${C.border}` }}>
          <h2 style={{
            fontFamily: FAMILY.sans,
            fontSize: SIZE.h2,
            fontWeight: 700,
            color: C.primary,
            marginBottom: 8,
          }}>
            System Movement
          </h2>
          <p style={{ color: C.secondary, fontSize: 20, lineHeight: 1.7, marginBottom: 20, fontWeight: 500 }}>
            Four markets moved in April. Three repriced within a two-hour window from federal triggers.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {SCORE_MOVEMENTS.map((m) => {
              const isUp = m.delta > 0;
              const color = isUp ? "#16a34a" : "#b45309";
              return (
                <div key={m.city} style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "14px 16px",
                  background: C.bgSubtle,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  flexWrap: "wrap",
                }}>
                  <span style={{
                    color,
                    fontFamily: FAMILY.mono,
                    fontSize: 20,
                    fontWeight: 700,
                    minWidth: 48,
                  }}>
                    {isUp ? "+" : ""}{m.delta}
                  </span>
                  <div style={{ minWidth: 140 }}>
                    <div style={{ color: C.primary, fontSize: 20, fontWeight: 600 }}>
                      {m.city}, {m.state}
                    </div>
                    <div style={{ color: C.tertiary, fontSize: 11, fontFamily: FAMILY.mono, marginTop: 2 }}>
                      {m.from} → {m.to}
                    </div>
                  </div>
                  <span style={{
                    background: `${getScoreColor(m.to)}1A`,
                    color: getScoreColor(m.to),
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: 1,
                    padding: "3px 8px",
                    borderRadius: 3,
                    border: `1px solid ${getScoreColor(m.to)}40`,
                    height: "fit-content",
                  }}>
                    {getScoreTier(m.to)}
                  </span>
                  <span style={{ color: C.secondary, fontSize: 20, lineHeight: 1.6, flex: 1, minWidth: 280 }}>
                    {m.cause}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* ═══ Dominant Takeaway (mid-report anchor) ═══ */}
        <section style={{
          marginBottom: 48,
          padding: "36px 32px",
          borderLeft: `4px solid ${C.accent}`,
          background: C.accentSoft,
          borderRadius: "0 10px 10px 0",
        }}>
          <p style={{
            fontFamily: FAMILY.sans,
            fontSize: SIZE.h2,
            fontWeight: 700,
            color: C.primary,
            lineHeight: 1.4,
            margin: 0,
            letterSpacing: "-0.01em",
          }}>
            April confirms that federal signals — not local readiness — are now driving market movement.
          </p>
        </section>

        {/* ═══ Structural Signals — Primary + Secondary hierarchy ═══ */}
        <section style={{ marginBottom: 48, padding: "32px 0", borderBottom: `1px solid ${C.border}` }}>
          <h2 style={{
            fontFamily: FAMILY.sans,
            fontSize: SIZE.h2,
            fontWeight: 700,
            color: C.primary,
            marginBottom: 20,
          }}>
            Structural Signals
          </h2>

          {/* Primary Signal — dominant */}
          <div style={{
            background: "#ffffff",
            border: `2px solid ${PRIMARY_SIGNAL.accent}`,
            borderRadius: 10,
            padding: "24px 28px",
            marginBottom: 24,
            boxShadow: `0 1px 3px rgba(10,37,64,0.04)`,
          }}>
            <div style={{
              fontFamily: FAMILY.mono,
              fontSize: 10,
              letterSpacing: 3,
              color: PRIMARY_SIGNAL.accent,
              fontWeight: 700,
              marginBottom: 12,
            }}>
              PRIMARY SIGNAL
            </div>
            <div style={{
              color: C.primary,
              fontSize: SIZE.h2,
              fontWeight: 700,
              marginBottom: 14,
              lineHeight: 1.3,
              fontFamily: FAMILY.sans,
              letterSpacing: "-0.01em",
            }}>
              {PRIMARY_SIGNAL.title}
            </div>
            <div style={{ color: C.secondary, fontSize: 20, lineHeight: 1.75, marginBottom: 16 }}>
              {PRIMARY_SIGNAL.observation}
            </div>
            <div style={{
              borderTop: `1px solid ${C.border}`,
              paddingTop: 14,
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
            }}>
              <span style={{
                fontFamily: FAMILY.mono,
                fontSize: 10,
                letterSpacing: 3,
                color: PRIMARY_SIGNAL.accent,
                fontWeight: 700,
                paddingTop: 3,
                whiteSpace: "nowrap",
              }}>
                CALL
              </span>
              <span style={{ color: C.primary, fontSize: 20, lineHeight: 1.75, fontWeight: 500 }}>
                {PRIMARY_SIGNAL.call}
              </span>
            </div>
          </div>

          {/* Secondary signals — compact 2-col grid */}
          <div style={{
            fontFamily: FAMILY.mono,
            fontSize: 9,
            letterSpacing: 2,
            color: C.tertiary,
            marginBottom: 12,
          }}>
            SECONDARY SIGNALS
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {SECONDARY_SIGNALS.map((s) => (
              <div key={s.title} style={{
                background: C.bgSubtle,
                border: `1px solid ${C.border}`,
                borderLeft: `3px solid ${s.accent}`,
                borderRadius: "0 6px 6px 0",
                padding: "14px 18px",
              }}>
                <div style={{ color: C.primary, fontSize: 20, fontWeight: 700, marginBottom: 8, lineHeight: 1.35 }}>
                  {s.title}
                </div>
                <div style={{ color: C.secondary, fontSize: 20, lineHeight: 1.7, marginBottom: 10 }}>
                  {s.observation}
                </div>
                <div style={{
                  borderTop: `1px solid ${C.border}`,
                  paddingTop: 8,
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                }}>
                  <span style={{
                    fontFamily: FAMILY.mono,
                    fontSize: 8,
                    letterSpacing: 2,
                    color: s.accent,
                    fontWeight: 700,
                    paddingTop: 2,
                    whiteSpace: "nowrap",
                  }}>
                    CALL
                  </span>
                  <span style={{ color: C.primary, fontSize: 20, lineHeight: 1.7 }}>
                    {s.call}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ Market Clusters ═══ */}
        <section style={{ marginBottom: 48, padding: "32px 0", borderBottom: `1px solid ${C.border}` }}>
          <h2 style={{
            fontFamily: FAMILY.sans,
            fontSize: SIZE.h2,
            fontWeight: 700,
            color: C.primary,
            marginBottom: 8,
          }}>
            Market Clusters
          </h2>
          <p style={{ color: C.secondary, fontSize: 20, lineHeight: 1.7, marginBottom: 20, fontWeight: 500 }}>
            The 25-market field, framed by structural posture rather than score.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {CLUSTERS.map((cluster) => (
              <div key={cluster.label} style={{
                background: C.bgSubtle,
                border: `1px solid ${C.border}`,
                borderLeft: `4px solid ${cluster.accent}`,
                borderRadius: "0 8px 8px 0",
                padding: "16px 20px",
              }}>
                <div style={{
                  fontFamily: FAMILY.sans,
                  color: C.primary,
                  fontSize: 20,
                  fontWeight: 700,
                  marginBottom: 6,
                }}>
                  {cluster.label}
                </div>
                <div style={{ color: C.secondary, fontSize: 20, lineHeight: 1.7, marginBottom: 10 }}>
                  {cluster.description}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {cluster.cities.map((city) => (
                    <span key={city} style={{
                      background: "#ffffff",
                      border: `1px solid ${C.border}`,
                      borderRadius: 4,
                      padding: "4px 10px",
                      fontSize: 11,
                      color: C.primary,
                      fontWeight: 500,
                    }}>
                      {city}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ Constraints Across the Index ═══ */}
        <section style={{ marginBottom: 48, padding: "32px 0", borderBottom: `1px solid ${C.border}` }}>
          <h2 style={{
            fontFamily: FAMILY.sans,
            fontSize: SIZE.h2,
            fontWeight: 700,
            color: C.primary,
            marginBottom: 8,
          }}>
            Key Constraints Across the Index
          </h2>
          <p style={{ color: C.secondary, fontSize: 20, lineHeight: 1.7, marginBottom: 20, fontWeight: 500 }}>
            Three structural barriers holding the field back from broader movement.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {CONSTRAINTS.map((c, i) => (
              <div key={c.label} style={{
                display: "flex",
                gap: 16,
                padding: "16px 20px",
                background: C.bgSubtle,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
              }}>
                <div style={{
                  fontFamily: FAMILY.mono,
                  fontSize: 22,
                  fontWeight: 700,
                  color: C.accent,
                  minWidth: 32,
                }}>
                  0{i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: C.primary, fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                    {c.label}
                  </div>
                  <div style={{ color: C.secondary, fontSize: 20, lineHeight: 1.7 }}>
                    {c.body}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ Watchlist ═══ */}
        <section style={{ marginBottom: 48, padding: "32px 0", borderBottom: `1px solid ${C.border}` }}>
          <h2 style={{
            fontFamily: FAMILY.sans,
            fontSize: SIZE.h2,
            fontWeight: 700,
            color: C.primary,
            marginBottom: 8,
          }}>
            Forward Signals (30–90 Days)
          </h2>
          <p style={{ color: C.secondary, fontSize: 20, lineHeight: 1.7, marginBottom: 20, fontWeight: 500 }}>
            Four markets where a near-term trigger has a credible path to a score-moving event.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {WATCHLIST.map((m) => (
              <div key={m.city} style={{
                background: C.bgSubtle,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "16px 20px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={{ color: C.primary, fontSize: 20, fontWeight: 600 }}>{m.city}</span>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: 1,
                    padding: "2px 8px",
                    borderRadius: 3,
                    background: C.accentSoft,
                    color: C.accent,
                    border: `1px solid ${C.border}`,
                    fontFamily: FAMILY.mono,
                  }}>
                    {m.horizon}
                  </span>
                </div>
                <div style={{ color: C.secondary, fontSize: 20, lineHeight: 1.6, marginBottom: 8 }}>
                  <span style={{ color: C.tertiary, textTransform: "uppercase", fontSize: 10, letterSpacing: 1, fontFamily: FAMILY.mono }}>Trigger:</span>{" "}
                  {m.trigger}
                </div>
                <div style={{ color: C.secondary, fontSize: 20, lineHeight: 1.7 }}>{m.impact}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ End-of-Month Rankings ═══ */}
        <section style={{ marginBottom: 48, padding: "32px 0", borderBottom: `1px solid ${C.border}` }}>
          <h2 style={{
            fontFamily: FAMILY.sans,
            fontSize: SIZE.h2,
            fontWeight: 700,
            color: C.primary,
            marginBottom: 8,
          }}>
            End-of-Month Rankings
          </h2>
          <p style={{ color: C.secondary, fontSize: 20, lineHeight: 1.7, marginBottom: 20, fontWeight: 500 }}>
            Top-tier markets remain unchanged — the federal layer is building capacity beneath them.
          </p>
          <div style={{
            background: C.bgSubtle,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            overflow: "hidden",
          }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "40px 1fr 60px 80px 1fr",
              padding: "10px 16px",
              borderBottom: `1px solid ${C.border}`,
              fontSize: 9,
              fontFamily: FAMILY.mono,
              letterSpacing: 2,
              color: C.tertiary,
            }}>
              <span>#</span>
              <span>MARKET</span>
              <span style={{ textAlign: "right" }}>SCORE</span>
              <span style={{ textAlign: "center" }}>TIER</span>
              <span />
            </div>
            {sorted.map((city, i) => {
              const score = city.score ?? 0;
              const color = getScoreColor(score);
              const tier = getScoreTier(score);
              return (
                <div key={city.id} style={{
                  display: "grid",
                  gridTemplateColumns: "40px 1fr 60px 80px 1fr",
                  padding: "10px 16px",
                  borderBottom: i < sorted.length - 1 ? `1px solid ${C.border}` : "none",
                  alignItems: "center",
                }}>
                  <span style={{ color: C.tertiary, fontSize: 11 }}>{i + 1}</span>
                  <span style={{ color: C.primary, fontSize: 20, fontWeight: 500 }}>
                    {city.city}, {city.state}
                  </span>
                  <span style={{ textAlign: "right", color, fontSize: 20, fontWeight: 700, fontFamily: FAMILY.mono }}>
                    {score}
                  </span>
                  <span style={{ textAlign: "center" }}>
                    <span style={{
                      background: `${color}1A`,
                      color,
                      fontSize: 8,
                      fontWeight: 700,
                      letterSpacing: 1,
                      padding: "2px 8px",
                      borderRadius: 3,
                      border: `1px solid ${color}40`,
                    }}>
                      {tier}
                    </span>
                  </span>
                  <div style={{ height: 4, borderRadius: 2, background: C.border, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: 2 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ═══ Final Take ═══ */}
        <section style={{
          marginBottom: 48,
          padding: "40px 32px",
          background: "#0a2540",
          borderRadius: 12,
          color: "#ffffff",
        }}>
          <div style={{
            fontFamily: FAMILY.mono,
            fontSize: 10,
            letterSpacing: 3,
            color: "#7eb8ff",
            fontWeight: 700,
            marginBottom: 16,
          }}>
            FINAL TAKE
          </div>
          <p style={{
            fontFamily: FAMILY.sans,
            fontSize: SIZE.h2,
            fontWeight: 600,
            lineHeight: 1.45,
            color: "#ffffff",
            margin: "0 0 18px",
            letterSpacing: "-0.01em",
          }}>
            April marks a shift from isolated market development to synchronized federal-driven movement.
          </p>
          <p style={{
            fontSize: 20,
            lineHeight: 1.65,
            color: "#cbd6e2",
            margin: 0,
            fontWeight: 400,
          }}>
            The next phase of UAM readiness will be defined by how quickly markets convert federal signals into operational infrastructure.
          </p>
        </section>

        {/* ═══ Methodology footnote ═══ */}
        <section style={{ marginBottom: 48, padding: "24px 0", borderBottom: `1px solid ${C.border}` }}>
          <p style={{ color: C.tertiary, fontSize: 20, lineHeight: 1.7 }}>
            Scores are computed under{" "}
            <Link href="/methodology" style={{ color: C.accent, textDecoration: "underline" }}>
              v1.3 methodology
            </Link>
            . Readiness signals are ingested daily from federal, state, and operator sources;
            classifier outputs are reviewed and applied via override pipeline. Forward calls
            in this brief are first-resolution candidates; verification window opens June 16, 2026.
          </p>
        </section>

        {/* ═══ CTA ═══ */}
        <section style={{
          textAlign: "center",
          padding: "48px 24px",
          background: C.bgSubtle,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          marginTop: 32,
        }}>
          <h3 style={{
            fontFamily: FAMILY.sans,
            fontSize: 22,
            fontWeight: 700,
            color: C.primary,
            marginBottom: 8,
          }}>
            Want the per-market traces and the audit trail behind these calls?
          </h3>
          <p style={{ color: C.secondary, fontSize: 20, marginBottom: 20, lineHeight: 1.6 }}>
            Full April brief includes per-market factor traces, classifier audit data, and
            the prediction ledger entries linked to each forward call.
          </p>
          <Link
            href="/contact?tier=pro&ref=report-april"
            style={{
              display: "inline-block",
              padding: "12px 28px",
              background: C.accent,
              color: "#ffffff",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textDecoration: "none",
              borderRadius: 6,
            }}
          >
            Talk to Us
          </Link>
        </section>
      </main>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 20px 48px" }}>
        <PulseSubscribe source="report" compact theme="light" />
      </div>

      <SiteFooter theme="light" />
    </div>
  );
}
