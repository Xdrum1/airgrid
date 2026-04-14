/**
 * TruWeather Deployment Map Ingestion
 *
 * Loads a TruWeather-provided deployment map into the TruWeatherDeployment
 * table, which the v1.4 scoring engine consumes to compute the Low-Altitude
 * Sensing sub-indicator per market.
 *
 * Expected input: JSON file with the following shape:
 *
 *   {
 *     "source": "TruWeather Q2 2026 Deployment Map",
 *     "sourceDate": "2026-04-15",
 *     "deployments": [
 *       {
 *         "marketId": "miami",
 *         "siteName": "Miami Executive (TMB) vertiport area",
 *         "lat": 25.6479,
 *         "lng": -80.4328,
 *         "status": "deployed",
 *         "deploymentDate": "2026-03-01",
 *         "sensorType": "V360",
 *         "coverageRadiusKm": 25,
 *         "altitudeMinFeet": 30,
 *         "altitudeMaxFeet": 2000,
 *         "notes": "Primary V360 unit covering MIA-FLL corridor and vertiport sites"
 *       },
 *       ...
 *     ]
 *   }
 *
 * Usage:
 *   npx tsx scripts/ingest-truweather-deployment.ts <path-to-json>
 *   npx tsx scripts/ingest-truweather-deployment.ts <path> --dry-run
 *   npx tsx scripts/ingest-truweather-deployment.ts <path> --replace  # wipe existing before ingest
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { CITIES } from "../src/data/seed";

const prisma = new PrismaClient();

interface DeploymentRecord {
  marketId: string;
  siteName?: string | null;
  lat?: number | null;
  lng?: number | null;
  status: "deployed" | "planned" | "none";
  deploymentDate?: string | null;
  sensorType: string;
  coverageRadiusKm: number;
  altitudeMinFeet: number;
  altitudeMaxFeet: number;
  notes?: string | null;
}

interface DeploymentMap {
  source: string;
  sourceDate: string;
  deployments: DeploymentRecord[];
}

function validate(map: DeploymentMap): string[] {
  const errors: string[] = [];
  if (!map.source) errors.push("Missing top-level field: source");
  if (!map.sourceDate) errors.push("Missing top-level field: sourceDate");
  if (!Array.isArray(map.deployments)) {
    errors.push("Missing or invalid deployments array");
    return errors;
  }

  const validMarkets = new Set(CITIES.map((c) => c.id));
  const validStatuses = new Set(["deployed", "planned", "none"]);

  map.deployments.forEach((d, i) => {
    const prefix = `deployments[${i}]`;
    if (!d.marketId) errors.push(`${prefix}: missing marketId`);
    else if (!validMarkets.has(d.marketId)) {
      errors.push(`${prefix}: marketId "${d.marketId}" is not a tracked AirIndex market`);
    }
    if (!d.status) errors.push(`${prefix}: missing status`);
    else if (!validStatuses.has(d.status)) {
      errors.push(`${prefix}: status must be one of deployed/planned/none, got "${d.status}"`);
    }
    if (d.status === "deployed" && !d.deploymentDate) {
      errors.push(`${prefix}: status=deployed requires deploymentDate`);
    }
    if (!d.sensorType) errors.push(`${prefix}: missing sensorType`);
    if (typeof d.coverageRadiusKm !== "number") errors.push(`${prefix}: coverageRadiusKm must be a number`);
    if (typeof d.altitudeMinFeet !== "number") errors.push(`${prefix}: altitudeMinFeet must be a number`);
    if (typeof d.altitudeMaxFeet !== "number") errors.push(`${prefix}: altitudeMaxFeet must be a number`);
  });

  return errors;
}

async function main() {
  const args = process.argv.slice(2);
  const filePath = args.find((a) => !a.startsWith("--"));
  const dryRun = args.includes("--dry-run");
  const replace = args.includes("--replace");

  if (!filePath) {
    console.error("Usage: npx tsx scripts/ingest-truweather-deployment.ts <path-to-json> [--dry-run] [--replace]");
    process.exit(1);
  }

  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);
  console.log(`Reading ${filePath}...`);

  let map: DeploymentMap;
  try {
    map = JSON.parse(readFileSync(filePath, "utf8"));
  } catch (err) {
    console.error("Failed to parse input file as JSON:", err);
    process.exit(1);
  }

  console.log(`\nSource: ${map.source}`);
  console.log(`Source date: ${map.sourceDate}`);
  console.log(`Deployments: ${map.deployments.length}\n`);

  const errors = validate(map);
  if (errors.length > 0) {
    console.error("Validation failed:");
    errors.forEach((e) => console.error(`  ✗ ${e}`));
    process.exit(1);
  }
  console.log("✓ Validation passed\n");

  // Summary by status
  const byStatus: Record<string, number> = {};
  const byMarket: Record<string, number> = {};
  for (const d of map.deployments) {
    byStatus[d.status] = (byStatus[d.status] ?? 0) + 1;
    byMarket[d.marketId] = (byMarket[d.marketId] ?? 0) + 1;
  }
  console.log("By status:");
  Object.entries(byStatus).forEach(([s, n]) => console.log(`  ${s}: ${n}`));
  console.log("\nBy market:");
  Object.entries(byMarket).forEach(([m, n]) => console.log(`  ${m}: ${n}`));

  if (dryRun) {
    console.log("\nDRY RUN — no database changes made.");
    await prisma.$disconnect();
    return;
  }

  if (replace) {
    const deleted = await prisma.truWeatherDeployment.deleteMany({});
    console.log(`\n[replace] Deleted ${deleted.count} existing records.`);
  }

  let inserted = 0;
  for (const d of map.deployments) {
    await prisma.truWeatherDeployment.create({
      data: {
        marketId: d.marketId,
        siteName: d.siteName ?? null,
        lat: d.lat ?? null,
        lng: d.lng ?? null,
        status: d.status,
        deploymentDate: d.deploymentDate ? new Date(d.deploymentDate) : null,
        sensorType: d.sensorType,
        coverageRadiusKm: d.coverageRadiusKm,
        altitudeMinFeet: d.altitudeMinFeet,
        altitudeMaxFeet: d.altitudeMaxFeet,
        notes: d.notes ?? null,
        source: map.source,
        sourceDate: new Date(map.sourceDate),
      },
    });
    inserted++;
  }

  console.log(`\n[ok] Inserted ${inserted} deployment records.`);

  // Final table state
  const totals = await prisma.truWeatherDeployment.groupBy({
    by: ["status"],
    _count: true,
  });
  console.log("\nTable state after ingest:");
  totals.forEach((t) => console.log(`  ${t.status}: ${t._count}`));

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
