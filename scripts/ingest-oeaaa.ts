/**
 * OE/AAA Determination Ingestion — pulls NRA + CIRC case data from FAA API.
 *
 * Usage:
 *   npx tsx scripts/ingest-oeaaa.ts                          # Full ingestion, current year
 *   npx tsx scripts/ingest-oeaaa.ts --year=2024              # Specific year
 *   npx tsx scripts/ingest-oeaaa.ts --state=FL               # Single state
 *   npx tsx scripts/ingest-oeaaa.ts --dry-run                # Fetch + parse, no DB writes
 *   npx tsx scripts/ingest-oeaaa.ts --update-compliance      # Also backfill HeliportCompliance Q2
 *   npx tsx scripts/ingest-oeaaa.ts --circ-only              # Only fetch CIRC cases (no year filter)
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient, Prisma } from "@prisma/client";
import {
  fetchNraCasesByState,
  fetchCircCasesByState,
  TRACKED_STATES,
  type OeaaaCase,
} from "../src/lib/oeaaa-api";

const prisma = new PrismaClient();

// Metro bounding boxes — copied from ingest-heliports.ts
const METRO_BOUNDS: Record<string, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
  los_angeles:    { minLat: 33.60, maxLat: 34.35, minLng: -118.70, maxLng: -117.65 },
  new_york:       { minLat: 40.45, maxLat: 41.00, minLng: -74.30, maxLng: -73.65 },
  dallas:         { minLat: 32.55, maxLat: 33.10, minLng: -97.40, maxLng: -96.50 },
  miami:          { minLat: 25.55, maxLat: 26.10, minLng: -80.50, maxLng: -80.05 },
  orlando:        { minLat: 28.20, maxLat: 28.80, minLng: -81.60, maxLng: -81.00 },
  las_vegas:      { minLat: 35.90, maxLat: 36.35, minLng: -115.40, maxLng: -114.90 },
  chicago:        { minLat: 41.60, maxLat: 42.10, minLng: -88.00, maxLng: -87.50 },
  houston:        { minLat: 29.50, maxLat: 30.10, minLng: -95.80, maxLng: -95.00 },
  san_francisco:  { minLat: 37.20, maxLat: 37.90, minLng: -122.55, maxLng: -121.80 },
  denver:         { minLat: 39.50, maxLat: 39.95, minLng: -105.20, maxLng: -104.70 },
  phoenix:        { minLat: 33.20, maxLat: 33.75, minLng: -112.30, maxLng: -111.70 },
  atlanta:        { minLat: 33.55, maxLat: 34.00, minLng: -84.60, maxLng: -84.15 },
  seattle:        { minLat: 47.35, maxLat: 47.80, minLng: -122.50, maxLng: -122.10 },
  washington_dc:  { minLat: 38.70, maxLat: 39.10, minLng: -77.25, maxLng: -76.85 },
  boston:          { minLat: 42.20, maxLat: 42.50, minLng: -71.25, maxLng: -70.90 },
  tampa:          { minLat: 27.70, maxLat: 28.15, minLng: -82.70, maxLng: -82.30 },
  austin:         { minLat: 30.10, maxLat: 30.55, minLng: -97.95, maxLng: -97.55 },
  nashville:      { minLat: 35.95, maxLat: 36.30, minLng: -87.00, maxLng: -86.55 },
  columbus:       { minLat: 39.80, maxLat: 40.15, minLng: -83.15, maxLng: -82.75 },
  san_diego:      { minLat: 32.60, maxLat: 33.05, minLng: -117.30, maxLng: -116.90 },
  charlotte:      { minLat: 35.05, maxLat: 35.45, minLng: -81.00, maxLng: -80.65 },
  minneapolis:    { minLat: 44.80, maxLat: 45.15, minLng: -93.50, maxLng: -93.05 },
  salt_lake_city: { minLat: 40.55, maxLat: 40.90, minLng: -112.10, maxLng: -111.70 },
  san_antonio:    { minLat: 29.30, maxLat: 29.65, minLng: -98.70, maxLng: -98.30 },
  cincinnati:     { minLat: 38.95, maxLat: 39.25, minLng: -84.70, maxLng: -84.30 },
};

function matchMetro(lat: number, lng: number): string | null {
  for (const [cityId, bounds] of Object.entries(METRO_BOUNDS)) {
    if (lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng) {
      return cityId;
    }
  }
  return null;
}

// Proximity threshold for heliport linking (~0.5nm ≈ 0.008 degrees)
const PROXIMITY_DEG = 0.008;

// ── Args ───────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const circOnly = args.includes("--circ-only");
const updateCompliance = args.includes("--update-compliance");
const yearArg = args.find((a) => a.startsWith("--year="));
const stateArg = args.find((a) => a.startsWith("--state="));
const year = yearArg ? parseInt(yearArg.split("=")[1]) : new Date().getFullYear();
const singleState = stateArg?.split("=")[1]?.toUpperCase();

// ── Main ───────────────────────────────────────────────────

async function main() {
  const states = singleState ? [singleState] : TRACKED_STATES;
  const allCases = new Map<string, OeaaaCase>(); // dedup by ASN
  const failedStates: string[] = [];

  console.log(`\n${"═".repeat(60)}`);
  console.log(`  OE/AAA DETERMINATION INGESTION`);
  console.log(`${"═".repeat(60)}`);
  console.log(`  Year:   ${circOnly ? "n/a (CIRC only)" : year}`);
  console.log(`  States: ${states.join(", ")} (${states.length})`);
  console.log(`  Mode:   ${dryRun ? "DRY RUN" : "LIVE"}${updateCompliance ? " + compliance update" : ""}\n`);

  // Fetch NRA cases per state
  if (!circOnly) {
    for (const state of states) {
      try {
        const cases = await fetchNraCasesByState(state, year);
        for (const c of cases) allCases.set(c.asn, c);
      } catch (err) {
        console.error(`  FAILED: ${state} NRA — ${err}`);
        failedStates.push(`${state}/NRA`);
      }
      // Polite delay between requests
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  // Fetch CIRC cases per state
  for (const state of states) {
    try {
      const cases = await fetchCircCasesByState(state);
      for (const c of cases) allCases.set(c.asn, c);
    } catch (err) {
      console.error(`  FAILED: ${state} CIRC — ${err}`);
      failedStates.push(`${state}/CIRC`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Summary of fetched data
  const cases = [...allCases.values()];
  const statusCounts: Record<string, number> = {};
  const stateCounts: Record<string, number> = {};
  let geoMatched = 0;

  for (const c of cases) {
    statusCounts[c.statusCode] = (statusCounts[c.statusCode] ?? 0) + 1;
    stateCounts[c.nearestState] = (stateCounts[c.nearestState] ?? 0) + 1;
    if (matchMetro(c.lat, c.lng)) geoMatched++;
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`  FETCH SUMMARY`);
  console.log(`${"─".repeat(60)}`);
  console.log(`  Total unique cases: ${cases.length}`);
  console.log(`  Geo-matched to metros: ${geoMatched}`);
  console.log(`\n  By status:`);
  for (const [status, count] of Object.entries(statusCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${count.toString().padStart(6)}  ${status}`);
  }
  console.log(`\n  By state (top 10):`);
  for (const [state, count] of Object.entries(stateCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`    ${count.toString().padStart(6)}  ${state}`);
  }
  if (failedStates.length > 0) {
    console.log(`\n  FAILED: ${failedStates.join(", ")}`);
  }

  if (dryRun) {
    console.log(`\n  DRY RUN — no DB writes.`);
    await prisma.$disconnect();
    return;
  }

  // Upsert to DB
  console.log(`\n  Upserting ${cases.length} records...`);
  let upserted = 0;
  let errors = 0;

  for (const c of cases) {
    const marketId = matchMetro(c.lat, c.lng);

    try {
      await prisma.oeaaaDetermination.upsert({
        where: { asn: c.asn },
        create: {
          asn: c.asn,
          caseId: c.caseId,
          caseType: c.caseType,
          statusCode: c.statusCode,
          nearestAirportName: c.nearestAirportName,
          nearestCity: c.nearestCity,
          nearestState: c.nearestState,
          lat: new Prisma.Decimal(c.lat),
          lng: new Prisma.Decimal(c.lng),
          structureType: c.structureType,
          structureDescription: c.structureDescription,
          aglHeight: c.aglHeight,
          amslHeight: c.amslHeight,
          filingDate: c.filingDate ? new Date(c.filingDate) : null,
          determinationDate: c.determinationDate ? new Date(c.determinationDate) : null,
          expirationDate: c.expirationDate ? new Date(c.expirationDate) : null,
          year: c.year,
          sourceEndpoint: c.caseType === "NRA" ? "NRA_state" : "CIRC_state",
          marketId,
          raw: c.raw as Prisma.JsonObject,
        },
        update: {
          statusCode: c.statusCode,
          determinationDate: c.determinationDate ? new Date(c.determinationDate) : null,
          expirationDate: c.expirationDate ? new Date(c.expirationDate) : null,
          marketId,
          raw: c.raw as Prisma.JsonObject,
          updatedAt: new Date(),
        },
      });
      upserted++;
    } catch (err) {
      errors++;
      if (errors <= 5) console.error(`  Upsert error (${c.asn}):`, err);
    }
  }

  console.log(`  Upserted: ${upserted}  Errors: ${errors}`);

  // Link to nearest heliports via proximity
  console.log(`\n  Linking determinations to heliports (${PROXIMITY_DEG}° threshold)...`);
  const linkResult = await prisma.$executeRawUnsafe(`
    UPDATE "OeaaaDetermination" d
    SET "linkedHeliportId" = sub.hid
    FROM (
      SELECT d2.id AS did, (
        SELECT h.id FROM "Heliport" h
        WHERE ABS(CAST(h.lat AS float) - CAST(d2.lat AS float)) < ${PROXIMITY_DEG}
          AND ABS(CAST(h.lng AS float) - CAST(d2.lng AS float)) < ${PROXIMITY_DEG}
        ORDER BY POWER(CAST(h.lat AS float) - CAST(d2.lat AS float), 2) +
                 POWER(CAST(h.lng AS float) - CAST(d2.lng AS float), 2)
        LIMIT 1
      ) AS hid
      FROM "OeaaaDetermination" d2
      WHERE d2."linkedHeliportId" IS NULL
    ) sub
    WHERE d.id = sub.did AND sub.hid IS NOT NULL
  `);
  console.log(`  Linked ${linkResult} determinations to heliports`);

  // Optionally update HeliportCompliance Q2
  if (updateCompliance) {
    console.log(`\n  Updating HeliportCompliance Q2 from linked determinations...`);
    const linked = await prisma.oeaaaDetermination.findMany({
      where: { linkedHeliportId: { not: null } },
      select: { asn: true, statusCode: true, linkedHeliportId: true },
    });

    let q2Updated = 0;
    for (const det of linked) {
      const q2Status = "on_file";
      const q2Type =
        det.statusCode === "DET-DNE" ? "concur" :
        det.statusCode.startsWith("DET-Conditional") ? "concur_with_exception" :
        det.statusCode === "CIR" ? "objectionable" :
        det.statusCode === "DET-to-Prop" ? "concur" :
        null;
      const q2Note = `OE/AAA ASN ${det.asn}: ${det.statusCode}`;

      try {
        // HeliportCompliance.facilityId = Heliport.id
        await prisma.heliportCompliance.updateMany({
          where: { facilityId: det.linkedHeliportId! },
          data: {
            q2AirspaceDetermination: q2Status,
            ...(q2Type && { q2DeterminationType: q2Type }),
            q2Note,
          },
        });
        q2Updated++;
      } catch {
        // Skip — compliance record may not exist for this heliport
      }
    }
    console.log(`  Q2 updated: ${q2Updated} heliport compliance records`);
  }

  // Final counts
  const totalInDb = await prisma.oeaaaDetermination.count();
  const linkedCount = await prisma.oeaaaDetermination.count({ where: { linkedHeliportId: { not: null } } });
  const marketCount = await prisma.oeaaaDetermination.count({ where: { marketId: { not: null } } });

  console.log(`\n${"═".repeat(60)}`);
  console.log(`  DONE`);
  console.log(`${"═".repeat(60)}`);
  console.log(`  Total in DB:          ${totalInDb}`);
  console.log(`  Geo-matched to metro: ${marketCount}`);
  console.log(`  Linked to heliport:   ${linkedCount}`);
  console.log("");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
