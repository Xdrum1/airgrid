import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { CITIES, OPERATORS, VERTIPORTS, MARKET_COUNT } from "@/data/seed";
import { getScoreColor, getScoreTier, SCORE_WEIGHTS } from "@/lib/scoring";
import ReportGate from "./ReportGate";

export const metadata: Metadata = {
  title: "March 2026 Market Report — AirIndex",
  description:
    "UAM Market Readiness Intelligence — March 2026. Score movements, methodology updates, corridor tracking, and operator analysis across 21 US markets.",
};

// -------------------------------------------------------
// Data prep (runs at build time)
// -------------------------------------------------------

const sorted = [...CITIES].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

const SCORE_MOVEMENTS = [
  { city: "San Francisco", state: "CA", from: 40, to: 75, delta: 35, reason: "Joby Electric Skies Tour demo flight across SF Bay confirmed pilot program and operator presence" },
  { city: "Austin", state: "TX", from: 30, to: 50, delta: 20, reason: "State legislation enacted + active pilot program established" },
  { city: "Houston", state: "TX", from: 30, to: 50, delta: 20, reason: "State legislation enacted + pilot program activity recognized" },
  { city: "Phoenix", state: "AZ", from: 35, to: 50, delta: 15, reason: "Active pilot program via Joby eIPP partnership + state regulatory momentum" },
  { city: "San Diego", state: "CA", from: 45, to: 50, delta: 5, reason: "Vertiport zoning frameworks formalized in city planning documents" },
  { city: "Dallas", state: "TX", from: 100, to: 95, delta: -5, reason: "Methodology v1.3 recalibration — no market scores 100 due to weather infrastructure gap" },
  { city: "Los Angeles", state: "CA", from: 100, to: 95, delta: -5, reason: "Methodology v1.3 weather infrastructure adjustment" },
  { city: "Orlando", state: "FL", from: 85, to: 80, delta: -5, reason: "Methodology v1.3 weather infrastructure adjustment" },
  { city: "New York", state: "NY", from: 70, to: 55, delta: -15, reason: "Methodology v1.3 reweight — no vertiport zoning or state legislation drops multiple factors" },
];

const TOP_STORIES = [
  {
    color: "#00ff88",
    title: "San Francisco surges +35 to ADVANCED tier",
    body: "Joby's Electric Skies Tour demo flight across SF Bay confirmed active pilot program status and operator presence in the market. Combined with California's existing enacted legislation, vertiport zoning frameworks, and regulatory posture, San Francisco jumped from EARLY (40) to ADVANCED (75) — the largest single-month score movement in AirIndex history.",
  },
  {
    color: "#00d4ff",
    title: "Scoring methodology v1.3 shipped",
    body: "State Legislation elevated to highest-weighted factor (20 pts). Weather Infrastructure replaces LAANC as the seventh factor, with graduated scoring (none/partial/full). No market currently scores 100 — even Dallas and LA carry a 5-point weather infrastructure gap, reflecting the absence of comprehensive low-altitude weather sensing networks at scale.",
  },
  {
    color: "#f59e0b",
    title: "Joby acquires Blade Air Mobility (~$125M)",
    body: "Joby Aviation completed its acquisition of Blade Air Mobility, consolidating NYC heliport terminal network, LA helicopter routes, and Miami operations under a single operator. Active operator count: 5 → 4. This gives Joby an operational infrastructure head start in three of the top five markets.",
  },
  {
    color: "#7c3aed",
    title: "5,647 FAA heliports ingested into AirIndex",
    body: "Full NASR 5010 heliport database integrated. Los Angeles leads with 146 registered heliports, followed by Houston (137), Dallas (69), and Phoenix (48). These existing aviation facilities represent potential eVTOL conversion sites — markets with dense heliport networks may have a 12-18 month infrastructure advantage.",
  },
  {
    color: "#00d4ff",
    title: "Federal Register coverage expanded 1,580%",
    body: "Ingestion window expanded from 90 to 730 days with new search terms ('powered lift', SFAR). Records jumped from 5 to 84. One filing — Archer's White House UAM Pilot Program — had been missed in the 90-day window and triggered Miami's score change from 80 to 100 (later adjusted to 80 under v1.3).",
  },
];

