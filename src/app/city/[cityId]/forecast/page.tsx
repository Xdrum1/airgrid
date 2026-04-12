/**
 * Public-facing forecast page for a city.
 *
 * URL: /city/[cityId]/forecast
 *
 * Surfaces the platform's predictive layer for any tracked market.
 * Designed for: advisors, prospects, subscribers, BD conversations.
 * Auth-gated (Pro+) to position predictive content as a tier-differentiating product.
 */

import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { getUserTier } from "@/lib/billing";
import { hasProAccess } from "@/lib/billing-shared";
import { getCitiesWithOverrides } from "@/data/seed";
import { calculateReadinessScore, getScoreTier } from "@/lib/scoring";
import { getForwardSignals, logPredictions, getForecastSummary } from "@/lib/forward-signals";
import ForwardSignalsPanel from "@/components/ForwardSignalsPanel";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

interface Props {
  params: Promise<{ cityId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cityId } = await params;
  const cities = await getCitiesWithOverrides();
  const city = cities.find((c) => c.id === cityId);
  if (!city) return { title: "Forecast Not Found — AirIndex" };
  return {
    title: `${city.city}, ${city.state} — Platform Forecast — AirIndex`,
    description: `AirIndex predictive intelligence for ${city.city}: forward signals, decision windows, and 30-day score forecast.`,
    robots: "noindex, nofollow",
  };
}

export default async function ForecastPage({ params }: Props) {
  const { cityId } = await params;

  // Auth gate
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?next=/city/${cityId}/forecast`);
  }
  const tier = await getUserTier(session.user.id);
  if (!hasProAccess(tier)) {
    redirect("/pricing");
  }

  // Data
  const cities = await getCitiesWithOverrides();
  const city = cities.find((c) => c.id === cityId);
  if (!city) notFound();

  const { score } = calculateReadinessScore(city);
  const scoreTier = getScoreTier(score);

  const report = await getForwardSignals(cityId);

  // Log predictions for scorecard tracking
  if (report.signals.length > 0) {
    logPredictions(cityId, report, "forecast_page").catch(() => {});
  }

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div style={{
      background: "#050508",
      color: "#e0e0e0",
      minHeight: "100vh",
      fontFamily: "'Inter', sans-serif",
    }}>
      <SiteNav />

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "80px 24px 60px" }}>

        {/* Breadcrumb */}
        <div style={{ marginBottom: 16 }}>
          <Link
            href={`/city/${cityId}`}
            style={{ color: "#666", fontSize: 12, textDecoration: "none" }}
          >
            ← {city.city} market profile
          </Link>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            fontSize: 9,
            letterSpacing: 3,
            color: "#5B8DB8",
            fontFamily: "'Space Mono', monospace",
            marginBottom: 12,
            fontWeight: 700,
          }}>
            PLATFORM FORECAST · PREDICTIVE INTELLIGENCE
          </div>
          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 32,
            fontWeight: 700,
            color: "#fff",
            margin: "0 0 8px",
            letterSpacing: "-0.02em",
          }}>
            {city.city}, {city.state}
          </h1>
          <div style={{
            color: "#888",
            fontSize: 13,
            marginBottom: 4,
            fontFamily: "'Space Mono', monospace",
          }}>
            Current readiness: <strong style={{ color: "#fff" }}>{score}/100</strong> · {scoreTier} tier
          </div>
          <div style={{ color: "#666", fontSize: 11, fontFamily: "'Space Mono', monospace" }}>
            Generated {today} · AirIndex Forward Signals v1.0
          </div>
        </div>

        {/* Lede */}
        <div style={{
          background: "rgba(91,141,184,0.04)",
          border: "1px solid rgba(91,141,184,0.12)",
          borderLeft: "3px solid #5B8DB8",
          borderRadius: "0 8px 8px 0",
          padding: "20px 24px",
          marginBottom: 32,
        }}>
          <p style={{ color: "#ccc", fontSize: 14, lineHeight: 1.7, margin: 0 }}>
            {getForecastSummary(report)}
          </p>
        </div>

        {/* Panel */}
        <ForwardSignalsPanel report={report} dark={true} />

        {/* Methodology Note */}
        <div style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 8,
          padding: "20px 24px",
          marginTop: 24,
          fontSize: 12,
          color: "#888",
          lineHeight: 1.7,
        }}>
          <div style={{
            fontSize: 9,
            letterSpacing: 2,
            color: "#5B8DB8",
            fontFamily: "'Space Mono', monospace",
            marginBottom: 8,
            fontWeight: 700,
          }}>
            HOW THIS FORECAST IS GENERATED
          </div>
          <p style={{ margin: "0 0 10px" }}>
            AirIndex aggregates forward signals from five sources:
          </p>
          <ul style={{ margin: "0 0 10px 18px", paddingLeft: 0 }}>
            <li><strong style={{ color: "#aaa" }}>Classifier outputs</strong> — high and medium confidence pipeline events with mapped decision windows (FAA corridor filings: 60–90 days, etc.)</li>
            <li><strong style={{ color: "#aaa" }}>Pending overrides</strong> — classifier outputs awaiting analyst promotion</li>
            <li><strong style={{ color: "#aaa" }}>MarketWatch trajectory</strong> — POSITIVE/NEGATIVE/DEVELOPING with IMPROVING/STABLE/DETERIORATING outlook</li>
            <li><strong style={{ color: "#aaa" }}>Pre-development facility milestones</strong> — facilities not yet in FAA NASR with known permit timelines</li>
            <li><strong style={{ color: "#aaa" }}>Score velocity</strong> — signal density vs other markets, acceleration detection</li>
          </ul>
          <p style={{ margin: "0 0 10px" }}>
            Score impact estimates account for the city&apos;s current factor credit. If a market already has full credit on a factor, predicted events on that factor are flagged as validation-only (no score change).
          </p>
          <p style={{ margin: 0 }}>
            Every prediction is logged to the platform&apos;s scorecard. Track record metrics will be published once verification windows close (60–90 days from initial deployment, April 2026).
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
