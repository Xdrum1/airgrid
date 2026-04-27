/**
 * /forecasts — public page listing all active AirIndex score-movement
 * forecasts. Reads PredictionRecord rows where predictedDelta != 0.
 *
 * Surfaces the directional call (up/down + delta), confidence, resolution
 * window, and source signals. After June 16 2026 (first resolution), this
 * page also shows resolved forecasts with hit/miss outcome — the track
 * record that compounds into the AirIndex moat.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CITIES_MAP } from "@/data/seed";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Forecasts — AirIndex",
  description:
    "Active AirIndex forecasts — directional score-movement calls with named source signals, confidence levels, and dated resolution windows.",
};

export const revalidate = 600; // 10 minutes — predictions don't move that fast

const DIRECTION_STYLE: Record<string, { color: string; sign: string; label: string }> = {
  positive: { color: "#16a34a", sign: "+", label: "Positive" },
  negative: { color: "#dc2626", sign: "-", label: "Negative" },
  neutral: { color: "#697386", sign: "", label: "Neutral" },
};

const CONFIDENCE_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  high: { color: "#0a2540", bg: "#dbeafe", label: "High" },
  medium: { color: "#92400e", bg: "#fef3c7", label: "Medium" },
  low: { color: "#525252", bg: "#f3f4f6", label: "Low" },
};

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  pending: { color: "#0a2540", bg: "#e0e7ff", label: "Active" },
  validated: { color: "#16a34a", bg: "#dcfce7", label: "Hit" },
  invalidated: { color: "#dc2626", bg: "#fee2e2", label: "Miss" },
  inconclusive: { color: "#525252", bg: "#f3f4f6", label: "Inconclusive" },
  overdue: { color: "#92400e", bg: "#fef3c7", label: "Overdue" },
};

const CATEGORY_LABEL: Record<string, string> = {
  regulatory: "Regulatory",
  infrastructure: "Infrastructure",
  operator: "Operator",
  weather: "Weather",
};

function formatDate(d: Date | null): string {
  if (!d) return "TBD";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function cityLabel(cityId: string): { name: string; state: string } {
  const c = CITIES_MAP[cityId];
  if (c) return { name: c.city, state: c.state };
  // Fallback: humanize the id
  return {
    name: cityId
      .split("_")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" "),
    state: "",
  };
}

export default async function ForecastsPage() {
  // Pull all score-impacting predictions (delta != 0)
  const [pending, resolved] = await Promise.all([
    prisma.predictionRecord.findMany({
      where: { status: "pending", predictedDelta: { not: 0 } },
      orderBy: { latestExpected: "asc" },
    }),
    prisma.predictionRecord.findMany({
      where: { status: { in: ["validated", "invalidated", "inconclusive", "overdue"] } },
      orderBy: { verifiedAt: "desc" },
      take: 50,
    }),
  ]);

  // Stats for the headline
  const total = pending.length;
  const positive = pending.filter((p) => p.predictedDirection === "positive").length;
  const negative = pending.filter((p) => p.predictedDirection === "negative").length;
  const totalResolved = resolved.length;
  const hits = resolved.filter((r) => r.status === "validated").length;
  const accuracy = totalResolved > 0 ? Math.round((hits / totalResolved) * 100) : null;

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", color: "#0a2540", fontFamily: "Inter, sans-serif" }}>
      <SiteNav theme="light" />

      {/* Header */}
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "clamp(48px, 6vw, 72px) 24px 24px" }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 2, color: "#5B8DB8", textTransform: "uppercase", marginBottom: 14 }}>
          AirIndex Forecasts
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "clamp(28px, 4vw, 40px)", lineHeight: 1.15, margin: "0 0 16px" }}>
          Score-movement forecasts, with resolution dates
        </h1>
        <p style={{ color: "#425466", fontSize: 15, lineHeight: 1.7, maxWidth: 700, margin: "0 0 32px" }}>
          Every forecast names the source signals, the predicted score change, the confidence level,
          and the date the prediction resolves. We log forecasts when generated and verify them when
          their windows close — building a public, auditable track record of AirIndex&apos;s predictive accuracy.
        </p>

        {/* Headline stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 16 }}>
          <Stat label="Active forecasts" value={String(total)} accent="#0a2540" />
          <Stat label="Predicted up" value={String(positive)} accent="#16a34a" />
          <Stat label="Predicted down" value={String(negative)} accent="#dc2626" />
          <Stat
            label={accuracy !== null ? "Accuracy to date" : "First resolution"}
            value={accuracy !== null ? `${accuracy}%` : "Jun 16, 2026"}
            accent="#5B8DB8"
          />
        </div>
        {accuracy === null && (
          <div
            style={{
              padding: "12px 16px",
              background: "#f0f9ff",
              border: "1px solid #bae6fd",
              borderRadius: 6,
              fontSize: 12,
              color: "#0c4a6e",
              lineHeight: 1.6,
            }}
          >
            <strong>Track record opens June 16, 2026.</strong> Until then, forecasts are logged but unverified.
            We publish accuracy as soon as the first resolution windows close — wins and misses both.
          </div>
        )}
      </section>

      {/* Active forecasts */}
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 64px" }}>
        <h2
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 22,
            margin: "0 0 8px",
            paddingBottom: 12,
            borderBottom: "1px solid #e3e8ee",
          }}
        >
          Active forecasts
        </h2>
        <p style={{ color: "#697386", fontSize: 13, margin: "12px 0 24px", lineHeight: 1.6 }}>
          {total} {total === 1 ? "forecast" : "forecasts"} pending resolution. Sorted by earliest expected resolution date.
        </p>

        {pending.length === 0 ? (
          <div style={{ padding: 24, background: "#f9fbfd", borderRadius: 8, color: "#697386", fontSize: 13 }}>
            No active forecasts. Check back after the next pipeline run.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pending.map((p) => {
              const dir = DIRECTION_STYLE[p.predictedDirection] ?? DIRECTION_STYLE.neutral;
              const conf = CONFIDENCE_STYLE[p.confidence] ?? CONFIDENCE_STYLE.medium;
              const status = STATUS_STYLE[p.status] ?? STATUS_STYLE.pending;
              const city = cityLabel(p.cityId);
              return (
                <article
                  key={p.id}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e3e8ee",
                    borderLeft: `4px solid ${dir.color}`,
                    borderRadius: 8,
                    padding: "18px 20px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, marginBottom: 8, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: "#697386", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                        {CATEGORY_LABEL[p.category] ?? p.category}
                      </div>
                      <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, fontWeight: 700, margin: 0, color: "#0a2540" }}>
                        {city.name}{city.state && `, ${city.state}`}
                      </h3>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Pill bg={status.bg} color={status.color}>{status.label}</Pill>
                      <Pill bg={conf.bg} color={conf.color}>{conf.label} confidence</Pill>
                      <Pill bg="#f1f5f9" color={dir.color}>
                        {dir.sign}{Math.abs(p.predictedDelta)} pts
                      </Pill>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: "#425466", lineHeight: 1.6, margin: "8px 0 12px" }}>
                    {p.description}
                  </p>
                  <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#697386", flexWrap: "wrap", paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
                    <span>
                      <strong style={{ color: "#0a2540" }}>Window:</strong> {p.windowLabel}
                    </span>
                    <span>
                      <strong style={{ color: "#0a2540" }}>Resolves by:</strong> {formatDate(p.latestExpected)}
                    </span>
                    {p.sourceUrl && (
                      <a href={p.sourceUrl} target="_blank" rel="noreferrer" style={{ color: "#5B8DB8", textDecoration: "none" }}>
                        Source signal →
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Resolved forecasts (only renders post-Jun 16) */}
      {resolved.length > 0 && (
        <section style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px 64px" }}>
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 22,
              margin: "0 0 8px",
              paddingBottom: 12,
              borderBottom: "1px solid #e3e8ee",
            }}
          >
            Resolved forecasts
          </h2>
          <p style={{ color: "#697386", fontSize: 13, margin: "12px 0 24px", lineHeight: 1.6 }}>
            {totalResolved} resolved · {hits} hits · {accuracy}% accuracy
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {resolved.map((p) => {
              const status = STATUS_STYLE[p.status] ?? STATUS_STYLE.inconclusive;
              const city = cityLabel(p.cityId);
              return (
                <div key={p.id} style={{ background: "#f9fbfd", border: "1px solid #e3e8ee", borderRadius: 6, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 14, color: "#0a2540", fontWeight: 600 }}>{city.name}{city.state && `, ${city.state}`}</div>
                    <div style={{ fontSize: 11, color: "#697386", marginTop: 2 }}>
                      Predicted {DIRECTION_STYLE[p.predictedDirection]?.sign}{Math.abs(p.predictedDelta)} pts · Actual {p.actualDelta != null ? `${p.actualDelta >= 0 ? "+" : ""}${p.actualDelta} pts` : "TBD"}
                    </div>
                  </div>
                  <Pill bg={status.bg} color={status.color}>{status.label}</Pill>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* About + VDG attribution */}
      <section style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 80px", borderTop: "1px solid #e3e8ee" }}>
        <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, margin: "0 0 12px", color: "#0a2540" }}>
          About AirIndex Forecasts
        </h3>
        <p style={{ color: "#697386", fontSize: 13, lineHeight: 1.7, margin: "0 0 12px" }}>
          AirIndex Forecasts are directional calls on the AirIndex Score (AIS) of tracked markets, generated
          when our pipeline detects a forward-leading signal — a regulatory action awaiting decision, an FAA
          certification milestone, an operator deployment announcement, or a state legislation event.
        </p>
        <p style={{ color: "#697386", fontSize: 13, lineHeight: 1.7, margin: "0 0 12px" }}>
          Each forecast is logged at generation with its predicted delta, direction, confidence, and resolution
          window. After the window closes, automated verification compares the prediction against the actual
          score change and marks it as Hit, Miss, or Inconclusive. We publish results regardless of outcome.
        </p>
        <p style={{ color: "#697386", fontSize: 13, lineHeight: 1.7, margin: 0 }}>
          Methodology:{" "}
          <Link href="/methodology" style={{ color: "#5B8DB8", textDecoration: "none" }}>
            airindex.io/methodology
          </Link>
          . Companion to <Link href="/catalysts" style={{ color: "#5B8DB8", textDecoration: "none" }}>/catalysts</Link>,
          a calendar of dated regulatory and infrastructure events that resolve forecasts.
        </p>
        <div style={{ marginTop: 24, fontSize: 10, color: "#8792a2", fontFamily: "'Space Mono', monospace", letterSpacing: 1 }}>
          AirIndex Forecasts — part of Vertical Data Group&rsquo;s predictive intelligence
        </div>
      </section>

      <SiteFooter theme="light" />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ background: "#f9fbfd", border: "1px solid #e3e8ee", borderTop: `3px solid ${accent}`, borderRadius: 8, padding: "16px 18px" }}>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, color: accent, lineHeight: 1, marginBottom: 6 }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: "#697386", fontFamily: "'Space Mono', monospace", letterSpacing: 1, textTransform: "uppercase" }}>
        {label}
      </div>
    </div>
  );
}

function Pill({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-block",
        background: bg,
        color,
        fontSize: 10,
        fontWeight: 700,
        fontFamily: "'Space Mono', monospace",
        letterSpacing: 1,
        padding: "3px 8px",
        borderRadius: 3,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
