/**
 * FKB Phase 1 Seed Script
 *
 * Seeds: Market table (21 cities) + FKB Factor Registry (8 factors, 1 retired)
 *
 * Usage:
 *   npx tsx scripts/seed-fkb.ts
 *   npx tsx scripts/seed-fkb.ts --dry-run
 *
 * Prerequisites:
 *   - Database migration must be run first (npx prisma db push or migrate)
 *   - DATABASE_URL must be set
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────
// Market Registry — 21 tracked US markets
// IDs match seed.ts city IDs exactly
// ─────────────────────────────────────────────────────────

const MARKETS = [
  { id: "los_angeles", city: "Los Angeles", state: "CA", metro: "Greater Los Angeles", lat: 34.0522, lng: -118.2437 },
  { id: "dallas", city: "Dallas", state: "TX", metro: "Dallas-Fort Worth", lat: 32.7767, lng: -96.7970 },
  { id: "miami", city: "Miami", state: "FL", metro: "South Florida", lat: 25.7617, lng: -80.1918 },
  { id: "orlando", city: "Orlando", state: "FL", metro: "Central Florida", lat: 28.5383, lng: -81.3792 },
  { id: "san_francisco", city: "San Francisco", state: "CA", metro: "San Francisco Bay Area", lat: 37.7749, lng: -122.4194 },
  { id: "new_york", city: "New York", state: "NY", metro: "New York Metro", lat: 40.7128, lng: -74.0060 },
  { id: "phoenix", city: "Phoenix", state: "AZ", metro: "Phoenix Metro", lat: 33.4484, lng: -112.0740 },
  { id: "austin", city: "Austin", state: "TX", metro: "Austin-Round Rock", lat: 30.2672, lng: -97.7431 },
  { id: "houston", city: "Houston", state: "TX", metro: "Greater Houston", lat: 29.7604, lng: -95.3698 },
  { id: "san_diego", city: "San Diego", state: "CA", metro: "San Diego Metro", lat: 32.7157, lng: -117.1611 },
  { id: "denver", city: "Denver", state: "CO", metro: "Denver Metro", lat: 39.7392, lng: -104.9903 },
  { id: "atlanta", city: "Atlanta", state: "GA", metro: "Atlanta Metro", lat: 33.7490, lng: -84.3880 },
  { id: "chicago", city: "Chicago", state: "IL", metro: "Chicago Metro", lat: 41.8781, lng: -87.6298 },
  { id: "charlotte", city: "Charlotte", state: "NC", metro: "Charlotte Metro", lat: 35.2271, lng: -80.8431 },
  { id: "las_vegas", city: "Las Vegas", state: "NV", metro: "Las Vegas Valley", lat: 36.1699, lng: -115.1398 },
  { id: "nashville", city: "Nashville", state: "TN", metro: "Nashville Metro", lat: 36.1627, lng: -86.7816 },
  { id: "seattle", city: "Seattle", state: "WA", metro: "Seattle Metro", lat: 47.6062, lng: -122.3321 },
  { id: "boston", city: "Boston", state: "MA", metro: "Greater Boston", lat: 42.3601, lng: -71.0589 },
  { id: "detroit", city: "Detroit", state: "MI", metro: "Detroit Metro", lat: 42.3314, lng: -83.0458 },
  { id: "columbus", city: "Columbus", state: "OH", metro: "Columbus Metro", lat: 39.9612, lng: -82.9988 },
  { id: "tampa", city: "Tampa", state: "FL", metro: "Tampa Bay", lat: 27.9506, lng: -82.4572 },
];

// ─────────────────────────────────────────────────────────
// FKB Factor Registry — 8 factors (7 active + 1 retired)
// Codes are permanent identifiers. Never change these.
// ─────────────────────────────────────────────────────────

const FACTORS = [
  {
    code: "OPR",
    name: "Operator Presence",
    description: "Measures the number and quality of active UAM/eVTOL operator deployments, announced partnerships, test operations, and commercial commitments within the metro area. Weighted most heavily because operator commitment is the strongest leading indicator of commercial readiness.",
    scoringTier: "PRIMARY",
    introducedIn: "v1.0",
    retired: false,
    sortOrder: 1,
  },
  {
    code: "LEG",
    name: "State Legislation",
    description: "Tracks the status and quality of state-level legislation enabling or explicitly addressing UAM infrastructure, vertiport permitting, airspace rights, or eVTOL operating frameworks. Binary gating: markets without any active legislation score max 5 on this factor regardless of other signals. This reflects the real-world gating effect state law has on infrastructure development.",
    scoringTier: "PRIMARY",
    introducedIn: "v1.0",
    retired: false,
    sortOrder: 2,
  },
  {
    code: "VRT",
    name: "Vertiport Infrastructure",
    description: "Assesses physical vertiport infrastructure: completed facilities, sites under construction, permitted developments, and signed ground leases. Distinguishes between operational (full score), under construction (partial), and announced-only (minimal) projects.",
    scoringTier: "PRIMARY",
    introducedIn: "v1.0",
    retired: false,
    sortOrder: 3,
  },
  {
    code: "REG",
    name: "Regulatory Posture",
    description: "Scores the FAA and local authority engagement level with UAM in the market — including FAA BEYOND drone program inclusion, UAS traffic management (UTM) pilot participation, and local authority attitudes expressed through public documents, city council records, and official statements.",
    scoringTier: "DERIVED",
    introducedIn: "v1.0",
    retired: false,
    sortOrder: 4,
  },
  {
    code: "PLT",
    name: "Pilot Programs",
    description: "Tracks active or completed government-funded or FAA-sanctioned UAM pilot programs in the metro area. Includes both airspace demonstration programs and ground-side infrastructure pilots. Serves as a leading indicator of institutional readiness before commercial operations launch.",
    scoringTier: "DERIVED",
    introducedIn: "v1.0",
    retired: false,
    sortOrder: 5,
  },
  {
    code: "ZON",
    name: "Zoning & Land Use",
    description: "Evaluates whether the metro's zoning code explicitly addresses or enables vertiport development. Covers by-right vertiport zoning, helipad conversion pathways, rooftop landing pad allowances, and noise ordinance compatibility.",
    scoringTier: "DERIVED",
    introducedIn: "v1.0",
    retired: false,
    sortOrder: 6,
  },
  {
    code: "WTH",
    name: "Weather Infrastructure",
    description: "Weather infrastructure readiness tracks low-altitude weather sensing at the city level. The USDOT AAM National Strategy identifies weather as one of four infrastructure pillars alongside physical, energy, and spectrum. Weather remains the most uncertain and uncontrollable factor that will impact schedule reliability and operator dispatch rates. This factor uses a graduated three-tier model: Full (10 pts) — dedicated low-altitude sensing deployed; Partial (5 pts) — standard airport weather infrastructure; None (0 pts) — no meaningful weather infrastructure for low-altitude operations.",
    scoringTier: "DERIVED",
    introducedIn: "v1.3",
    retired: false,
    sortOrder: 7,
  },
  {
    // Retired factor — preserved for historical score integrity
    code: "LNC",
    name: "LAANC Coverage",
    description: "Binary indicator of whether FAA LAANC (Low Altitude Authorization and Notification Capability) was active in the metro area. Retired in v1.3 because 20 of 21 tracked markets had LAANC coverage, making it background noise rather than a differentiating signal.",
    scoringTier: "BINARY",
    introducedIn: "v1.0",
    retired: true,
    retiredIn: "v1.3",
    retirementReason: "20 of 21 tracked markets had LAANC coverage — factor no longer differentiated markets. Replaced by WTH (Weather Infrastructure) which captures meaningful variation in low-altitude weather sensing capability.",
    sortOrder: 99,
  },
];

// ─────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────

async function main() {
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

  // ── Step 1: Seed Markets ──
  console.log("═══ Markets ═══");
  for (const m of MARKETS) {
    if (dryRun) {
      console.log(`  [dry] Would upsert Market: ${m.id} (${m.city}, ${m.state})`);
    } else {
      await prisma.market.upsert({
        where: { id: m.id },
        create: {
          id: m.id,
          city: m.city,
          state: m.state,
          metro: m.metro,
          lat: m.lat,
          lng: m.lng,
        },
        update: {
          city: m.city,
          state: m.state,
          metro: m.metro,
          lat: m.lat,
          lng: m.lng,
        },
      });
      console.log(`  ✓ ${m.id} (${m.city}, ${m.state})`);
    }
  }
  console.log(`\n${MARKETS.length} markets ${dryRun ? "would be" : ""} seeded.\n`);

  // ── Step 2: Seed Factor Registry ──
  console.log("═══ FKB Factor Registry ═══");
  for (const f of FACTORS) {
    if (dryRun) {
      console.log(`  [dry] Would upsert Factor: ${f.code} — ${f.name} ${f.retired ? "(RETIRED)" : ""}`);
    } else {
      await prisma.fkbFactor.upsert({
        where: { code: f.code },
        create: {
          code: f.code,
          name: f.name,
          description: f.description,
          scoringTier: f.scoringTier,
          introducedIn: f.introducedIn,
          retired: f.retired,
          retiredIn: (f as Record<string, unknown>).retiredIn as string | undefined,
          retirementReason: (f as Record<string, unknown>).retirementReason as string | undefined,
          sortOrder: f.sortOrder,
        },
        update: {
          name: f.name,
          description: f.description,
          scoringTier: f.scoringTier,
          retired: f.retired,
          retiredIn: (f as Record<string, unknown>).retiredIn as string | undefined,
          retirementReason: (f as Record<string, unknown>).retirementReason as string | undefined,
          sortOrder: f.sortOrder,
        },
      });
      console.log(`  ✓ ${f.code} — ${f.name} ${f.retired ? "(RETIRED)" : ""}`);
    }
  }
  console.log(`\n${FACTORS.length} factors ${dryRun ? "would be" : ""} seeded (${FACTORS.filter(f => !f.retired).length} active, ${FACTORS.filter(f => f.retired).length} retired).\n`);

  // ── Summary ──
  console.log("═══ Factor Codes (for review) ═══");
  console.log("┌──────┬────────────────────────────┬──────────┬─────────┐");
  console.log("│ Code │ Name                       │ Tier     │ Status  │");
  console.log("├──────┼────────────────────────────┼──────────┼─────────┤");
  for (const f of FACTORS) {
    const code = f.code.padEnd(4);
    const name = f.name.padEnd(26);
    const tier = f.scoringTier.padEnd(8);
    const status = f.retired ? "RETIRED" : "ACTIVE ";
    console.log(`│ ${code} │ ${name} │ ${tier} │ ${status} │`);
  }
  console.log("└──────┴────────────────────────────┴──────────┴─────────┘");
}

main()
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
