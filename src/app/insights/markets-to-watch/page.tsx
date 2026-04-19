/**
 * Markets to Watch — public-facing platform forecast digest.
 *
 * Surfaces the top markets ranked by predictive significance.
 * Free preview: top 3 markets visible to anyone.
 * Pro+ subscribers: full ranked list of all 25 markets.
 *
 * URL: /insights/markets-to-watch
 */

import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { getUserTier } from "@/lib/billing";
import { hasProAccess } from "@/lib/billing-shared";
import { getPlatformForecastDigest, renderSignalNarrative } from "@/lib/forward-signals";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import PulseSubscribe from "@/components/PulseSubscribe";

export const metadata: Metadata = {
  title: "Markets to Watch — Platform Forecast — AirIndex",
  description:
    "AirIndex Forward Signals digest. 25 US UAM markets ranked by predictive significance — forward signals, MarketWatch trajectory, signal velocity, and 30-day forecasts.",
};

export const dynamic = "force-dynamic";

export default async function MarketsToWatchPage() {
  const session = await auth();
  const tier = session?.user?.id ? await getUserTier(session.user.id) : null;
  const isPro = tier ? hasProAccess(tier) : false;

  const digest = await getPlatformForecastDigest();
  // Free preview: top 3. Pro+: all.
  const visible = isPro ? digest : digest.slice(0, 3);
  const hidden = isPro ? [] : digest.slice(3);

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

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "80px 24px 60px" }}>

        {/* Breadcrumb */}
        <div style={{ marginBottom: 16 }}>
          <Link href="/insights" style={{ color: "#666", fontSize: 12, textDecoration: "none" }}>
            ← Insights
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
            PLATFORM FORECAST · UPDATED CONTINUOUSLY
          </div>
          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "clamp(28px, 4vw, 38px)",
            fontWeight: 700,
            color: "#fff",
            margin: "0 0 16px",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}>
            Markets to Watch
          </h1>
          <p style={{ color: "#888", fontSize: 14, lineHeight: 1.7, maxWidth: 680 }}>
            All 25 US UAM markets ranked by predictive significance &mdash; combining
            forward signals, MarketWatch trajectory, signal velocity, and 30-day score
            forecasts. Generated from the AirIndex pipeline as of {today}.
          </p>
        </div>

        {/* Methodology callout */}
        <div style={{
          background: "rgba(91,141,184,0.04)",
          border: "1px solid rgba(91,141,184,0.12)",
          borderRadius: 8,
          padding: "16px 20px",
          marginBottom: 32,
          fontSize: 12,
          color: "#aaa",
          lineHeight: 1.7,
        }}>
          <strong style={{ color: "#5B8DB8", letterSpacing: 1 }}>HOW WE RANK</strong> &middot;
          Significance is computed from signal confidence, resolution timeframe, expected score
          impact, market momentum, and signal acceleration. Higher significance = more
          notable forward activity.
        </div>

        {/* Market list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {visible.map((m, idx) => (
            <MarketCard key={m.cityId} market={m} rank={idx + 1} />
          ))}
        </div>

        {/* Pro paywall */}
        {!isPro && hidden.length > 0 && (
          <div style={{
            marginTop: 32,
            padding: "32px 28px",
            background: "linear-gradient(180deg, rgba(91,141,184,0.05), rgba(91,141,184,0.02))",
            border: "1px solid rgba(91,141,184,0.2)",
            borderRadius: 12,
            textAlign: "center",
          }}>
            <div style={{
              fontSize: 9,
              letterSpacing: 3,
              color: "#5B8DB8",
              fontFamily: "'Space Mono', monospace",
              marginBottom: 12,
              fontWeight: 700,
            }}>
              {hidden.length} ADDITIONAL MARKETS &middot; PRO+ ACCESS
            </div>
            <h2 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 22,
              fontWeight: 700,
              color: "#fff",
              margin: "0 0 12px",
            }}>
              See the full forecast
            </h2>
            <p style={{ color: "#888", fontSize: 14, lineHeight: 1.7, maxWidth: 460, margin: "0 auto 20px" }}>
              The full forecast covers all 25 markets ranked by predictive significance,
              with detailed forward signals, decision windows, and 30-day score projections.
            </p>
            <Link
              href="/contact?inquiry=markets-forecast"
              style={{
                display: "inline-block",
                padding: "12px 28px",
                background: "#5B8DB8",
                color: "#050508",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textDecoration: "none",
                borderRadius: 6,
              }}
            >
              TALK TO US
            </Link>
          </div>
        )}

        {/* Subscribe CTA */}
        {!isPro && (
          <div style={{ marginTop: 48, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
            <PulseSubscribe source="markets-to-watch" compact />
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function MarketCard({
  market: m,
  rank,
}: {
  market: Awaited<ReturnType<typeof getPlatformForecastDigest>>[number];
  rank: number;
}) {
  const watchColor = m.marketWatch?.status === "POSITIVE_WATCH"
    ? "#16a34a"
    : m.marketWatch?.status === "NEGATIVE_WATCH"
    ? "#dc2626"
    : "#888";

  const forecastColor = m.expectedScoreChange30d
    ? m.expectedScoreChange30d > 0 ? "#16a34a" : "#dc2626"
    : "#888";

  return (
    <div style={{
      background: "#0a0a12",
      border: "1px solid #1a1a2e",
      borderRadius: 12,
      padding: "20px 24px",
      display: "grid",
      gridTemplateColumns: "auto 1fr auto",
      gap: 20,
      alignItems: "start",
    }}>
      {/* Rank */}
      <div style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: 28,
        fontWeight: 700,
        color: "#5B8DB8",
        minWidth: 42,
      }}>
        #{rank}
      </div>

      {/* Main column */}
      <div>
        <div style={{ display: "flex", gap: 10, alignItems: "baseline", marginBottom: 6, flexWrap: "wrap" }}>
          <Link
            href={`/city/${m.cityId}`}
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 18,
              fontWeight: 700,
              color: "#fff",
              textDecoration: "none",
            }}
          >
            {m.cityName}, {m.state}
          </Link>
          <span style={{ fontSize: 12, color: "#888" }}>
            Score {m.currentScore}/100
          </span>
          {m.accelerating && (
            <span style={{
              fontSize: 9,
              fontFamily: "'Space Mono', monospace",
              color: "#16a34a",
              letterSpacing: 1,
              fontWeight: 700,
              background: "rgba(22,163,74,0.1)",
              padding: "2px 6px",
              borderRadius: 3,
            }}>
              ACCELERATING
            </span>
          )}
        </div>

        {/* Top signals */}
        {m.topSignals.length > 0 ? (
          <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none" }}>
            {m.topSignals.map((s) => (
              <li key={s.id} style={{
                color: "#aaa",
                fontSize: 12,
                lineHeight: 1.6,
                marginBottom: 4,
                paddingLeft: 14,
                position: "relative",
              }}>
                <span style={{ position: "absolute", left: 0, color: "#5B8DB8" }}>•</span>
                {renderSignalNarrative(s)}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: "#666", fontSize: 12, fontStyle: "italic", margin: "8px 0 0" }}>
            No active forward signals tracked.
          </p>
        )}
      </div>

      {/* Right column — metrics */}
      <div style={{ minWidth: 140, display: "flex", flexDirection: "column", gap: 6, fontSize: 11 }}>
        {m.marketWatch && (
          <div style={{ textAlign: "right" }}>
            <span style={{ color: "#666" }}>Watch: </span>
            <span style={{ color: watchColor, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>
              {m.marketWatch.outlook}
            </span>
          </div>
        )}
        <div style={{ textAlign: "right" }}>
          <span style={{ color: "#666" }}>Signals 30d: </span>
          <span style={{ color: "#fff", fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>
            {m.signalsLast30d} (#{m.rankNational ?? "—"})
          </span>
        </div>
        {m.expectedScoreChange30d !== null && m.expectedScoreChange30d !== 0 && (
          <div style={{ textAlign: "right" }}>
            <span style={{ color: "#666" }}>30d forecast: </span>
            <span style={{ color: forecastColor, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>
              {m.expectedScoreChange30d > 0 ? "+" : ""}{m.expectedScoreChange30d}
            </span>
          </div>
        )}
        <div style={{ textAlign: "right", marginTop: 4 }}>
          <Link
            href={`/city/${m.cityId}/forecast`}
            style={{ color: "#5B8DB8", fontSize: 11, textDecoration: "none", letterSpacing: 0.5 }}
          >
            full forecast →
          </Link>
        </div>
      </div>
    </div>
  );
}
