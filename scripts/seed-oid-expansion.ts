/**
 * OID Expansion — adds the 6 operators missing from the initial seed.
 *
 * Original spec: 11 operators. Initial seed populated 5 (Joby, Archer, Wisk,
 * Volocopter, Blade). This adds the remaining 6:
 *
 *   - Beta Technologies (ALIA)
 *   - Lilium (Lilium Jet) — bankruptcy reorganization 2024
 *   - Vertical Aerospace (VX4)
 *   - Eve Air Mobility (Eve eVTOL — Embraer subsidiary)
 *   - EHang (EH216-S — type certified in China)
 *   - Supernal (Hyundai eVTOL division)
 *
 * Each operator gets:
 *   - Core record (entity, vehicle type, HQ, founded, ticker if public)
 *   - Initial market presence rows (where they have announced or are operating)
 *   - Key certifications (FAA Part 135, type cert progress)
 *   - Financing rounds (most recent)
 *   - Vertiport commitments (announced sites)
 *   - Major events (recent 12 months)
 *
 * Idempotent: skips operators that already exist by name.
 *
 * Usage:
 *   npx tsx scripts/seed-oid-expansion.ts --dry-run
 *   npx tsx scripts/seed-oid-expansion.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

interface OperatorSpec {
  name: string;
  shortName: string;
  ticker?: string;
  cik?: string;
  entityType: "MANUFACTURER" | "OPERATOR" | "OPERATOR_MANUFACTURER" | "INFRASTRUCTURE";
  vehicleType?: string;
  hqCity?: string;
  hqCountry?: string;
  foundedYear?: number;
  website?: string;
  isActive: boolean;
  inactiveReason?: string;

  marketPresence?: Array<{
    cityId: string;
    deploymentStage: string;
    stageScore: number;
    stageSetAt: string;
    confidence: "HIGH" | "MEDIUM" | "LOW";
    notes?: string;
    routeAnnounced?: boolean;
    vertiportCommitted?: boolean;
  }>;

  certifications?: Array<{
    certType: string;
    issuingAuthority: string;
    cityId?: string;
    issuedDate?: string;
    notes?: string;
  }>;

  financing?: Array<{
    roundType: string;
    amountUsd?: number;
    announcedDate: string;
    leadInvestor?: string;
    notableInvestors?: string[];
    sourceName: string;
    notes?: string;
  }>;

  vertiportCommitments?: Array<{
    cityId: string;
    commitmentType: string;
    siteName?: string;
    partnerName?: string;
    announcedDate: string;
    notes?: string;
  }>;

  events?: Array<{
    cityId?: string;
    eventType: string;
    eventDate: string;
    headline: string;
    sourceName: string;
    sourceReliability: number;
    stageImplication?: string;
    stageImplicationConfidence?: "HIGH" | "MEDIUM" | "LOW";
  }>;
}

// ════════════════════════════════════════════════════════════
// 6 operator specs
// ════════════════════════════════════════════════════════════

const OPERATORS: OperatorSpec[] = [
  {
    name: "Beta Technologies, Inc.",
    shortName: "Beta",
    entityType: "MANUFACTURER",
    vehicleType: "eVTOL",
    hqCity: "Burlington, VT",
    foundedYear: 2017,
    website: "https://www.beta.team",
    isActive: true,
    certifications: [
      { certType: "FAA_TYPE_CERT", issuingAuthority: "FAA", notes: "ALIA-250 type certification in progress; CX300 (eCTOL variant) flying" },
      { certType: "FAA_PART135", issuingAuthority: "FAA", notes: "Part 135 air carrier certificate granted 2024" },
    ],
    financing: [
      { roundType: "SERIES_C", amountUsd: 318000000, announcedDate: "2024-12-10", leadInvestor: "QIA / TPG Rise Climate", sourceName: "Beta press release" },
      { roundType: "STRATEGIC", amountUsd: 165000000, announcedDate: "2025-08-22", leadInvestor: "United Therapeutics", sourceName: "WSJ", notes: "Strategic for organ transport applications" },
    ],
    events: [
      { cityType: undefined as any, eventType: "TYPE_CERTIFICATION_PROGRESS", eventDate: "2025-09-15", headline: "Beta ALIA-250 advances to fatigue testing phase with FAA", sourceName: "FlightGlobal", sourceReliability: 4 },
      { eventType: "INFRASTRUCTURE_OPENED", eventDate: "2024-08-20", headline: "Beta opens fast-charging network spanning East Coast corridor", sourceName: "Beta press release", sourceReliability: 5 },
    ] as any,
  },

  {
    name: "Lilium GmbH",
    shortName: "Lilium",
    ticker: "LILMQ",
    entityType: "MANUFACTURER",
    vehicleType: "eVTOL",
    hqCity: "Munich, Germany",
    hqCountry: "DE",
    foundedYear: 2015,
    website: "https://lilium.com",
    isActive: false,
    inactiveReason: "Filed for insolvency October 2024; reorganization continues under new ownership consortium 2025",
    financing: [
      { roundType: "DEBT", amountUsd: 200000000, announcedDate: "2025-02-15", leadInvestor: "Mobile Uplift Corporation (consortium)", sourceName: "Reuters", notes: "Restart financing post-insolvency" },
    ],
    events: [
      { eventType: "BANKRUPTCY_FILING", eventDate: "2024-10-24", headline: "Lilium files for insolvency in German court", sourceName: "Bloomberg", sourceReliability: 5, stageImplication: "EXITED", stageImplicationConfidence: "HIGH" },
      { eventType: "RESTRUCTURING", eventDate: "2025-02-15", headline: "Lilium acquired out of insolvency by Mobile Uplift consortium", sourceName: "Reuters", sourceReliability: 5 },
    ],
  },

  {
    name: "Vertical Aerospace Group Ltd",
    shortName: "Vertical",
    ticker: "EVTL",
    entityType: "MANUFACTURER",
    vehicleType: "eVTOL",
    hqCity: "Bristol, UK",
    hqCountry: "GB",
    foundedYear: 2016,
    website: "https://vertical-aerospace.com",
    isActive: true,
    certifications: [
      { certType: "FAA_TYPE_CERT", issuingAuthority: "FAA", notes: "VX4 dual EASA/FAA certification campaign — currently in piloted flight testing" },
    ],
    financing: [
      { roundType: "STRATEGIC", amountUsd: 75000000, announcedDate: "2024-12-30", leadInvestor: "Mudrick Capital", sourceName: "FT", notes: "Capital infusion via convertible notes restructuring" },
    ],
    marketPresence: [
      { cityId: "miami", deploymentStage: "ANNOUNCED", stageScore: 5, stageSetAt: "2025-11-20", confidence: "MEDIUM", notes: "South Florida network announced via UrbanV/Signature Aviation JV partnership; covers Miami, Fort Lauderdale, Palm Beach", routeAnnounced: true },
    ],
    vertiportCommitments: [
      { cityId: "miami", commitmentType: "PARTNERSHIP", siteName: "South Florida UrbanV network", partnerName: "UrbanV / Signature Aviation / Skyports / Vertiports by Atlantic Aviation", announcedDate: "2025-11-20", notes: "Announced South Florida network covering 3 metros" },
    ],
    events: [
      { cityId: "miami", eventType: "MARKET_ANNOUNCEMENT", eventDate: "2025-11-20", headline: "Vertical Aerospace announces South Florida AAM network with UrbanV/Skyports partnership", sourceName: "Vertical press release", sourceReliability: 5, stageImplication: "ANNOUNCED", stageImplicationConfidence: "HIGH" },
      { eventType: "FLIGHT_TEST_MILESTONE", eventDate: "2024-08-15", headline: "Vertical VX4 completes piloted thrust-borne flight", sourceName: "FlightGlobal", sourceReliability: 5 },
    ],
  },

  {
    name: "Eve Air Mobility",
    shortName: "Eve",
    ticker: "EVEX",
    entityType: "MANUFACTURER",
    vehicleType: "eVTOL",
    hqCity: "Melbourne, FL",
    foundedYear: 2020,
    website: "https://www.eveairmobility.com",
    isActive: true,
    certifications: [
      { certType: "FAA_TYPE_CERT", issuingAuthority: "ANAC + FAA", notes: "Embraer-backed; dual ANAC (Brazil) and FAA certification campaign targeting 2027" },
    ],
    financing: [
      { roundType: "STRATEGIC", amountUsd: 94000000, announcedDate: "2024-04-04", leadInvestor: "Embraer", sourceName: "Eve press release", notes: "Embraer parent company financing extension" },
    ],
    marketPresence: [
      { cityId: "miami", deploymentStage: "ANNOUNCED", stageScore: 5, stageSetAt: "2023-03-01", confidence: "HIGH", notes: "Miami CONOPS published 2023 with Skyports, L3Harris, CAMI consortium; Phase 1 projection 7 vertiports by 2026", routeAnnounced: true },
    ],
    vertiportCommitments: [
      { cityId: "miami", commitmentType: "PARTNERSHIP", siteName: "Miami-Dade Phase 1 CONOPS", partnerName: "Skyports / L3Harris / CAMI", announcedDate: "2023-03-01", notes: "Industry-led CONOPS published; 7-32 vertiports projected over time" },
    ],
    events: [
      { cityId: "miami", eventType: "CONOPS_PUBLISHED", eventDate: "2023-03-01", headline: "Eve publishes Miami eVTOL Concept of Operations with Skyports + L3Harris", sourceName: "Eve press release", sourceReliability: 5 },
    ],
  },

  {
    name: "EHang Holdings Limited",
    shortName: "EHang",
    ticker: "EH",
    cik: "0001738758",
    entityType: "OPERATOR_MANUFACTURER",
    vehicleType: "eVTOL",
    hqCity: "Guangzhou, China",
    hqCountry: "CN",
    foundedYear: 2014,
    website: "https://www.ehang.com",
    isActive: true,
    certifications: [
      { certType: "OTHER", issuingAuthority: "CAAC (China)", issuedDate: "2023-10-13", notes: "EH216-S type certified by CAAC — first autonomous passenger eVTOL type cert globally" },
    ],
    financing: [
      { roundType: "STRATEGIC", amountUsd: 23000000, announcedDate: "2024-12-05", leadInvestor: "Hefei Government Investment Group", sourceName: "EHang Q4 release", notes: "Chinese municipal AAM corridor partnership financing" },
    ],
    events: [
      { eventType: "TYPE_CERTIFICATION_GRANTED", eventDate: "2023-10-13", headline: "EHang EH216-S receives CAAC type certification — first autonomous passenger eVTOL globally", sourceName: "CAAC", sourceReliability: 5, stageImplication: "CERTIFIED", stageImplicationConfidence: "HIGH" },
      { eventType: "COMMERCIAL_LAUNCH", eventDate: "2024-04-07", headline: "EHang receives Air Operator Certificate from CAAC for autonomous passenger flights", sourceName: "EHang press release", sourceReliability: 5 },
    ],
  },

  {
    name: "Supernal LLC",
    shortName: "Supernal",
    entityType: "MANUFACTURER",
    vehicleType: "eVTOL",
    hqCity: "Washington, DC",
    foundedYear: 2020,
    website: "https://supernal.aero",
    isActive: true,
    inactiveReason: undefined,
    certifications: [
      { certType: "FAA_TYPE_CERT", issuingAuthority: "FAA", notes: "S-A2 vehicle disclosed at CES 2024; type certification campaign targeting 2028 commercial entry" },
    ],
    financing: [
      { roundType: "STRATEGIC", amountUsd: 50000000, announcedDate: "2024-09-15", leadInvestor: "Hyundai Motor Group", sourceName: "Hyundai press release", notes: "Hyundai parent capital allocation" },
    ],
    marketPresence: [
      { cityId: "los_angeles", deploymentStage: "ANNOUNCED", stageScore: 5, stageSetAt: "2024-09-10", confidence: "MEDIUM", notes: "LA28 Olympics partnership announced with LA28 organizing committee" },
    ],
    vertiportCommitments: [
      { cityId: "los_angeles", commitmentType: "MOU", siteName: "LA28 Olympics partnership", partnerName: "LA28 Organizing Committee", announcedDate: "2024-09-10", notes: "Targeting Olympics demonstrations" },
    ],
    events: [
      { eventType: "VEHICLE_REVEAL", eventDate: "2024-01-09", headline: "Supernal reveals S-A2 production-intent eVTOL at CES 2024", sourceName: "Hyundai / Supernal", sourceReliability: 5 },
      { cityId: "los_angeles", eventType: "MARKET_ANNOUNCEMENT", eventDate: "2024-09-10", headline: "Supernal announces LA28 Olympics partnership for eVTOL demonstrations", sourceName: "Supernal press release", sourceReliability: 5, stageImplication: "ANNOUNCED", stageImplicationConfidence: "MEDIUM" },
    ],
  },
];

// ════════════════════════════════════════════════════════════
// Main
// ════════════════════════════════════════════════════════════

async function main() {
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

  let createdOps = 0;
  let skippedOps = 0;
  let createdMP = 0;
  let createdCerts = 0;
  let createdFin = 0;
  let createdVC = 0;
  let createdEv = 0;

  for (const spec of OPERATORS) {
    const existing = await prisma.oidOperator.findFirst({ where: { name: spec.name } });
    if (existing) {
      console.log(`[skip] ${spec.shortName} — already exists`);
      skippedOps++;
      continue;
    }

    if (dryRun) {
      console.log(`[would create] ${spec.shortName} — ${spec.entityType} — ${spec.hqCity ?? "—"}`);
      console.log(`               ${spec.marketPresence?.length ?? 0} market presence, ${spec.certifications?.length ?? 0} certs, ${spec.financing?.length ?? 0} rounds, ${spec.vertiportCommitments?.length ?? 0} commitments, ${spec.events?.length ?? 0} events`);
      createdOps++;
      continue;
    }

    const operator = await prisma.oidOperator.create({
      data: {
        name: spec.name,
        shortName: spec.shortName,
        ticker: spec.ticker,
        cik: spec.cik,
        entityType: spec.entityType,
        vehicleType: spec.vehicleType,
        hqCity: spec.hqCity,
        hqCountry: spec.hqCountry ?? "US",
        foundedYear: spec.foundedYear,
        website: spec.website,
        isActive: spec.isActive,
        inactiveReason: spec.inactiveReason,
      },
    });
    console.log(`[ok]   ${spec.shortName} (${operator.id})`);
    createdOps++;

    for (const mp of spec.marketPresence ?? []) {
      await prisma.oidOperatorMarketPresence.create({
        data: {
          operatorId: operator.id,
          cityId: mp.cityId,
          deploymentStage: mp.deploymentStage,
          stageScore: mp.stageScore,
          stageSetAt: new Date(mp.stageSetAt),
          stageSetBy: "ANALYST",
          confidence: mp.confidence,
          notes: mp.notes,
          routeAnnounced: mp.routeAnnounced ?? false,
          vertiportCommitted: mp.vertiportCommitted ?? false,
        },
      });
      createdMP++;
    }
    for (const c of spec.certifications ?? []) {
      await prisma.oidOperatorCertification.create({
        data: {
          operatorId: operator.id,
          certType: c.certType,
          issuingAuthority: c.issuingAuthority,
          cityId: c.cityId,
          issuedDate: c.issuedDate ? new Date(c.issuedDate) : null,
          notes: c.notes,
        },
      });
      createdCerts++;
    }
    for (const f of spec.financing ?? []) {
      await prisma.oidOperatorFinancing.create({
        data: {
          operatorId: operator.id,
          roundType: f.roundType,
          amountUsd: f.amountUsd,
          announcedDate: new Date(f.announcedDate),
          leadInvestor: f.leadInvestor,
          notableInvestors: f.notableInvestors ?? [],
          sourceName: f.sourceName,
          notes: f.notes,
        },
      });
      createdFin++;
    }
    for (const v of spec.vertiportCommitments ?? []) {
      await prisma.oidVertiportCommitment.create({
        data: {
          operatorId: operator.id,
          cityId: v.cityId,
          commitmentType: v.commitmentType,
          siteName: v.siteName,
          partnerName: v.partnerName,
          announcedDate: new Date(v.announcedDate),
          notes: v.notes,
        },
      });
      createdVC++;
    }
    for (const e of spec.events ?? []) {
      await prisma.oidOperatorEvent.create({
        data: {
          operatorId: operator.id,
          cityId: (e as any).cityId,
          eventType: e.eventType,
          eventDate: new Date(e.eventDate),
          headline: e.headline,
          sourceName: e.sourceName,
          sourceReliability: e.sourceReliability,
          stageImplication: e.stageImplication,
          stageImplicationConfidence: e.stageImplicationConfidence,
        },
      });
      createdEv++;
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Operators created: ${createdOps}, skipped: ${skippedOps}`);
  if (!dryRun) {
    console.log(`Market presence: ${createdMP}`);
    console.log(`Certifications: ${createdCerts}`);
    console.log(`Financing rounds: ${createdFin}`);
    console.log(`Vertiport commitments: ${createdVC}`);
    console.log(`Events: ${createdEv}`);
    console.log("\n=== OID totals after seed ===");
    console.log("Operators:", await prisma.oidOperator.count());
    console.log("Market presence:", await prisma.oidOperatorMarketPresence.count());
    console.log("Certifications:", await prisma.oidOperatorCertification.count());
    console.log("Financing:", await prisma.oidOperatorFinancing.count());
    console.log("Vertiport commitments:", await prisma.oidVertiportCommitment.count());
    console.log("Events:", await prisma.oidOperatorEvent.count());
  }

  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
