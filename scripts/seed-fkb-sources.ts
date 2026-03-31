/**
 * FKB Phase 3 — Seed Source Registry
 *
 * Every data source feeding into AirIndex scores, with reliability
 * ratings, update frequency, and factor mappings.
 *
 * Usage:
 *   npx tsx scripts/seed-fkb-sources.ts
 *   npx tsx scripts/seed-fkb-sources.ts --dry-run
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────
// Source Registry
//
// Reliability: 5=federal official, 4=state official,
//   3=industry/trade, 2=operator/corporate, 1=press/social
// ─────────────────────────────────────────────────────────

interface SourceDef {
  sourceName: string;
  sourceType: string;
  baseUrl: string;
  apiEndpoint?: string;
  reliabilityScore: number;
  updateFrequency: string;
  notes?: string;
  factors: string[]; // Factor codes this source feeds
}

const SOURCES: SourceDef[] = [
  // ── Federal Official (5) ──
  {
    sourceName: "Federal Register API",
    sourceType: "API",
    baseUrl: "https://www.federalregister.gov",
    apiEndpoint: "https://www.federalregister.gov/api/v1/documents",
    reliabilityScore: 5,
    updateFrequency: "DAILY",
    notes: "Final rules, NOPRs, advisory circulars. Filtered to FAA/DOT agencies. 730-day backfill completed Mar 2026.",
    factors: ["REG", "LEG", "VRT", "PLT"],
  },
  {
    sourceName: "Congress.gov API",
    sourceType: "API",
    baseUrl: "https://api.congress.gov",
    apiEndpoint: "https://api.congress.gov/v3",
    reliabilityScore: 5,
    updateFrequency: "DAILY",
    notes: "Curated bill tracking — 8+ AAM-relevant bills. Bill status, cosponsors, committee actions. Free API key required.",
    factors: ["LEG", "REG"],
  },
  {
    sourceName: "Regulations.gov API",
    sourceType: "API",
    baseUrl: "https://www.regulations.gov",
    apiEndpoint: "https://api.regulations.gov/v4",
    reliabilityScore: 5,
    updateFrequency: "DAILY",
    notes: "FAA dockets — proposed rules, NOPRs, public comment periods. Catches rulemaking 6-12 months before Federal Register publication.",
    factors: ["REG"],
  },
  {
    sourceName: "FAA NASR 5010 (Heliports)",
    sourceType: "API",
    baseUrl: "https://nfdc.faa.gov",
    apiEndpoint: "https://nfdc.faa.gov/nfdcApps/services/ajv5/facilitySearch.jsp",
    reliabilityScore: 5,
    updateFrequency: "MONTHLY",
    notes: "5,647 FAA-registered heliports. Facility-level data: coordinates, elevation, ownership, use type. Full ingestion completed Mar 25, 2026.",
    factors: ["VRT"],
  },
  {
    sourceName: "FAA DroneZone / LAANC",
    sourceType: "API",
    baseUrl: "https://faadronezone.faa.gov",
    reliabilityScore: 5,
    updateFrequency: "MONTHLY",
    notes: "LAANC facility maps and UAS authorization data. Used for historical LNC factor (retired v1.3). Still monitored for REG signals.",
    factors: ["REG"],
  },

  // ── State Official (4) ──
  {
    sourceName: "LegiScan API",
    sourceType: "API",
    baseUrl: "https://legiscan.com",
    apiEndpoint: "https://api.legiscan.com",
    reliabilityScore: 4,
    updateFrequency: "DAILY",
    notes: "All 50 states. Bill text, sponsor, status, amendment history. Push API notifies on status changes. Primary source for LEG factor.",
    factors: ["LEG", "ZON"],
  },
  {
    sourceName: "State Legislature Websites",
    sourceType: "SCRAPE",
    baseUrl: "Various",
    reliabilityScore: 4,
    updateFrequency: "WEEKLY",
    notes: "Direct verification of bill status when LegiScan data is delayed. Manual spot-check for critical bills (e.g., AZ SB1826/SB1827).",
    factors: ["LEG"],
  },
  {
    sourceName: "State Governor Press Offices",
    sourceType: "RSS",
    baseUrl: "Various",
    reliabilityScore: 4,
    updateFrequency: "ON_EVENT",
    notes: "Executive orders, bill signings, AAM-related proclamations. RSS feeds for 21 scored market states. Lower volume — manual review acceptable.",
    factors: ["LEG", "REG"],
  },

  // ── Industry / Trade (3) ──
  {
    sourceName: "Aviation Week Network",
    sourceType: "RSS",
    baseUrl: "https://aviationweek.com",
    reliabilityScore: 3,
    updateFrequency: "DAILY",
    notes: "Trade publication — AAM/eVTOL coverage. Operator announcements, certification milestones, route plans.",
    factors: ["OPR", "PLT"],
  },
  {
    sourceName: "The Air Current",
    sourceType: "RSS",
    baseUrl: "https://theaircurrent.com",
    reliabilityScore: 3,
    updateFrequency: "DAILY",
    notes: "Aviation industry analysis. Strong on FAA certification and regulatory developments.",
    factors: ["OPR", "REG"],
  },
  {
    sourceName: "Vertical Flight Society (VFS)",
    sourceType: "MANUAL",
    baseUrl: "https://vtol.org",
    reliabilityScore: 3,
    updateFrequency: "MONTHLY",
    notes: "Industry body — conference proceedings, infrastructure reports, forum papers. Rex Alexander is VFS Infrastructure Advisor.",
    factors: ["VRT", "REG", "PLT"],
  },
  {
    sourceName: "NCSL Aviation Policy Tracker",
    sourceType: "SCRAPE",
    baseUrl: "https://www.ncsl.org",
    reliabilityScore: 3,
    updateFrequency: "MONTHLY",
    notes: "National Conference of State Legislatures — tracks aviation and drone bills across all 50 states. Supplements LegiScan.",
    factors: ["LEG"],
  },

  // ── Operator / Corporate (2) ──
  {
    sourceName: "SEC EDGAR",
    sourceType: "API",
    baseUrl: "https://www.sec.gov/cgi-bin/browse-edgar",
    apiEndpoint: "https://efts.sec.gov/LATEST/search-index",
    reliabilityScore: 2,
    updateFrequency: "DAILY",
    notes: "10-K, 10-Q, 8-K filings from public operators (Joby, Archer). Market commitments, route announcements, partnership disclosures.",
    factors: ["OPR"],
  },
  {
    sourceName: "Operator Press Releases",
    sourceType: "RSS",
    baseUrl: "Various",
    reliabilityScore: 2,
    updateFrequency: "DAILY",
    notes: "Joby, Archer, Wisk, Lilium investor relations and newsrooms. Primary OPR signal source. Classification pipeline ingests via Google News API.",
    factors: ["OPR", "PLT", "VRT"],
  },
  {
    sourceName: "Vertiport Developer Filings",
    sourceType: "MANUAL",
    baseUrl: "Various",
    reliabilityScore: 2,
    updateFrequency: "ON_EVENT",
    notes: "Skyports, Urban-Air Port, Ferrovial investor relations. SPAC docs, deployment announcements, city partnership MOUs.",
    factors: ["VRT"],
  },

  // ── Municipal / Local (3-4) ──
  {
    sourceName: "Municipal Zoning Records",
    sourceType: "MANUAL",
    baseUrl: "Various",
    reliabilityScore: 4,
    updateFrequency: "ON_EVENT",
    notes: "City council minutes, zoning board decisions, planning commission records. Primary ZON source. Manual review — no API available for most cities.",
    factors: ["ZON"],
  },
  {
    sourceName: "City/County Planning Departments",
    sourceType: "SCRAPE",
    baseUrl: "Various",
    reliabilityScore: 4,
    updateFrequency: "MONTHLY",
    notes: "Municode API for zoning code text search. Direct scrape of city planning department FAQs and development applications.",
    factors: ["ZON", "VRT"],
  },

  // ── Weather / Infrastructure (3-4) ──
  {
    sourceName: "FAA ASOS/AWOS Station Registry",
    sourceType: "API",
    baseUrl: "https://www.faa.gov",
    reliabilityScore: 5,
    updateFrequency: "MONTHLY",
    notes: "Airport weather station registry. Basis for WTH 'partial' scoring — standard airport coverage without dedicated low-altitude sensing.",
    factors: ["WTH"],
  },
  {
    sourceName: "TruWeather Solutions (Planned)",
    sourceType: "API",
    baseUrl: "https://truweathersolutions.com",
    reliabilityScore: 4,
    updateFrequency: "DAILY",
    notes: "PLANNED — eIPP deployment maps, low-altitude weather sensing coverage data. Will upgrade WTH factor from internal assessment to external provider data. Don Berchoff, CEO. Partnership in discussion.",
    factors: ["WTH"],
  },

  // ── Demand / Census (3) ──
  {
    sourceName: "US Census Bureau",
    sourceType: "API",
    baseUrl: "https://data.census.gov",
    reliabilityScore: 5,
    updateFrequency: "MONTHLY",
    notes: "Population density, metro area demographics. Feeds MKT (Market Demand Signals) factor in FKB spec.",
    factors: ["OPR"],
  },
  {
    sourceName: "FAA ACAIS (Airport Activity)",
    sourceType: "API",
    baseUrl: "https://www.faa.gov/airports/planning_capacity",
    reliabilityScore: 5,
    updateFrequency: "MONTHLY",
    notes: "Airport enplanement statistics. Business aviation operations proxy for UAM demand potential.",
    factors: ["OPR"],
  },
];

// ─────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────

async function main() {
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

  // Look up factor IDs
  const factors = await prisma.fkbFactor.findMany({ select: { id: true, code: true } });
  const factorMap = new Map(factors.map((f) => [f.code, f.id]));

  console.log("═══ FKB Source Registry ═══\n");

  let created = 0;
  for (const s of SOURCES) {
    // Create one source entry per factor it feeds
    for (const factorCode of s.factors) {
      const factorId = factorMap.get(factorCode);
      if (!factorId) {
        console.error(`  ✗ Factor code ${factorCode} not found!`);
        continue;
      }

      if (dryRun) {
        console.log(`  [dry] ${s.sourceName} → ${factorCode} (reliability: ${s.reliabilityScore}, freq: ${s.updateFrequency})`);
      } else {
        // Check for existing
        const existing = await prisma.fkbFactorSource.findFirst({
          where: { factorId, sourceName: s.sourceName },
        });

        if (existing) {
          console.log(`  ○ ${s.sourceName} → ${factorCode} (already exists)`);
        } else {
          await prisma.fkbFactorSource.create({
            data: {
              factorId,
              sourceName: s.sourceName,
              sourceType: s.sourceType,
              baseUrl: s.baseUrl,
              apiEndpoint: s.apiEndpoint ?? null,
              reliabilityScore: s.reliabilityScore,
              updateFrequency: s.updateFrequency,
              notes: s.notes ?? null,
            },
          });
          console.log(`  ✓ ${s.sourceName} → ${factorCode} (reliability: ${s.reliabilityScore})`);
          created++;
        }
      }
    }
  }

  console.log(`\n${created} source entries created.\n`);

  // ── Summary ──
  console.log("═══ Sources by Factor ═══");
  for (const [code] of factorMap) {
    const count = SOURCES.filter(s => s.factors.includes(code)).length;
    const avgReliability = SOURCES.filter(s => s.factors.includes(code))
      .reduce((sum, s) => sum + s.reliabilityScore, 0) / Math.max(count, 1);
    console.log(`  ${code}: ${count} sources (avg reliability: ${avgReliability.toFixed(1)})`);
  }

  console.log("\n═══ Sources by Reliability ═══");
  for (let r = 5; r >= 1; r--) {
    const label = r === 5 ? "Federal Official" : r === 4 ? "State Official" : r === 3 ? "Industry/Trade" : r === 2 ? "Operator/Corporate" : "Press/Social";
    const sources = SOURCES.filter(s => s.reliabilityScore === r);
    console.log(`  ${r} (${label}): ${sources.length} sources`);
  }
}

main()
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
