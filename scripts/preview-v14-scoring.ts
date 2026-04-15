/**
 * v1.4 Scoring Preview — diff v1.3 weather factor vs v1.4 per-market.
 *
 * For each tracked market, computes:
 *   - Current v1.3 weather factor (0/5/10 based on weatherInfraLevel)
 *   - v1.4 weather factor broken into ASOS proximity (0-5) + low-alt sensing (0-5)
 *
 * Candidate sites sourced from Heliport (within metro bounds) + pre-dev
 * facilities. ASOS stations from src/data/asos-stations.
 *
 * Intended as the validation harness before flipping the v1.4 flag.
 * Run before and after ingesting TruWeather's deployment map so you can
 * see the marginal impact of the low-altitude sensing layer.
 *
 * Usage:
 *   npx tsx scripts/preview-v14-scoring.ts            # all markets
 *   npx tsx scripts/preview-v14-scoring.ts miami      # single market
 *   npx tsx scripts/preview-v14-scoring.ts --csv      # CSV output for analysis
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { CITIES } from "../src/data/seed";
import { calculateWeatherFactorV14, type CandidateSiteRow } from "../src/lib/scoring-v14";
import { ASOS_STATIONS, METRO_BOUNDS } from "../src/data/asos-stations";
import { PRE_DEVELOPMENT_FACILITIES } from "../src/data/pre-development-facilities";

const prisma = new PrismaClient();

const V13_WEIGHT: Record<string, number> = { full: 10, partial: 5, none: 0 };

async function getCandidateSitesForMarket(cityId: string): Promise<CandidateSiteRow[]> {
  const bounds = METRO_BOUNDS[cityId];
  if (!bounds) return [];

  const heliports = await prisma.heliport.findMany({
    where: {
      lat: { gte: bounds.minLat, lte: bounds.maxLat },
      lng: { gte: bounds.minLng, lte: bounds.maxLng },
      statusCode: "O",
    },
    select: { lat: true, lng: true },
  });

  const preDev = PRE_DEVELOPMENT_FACILITIES.filter((f) => f.marketId === cityId).map(
    (f) => ({ lat: f.lat, lng: f.lng, class: "pre_dev" as const }),
  );

  return [
    ...heliports.map((h) => ({ lat: h.lat, lng: h.lng, class: "heliport" as const })),
    ...preDev,
  ];
}

async function main() {
  const args = process.argv.slice(2);
  const csvMode = args.includes("--csv");
  const cityFilter = args.find((a) => !a.startsWith("--"));
  const targets = cityFilter
    ? CITIES.filter((c) => c.id === cityFilter)
    : CITIES;

  if (targets.length === 0) {
    console.error(`City not found: ${cityFilter}`);
    process.exit(1);
  }

  if (csvMode) {
    console.log(
      "cityId,v13_weather,v14_weather,v14_asos,v14_lowalt,delta,sites,deployments,coverage_ratio,planned_only",
    );
  } else {
    console.log("v1.4 Scoring Preview\n====================\n");
  }

  for (const city of targets) {
    const sites = await getCandidateSitesForMarket(city.id);
    const v14 = await calculateWeatherFactorV14(city.id, sites, ASOS_STATIONS);

    // v1.3 weather factor from current seed
    const v13Level = city.weatherInfraLevel ?? "none";
    const v13Weather = V13_WEIGHT[v13Level] ?? 0;
    const delta = v14.weatherFactorTotal - v13Weather;

    if (csvMode) {
      console.log(
        [
          city.id,
          v13Weather,
          v14.weatherFactorTotal,
          v14.asosProximityCredit,
          v14.lowAltSensingCredit,
          delta >= 0 ? `+${delta}` : String(delta),
          v14.candidateSiteCount,
          v14.deploymentCount,
          v14.breakdown.sensingCoverageRatio.toFixed(2),
          v14.breakdown.hasPlannedOnly,
        ].join(","),
      );
    } else {
      const deltaTag =
        delta === 0 ? "   =0" : delta > 0 ? `  +${delta}` : `  ${delta}`;
      console.log(
        `${city.id.padEnd(18)} v1.3=${String(v13Weather).padStart(2)}/10  →  v1.4=${String(v14.weatherFactorTotal).padStart(2)}/10 (ASOS ${v14.asosProximityCredit}/5 · Low-alt ${v14.lowAltSensingCredit}/5)${deltaTag}  [${v14.candidateSiteCount} sites, ${v14.deploymentCount} deployments]`,
      );
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
