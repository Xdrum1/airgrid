import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "What's New — AirIndex",
  description:
    "Platform updates, new features, and data improvements to the AirIndex UAM Readiness Intelligence platform.",
};

// -------------------------------------------------------
// Changelog entries — newest first
// -------------------------------------------------------

interface Update {
  date: string; // YYYY-MM-DD
  tag: "feature" | "data" | "improvement" | "launch";
  title: string;
  body: string;
  link?: { label: string; href: string };
  image?: { src: string; alt: string; width: number; height: number };
}

const TAG_COLORS: Record<Update["tag"], string> = {
  feature: "#5B8DB8",
  data: "#00ff88",
  improvement: "#f59e0b",
  launch: "#7c3aed",
};

const TAG_LABELS: Record<Update["tag"], string> = {
  feature: "NEW FEATURE",
  data: "DATA UPDATE",
  improvement: "IMPROVEMENT",
  launch: "LAUNCH",
};

const UPDATES: Update[] = [
  {
    date: "2026-03-29",
    tag: "feature",
    title: "\"What If\" Scenario Modeling",
    body: "Interactive scenario modeling on every city page. Toggle gap factors on and off to see projected score changes and tier transitions in real time. See exactly what happens if legislation passes, a pilot program launches, or weather infrastructure is deployed — individually or in combination.",
    link: { label: "Request access", href: "/request-access" },
    image: { src: "/images/scenario-phoenix.png", alt: "What If scenario modeling — Phoenix with legislation toggled showing 50 → 60 projection", width: 800, height: 200 },
  },
  {
    date: "2026-03-29",
    tag: "feature",
    title: "Score Timeline with Causal Events",
    body: "Every score change is now annotated with the event that caused it. The new Score Timeline shows date, delta, which factors moved, and a linked source citation for each change. See exactly why Miami went from 80 to 100, or why New York dropped from 70 to 55.",
    link: { label: "Request access", href: "/request-access" },
    image: { src: "/images/timeline-events.png", alt: "Score Timeline — San Francisco score changes with factor-level tags", width: 600, height: 480 },
  },
  {
    date: "2026-03-29",
    tag: "feature",
    title: "Factor-Level Source Citations",
    body: "Score breakdown now shows the specific evidence behind each factor — what earned the points, when it was verified, and a link to the source. Every score is now traceable to a documented event or filing.",
    image: { src: "/images/breakdown-la.png", alt: "Factor breakdown with citations — Los Angeles at 95", width: 400, height: 900 },
  },
  {
    date: "2026-03-29",
    tag: "launch",
    title: "Market Intelligence Briefings",
    body: "Custom market analysis is now available in three tiers: Market Snapshots (single city), Market Briefings (2-3 cities with discovery call), and Strategic Assessments (4-21 cities with quarterly reviews). Each briefing includes factor breakdown, gap analysis, score trajectory, and tailored recommendations.",
    link: { label: "Learn more", href: "/briefings" },
  },
  {
    date: "2026-03-29",
    tag: "data",
    title: "Weather Infrastructure Methodology Update",
    body: "Added USDOT AAM National Strategy rationale to the Weather Infrastructure factor. Weather is one of four federally recognized infrastructure pillars (physical, energy, spectrum, weather) — this is now cited in the methodology and March report.",
    link: { label: "Read the methodology", href: "/methodology" },
  },
  {
    date: "2026-03-28",
    tag: "feature",
    title: "Heliport Infrastructure Map Layer",
    body: "5,647 FAA-registered heliports now visible on the map. Toggle between MARKETS and HELIPORTS views — density heatmap at overview zoom, individual facility markers when zoomed in. Click any heliport for FAA ID, ownership type, elevation, and use classification.",
    link: { label: "Request access", href: "/request-access" },
    image: { src: "/images/heliport-detail.png", alt: "Heliport map layer — San Francisco Bay Area with facility popup", width: 800, height: 500 },
  },
  {
    date: "2026-03-28",
    tag: "launch",
    title: "Institutional Platform Positioning",
    body: "Redesigned the public site around our institutional intelligence positioning. AirIndex is the intelligence infrastructure for urban air mobility — market readiness data for the institutions shaping where eVTOL operates. New request access flow with organization, role, and use case fields.",
  },
  {
    date: "2026-03-27",
    tag: "feature",
    title: "Federal Activity Tab",
    body: "New Pro-gated dashboard tab tracking federal AAM legislation and regulatory activity. Two sections: Legislation (8 tracked Congress bills with live status via Congress.gov API) and FAA Dockets (regulations.gov documents with comment period tracking).",
    link: { label: "Request access", href: "/request-access" },
    image: { src: "/images/federal-activity.png", alt: "Federal Activity tab — AAM legislation tracking with live Congress bill status", width: 800, height: 400 },
  },
  {
    date: "2026-03-27",
    tag: "feature",
    title: "Market Snapshot PDF & Score Trajectories",
    body: "Downloadable market snapshot reports at /reports/snapshot/{cityId} with print-optimized layout. Score trajectory sparklines now visible in the city detail panel and snapshot pages, showing factor-level trends over time.",
  },
  {
    date: "2026-03-25",
    tag: "feature",
    title: "Gap Analysis Engine",
    body: "Every city detail panel now shows a Gap Analysis section identifying which readiness factors are missing, how many points are available, and specific recommendations to close each gap. Powered by the same engine behind our institutional gap reports.",
    link: { label: "Request access", href: "/request-access" },
  },
  {
    date: "2026-03-25",
    tag: "feature",
    title: "What's New Page",
    body: "You're looking at it. We'll post platform updates, new data sources, methodology changes, and feature launches here. Subscribe to stay informed as we build the definitive UAM market intelligence platform.",
  },
  {
    date: "2026-03-24",
    tag: "data",
    title: "Scoring Methodology v1.3",
    body: "Introduced three graduated scoring factors: State Legislation (enacted/actively moving/none), Regulatory Posture (friendly/neutral/restrictive), and Weather Infrastructure (full/partial/none). No market scores 100 anymore — the weather gap is universal. LA and Dallas lead at 95.",
    link: { label: "Read the methodology", href: "/methodology" },
  },
  {
    date: "2026-03-17",
    tag: "data",
    title: "Blade Air Mobility Consolidated into Joby Aviation",
    body: "Following Joby's acquisition of Blade Air Mobility, we've consolidated all Blade market presence, corridors, and vertiport data under Joby Aviation across all 21 tracked markets. Operator count reduced from 6 to 5.",
  },
  {
    date: "2026-03-13",
    tag: "data",
    title: "Federal Register Backfill — 730 Days",
    body: "Expanded Federal Register ingestion from 90 to 730 days with improved search terms ('powered lift', SFAR). Captured 84 records (up from 5). Miami score updated 80→100 after Archer's White House Pilot Program surfaced. 25 relevant regulatory signals now tracked.",
  },
  {
    date: "2026-03-12",
    tag: "improvement",
    title: "AI Classification Prompt v4",
    body: "Upgraded our Haiku-powered filing classification to reduce false negatives on stock-framed headlines and improve metro area geographic matching across 17 metro areas. Overall accuracy baseline: ~80% across HIGH/MEDIUM/NEEDS_REVIEW confidence tiers.",
  },
  {
    date: "2026-03-10",
    tag: "feature",
    title: "Trajectory API Endpoint",
    body: "New API endpoint: GET /api/v1/markets/{cityId}/trajectory. Returns factor-level score deltas over time. Pro tier gets 90-day history, Institutional+ gets full history.",
    link: { label: "API documentation", href: "/api/docs" },
  },
  {
    date: "2026-03-05",
    tag: "feature",
    title: "Market Watch Status & Analyst Notes",
    body: "Markets now carry watch status indicators (Stable, Positive Watch, Negative Watch, Under Review) with outlook signals and analyst notes for Pro subscribers. See which markets are moving before the score changes.",
  },
  {
    date: "2026-03-03",
    tag: "feature",
    title: "Heliport Infrastructure Data",
    body: "Every market now shows FAA-registered heliport counts from the NASR 5010 database. Los Angeles leads with 146 heliports — existing infrastructure that could accelerate vertiport conversion timelines.",
  },
  {
    date: "2026-03-01",
    tag: "launch",
    title: "Public API v1",
    body: "Launched the AirIndex API with Bearer token authentication, tier-based rate limiting, and four market endpoints: list, detail, history, and export. Snake_case JSON responses with X-RateLimit headers.",
    link: { label: "Explore the API", href: "/api" },
  },
  {
    date: "2026-02-25",
    tag: "feature",
    title: "Corridor Intelligence Layer",
    body: "Database-backed corridors with detail pages, subscription alerts, and full ingestion pipeline. 9 corridors tracked across major US markets with distance, flight time, altitude, and status data.",
  },
  {
    date: "2026-02-20",
    tag: "launch",
    title: "Invite-Only Access & Teaser Wall",
    body: "Launched the invite-only access system. Unauthenticated visitors see blurred operators, vertiports, corridors, and milestones in the detail panel. Request access, get approved by our team, and unlock the full dashboard.",
    link: { label: "Request access", href: "/request-access" },
  },
  {
    date: "2026-02-15",
    tag: "feature",
    title: "UAM Intel Feed",
    body: "Curated intelligence feed with regulatory, infrastructure, operator, and legislative categories. Auto-classified from our ingestion pipeline with editorial review. Published items include source attribution and market tagging.",
    link: { label: "Request access", href: "/request-access" },
  },
  {
    date: "2026-02-01",
    tag: "launch",
    title: "AirIndex Public Beta",
    body: "Launched the AirIndex UAM Readiness Intelligence platform tracking 21 US metropolitan areas across seven standardized readiness factors. Interactive map, city rankings, score breakdowns, and operator tracking.",
    link: { label: "Request access", href: "/request-access" },
  },
];

