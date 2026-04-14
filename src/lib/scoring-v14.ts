/**
 * AirIndex Scoring v1.4 — Weather Factor Refinement
 *
 * Implements the refined weather scoring methodology developed with Don Berchoff
 * (TruWeather, April 13 2026 call) and documented in the Technical Integration
 * Brief v2.
 *
 * Changes from v1.3:
 *   - Weather Infrastructure (10 pts) split into two 5-point sub-indicators:
 *     (1) ASOS Proximity — grid-based, uses FAA NPRM Part 108 5nm rule
 *     (2) Low-Altitude Sensing — driven by TruWeatherDeployment data
 *   - Grid-based rollup — averages per-site credit across all candidate
 *     sites in the metro (heliports + airports + pre-development facilities)
 *
 * This module is feature-flagged and does not replace v1.3. Call
 * calculateWeatherFactorV14(cityId) from any surface that wants to preview
 * v1.4 output. Once validated with Don, can be wired into the main scoring
 * engine behind a version flag.
 *
 * Integration path for going live:
 *   1. Ingest TruWeather deployment data via scripts/ingest-truweather-deployment.ts
 *   2. Validate v1.4 output against current live scores
 *   3. Flip the platform to v1.4 via a feature flag in scoring.ts
 *   4. Regenerate snapshots; alert subscribers for markets that change
 */

import { SCORE_WEIGHTS } from "@/lib/scoring";
import { createLogger } from "@/lib/logger";

const logger = createLogger("scoring-v14");

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export interface WeatherFactorV14 {
  asosProximityCredit: number;      // 0-5
  lowAltSensingCredit: number;      // 0-5
  weatherFactorTotal: number;       // 0-10 (capped)
  candidateSiteCount: number;
  deploymentCount: number;
  methodology: "v1.4";
  breakdown: {
    /** Fraction of sites within 5nm of a deployed TruWeather sensor (if any) */
    sensingCoverageRatio: number;
    /** Whether at least one "planned" deployment exists without any "deployed" */
    hasPlannedOnly: boolean;
  };
}

export interface CandidateSiteRow {
  lat: number;
  lng: number;
  class: "heliport" | "airport" | "pre_dev";
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

const EARTH_RADIUS_NM = 3440.065;
const KM_PER_NM = 1.852;

function haversineNm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_NM * Math.asin(Math.sqrt(a));
}

/**
 * Per-site ASOS proximity credit (0-5).
 * Called with a site's distance to the nearest ASOS station.
 */
function asosProximityCredit(distanceNm: number): number {
  if (distanceNm <= 5) return 5;
  if (distanceNm <= 10) return 2;
  return 0;
}

/**
 * Determines whether a given site falls within the coverage radius of any
 * deployed TruWeather sensor. Radius is the sensor's coverageRadiusKm
 * converted to nautical miles.
 */
function isSiteCoveredByDeployment(
  siteLat: number,
  siteLng: number,
  deployment: { lat: number | null; lng: number | null; coverageRadiusKm: number },
): boolean {
  if (deployment.lat == null || deployment.lng == null) {
    // Deployment without coordinates — assume market-wide coverage
    return true;
  }
  const distNm = haversineNm(siteLat, siteLng, deployment.lat, deployment.lng);
  const radiusNm = deployment.coverageRadiusKm / KM_PER_NM;
  return distNm <= radiusNm;
}

// ─────────────────────────────────────────────────────────
// Main API
// ─────────────────────────────────────────────────────────

/**
 * Compute the v1.4 weather factor for a single market.
 *
 * Inputs:
 *   - cityId: the AirIndex tracked market ID
 *   - candidateSites: list of {lat, lng, class} — all potential landing
 *     sites in the metro (heliports + airports + pre-dev facilities)
 *   - asosStations: list of {lat, lng} — reference ASOS locations
 *
 * Output: WeatherFactorV14 with sub-indicator breakdown and total.
 */
export async function calculateWeatherFactorV14(
  cityId: string,
  candidateSites: CandidateSiteRow[],
  asosStations: { lat: number; lng: number }[],
): Promise<WeatherFactorV14> {
  // ── Sub-indicator 1: ASOS Proximity (0-5) ──
  let asosCreditSum = 0;
  if (candidateSites.length > 0 && asosStations.length > 0) {
    for (const site of candidateSites) {
      let minDist = Infinity;
      for (const asos of asosStations) {
        const d = haversineNm(site.lat, site.lng, asos.lat, asos.lng);
        if (d < minDist) minDist = d;
      }
      asosCreditSum += asosProximityCredit(minDist);
    }
  }
  const asosProximityCreditAvg =
    candidateSites.length > 0 ? asosCreditSum / candidateSites.length : 0;

  // ── Sub-indicator 2: Low-Altitude Sensing (0-5) ──
  const prisma = await getPrisma();
  const deployments = await prisma.truWeatherDeployment.findMany({
    where: { marketId: cityId },
  });

  let lowAltCredit = 0;
  let sensingCoverageRatio = 0;
  let hasPlannedOnly = false;

  if (deployments.length > 0) {
    const deployed = deployments.filter((d) => d.status === "deployed");
    const planned = deployments.filter((d) => d.status === "planned");

    if (deployed.length > 0 && candidateSites.length > 0) {
      let coveredCount = 0;
      for (const site of candidateSites) {
        const covered = deployed.some((d) =>
          isSiteCoveredByDeployment(site.lat, site.lng, d),
        );
        if (covered) coveredCount++;
      }
      sensingCoverageRatio = coveredCount / candidateSites.length;
      lowAltCredit = sensingCoverageRatio * 5;
    } else if (planned.length > 0) {
      // Planned-only: partial credit (2/5) indicates forward momentum
      lowAltCredit = 2;
      hasPlannedOnly = true;
    }
  }

  // ── Roll up ──
  const asosCreditRounded = Math.round(asosProximityCreditAvg * 10) / 10;
  const lowAltCreditRounded = Math.round(lowAltCredit * 10) / 10;
  const weatherFactorTotal = Math.min(
    SCORE_WEIGHTS.weatherInfrastructure,
    Math.round(asosCreditRounded + lowAltCreditRounded),
  );

  logger.debug("v1.4 weather factor computed", {
    cityId,
    candidateSites: candidateSites.length,
    deployments: deployments.length,
    asos: asosCreditRounded,
    lowAlt: lowAltCreditRounded,
    total: weatherFactorTotal,
  });

  return {
    asosProximityCredit: asosCreditRounded,
    lowAltSensingCredit: lowAltCreditRounded,
    weatherFactorTotal,
    candidateSiteCount: candidateSites.length,
    deploymentCount: deployments.length,
    methodology: "v1.4",
    breakdown: {
      sensingCoverageRatio,
      hasPlannedOnly,
    },
  };
}

/**
 * Convenience: compute v1.4 weather factors for multiple markets in one call.
 * Takes a map of cityId → candidate sites.
 */
export async function calculateWeatherFactorV14Batch(
  sitesByMarket: Record<string, CandidateSiteRow[]>,
  asosStations: { lat: number; lng: number }[],
): Promise<Record<string, WeatherFactorV14>> {
  const results: Record<string, WeatherFactorV14> = {};
  for (const [cityId, sites] of Object.entries(sitesByMarket)) {
    results[cityId] = await calculateWeatherFactorV14(cityId, sites, asosStations);
  }
  return results;
}
