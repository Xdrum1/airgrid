import type { Metadata } from "next";
import Link from "next/link";
import TrackPageView from "@/components/TrackPageView";

export const metadata: Metadata = {
  title: "About — AirIndex",
  description:
    "AirIndex is the independent market readiness rating system for Urban Air Mobility — the only platform that scores U.S. cities on the ground conditions that determine where commercial eVTOL operations launch.",
};

export default function AboutPage() {
  return (
    <main
      className="min-h-screen bg-[#050508] text-white"
      style={{ fontFamily: "var(--font-space-mono), monospace" }}
    >
      <TrackPageView page="about" />

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <Link href="/" className="text-lg font-bold tracking-wide" style={{ fontFamily: "var(--font-syne), sans-serif" }}>
          AIRINDEX
        </Link>
        <div className="flex items-center gap-6 text-sm text-white/60">
          <Link href="/methodology" className="hover:text-white transition-colors">Methodology</Link>
          <Link href="/api" className="hover:text-white transition-colors">API</Link>
          <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          <Link href="/login" className="hover:text-white transition-colors">Sign in</Link>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-16 space-y-10">

        {/* Tagline */}
        <p className="text-sm uppercase tracking-[0.2em] text-[#00d4ff]">
          Rate the Sky.
        </p>

        {/* Headline */}
        <h1
          className="text-3xl md:text-4xl font-bold leading-tight"
          style={{ fontFamily: "var(--font-syne), sans-serif" }}
        >
          The eVTOL aircraft are ready. The question is where they&apos;ll fly first.
        </h1>

        {/* Body */}
        <div className="space-y-6 text-white/80 leading-relaxed">
          <p>
            AirIndex is the independent market readiness rating system for Urban
            Air Mobility — the only platform that scores U.S. cities on the ground
            conditions that determine where commercial eVTOL operations actually
            launch, and when.
          </p>

          <p>
            We track seven weighted factors across 21 markets: regulatory posture,
            LAANC corridor coverage, operator presence, active pilot programs,
            vertiport infrastructure, zoning policy, and state legislation. Every
            market receives a live 0–100 readiness score — updated continuously as
            conditions change. Not a forecast. Not a projection. A live index built
            on what is actually happening.
          </p>

          <p>
            Our data comes from primary sources: FAA filings, SEC EDGAR, the
            Federal Register, state legislative records, and operator activity.
            Every score change is sourced, timestamped, and traceable. We do not
            rate cities on press releases or announcements. We rate them on
            verifiable facts.
          </p>

          <p>
            Where others track the aircraft and the companies building them,
            AirIndex tracks the geography — the regulatory, infrastructure, and
            political conditions that determine which markets win the race to
            commercial operations.
          </p>

          <p>
            AirIndex does not represent operators, municipalities, or investors.
            Our ratings are independent. That independence is the foundation of
            their value.
          </p>

          <p>
            For operators deciding where to launch. For investors evaluating market
            timing. For city planners building toward readiness. AirIndex is the
            benchmark.
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-wrap gap-4 pt-4">
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded text-sm font-semibold bg-[#00d4ff] text-black hover:bg-[#00d4ff]/90 transition-colors"
          >
            View the ratings
          </Link>
          <Link
            href="/methodology"
            className="px-6 py-3 rounded text-sm font-semibold border border-white/20 text-white/80 hover:border-white/40 hover:text-white transition-colors"
          >
            Read the methodology
          </Link>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 pt-8 text-xs text-white/40">
          <p>AirIndex &middot; The Readiness Standard for UAM &middot; airindex.io &middot; <Link href="/terms" className="text-white/40 hover:text-white/60 transition-colors">Terms</Link> &middot; <Link href="/privacy" className="text-white/40 hover:text-white/60 transition-colors">Privacy</Link></p>
        </div>
      </div>
    </main>
  );
}
