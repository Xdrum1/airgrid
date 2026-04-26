/**
 * /catalysts — public page listing tracked regulatory and infrastructure
 * events on the AirIndex calendar. Reads PredictionRecord rows where
 * predictedDelta = 0 (i.e., events being watched for resolution but
 * already credited in the score).
 *
 * This is the "calendar of what's coming up" companion to /forecasts.
 * Operators time deployment decisions to these events; investors track
 * them for portfolio markets.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CITIES_MAP } from "@/data/seed";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Catalysts — AirIndex",
  description:
    "Tracked regulatory and infrastructure events on the AirIndex calendar — dated catalysts that resolve forecasts.",
};

export const revalidate = 600;

const CATEGORY_STYLE: Record<string, { color: string; label: string }> = {
  regulatory: { color: "#5B8DB8", label: "Regulatory" },
  infrastructure: { color: "#00d4ff", label: "Infrastructure" },
  operator: { color: "#7c3aed", label: "Operator" },
  weather: { color: "#0d9488", label: "Weather" },
};

function formatDate(d: Date | null): string {
  if (!d) return "TBD";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function cityLabel(cityId: string): { name: string; state: string } {
  const c = CITIES_MAP[cityId];
  if (c) return { name: c.city, state: c.state };
  return {
    name: cityId
      .split("_")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" "),
    state: "",
  };
}

function monthYearKey(d: Date | null): string {
  if (!d) return "Date TBD";
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default async function CatalystsPage() {
  const catalysts = await prisma.predictionRecord.findMany({
    where: { status: "pending", predictedDelta: 0 },
    orderBy: { latestExpected: "asc" },
  });

  // Group by month+year for calendar display
  const groups = new Map<string, typeof catalysts>();
  for (const c of catalysts) {
    const key = monthYearKey(c.latestExpected);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  const total = catalysts.length;
  const upcoming30d = catalysts.filter((c) => {
    if (!c.latestExpected) return false;
    return c.latestExpected.getTime() < Date.now() + 30 * 24 * 60 * 60 * 1000;
  }).length;

  const byCategory = catalysts.reduce<Record<string, number>>((acc, c) => {
    acc[c.category] = (acc[c.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", color: "#0a2540", fontFamily: "Inter, sans-serif" }}>
      <SiteNav theme="light" />

      {/* Header */}
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "clamp(48px, 6vw, 72px) 24px 24px" }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 2, color: "#5B8DB8", textTransform: "uppercase", marginBottom: 14 }}>
          AirIndex Catalysts
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "clamp(28px, 4vw, 40px)", lineHeight: 1.15, margin: "0 0 16px" }}>
          Dated regulatory and infrastructure events on the AAM calendar
        </h1>
        <p style={{ color: "#425466", fontSize: 15, lineHeight: 1.7, maxWidth: 720, margin: "0 0 32px" }}>
          Catalysts are the events AirIndex is watching for resolution — bills awaiting decision, FAA aeronautical
          studies running their cycle, operator deployment announcements that need follow-on milestones. These
          don&rsquo;t change scores when added (the underlying signal already did) — they close out forecasts when
          they resolve. Track them like any institutional research firm tracks an event calendar.
        </p>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
          <Stat label="Tracked catalysts" value={String(total)} accent="#0a2540" />
          <Stat label="Resolving in 30 days" value={String(upcoming30d)} accent="#5B8DB8" />
          <Stat label="Regulatory" value={String(byCategory.regulatory ?? 0)} accent="#5B8DB8" />
          <Stat label="Infrastructure" value={String(byCategory.infrastructure ?? 0)} accent="#00d4ff" />
        </div>
      </section>

      {/* Calendar grouped by month */}
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 64px" }}>
        <h2
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 22,
            margin: "0 0 24px",
            paddingBottom: 12,
            borderBottom: "1px solid #e3e8ee",
          }}
        >
          Calendar
        </h2>

        {total === 0 ? (
          <div style={{ padding: 24, background: "#f9fbfd", borderRadius: 8, color: "#697386", fontSize: 13 }}>
            No active catalysts.
          </div>
        ) : (
          Array.from(groups.entries()).map(([month, items]) => (
            <div key={month} style={{ marginBottom: 32 }}>
              <h3
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: 15,
                  color: "#0a2540",
                  margin: "0 0 12px",
                  paddingBottom: 6,
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                {month}{" "}
                <span style={{ fontSize: 11, color: "#697386", fontWeight: 400, marginLeft: 8 }}>
                  {items.length} {items.length === 1 ? "catalyst" : "catalysts"}
                </span>
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {items.map((c) => {
                  const cat = CATEGORY_STYLE[c.category] ?? { color: "#697386", label: c.category };
                  const city = cityLabel(c.cityId);
                  return (
                    <div
                      key={c.id}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e3e8ee",
                        borderLeft: `3px solid ${cat.color}`,
                        borderRadius: 6,
                        padding: "12px 16px",
                        display: "grid",
                        gridTemplateColumns: "100px 1fr auto",
                        gap: 14,
                        alignItems: "start",
                      }}
                    >
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#0a2540", fontWeight: 700, letterSpacing: 0.5 }}>
                        {formatDate(c.latestExpected)}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, color: "#0a2540", fontWeight: 600, marginBottom: 4 }}>
                          {city.name}{city.state && `, ${city.state}`}
                        </div>
                        <div style={{ fontSize: 12, color: "#697386", lineHeight: 1.5 }}>
                          {c.description}
                        </div>
                      </div>
                      <span
                        style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: 9,
                          color: cat.color,
                          letterSpacing: 1,
                          textTransform: "uppercase",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {cat.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </section>

      {/* About + VDG attribution */}
      <section style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 80px", borderTop: "1px solid #e3e8ee" }}>
        <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, margin: "0 0 12px" }}>
          About AirIndex Catalysts
        </h3>
        <p style={{ color: "#697386", fontSize: 13, lineHeight: 1.7, margin: "0 0 12px" }}>
          Each catalyst is a dated event being tracked for resolution by the AirIndex pipeline — a state bill
          awaiting decision, an FAA aeronautical study running its cycle, an operator deployment announcement
          with expected follow-on milestones. Catalysts don&rsquo;t change AirIndex Scores when added — the
          underlying signal already did — but they close out the forecasts attached to that signal.
        </p>
        <p style={{ color: "#697386", fontSize: 13, lineHeight: 1.7, margin: 0 }}>
          Companion to{" "}
          <Link href="/forecasts" style={{ color: "#5B8DB8", textDecoration: "none" }}>
            /forecasts
          </Link>
          , which lists score-impacting predictions with directional calls.
        </p>
        <div style={{ marginTop: 24, fontSize: 10, color: "#8792a2", fontFamily: "'Space Mono', monospace", letterSpacing: 1 }}>
          AirIndex Catalysts — part of Vertical Data Group&rsquo;s predictive intelligence
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
