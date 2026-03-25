import type { Metadata } from "next";
import Link from "next/link";
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
}

const TAG_COLORS: Record<Update["tag"], string> = {
  feature: "#00d4ff",
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
    date: "2026-03-25",
    tag: "feature",
    title: "Gap Analysis Engine",
    body: "Every city detail panel now shows a Gap Analysis section for Pro subscribers. See exactly which readiness factors are missing, how many points are available, and specific recommendations to close each gap. Powered by the same engine behind our institutional gap reports.",
    link: { label: "View a market", href: "/dashboard" },
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
    link: { label: "Read the feed", href: "/feed" },
  },
  {
    date: "2026-02-01",
    tag: "launch",
    title: "AirIndex Public Beta",
    body: "Launched the AirIndex UAM Readiness Intelligence platform tracking 21 US metropolitan areas across seven standardized readiness factors. Interactive map, city rankings, score breakdowns, and operator tracking.",
    link: { label: "Explore the dashboard", href: "/dashboard" },
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
                "linear-gradient(to bottom, rgba(0,212,255,0.3), rgba(0,212,255,0.05))",
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

              {/* Optional link */}
              {update.link && (
                <Link
                  href={update.link.href}
                  style={{
                    display: "inline-block",
                    marginTop: 10,
                    color: "#00d4ff",
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
