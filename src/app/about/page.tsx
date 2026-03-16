import type { Metadata } from "next";
import Link from "next/link";
import TrackPageView from "@/components/TrackPageView";
import SiteNav from "@/components/SiteNav";
import { MARKET_COUNT } from "@/data/seed";

export const metadata: Metadata = {
  title: "About AirIndex — UAM Market Intelligence by Vertical Data Group",
  description:
    "AirIndex is the independent market readiness rating system for Urban Air Mobility — the only platform that scores U.S. cities on the ground conditions that determine where commercial eVTOL operations launch.",
};

const sectionHeading: React.CSSProperties = {
  fontFamily: "var(--font-syne), sans-serif",
  fontWeight: 700,
  fontSize: 20,
  letterSpacing: "0.02em",
  color: "#fff",
  marginBottom: 20,
  paddingBottom: 12,
  borderBottom: "1px solid rgba(255,255,255,0.08)",
};

export default function AboutPage() {
  return (
    <main
      className="min-h-screen bg-[#050508] text-white"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <TrackPageView page="about" />

      <SiteNav />

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

        {/* Body — existing copy */}
        <div className="space-y-6 text-white/80 leading-relaxed">
          <p>
            AirIndex is the independent market readiness rating system for Urban
            Air Mobility — the only platform that scores U.S. cities on the ground
            conditions that determine where commercial eVTOL operations actually
            launch, and when.
          </p>

          <p>
            We track seven weighted factors across {MARKET_COUNT} markets: regulatory posture,
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

        {/* ── The Company ── */}
        <div className="pt-8">
          <h2 style={sectionHeading}>The Company</h2>
          <div className="space-y-6 text-white/80 leading-relaxed">
            <p>
              <a href="https://verticaldatagroup.com" target="_blank" rel="noopener" className="text-[#00d4ff] hover:underline">Vertical Data Group, LLC</a> is a South Carolina-based data intelligence company
              founded in March 2026. AirIndex is our first product — the UAM market readiness
              index we built because it didn&apos;t exist and the industry needed it.
            </p>
            <p>
              We are not an aviation company. We are not a software company. We are a data
              intelligence company that builds systematic, auditable intelligence infrastructure
              for emerging markets. AirIndex is the first application of that methodology.
              The UAM industry is our starting point.
            </p>
            <p>
              Vertical Data Group is an active member of the South Carolina Research Authority.
              Our federal entity registration (UEI) is active in SAM.gov, enabling eligibility
              for federal research partnerships and data contracts.
            </p>
          </div>
        </div>

        {/* ── The Methodology ── */}
        <div className="pt-4">
          <h2 style={sectionHeading}>The Methodology</h2>
          <div className="space-y-6 text-white/80 leading-relaxed">
            <p>
              The AirIndex scoring methodology is fully published and version-controlled.
              Every score change is traceable to a specific source document, classification
              result, and override decision. Two retrospective accuracy audits have been
              conducted in March 2026, establishing ~89% classification accuracy. The
              methodology has been refined across five prompt versions since launch, with
              each change documented in the public version log.
            </p>
            <p>
              Version history, accuracy audit results, data source specifications, and
              classification logic are available in full at{" "}
              <Link href="/methodology" className="text-[#00d4ff] hover:underline">
                airindex.io/methodology
              </Link>.
            </p>
          </div>
        </div>

        {/* ── Who Uses AirIndex ── */}
        <div className="pt-4">
          <h2 style={sectionHeading}>Who Uses AirIndex</h2>
          <div className="space-y-6 text-white/80 leading-relaxed">
            <p>
              AirIndex serves professionals making decisions in the UAM ecosystem —
              infrastructure developers evaluating site selection, operators prioritizing
              market entry, investors tracking market readiness trajectories, city planners
              benchmarking against peer markets, and researchers studying UAM
              commercialization patterns.
            </p>
            <p>
              The index is designed to be the benchmark the industry cites — not a proprietary
              tool with a closed methodology, but an open, auditable standard that grows more
              useful as more people use it and challenge it.
            </p>
          </div>
        </div>

        {/* ── Contact and Access ── */}
        <div className="pt-4">
          <h2 style={sectionHeading}>Contact &amp; Access</h2>
          <div className="space-y-4 text-white/70 text-sm leading-relaxed">
            <p>
              For research access, data partnerships, API inquiries, or press requests:{" "}
              <a href="mailto:info@airindex.io" className="text-[#00d4ff] hover:underline">info@airindex.io</a>
            </p>
            <p>
              For subscription and platform questions:{" "}
              <a href="mailto:hello@airindex.io" className="text-[#00d4ff] hover:underline">hello@airindex.io</a>
            </p>
            <p>
              For legal and terms inquiries:{" "}
              <a href="mailto:legal@airindex.io" className="text-[#00d4ff] hover:underline">legal@airindex.io</a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 pt-8 text-xs text-white/40 space-y-2">
          <p><a href="https://verticaldatagroup.com" target="_blank" rel="noopener" className="text-white/40 hover:text-white/60 transition-colors">Vertical Data Group, LLC</a> &middot; PO Box 31172 &middot; Myrtle Beach, SC 29588</p>
          <p>
            <Link href="/" className="text-white/40 hover:text-white/60 transition-colors">airindex.io</Link>
            {" "}&middot;{" "}
            <Link href="/terms" className="text-white/40 hover:text-white/60 transition-colors">Terms</Link>
            {" "}&middot;{" "}
            <Link href="/privacy" className="text-white/40 hover:text-white/60 transition-colors">Privacy</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