const CORRIDORS_DATA = [
  { name: "LAX → DTLA", status: "proposed", city: "Los Angeles", operator: "Joby Aviation", distance: "24 km" },
  { name: "LAX → Santa Monica", status: "proposed", city: "Los Angeles", operator: "Archer Aviation", distance: "14 km" },
  { name: "MIA → Fort Lauderdale", status: "proposed", city: "Miami", operator: "Joby Aviation", distance: "48 km" },
  { name: "DFW → Downtown Dallas", status: "proposed", city: "Dallas", operator: "Wisk Aero", distance: "32 km" },
  { name: "JFK → Manhattan", status: "proposed", city: "New York", operator: "Joby Aviation", distance: "22 km" },
  { name: "SFO → Downtown SF", status: "proposed", city: "San Francisco", operator: "Joby Aviation", distance: "20 km" },
  { name: "ORD → Downtown Chicago", status: "proposed", city: "Chicago", operator: "Archer Aviation", distance: "26 km" },
  { name: "PHX → Scottsdale", status: "proposed", city: "Phoenix", operator: "Joby Aviation", distance: "18 km" },
  { name: "MCO → International Drive", status: "proposed", city: "Orlando", operator: "—", distance: "12 km" },
];

const HELIPORT_TOP10 = [
  { city: "Los Angeles", state: "CA", count: 146 },
  { city: "Houston", state: "TX", count: 137 },
  { city: "Dallas", state: "TX", count: 69 },
  { city: "Phoenix", state: "AZ", count: 48 },
  { city: "Orlando", state: "FL", count: 44 },
  { city: "New York", state: "NY", count: 39 },
  { city: "Miami", state: "FL", count: 37 },
  { city: "Denver", state: "CO", count: 28 },
  { city: "Atlanta", state: "GA", count: 27 },
  { city: "Chicago", state: "IL", count: 25 },
];

const WEIGHT_LABELS: Record<string, string> = {
  stateLegislation: "State Legislation",
  activePilotProgram: "Active Pilot Program",
  approvedVertiport: "Approved Vertiport",
  activeOperatorPresence: "Operator Presence",
  vertiportZoning: "Vertiport Zoning",
  regulatoryPosture: "Regulatory Posture",
  weatherInfrastructure: "Weather Infrastructure",
};

// -------------------------------------------------------
// Page
// -------------------------------------------------------

