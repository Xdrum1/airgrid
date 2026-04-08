/**
 * OE/AAA OE Case Ingestion — pulls OE (Obstruction Evaluation) cases
 * via ASN list + individual case lookups.
 *
 * Purpose: independently verify the 3,868 conditional / 42 objectionable
 * heliport determination numbers from Rex's Verticon 2026 presentation.
 *
 * Strategy:
 *   1. Pull all OE ASNs per region via asnList (up to 8,000 per region)
 *   2. Filter out ASNs already in DB (resumable)
 *   3. Fetch individual cases with controlled concurrency
 *   4. Upsert to OeaaaDetermination table
 *   5. Print heliport-filtered breakdown matching Rex's categories
 *
 * Usage:
 *   npx tsx scripts/ingest-oeaaa-oe.ts                    # Full run, all regions, current year
 *   npx tsx scripts/ingest-oeaaa-oe.ts --year=2024        # Specific year
 *   npx tsx scripts/ingest-oeaaa-oe.ts --region=ASO       # Single region
 *   npx tsx scripts/ingest-oeaaa-oe.ts --concurrency=20   # Parallel requests (default 10)
 *   npx tsx scripts/ingest-oeaaa-oe.ts --dry-run          # Fetch ASNs only, no case lookups
 *   npx tsx scripts/ingest-oeaaa-oe.ts --summary          # Just print DB summary, no fetching
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient, Prisma } from "@prisma/client";
import {
  fetchCaseByAsn,
  fetchNraAsnsByRegion,
  getRegionForState,
  type OeaaaCase,
} from "../src/lib/oeaaa-api";

const prisma = new PrismaClient();

const ALL_REGIONS = ["ASO", "ASW", "AWP", "AEA", "ANE", "AGL", "ACE", "ANM", "AAL"];

// Metro bounds for geo-matching (same as ingest-oeaaa.ts)
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

// ── Args ───────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const summaryOnly = args.includes("--summary");
const yearArg = args.find((a) => a.startsWith("--year="));
const regionArg = args.find((a) => a.startsWith("--region="));
const concurrencyArg = args.find((a) => a.startsWith("--concurrency="));
const year = yearArg ? parseInt(yearArg.split("=")[1]) : new Date().getFullYear();
const singleRegion = regionArg?.split("=")[1]?.toUpperCase();
const concurrency = concurrencyArg ? parseInt(concurrencyArg.split("=")[1]) : 10;

// ── Concurrent fetcher ─────────────────────────────────────

async function fetchCasesConcurrent(
  asns: string[],
  maxConcurrency: number,
  onProgress: (done: number, total: number, c: OeaaaCase | null) => void,
): Promise<OeaaaCase[]> {
  const results: OeaaaCase[] = [];
  let idx = 0;
  let done = 0;

  async function worker() {
    while (idx < asns.length) {
      const asn = asns[idx++];
      try {
        const c = await fetchCaseByAsn(asn);
        if (c) results.push(c);
        done++;
        onProgress(done, asns.length, c);
      } catch {
        done++;
        onProgress(done, asns.length, null);
      }
    }
  }

  const workers = Array.from({ length: Math.min(maxConcurrency, asns.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ── Summary ────────────────────────────────────────────────

async function printSummary() {
  const total = await prisma.oeaaaDetermination.count();
  const oeCount = await prisma.oeaaaDetermination.count({ where: { caseType: "OE" } });
  const nraCount = await prisma.oeaaaDetermination.count({ where: { caseType: "NRA" } });

  console.log(`\n${"═".repeat(60)}`);
  console.log("  OE/AAA DATABASE SUMMARY");
  console.log(`${"═".repeat(60)}`);
  console.log(`  Total records:  ${total.toLocaleString()}`);
  console.log(`  OE cases:       ${oeCount.toLocaleString()}`);
  console.log(`  NRA cases:      ${nraCount.toLocaleString()}`);

  // Status code breakdown for OE cases
  if (oeCount > 0) {
    const statuses = await prisma.$queryRaw<{ statusCode: string; count: number }[]>`
      SELECT "statusCode", COUNT(*)::int as count
      FROM "OeaaaDetermination"
      WHERE "caseType" = 'OE'
      GROUP BY "statusCode"
      ORDER BY count DESC`;
    console.log(`\n  OE Status Codes:`);
    for (const s of statuses) {
      console.log(`    ${String(s.count).padStart(6)}  ${s.statusCode}`);
    }
  }

  // Heliport-specific breakdown (structure types containing heliport/helipad keywords)
  const heliportCases = await prisma.$queryRaw<{ statusCode: string; count: number }[]>`
    SELECT "statusCode", COUNT(*)::int as count
    FROM "OeaaaDetermination"
    WHERE "caseType" = 'OE'
    AND (
      LOWER("structureType") LIKE '%heli%'
      OR LOWER("structureDescription") LIKE '%heli%'
      OR LOWER("structureDescription") LIKE '%vertiport%'
      OR LOWER("structureDescription") LIKE '%landing zone%'
      OR LOWER("structureDescription") LIKE '%hospital%pad%'
    )
    GROUP BY "statusCode"
    ORDER BY count DESC`;

  if (heliportCases.length > 0) {
    console.log(`\n  Heliport-Related OE Cases (keyword filter):`);
    let heliTotal = 0;
    for (const s of heliportCases) {
      console.log(`    ${String(s.count).padStart(6)}  ${s.statusCode}`);
      heliTotal += s.count;
    }
    console.log(`    ${String(heliTotal).padStart(6)}  TOTAL`);
  } else {
    console.log(`\n  No heliport-related OE cases found yet.`);
  }

  // Rex's target numbers for comparison
  console.log(`\n  Rex's Verticon 2026 Numbers (target for reconciliation):`);
  console.log(`      1,941  No Objection`);
  console.log(`      3,868  Conditional`);
  console.log(`         42  Objectionable`);
  console.log(`        150  Not Analyzed`);
  console.log(`        109  Unknown`);
  console.log(`      6,110  TOTAL`);

  console.log("");
}

// ── Main ───────────────────────────────────────────────────

async function main() {
  if (summaryOnly) {
    await printSummary();
    await prisma.$disconnect();
    return;
  }

  const regions = singleRegion ? [singleRegion] : ALL_REGIONS;

  console.log(`\n${"═".repeat(60)}`);
  console.log("  OE/AAA OE CASE INGESTION");
  console.log(`${"═".repeat(60)}`);
  console.log(`  Year:        ${year}`);
  console.log(`  Regions:     ${regions.join(", ")}`);
  console.log(`  Concurrency: ${concurrency}`);
  console.log(`  Mode:        ${dryRun ? "DRY RUN (ASN list only)" : "LIVE"}\n`);

  // Step 1: Pull ASN lists
  const allAsns: string[] = [];
  for (const region of regions) {
    console.log(`[OE/AAA] Fetching OE ASN list: ${region} ${year}...`);
    try {
      // The asnList endpoint uses the same base URL pattern
      const url = `https://oeaaa.faa.gov/oeaaa/services/asnList/OE/${year}?region=${region}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 90_000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) {
        console.error(`  HTTP ${res.status} — skipping ${region}`);
        continue;
      }

      const text = await res.text();
      if (text.includes("Maintenance Notification")) {
        console.error(`  Maintenance page — skipping ${region}`);
        continue;
      }

      // Parse ASN list
      const { XMLParser } = await import("fast-xml-parser");
      const parser = new XMLParser();
      const parsed = parser.parse(text);
      const list = parsed.asnList?.asn ?? [];
      const asns = Array.isArray(list) ? list.map(String) : [String(list)];
      console.log(`  ${asns.length} ASNs`);
      allAsns.push(...asns);
    } catch (err) {
      console.error(`  Failed: ${err}`);
    }
    // Delay between region requests
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(`\nTotal OE ASNs collected: ${allAsns.length}`);

  if (dryRun) {
    console.log("DRY RUN — no case lookups.");
    await prisma.$disconnect();
    return;
  }

  // Step 2: Filter out ASNs already in DB
  const existing = await prisma.oeaaaDetermination.findMany({
    where: { asn: { in: allAsns } },
    select: { asn: true },
  });
  const existingSet = new Set(existing.map((e) => e.asn));
  const newAsns = allAsns.filter((a) => !existingSet.has(a));
  console.log(`Already in DB: ${existingSet.size}  |  New to fetch: ${newAsns.length}\n`);

  if (newAsns.length === 0) {
    console.log("Nothing new to fetch.");
    await printSummary();
    await prisma.$disconnect();
    return;
  }

  // Step 3: Fetch cases with controlled concurrency
  let lastPrint = Date.now();
  const cases = await fetchCasesConcurrent(newAsns, concurrency, (done, total, c) => {
    if (Date.now() - lastPrint > 5000 || done === total) {
      const pct = Math.round((done / total) * 100);
      process.stdout.write(`\r  Fetching cases: ${done}/${total} (${pct}%)  `);
      lastPrint = Date.now();
    }
  });
  console.log(`\n  Fetched ${cases.length} cases\n`);

  // Step 4: Upsert to DB
  console.log("  Upserting to database...");
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
          sourceEndpoint: "OE_case",
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
    } catch {
      errors++;
    }
  }

  console.log(`  Upserted: ${upserted}  Errors: ${errors}`);

  // Step 5: Link to heliports
  console.log("  Linking to heliports...");
  const linked = await prisma.$executeRawUnsafe(`
    UPDATE "OeaaaDetermination" d
    SET "linkedHeliportId" = sub.hid
    FROM (
      SELECT d2.id AS did, (
        SELECT h.id FROM "Heliport" h
        WHERE ABS(CAST(h.lat AS float) - CAST(d2.lat AS float)) < 0.008
          AND ABS(CAST(h.lng AS float) - CAST(d2.lng AS float)) < 0.008
        ORDER BY POWER(CAST(h.lat AS float) - CAST(d2.lat AS float), 2) +
                 POWER(CAST(h.lng AS float) - CAST(d2.lng AS float), 2)
        LIMIT 1
      ) AS hid
      FROM "OeaaaDetermination" d2
      WHERE d2."linkedHeliportId" IS NULL AND d2."caseType" = 'OE'
    ) sub
    WHERE d.id = sub.did AND sub.hid IS NOT NULL
  `);
  console.log(`  Linked ${linked} OE cases to heliports`);

  await printSummary();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("OE ingestion failed:", err);
  process.exit(1);
});
