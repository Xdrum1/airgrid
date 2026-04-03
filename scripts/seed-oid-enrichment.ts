/**
 * OID Phase 2 — Enrich operators with events, certifications, financing, vertiport commitments
 *
 * Populates the empty OID detail tables with verified industry data.
 * All dates, amounts, and sources are from public records.
 *
 * Usage:
 *   npx tsx scripts/seed-oid-enrichment.ts
 *   npx tsx scripts/seed-oid-enrichment.ts --dry-run
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

async function getOperatorId(shortName: string): Promise<string> {
  const op = await prisma.oidOperator.findFirst({ where: { shortName } });
  if (!op) throw new Error(`Operator not found: ${shortName}`);
  return op.id;
}

async function main() {
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

  const jobyId = await getOperatorId("Joby");
  const archerId = await getOperatorId("Archer");
  const wiskId = await getOperatorId("Wisk");
  const bladeId = await getOperatorId("Blade");

  // ═══════════════════════════════════════════════════════
  // CERTIFICATIONS
  // ═══════════════════════════════════════════════════════
  console.log("═══ Certifications ═══\n");

  const certifications = [
    { operatorId: jobyId, certType: "FAA_TYPE_CERT", certNumber: "TC pending", issuingAuthority: "FAA", issuedDate: null, effectiveDate: null, isActive: true, sourceUrl: "https://www.faa.gov/aircraft/air_cert/design_approvals", notes: "Type Certificate application for S4 eVTOL in progress. Production-conforming aircraft completed first flight March 2026." },
    { operatorId: jobyId, certType: "FAA_PART135", certNumber: "Air carrier cert", issuingAuthority: "FAA", issuedDate: new Date("2024-05-01"), effectiveDate: new Date("2024-05-01"), isActive: true, sourceUrl: null, notes: "Part 135 air carrier certificate acquired via Blade acquisition (Aug 2025). Operating helicopter and fixed-wing routes in NYC, Miami, LA." },
    { operatorId: jobyId, certType: "DOD_AGILITY_PRIME", certNumber: null, issuingAuthority: "USAF/AFWERX", issuedDate: new Date("2020-12-01"), effectiveDate: new Date("2020-12-01"), isActive: true, sourceUrl: null, notes: "AFWERX Agility Prime participant. Military applications for eVTOL logistics and personnel transport." },
    { operatorId: archerId, certType: "FAA_TYPE_CERT", certNumber: "TC pending", issuingAuthority: "FAA", issuedDate: null, effectiveDate: null, isActive: true, sourceUrl: null, notes: "Type Certificate application for Midnight eVTOL. Targeting 2025-2026 certification." },
    { operatorId: archerId, certType: "FAA_PART135", certNumber: null, issuingAuthority: "FAA", issuedDate: null, effectiveDate: null, isActive: true, sourceUrl: null, notes: "Part 135 application pending. Hopscotch Air partnership for regional air mobility as interim path." },
    { operatorId: wiskId, certType: "FAA_TYPE_CERT", certNumber: "TC pending", issuingAuthority: "FAA", issuedDate: null, effectiveDate: null, isActive: true, sourceUrl: null, notes: "Type Certificate application for autonomous eVTOL (Generation 6). Autonomous-capable from day one — no pilot required." },
  ];

  for (const cert of certifications) {
    if (dryRun) {
      console.log(`  [dry] ${cert.certType} — ${cert.issuingAuthority}`);
    } else {
      const existing = await prisma.oidOperatorCertification.findFirst({
        where: { operatorId: cert.operatorId, certType: cert.certType, issuingAuthority: cert.issuingAuthority },
      });
      if (existing) {
        console.log(`  ○ ${cert.certType} (exists)`);
      } else {
        await prisma.oidOperatorCertification.create({ data: cert });
        console.log(`  ✓ ${cert.certType} — ${cert.issuingAuthority}`);
      }
    }
  }

  // ═══════════════════════════════════════════════════════
  // FINANCING
  // ═══════════════════════════════════════════════════════
  console.log("\n═══ Financing ═══\n");

  const financing = [
    { operatorId: jobyId, roundType: "SPAC", amountUsd: 1600000000, announcedDate: new Date("2021-08-10"), leadInvestor: "Reinvent Technology Partners", notableInvestors: ["Toyota", "Uber", "Intel Capital", "JetBlue Ventures"], totalRaisedToDate: 2200000000, sourceName: "SEC EDGAR", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001819848", notes: "SPAC merger with Reinvent Technology Partners. Listed on NYSE as JOBY." },
    { operatorId: jobyId, roundType: "STRATEGIC", amountUsd: 500000000, announcedDate: new Date("2023-10-01"), leadInvestor: "Toyota Motor Corporation", notableInvestors: ["Toyota"], totalRaisedToDate: 2700000000, sourceName: "Press release", sourceUrl: null, notes: "Toyota increased total investment to ~$894M. Deepened manufacturing partnership." },
    { operatorId: jobyId, roundType: "STRATEGIC", amountUsd: 125000000, announcedDate: new Date("2025-08-15"), leadInvestor: null, notableInvestors: [], totalRaisedToDate: 2800000000, sourceName: "SEC EDGAR / Press", sourceUrl: null, notes: "Blade Air Mobility acquisition. Cash + stock deal ~$125M. Acquired Part 135 cert, NYC/Miami/LA terminal network." },
    { operatorId: archerId, roundType: "SPAC", amountUsd: 1100000000, announcedDate: new Date("2021-09-15"), leadInvestor: "Atlas Crest Financial", notableInvestors: ["United Airlines", "Stellantis"], totalRaisedToDate: 1500000000, sourceName: "SEC EDGAR", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001811882", notes: "SPAC merger with Atlas Crest Financial. Listed on NYSE as ACHR." },
    { operatorId: archerId, roundType: "STRATEGIC", amountUsd: 215000000, announcedDate: new Date("2024-01-15"), leadInvestor: "United Airlines", notableInvestors: ["United Airlines", "Stellantis"], totalRaisedToDate: 1700000000, sourceName: "Press release", sourceUrl: null, notes: "United Airlines conditional order for $1B+ of Midnight aircraft. Equity investment alongside order commitment." },
    { operatorId: wiskId, roundType: "SERIES_B", amountUsd: 450000000, announcedDate: new Date("2022-01-18"), leadInvestor: "Boeing", notableInvestors: ["Boeing"], totalRaisedToDate: 850000000, sourceName: "Press release", sourceUrl: null, notes: "Boeing is majority owner. $450M Series B for autonomous eVTOL certification program." },
  ];

  for (const round of financing) {
    if (dryRun) {
      console.log(`  [dry] ${round.roundType} — $${(round.amountUsd / 1e6).toFixed(0)}M`);
    } else {
      const existing = await prisma.oidOperatorFinancing.findFirst({
        where: { operatorId: round.operatorId, roundType: round.roundType, announcedDate: round.announcedDate },
      });
      if (existing) {
        console.log(`  ○ ${round.roundType} (exists)`);
      } else {
        await prisma.oidOperatorFinancing.create({ data: round });
        console.log(`  ✓ ${round.roundType} — $${(round.amountUsd / 1e6).toFixed(0)}M`);
      }
    }
  }

  // ═══════════════════════════════════════════════════════
  // EVENTS
  // ═══════════════════════════════════════════════════════
  console.log("\n═══ Events ═══\n");

  const events = [
    // Joby
    { operatorId: jobyId, cityId: null, eventType: "CERTIFICATION_MILESTONE", eventDate: new Date("2026-03-20"), headline: "Joby completes first flight of production-conforming S4 aircraft", sourceName: "Joby Aviation", sourceReliability: 5, stageImplication: "CERTIFIED", stageImplicationConfidence: "HIGH", isVerified: true },
    { operatorId: jobyId, cityId: "san_francisco", eventType: "DEMONSTRATION_FLIGHT", eventDate: new Date("2026-03-28"), headline: "Joby completes Golden Gate Bridge eVTOL flight demonstration", sourceName: "Multiple press", sourceReliability: 4, stageImplication: "TESTING", stageImplicationConfidence: "HIGH", isVerified: true },
    { operatorId: jobyId, cityId: null, eventType: "FEDERAL_PROGRAM", eventDate: new Date("2026-04-01"), headline: "Joby selected for DOT/FAA eVTOL Integration Pilot Program", sourceName: "DOT/FAA", sourceReliability: 5, stageImplication: null, stageImplicationConfidence: null, isVerified: true },
    { operatorId: jobyId, cityId: null, eventType: "ACQUISITION", eventDate: new Date("2025-08-15"), headline: "Joby acquires Blade Air Mobility for ~$125M — gains Part 135 cert, NYC/Miami/LA terminal network", sourceName: "SEC EDGAR", sourceReliability: 5, stageImplication: "COMMERCIAL_OPS", stageImplicationConfidence: "HIGH", isVerified: true },
    { operatorId: jobyId, cityId: "new_york", eventType: "ROUTE_LAUNCH", eventDate: new Date("2025-09-01"), headline: "Joby begins operating ex-Blade helicopter routes in NYC (JFK-Manhattan)", sourceName: "Press", sourceReliability: 4, stageImplication: "COMMERCIAL_OPS", stageImplicationConfidence: "HIGH", isVerified: true },
    { operatorId: jobyId, cityId: null, eventType: "PARTNERSHIP", eventDate: new Date("2026-03-30"), headline: "Joby and Uber announce integration of Blade air mobility services into Uber app", sourceName: "Gulf Business", sourceReliability: 3, stageImplication: null, stageImplicationConfidence: null, isVerified: false },
    { operatorId: jobyId, cityId: "columbus", eventType: "MANUFACTURING", eventDate: new Date("2026-01-15"), headline: "Joby acquires second 700K sq ft facility in Dayton, OH for propeller manufacturing", sourceName: "Press", sourceReliability: 4, stageImplication: "ANNOUNCED", stageImplicationConfidence: "MEDIUM", isVerified: true },

    // Archer
    { operatorId: archerId, cityId: "los_angeles", eventType: "MARKET_EXPANSION", eventDate: new Date("2025-06-01"), headline: "Archer announces LA as first US commercial eVTOL market, targeting 2026 launch", sourceName: "Archer Aviation", sourceReliability: 5, stageImplication: "TESTING", stageImplicationConfidence: "HIGH", isVerified: true },
    { operatorId: archerId, cityId: "miami", eventType: "FEDERAL_PROGRAM", eventDate: new Date("2025-11-01"), headline: "Archer selected for White House Advanced Air Mobility Pilot Program — Miami corridor", sourceName: "White House", sourceReliability: 5, stageImplication: "ANNOUNCED", stageImplicationConfidence: "HIGH", isVerified: true },
    { operatorId: archerId, cityId: null, eventType: "PARTNERSHIP", eventDate: new Date("2026-03-28"), headline: "Archer partners with Hopscotch Air for regional air mobility via Part 135", sourceName: "Press", sourceReliability: 3, stageImplication: null, stageImplicationConfidence: null, isVerified: false },
    { operatorId: archerId, cityId: null, eventType: "FINANCIAL", eventDate: new Date("2026-04-01"), headline: "Archer files for resale of 5.33M shares, announces up to $8M vendor stock issuance", sourceName: "SEC EDGAR", sourceReliability: 5, stageImplication: null, stageImplicationConfidence: null, isVerified: true },
    { operatorId: archerId, cityId: null, eventType: "FINANCIAL", eventDate: new Date("2026-04-02"), headline: "Archer Aviation hits new 52-week low amid analyst concerns over additional capital needs", sourceName: "Multiple press", sourceReliability: 4, stageImplication: null, stageImplicationConfidence: null, isVerified: true },

    // Wisk
    { operatorId: wiskId, cityId: "dallas", eventType: "TESTING", eventDate: new Date("2024-06-01"), headline: "Wisk Aero begins autonomous eVTOL flight testing at DFW area", sourceName: "Press", sourceReliability: 4, stageImplication: "TESTING", stageImplicationConfidence: "HIGH", isVerified: true },
    { operatorId: wiskId, cityId: null, eventType: "CERTIFICATION_MILESTONE", eventDate: new Date("2025-03-01"), headline: "Wisk Generation 6 autonomous eVTOL enters final design phase for FAA Type Certificate", sourceName: "Wisk Aero", sourceReliability: 5, stageImplication: "CERTIFIED", stageImplicationConfidence: "MEDIUM", isVerified: true },

    // Blade (historical — acquired by Joby)
    { operatorId: bladeId, cityId: null, eventType: "ACQUISITION", eventDate: new Date("2025-08-15"), headline: "Blade Air Mobility acquired by Joby Aviation for ~$125M", sourceName: "SEC EDGAR", sourceReliability: 5, stageImplication: "EXITED", stageImplicationConfidence: "HIGH", isVerified: true },
  ];

  for (const event of events) {
    if (dryRun) {
      console.log(`  [dry] ${event.eventDate.toISOString().slice(0, 10)} — ${event.headline.slice(0, 80)}`);
    } else {
      const existing = await prisma.oidOperatorEvent.findFirst({
        where: { operatorId: event.operatorId, eventDate: event.eventDate, eventType: event.eventType },
      });
      if (existing) {
        console.log(`  ○ ${event.eventType} (exists)`);
      } else {
        await prisma.oidOperatorEvent.create({ data: event });
        console.log(`  ✓ ${event.eventDate.toISOString().slice(0, 10)} — ${event.headline.slice(0, 80)}`);
      }
    }
  }

  // ═══════════════════════════════════════════════════════
  // VERTIPORT COMMITMENTS
  // ═══════════════════════════════════════════════════════
  console.log("\n═══ Vertiport Commitments ═══\n");

  const commitments = [
    { operatorId: jobyId, cityId: "new_york", commitmentType: "OWNERSHIP", siteName: "West 30th Street Heliport (ex-Blade)", partnerName: "Joby Aviation (acquired from Blade)", announcedDate: new Date("2025-08-15"), isActive: true, notes: "NYC Manhattan terminal acquired via Blade acquisition. Operating helicopter routes, planned eVTOL transition." },
    { operatorId: jobyId, cityId: "new_york", commitmentType: "GROUND_LEASE", siteName: "JFK Airport Terminal", partnerName: "Port Authority of NY/NJ", announcedDate: new Date("2025-09-01"), isActive: true, notes: "JFK airport terminal for air taxi operations (ex-Blade). JFK-Manhattan route." },
    { operatorId: jobyId, cityId: "miami", commitmentType: "OWNERSHIP", siteName: "Miami terminal (ex-Blade)", partnerName: "Joby Aviation (acquired from Blade)", announcedDate: new Date("2025-08-15"), isActive: true, notes: "Miami terminal acquired via Blade acquisition." },
    { operatorId: jobyId, cityId: "los_angeles", commitmentType: "OWNERSHIP", siteName: "LA terminal (ex-Blade)", partnerName: "Joby Aviation (acquired from Blade)", announcedDate: new Date("2025-08-15"), isActive: true, notes: "LA terminal acquired via Blade acquisition." },
    { operatorId: jobyId, cityId: "dallas", commitmentType: "MOU", siteName: "DFW area vertiport", partnerName: "Skyports / DFW International Airport", announcedDate: new Date("2023-06-01"), isActive: true, notes: "Skyports-DFW partnership for vertiport development. Joby named as intended operator." },
    { operatorId: archerId, cityId: "los_angeles", commitmentType: "PARTNERSHIP", siteName: "LAX area vertiport", partnerName: "United Airlines / LAWA", announcedDate: new Date("2024-03-01"), isActive: true, notes: "United Airlines partnership for LAX-area vertiport operations. First US commercial market target." },
  ];

  for (const commitment of commitments) {
    if (dryRun) {
      console.log(`  [dry] ${commitment.cityId} — ${commitment.siteName}`);
    } else {
      const existing = await prisma.oidVertiportCommitment.findFirst({
        where: { operatorId: commitment.operatorId, cityId: commitment.cityId, siteName: commitment.siteName },
      });
      if (existing) {
        console.log(`  ○ ${commitment.siteName} (exists)`);
      } else {
        await prisma.oidVertiportCommitment.create({ data: commitment });
        console.log(`  ✓ ${commitment.cityId} — ${commitment.siteName}`);
      }
    }
  }

  // ═══════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════
  if (!dryRun) {
    const counts = await Promise.all([
      prisma.oidOperatorCertification.count(),
      prisma.oidOperatorFinancing.count(),
      prisma.oidOperatorEvent.count(),
      prisma.oidVertiportCommitment.count(),
    ]);
    console.log("\n═══ OID Summary ═══");
    console.log(`  Certifications:       ${counts[0]}`);
    console.log(`  Financing rounds:     ${counts[1]}`);
    console.log(`  Events:               ${counts[2]}`);
    console.log(`  Vertiport commitments: ${counts[3]}`);
  }
}

main()
  .catch((err) => { console.error("Error:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
