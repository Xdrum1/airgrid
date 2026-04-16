/**
 * Grid — per-metro 5nm weather-coverage visualization.
 *
 * Don Berchoff's demand artifact. Each 5nm cell is scored against the
 * 5nm rule (FAA NPRM Part 108): within 5nm of ASOS → full credit,
 * 5–10nm → partial, beyond 10nm → none.
 *
 * Path: /admin/reports/grid/[cityId]
 * Gate: signed-in admin only (dev-bypassed locally)
 * Scope: seeded markets only (Miami first; expand via seed-grid-cells.ts)
 *
 * This is the connective tissue between AirIndex (city score) and
 * RiskIndex (site score). City score will eventually derive from
 * mean of cell weather credits under v1.4 scoring.
 */
import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { METRO_BOUNDS } from "@/data/asos-stations";
import { getCitiesWithOverrides } from "@/data/seed";
import PrintButton from "@/app/reports/gap/[cityId]/PrintButton";
import GridMap, { type GridCellFeature } from "@/components/grid/GridMap";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "alan@airindex.io";
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export const metadata: Metadata = {
  title: "Grid — AirIndex",
  robots: "noindex, nofollow",
};

// ─────────────────────────────────────────────────────────
// Styling tokens — light brand, matches homepage + RiskIndex
// ─────────────────────────────────────────────────────────
const T = {
  bg: "#ffffff",
  textPrimary: "#0a2540",
  textSecondary: "#425466",
  textTertiary: "#697386",
  cardBorder: "#e3e8ee",
  subtleBg: "#f9fbfd",
  accent: "#5B8DB8",
  green: "#10b981",
  amber: "#f59e0b",
  red: "#dc2626",
};

function TierPill({ tier, count, total }: { tier: "full" | "partial" | "none"; count: number; total: number }) {
  const color = tier === "full" ? T.green : tier === "partial" ? T.amber : T.red;
  const label = tier === "full" ? "Full coverage" : tier === "partial" ? "Partial" : "No coverage";
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "14px 18px",
        background: T.bg,
        border: `1px solid ${T.cardBorder}`,
        borderTop: `3px solid ${color}`,
        borderRadius: 10,
        minWidth: 180,
      }}
    >
      <div style={{ fontSize: 10, letterSpacing: "0.12em", color: T.textTertiary, textTransform: "uppercase" as const, fontFamily: "'Space Mono', monospace" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.02em" }}>
          {count}
        </span>
        <span style={{ fontSize: 12, color: T.textTertiary }}>/ {total} cells · {pct}%</span>
      </div>
    </div>
  );
}