export default function MarchReportPage() {
  return (
    <div
      style={{
        background: "#050508",
        color: "#e0e0e0",
        minHeight: "100vh",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <SiteNav />

      <main style={{ maxWidth: 840, margin: "0 auto", padding: "100px 24px 80px" }}>

        {/* ═══ Header ═══ */}
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{
            fontSize: 9,
            letterSpacing: 3,
            color: "#00d4ff",
            fontFamily: "'Space Mono', monospace",
            marginBottom: 12,
          }}>
            MARCH 2026 &middot; ISSUE 2
          </div>
          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "clamp(28px, 4vw, 42px)",
            fontWeight: 700,
            color: "#fff",
            margin: "0 0 16px",
            letterSpacing: "-0.02em",
          }}>
            UAM Market Readiness Report
          </h1>
          <p style={{ color: "#888", fontSize: 14, lineHeight: 1.7, maxWidth: 600, margin: "0 auto" }}>
            Score movements, methodology updates, corridor tracking, and industry analysis
            across {MARKET_COUNT} US markets. Published by the AirIndex research team.
          </p>
          <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{
              background: "rgba(0,212,255,0.08)",
              border: "1px solid rgba(0,212,255,0.2)",
              borderRadius: 4,
              padding: "4px 12px",
              fontSize: 10,
              fontFamily: "'Space Mono', monospace",
              letterSpacing: 1,
              color: "#00d4ff",
            }}>
              v1.3 METHODOLOGY
            </span>
            <span style={{
              background: "rgba(0,255,136,0.08)",
              border: "1px solid rgba(0,255,136,0.2)",
              borderRadius: 4,
              padding: "4px 12px",
              fontSize: 10,
              fontFamily: "'Space Mono', monospace",
              letterSpacing: 1,
              color: "#00ff88",
            }}>
              {MARKET_COUNT} MARKETS
            </span>
          </div>
        </div>

        {/* ═══ Executive Summary ═══ */}
        <section style={{ marginBottom: 48, padding: "32px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 22,
            fontWeight: 700,
            color: "#fff",
            marginBottom: 16,
          }}>
            Executive Summary
          </h2>
          <div style={{ color: "#999", fontSize: 14, lineHeight: 1.85 }}>
            <p style={{ marginBottom: 14 }}>
              March 2026 was the most active month in AirIndex history. We shipped methodology v1.3 — the most significant
              scoring recalibration since launch — which elevated State Legislation to the highest-weighted factor and introduced
              Weather Infrastructure as a new dimension. The result: no market currently scores 100, even as the leaders maintain
              clear separation from the field.
            </p>
            <p style={{ marginBottom: 14 }}>
              <strong style={{ color: "#00ff88" }}>San Francisco surged 35 points</strong> to join the ADVANCED tier after
              Joby&apos;s Electric Skies Tour demo confirmed active pilot program status. Texas markets strengthened across
              the board as enacted state legislation lifted Austin and Houston 20 points each.
            </p>
            <p>
              On the industry side, Joby&apos;s acquisition of Blade Air Mobility consolidated three top-market terminal
              networks under one operator, and our FAA heliport data integration added a new infrastructure intelligence
              layer spanning 5,647 registered heliports.
            </p>
          </div>
        </section>

        {/* ═══ Key Metrics ═══ */}
        <section style={{ marginBottom: 48, padding: "32px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
          }}>
            {[
              { value: String(MARKET_COUNT), label: "MARKETS", color: "#00d4ff" },
              { value: "1,797", label: "RECORDS", color: "#00ff88" },
              { value: "5,647", label: "HELIPORTS", color: "#f59e0b" },
              { value: "v1.3", label: "METHODOLOGY", color: "#7c3aed" },
            ].map((m) => (
              <div key={m.label} style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8,
                padding: "20px 16px",
                textAlign: "center",
              }}>
                <div style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 28,
                  fontWeight: 800,
                  color: m.color,
                }}>
                  {m.value}
                </div>
                <div style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 9,
                  letterSpacing: 2,
                  color: "#666",
                  marginTop: 4,
                }}>
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ Score Movements ═══ */}
        <section style={{ marginBottom: 48, padding: "32px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 22,
            fontWeight: 700,
            color: "#fff",
            marginBottom: 20,
          }}>
            Score Movements
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {SCORE_MOVEMENTS.map((m) => {
              const isUp = m.delta > 0;
              const color = isUp ? "#00ff88" : m.delta < -10 ? "#ff4444" : "#f59e0b";
              return (
                <div key={m.city} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 6,
                  flexWrap: "wrap",
                }}>
                  <span style={{
                    color,
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 14,
                    fontWeight: 700,
                    minWidth: 48,
                  }}>
                    {isUp ? "+" : ""}{m.delta}
                  </span>
                  <span style={{ color: "#fff", fontSize: 13, fontWeight: 600, minWidth: 130 }}>
                    {m.city}, {m.state}
                  </span>
                  <span style={{ color: "#888", fontSize: 11, fontFamily: "'Space Mono', monospace" }}>
                    {m.from} → {m.to}
                  </span>
                  <span style={{
                    background: `${getScoreColor(m.to)}15`,
                    color: getScoreColor(m.to),
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: 1,
                    padding: "2px 8px",
                    borderRadius: 3,
                    border: `1px solid ${getScoreColor(m.to)}30`,
                  }}>
                    {getScoreTier(m.to)}
                  </span>
                  <span style={{ color: "#666", fontSize: 11, flex: 1, minWidth: 200 }}>
                    {m.reason}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* ═══ Full Rankings ═══ */}
        <section style={{ marginBottom: 48, padding: "32px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 22,
            fontWeight: 700,
            color: "#fff",
            marginBottom: 20,
          }}>
            Market Rankings — March 2026
          </h2>
          <div style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 8,
            overflow: "hidden",
          }}>
            {/* Table header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "40px 1fr 60px 80px 1fr",
              padding: "10px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              fontSize: 9,
              fontFamily: "'Space Mono', monospace",
              letterSpacing: 2,
              color: "#666",
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
                  borderBottom: i < sorted.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                  alignItems: "center",
                }}>
                  <span style={{ color: "#555", fontSize: 11 }}>{i + 1}</span>
                  <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>
                    {city.city}, {city.state}
                  </span>
                  <span style={{ textAlign: "right", color, fontSize: 14, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>
                    {score}
                  </span>
                  <span style={{ textAlign: "center" }}>
                    <span style={{
                      background: `${color}15`,
                      color,
                      fontSize: 8,
                      fontWeight: 700,
                      letterSpacing: 1,
                      padding: "2px 8px",
                      borderRadius: 3,
                      border: `1px solid ${color}30`,
                    }}>
                      {tier}
                    </span>
                  </span>
                  <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: 2 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ═══ GATE: Full Report Content ═══ */}
        <ReportGate>

          {/* ═══ Methodology v1.3 ═══ */}
          <section style={{ marginBottom: 48, padding: "32px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <h2 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 22,
              fontWeight: 700,
              color: "#fff",
              marginBottom: 16,
            }}>
              Scoring Methodology v1.3
            </h2>

            <div style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 9,
              letterSpacing: 1,
              color: "#555",
              marginBottom: 12,
            }}>
              UPDATED MARCH 29, 2026
            </div>
            <p style={{ color: "#999", fontSize: 13, lineHeight: 1.8, marginBottom: 14 }}>
              Version 1.3 introduces two major changes: State Legislation is now the highest-weighted factor at 20 points,
              and Weather Infrastructure replaces LAANC as the seventh scoring dimension. All scores are 0-100, computed
              from seven binary or graduated factors.
            </p>
            <p style={{ color: "#999", fontSize: 13, lineHeight: 1.8, marginBottom: 14 }}>
              <strong style={{ color: "#ccc" }}>Why Weather Infrastructure at 10 points?</strong>{" "}
              The USDOT AAM National Strategy documents weather as one of four infrastructure pillars
              alongside physical, energy, and spectrum. Weather remains the most uncertain and
              uncontrollable factor that will impact schedule reliability and operator dispatch rates,
              especially in built-up urban areas where confused winds will impact vertiport vehicle
              spacing and throughput. Better weather infrastructure will increase weather and wind
              certainty, contributing to a safer and more efficient airspace and vertiport ecosystem.
              States are a key enabler in closing the weather infrastructure gap.
            </p>
            <p style={{ color: "#999", fontSize: 13, lineHeight: 1.8, marginBottom: 20 }}>
              No market currently scores full points on Weather Infrastructure, reflecting the absence
              of comprehensive low-altitude weather sensing networks at scale. This is why even the
              top-ranked markets — Los Angeles and Dallas — carry a 5-point gap from a perfect score.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {Object.entries(SCORE_WEIGHTS).map(([key, weight]) => (
                <div key={key} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "8px 16px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 6,
                }}>
                  <span style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#00d4ff",
                    minWidth: 30,
                  }}>
                    {weight}
                  </span>
                  <span style={{ color: "#ccc", fontSize: 13 }}>
                    {WEIGHT_LABELS[key] || key}
                  </span>
                  <div style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${weight * 5}%`,
                      background: "rgba(0,212,255,0.4)",
                      borderRadius: 2,
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ═══ Top Stories ═══ */}
          <section style={{ marginBottom: 48, padding: "32px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <h2 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 22,
              fontWeight: 700,
              color: "#fff",
              marginBottom: 20,
            }}>
              Top Stories — March 2026
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {TOP_STORIES.map((story) => (
                <div key={story.title} style={{
                  borderLeft: `3px solid ${story.color}`,
                  padding: "12px 20px",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: "0 6px 6px 0",
                }}>
                  <div style={{ color: "#fff", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                    {story.title}
                  </div>
                  <div style={{ color: "#888", fontSize: 12, lineHeight: 1.7 }}>
                    {story.body}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ═══ Corridor Intelligence ═══ */}
          <section style={{ marginBottom: 48, padding: "32px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <h2 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 22,
              fontWeight: 700,
              color: "#fff",
              marginBottom: 20,
            }}>
              Corridor Intelligence
            </h2>
            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 8,
              overflow: "hidden",
            }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 70px",
                padding: "10px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                fontSize: 9,
                fontFamily: "'Space Mono', monospace",
                letterSpacing: 2,
                color: "#666",
              }}>
                <span>CORRIDOR</span>
                <span>OPERATOR</span>
                <span>MARKET</span>
                <span style={{ textAlign: "right" }}>DIST</span>
              </div>
              {CORRIDORS_DATA.map((c) => (
                <div key={c.name} style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 70px",
                  padding: "10px 16px",
                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                  fontSize: 12,
                }}>
                  <span style={{ color: "#fff", fontWeight: 500 }}>{c.name}</span>
                  <span style={{ color: "#888" }}>{c.operator}</span>
                  <span style={{ color: "#888" }}>{c.city}</span>
                  <span style={{ color: "#666", textAlign: "right", fontFamily: "'Space Mono', monospace" }}>{c.distance}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ═══ Operator Tracker ═══ */}
          <section style={{ marginBottom: 48, padding: "32px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <h2 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 22,
              fontWeight: 700,
              color: "#fff",
              marginBottom: 20,
            }}>
              Operator Tracker
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
              {OPERATORS.filter((o) => o.id !== "op_blade").map((op) => (
                <div key={op.id} style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8,
                  padding: "16px 20px",
                  borderTop: `2px solid ${op.color}`,
                }}>
                  <div style={{ color: "#fff", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                    {op.name}
                  </div>
                  <div style={{ color: "#666", fontSize: 10, letterSpacing: 1, marginBottom: 10 }}>
                    {op.hq}
                  </div>
                  <div style={{ fontSize: 11, color: "#888", lineHeight: 1.6 }}>
                    <div><span style={{ color: "#555" }}>Aircraft:</span> {op.aircraft.join(", ")}</div>
                    <div><span style={{ color: "#555" }}>Funding:</span> {op.funding}</div>
                    <div><span style={{ color: "#555" }}>FAA Status:</span> {op.faaCertStatus.replace("_", " ")}</div>
                    <div><span style={{ color: "#555" }}>Markets:</span> {op.activeMarkets.length || "—"}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ═══ Heliport Infrastructure ═══ */}
          <section style={{ marginBottom: 48, padding: "32px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <h2 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 22,
              fontWeight: 700,
              color: "#fff",
              marginBottom: 16,
            }}>
              Heliport Infrastructure — Top 10
            </h2>
            <p style={{ color: "#999", fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
              FAA NASR 5010 registered heliports by metro area. Markets with dense heliport networks
              have a potential 12-18 month infrastructure advantage through conversion of existing facilities.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {HELIPORT_TOP10.map((h, i) => (
                <div key={h.city} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "8px 16px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 6,
                }}>
                  <span style={{ color: "#555", fontSize: 11, minWidth: 20 }}>{i + 1}</span>
                  <span style={{ color: "#fff", fontSize: 13, fontWeight: 500, minWidth: 140 }}>
                    {h.city}, {h.state}
                  </span>
                  <span style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#f59e0b",
                    minWidth: 36,
                  }}>
                    {h.count}
                  </span>
                  <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${(h.count / 146) * 100}%`,
                      background: "rgba(245,158,11,0.5)",
                      borderRadius: 2,
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ═══ Markets to Watch ═══ */}
          <section style={{ marginBottom: 48, padding: "32px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <h2 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 22,
              fontWeight: 700,
              color: "#fff",
              marginBottom: 16,
            }}>
              Markets to Watch
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { city: "Phoenix, AZ", outlook: "IMPROVING", reason: "eIPP participation + active Joby presence. Legislative gap is the remaining barrier — if Arizona passes UAM enabling legislation, Phoenix could move +15-20 points." },
                { city: "Charlotte, NC", outlook: "DEVELOPING", reason: "FAA eIPP program participant with active pilot program. No vertiport zoning or state legislation yet, but regulatory posture is friendly." },
                { city: "Chicago, IL", outlook: "STABLE", reason: "Archer is present but Illinois has no enacted UAM legislation. Zoning and infrastructure investment needed to move score." },
                { city: "Las Vegas, NV", outlook: "IMPROVING", reason: "Enacted state legislation (highest-weighted factor) + FAA eIPP activity. Strong tourism use case — if vertiport or operator presence materializes, Las Vegas is positioned for rapid score increase." },
              ].map((m) => (
                <div key={m.city} style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8,
                  padding: "16px 20px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{m.city}</span>
                    <span style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: 1,
                      padding: "2px 8px",
                      borderRadius: 3,
                      background: m.outlook === "IMPROVING" ? "rgba(0,255,136,0.1)" : "rgba(0,212,255,0.1)",
                      color: m.outlook === "IMPROVING" ? "#00ff88" : "#00d4ff",
                      border: `1px solid ${m.outlook === "IMPROVING" ? "rgba(0,255,136,0.2)" : "rgba(0,212,255,0.2)"}`,
                    }}>
                      {m.outlook}
                    </span>
                  </div>
                  <div style={{ color: "#888", fontSize: 12, lineHeight: 1.7 }}>{m.reason}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ═══ April Outlook ═══ */}
          <section style={{ marginBottom: 48, padding: "32px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <h2 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 22,
              fontWeight: 700,
              color: "#fff",
              marginBottom: 16,
            }}>
              April Outlook
            </h2>
            <div style={{ color: "#999", fontSize: 13, lineHeight: 1.8 }}>
              <p style={{ marginBottom: 12 }}>
                <strong style={{ color: "#ccc" }}>State legislative sessions</strong> — Multiple states have UAM-related
                bills in committee. Arizona, Illinois, and Georgia are the ones to watch. Any enacted legislation triggers
                an automatic 20-point factor change for affected markets.
              </p>
              <p style={{ marginBottom: 12 }}>
                <strong style={{ color: "#ccc" }}>FAA powered lift rulemaking</strong> — The FAA&apos;s powered lift SFAR
                process continues to advance. Any final rule or significant milestone will be reflected in regulatory posture
                scores across all markets.
              </p>
              <p>
                <strong style={{ color: "#ccc" }}>Gap analysis engine</strong> — AirIndex will launch sub-indicator
                analysis showing exactly what each market needs to improve its score. This is the tool that turns a
                readiness score into an actionable roadmap.
              </p>
            </div>
          </section>

          {/* ═══ PDF Download ═══ */}
          <section style={{ marginBottom: 48, padding: "32px 0", textAlign: "center" }}>
            <a
              href="/reports/AirIndex_Report_March2026.pdf"
              download
              style={{
                display: "inline-block",
                padding: "14px 32px",
                background: "#00d4ff",
                color: "#050508",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textDecoration: "none",
                borderRadius: 6,
              }}
            >
              Download Full Report (PDF)
            </a>
            <p style={{ color: "#666", fontSize: 11, marginTop: 12 }}>
              AirIndex March 2026 Market Intelligence Report — PDF format
            </p>
          </section>

        </ReportGate>

        {/* ═══ CTA (always visible) ═══ */}
        <section style={{
          textAlign: "center",
          padding: "48px 24px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12,
          marginTop: 32,
        }}>
          <h3 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 18,
            fontWeight: 700,
            color: "#fff",
            marginBottom: 8,
          }}>
            Want ongoing market intelligence?
          </h3>
          <p style={{ color: "#888", fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
            Monthly reports, factor breakdowns, corridor tracking, and API access for your team.
          </p>
          <Link
            href="/contact?tier=pro&ref=report"
            style={{
              display: "inline-block",
              padding: "12px 28px",
              background: "#00d4ff",
              color: "#050508",
              fontSize: 12,
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

      <SiteFooter />
    </div>
  );
}