// -------------------------------------------------------
// Page
// -------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function UpdatesPage() {
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

      <main
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "120px 24px 80px",
        }}
      >
        {/* Page header */}
        <div style={{ marginBottom: 56 }}>
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 700,
              color: "#ffffff",
              margin: "0 0 12px",
              letterSpacing: "-0.02em",
            }}
          >
            What&apos;s New
          </h1>
          <p
            style={{
              color: "#888",
              fontSize: 15,
              lineHeight: 1.7,
              margin: 0,
              maxWidth: 520,
            }}
          >
            Platform updates, data improvements, and new features.
            Building the definitive UAM market intelligence layer.
          </p>
        </div>

        {/* Timeline */}
        <div style={{ position: "relative" }}>
          {/* Vertical line */}
          <div
            style={{
              position: "absolute",
              left: 5,
              top: 8,
              bottom: 0,
              width: 1,
              background:
                "linear-gradient(to bottom, rgba(91,141,184,0.3), rgba(91,141,184,0.05))",
            }}
          />

          {UPDATES.map((update, i) => (
            <div
              key={i}
              style={{
                position: "relative",
                paddingLeft: 32,
                paddingBottom: i === UPDATES.length - 1 ? 0 : 40,
              }}
            >
              {/* Dot */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 8,
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  background: TAG_COLORS[update.tag],
                  boxShadow: `0 0 8px ${TAG_COLORS[update.tag]}40`,
                }}
              />

              {/* Date + tag */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    color: "#666",
                    fontSize: 12,
                    fontFamily: "'Space Mono', monospace",
                  }}
                >
                  {formatDate(update.date)}
                </span>
                <span
                  style={{
                    color: TAG_COLORS[update.tag],
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    background: `${TAG_COLORS[update.tag]}12`,
                    border: `1px solid ${TAG_COLORS[update.tag]}30`,
                    borderRadius: 3,
                    padding: "2px 8px",
                  }}
                >
                  {TAG_LABELS[update.tag]}
                </span>
              </div>

              {/* Title */}
              <h2
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#ffffff",
                  margin: "0 0 8px",
                }}
              >
                {update.title}
              </h2>

              {/* Body */}
              <p
                style={{
                  color: "#aaa",
                  fontSize: 14,
                  lineHeight: 1.8,
                  margin: 0,
                }}
              >
                {update.body}
              </p>

              {/* Optional image */}
              {update.image && (
                <div style={{
                  marginTop: 14,
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.08)",
                  maxWidth: update.image.width > update.image.height * 2 ? 560 : 420,
                }}>
                  <Image
                    src={update.image.src}
                    alt={update.image.alt}
                    width={update.image.width}
                    height={update.image.height}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </div>
              )}

              {/* Optional link */}
              {update.link && (
                <Link
                  href={update.link.href}
                  style={{
                    display: "inline-block",
                    marginTop: 10,
                    color: "#5B8DB8",
                    fontSize: 12,
                    textDecoration: "none",
                    letterSpacing: "0.04em",
                    transition: "opacity 0.15s",
                  }}
                >
                  {update.link.label} →
                </Link>
              )}
            </div>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