export default async function GridPage({ params }: { params: Promise<{ cityId: string }> }) {
  if (process.env.NODE_ENV !== "development") {
    const session = await auth();
    if (!session?.user) redirect("/login?callbackUrl=/admin");
    if (session.user.email !== ADMIN_EMAIL) redirect("/");
  }

  const { cityId } = await params;

  const cells = await prisma.gridCell.findMany({
    where: { marketId: cityId },
    orderBy: [{ row: "asc" }, { col: "asc" }],
  });
  if (cells.length === 0) notFound();

  const bounds = METRO_BOUNDS[cityId];
  if (!bounds) notFound();

  const allCities = await getCitiesWithOverrides();
  const city = allCities.find((c) => c.id === cityId);
  if (!city) notFound();

  // Tier rollup
  const fullCount = cells.filter((c) => c.tier === "full").length;
  const partialCount = cells.filter((c) => c.tier === "partial").length;
  const noneCount = cells.filter((c) => c.tier === "none").length;
  const avgCredit =
    cells.reduce((s, c) => s + c.centroidCredit, 0) / Math.max(1, cells.length);

  // Derived weather score (v1.4 preview): mean credit, capped at 5, scaled to 10 pts
  const v14WeatherCredit = Math.round(avgCredit * 10) / 10; // 0-5 scale, one decimal
  const gridVersion = cells[0]?.gridVersion ?? "—";

  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const mapCells: GridCellFeature[] = cells.map((c) => ({
    id: c.id,
    minLat: c.minLat,
    maxLat: c.maxLat,
    minLng: c.minLng,
    maxLng: c.maxLng,
    centroidLat: c.centroidLat,
    centroidLng: c.centroidLng,
    tier: c.tier as "full" | "partial" | "none",
    centroidCredit: c.centroidCredit,
    nearestAsosId: c.nearestAsosId,
    nearestAsosDistanceNm: c.nearestAsosDistanceNm,
    siteIds: c.siteIds,
  }));

  return (
    <div style={{ background: T.bg, color: T.textPrimary, minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <style>{`@media print {
        @page { margin: 0.55in; size: letter; }
        .screen-only { display: none !important; }
        body, div { background: #fff !important; }
      }`}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 32px 72px" }}>
        <div className="screen-only" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <PrintButton />
        </div>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${T.cardBorder}`, paddingBottom: 10, marginBottom: 16, fontSize: 10, color: T.textTertiary, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
          <span><strong style={{ color: T.accent }}>AIRINDEX</strong> · Grid · Weather Coverage</span>
          <span>{today}</span>
        </div>

        <div style={{ marginBottom: 6, fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: "0.12em", color: T.accent, textTransform: "uppercase" as const }}>
          {gridVersion} · 5nm Grid
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700, color: T.textPrimary, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
          {city.city} weather-coverage grid
        </h1>
        <p style={{ color: T.textSecondary, fontSize: 15, lineHeight: 1.6, margin: "0 0 28px", maxWidth: 720 }}>
          Each 5nm cell is scored against the nearest ASOS station. Full coverage
          (green) sits within 5nm of an ASOS. Partial (amber) within 5–10nm.
          No coverage (red) beyond 10nm. City score aggregates cell scores — gaps
          the flat city number hides become visible here.
        </p>

        {/* Tier rollup */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
          <TierPill tier="full" count={fullCount} total={cells.length} />
          <TierPill tier="partial" count={partialCount} total={cells.length} />
          <TierPill tier="none" count={noneCount} total={cells.length} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              padding: "14px 18px",
              background: T.subtleBg,
              border: `1px solid ${T.cardBorder}`,
              borderRadius: 10,
              minWidth: 200,
            }}
          >
            <div style={{ fontSize: 10, letterSpacing: "0.12em", color: T.textTertiary, textTransform: "uppercase" as const, fontFamily: "'Space Mono', monospace" }}>
              Avg coverage credit
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.02em" }}>
                {v14WeatherCredit.toFixed(1)}
              </span>
              <span style={{ fontSize: 12, color: T.textTertiary }}>/ 5.0 (v1.4 preview)</span>
            </div>
          </div>
        </div>

        {/* Map */}
        {MAPBOX_TOKEN ? (
          <GridMap cells={mapCells} bounds={bounds} mapboxToken={MAPBOX_TOKEN} />
        ) : (
          <div style={{ padding: 24, border: `1px solid ${T.cardBorder}`, borderRadius: 12, background: T.subtleBg, color: T.textSecondary, fontSize: 13 }}>
            Mapbox token missing. Set <code style={{ background: "#eef2f7", padding: "1px 6px", borderRadius: 4 }}>NEXT_PUBLIC_MAPBOX_TOKEN</code> in env to render the grid.
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 24, paddingTop: 14, borderTop: `1px solid ${T.cardBorder}`, fontSize: 11, color: T.textTertiary, lineHeight: 1.6 }}>
          Grid cells generated per Don Berchoff&apos;s 5nm rule (FAA NPRM Part 108, pp. 96–98). ASOS station coordinates sourced from FAA NASR. Cells shown: {cells.length} · Imagery © Mapbox © OpenStreetMap.
        </div>
      </div>
    </div>
  );
}
