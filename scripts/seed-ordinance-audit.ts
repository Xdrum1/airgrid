/**
 * Seed OrdinanceAudit table — 5 markets × 5 questions
 *
 * Source: ordinance_audit_seed_data.html (Alan's research)
 *
 * Usage:
 *   npx tsx scripts/seed-ordinance-audit.ts
 *   npx tsx scripts/seed-ordinance-audit.ts --dry-run
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

const AUDITS = [
  {
    marketId: "dallas",
    faaTerminology: "partial",
    faaTerminologyNote: "Heliport used in Dallas code. Vertiport not yet defined. 'Helipad' appears in older sections — legally ambiguous.",
    zoningOrdinance: "partial",
    zoningOrdinanceNote: "Heliport appears in Dallas zoning code under specific districts. Vertiport not enumerated. Covered by implication via EB 105A heliport classification.",
    airspaceDetermination: "no",
    airspaceDeterminationNote: "No evidence of FAA airspace determination as a permit prerequisite in Dallas code. Texas has limited state-level enforcement.",
    nfpa418Referenced: "partial",
    nfpa418ReferencedNote: "Dallas adopted IBC (updated May 2025). IBC references NFPA 418 for rooftop heliports/helistops. Not explicitly cited in standalone fire code ordinance.",
    stateAdoptedAC: "no",
    stateAdoptedACNote: "Texas has limited enforcement per Rex. TxDOT does not mandate AC 150/5390-2D for private-use heliports. Federal grant-funded facilities only.",
    auditedBy: "Alan Michael",
  },
  {
    marketId: "miami",
    faaTerminology: "partial",
    faaTerminologyNote: "Miami-Dade UAM Policy Framework (2023) uses vertiport terminology. City code still references heliport/helistop. Vertiport not yet formally codified at city level.",
    zoningOrdinance: "partial",
    zoningOrdinanceNote: "Miami-Dade TPO published UAM Policy Framework and Strategic Roadmap (2023). Heliports addressed in zoning. Vertiport as distinct use not yet codified.",
    airspaceDetermination: "partial",
    airspaceDeterminationNote: "FDOT guidance allows local governments to make zoning approval contingent on FDOT site approval. Florida state framework partially covers this. Not explicitly codified at city level.",
    nfpa418Referenced: "yes",
    nfpa418ReferencedNote: "Florida is a heavily enforced state per Rex. Florida adopted IBC and IFC which reference NFPA 418. SB 1662 (July 2025) strengthens AAM infrastructure standards statewide.",
    stateAdoptedAC: "yes",
    stateAdoptedACNote: "Florida is one of the most heavily enforced states per Rex. FDOT AAM Land Use Compatibility and Site Approval Guidebook (Sept 2024) provides enforceable framework. SB 1662 further codifies this.",
    auditedBy: "Alan Michael",
  },
  {
    marketId: "phoenix",
    faaTerminology: "partial",
    faaTerminologyNote: "Phoenix AAM framework study (Dec 2025) uses correct vertiport terminology. City code not yet updated. AZ SB 1307 (eff. Sept 2025) introduces vertiport into state statute.",
    zoningOrdinance: "partial",
    zoningOrdinanceNote: "Phoenix published AAM framework identifying Sky Harbor, Deer Valley, and Goodyear as vertiport-ready sites. Formal zoning amendment not yet enacted. eIPP application submitted.",
    airspaceDetermination: "partial",
    airspaceDeterminationNote: "AZ SB 1307 mandates ADOT incorporate vertiports into statewide aviation plan by Sept 2026. State-level framework emerging. Not yet codified at city permit level.",
    nfpa418Referenced: "partial",
    nfpa418ReferencedNote: "Arizona adopted IBC. IBC references NFPA 418 for rooftop facilities. Standalone fire code ordinance reference not confirmed. State enforcement improving under SB 1307.",
    stateAdoptedAC: "partial",
    stateAdoptedACNote: "AZ SB 1307 (Sept 2025) establishes AAM infrastructure planning mandate. ADOT AAM Specialist being appointed. AC adoption not yet explicit — framework in development.",
    auditedBy: "Alan Michael",
  },
  {
    marketId: "charlotte",
    faaTerminology: "no",
    faaTerminologyNote: "Charlotte UDO updated Dec 2025 — no evidence of vertiport terminology added. NC developing AAM strategy but city code not yet updated. High-value fix target.",
    zoningOrdinance: "no",
    zoningOrdinanceNote: "Charlotte UDO (eff. June 2023, updated Dec 2025) does not address vertiports. Heliport treatment unclear. Charlotte-Atlanta AAM corridor study underway but no zoning action yet.",
    airspaceDetermination: "no",
    airspaceDeterminationNote: "No evidence of FAA airspace determination in Charlotte permit process. NC NCDOT Division of Aviation involved in Charlotte-Atlanta corridor study — state action ahead of city action.",
    nfpa418Referenced: "partial",
    nfpa418ReferencedNote: "NC adopted IBC. IBC references NFPA 418 for rooftop heliports. Standalone city fire code reference not confirmed. NC is listed among states developing AAM strategies.",
    stateAdoptedAC: "no",
    stateAdoptedACNote: "NC developing AAM strategy alongside GA for Charlotte-Atlanta corridor. No confirmed state-level AC adoption. Framework emerging but not yet enforceable.",
    auditedBy: "Alan Michael",
  },
  {
    marketId: "new_york",
    faaTerminology: "yes",
    faaTerminologyNote: "NYC Admin Code §412.8 addresses heliports and helistops. NYC Council legislation (Int 0026-2024, Int 0070-2024) uses correct terminology. Vertiport not yet separately codified but covered under heliport classification per EB 105A.",
    zoningOrdinance: "yes",
    zoningOrdinanceNote: "NYC has two city-controlled heliports (East 34th St, Downtown Manhattan). NYCEDC renewed Atlantic Aviation with mandatory eVTOL charging infrastructure requirement. Active city-level management of heliport/vertiport infrastructure.",
    airspaceDetermination: "partial",
    airspaceDeterminationNote: "NYC coordinates with FAA on heliport operations. City-controlled heliports operate under NYCEDC concession agreements that incorporate FAA requirements. Formal airspace determination as permit prerequisite not explicitly codified.",
    nfpa418Referenced: "yes",
    nfpa418ReferencedNote: "NYC adopted IBC and FDNY fire code. IBC references NFPA 418 for rooftop heliports. NYC Building Code §412.8 specifically addresses heliports and helistops with explicit standards.",
    stateAdoptedAC: "partial",
    stateAdoptedACNote: "NY State aviation law provides framework but AC 150/5390-2D adoption not explicitly confirmed at state level. NYC's active heliport management and NYCEDC requirements provide de facto enforcement structure.",
    auditedBy: "Alan Michael",
  },
];

async function main() {
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);
  console.log("═══ Ordinance Audit Seed ═══\n");

  for (const audit of AUDITS) {
    const statuses = [audit.faaTerminology, audit.zoningOrdinance, audit.airspaceDetermination, audit.nfpa418Referenced, audit.stateAdoptedAC];
    const yes = statuses.filter(s => s === "yes").length;
    const partial = statuses.filter(s => s === "partial").length;
    const no = statuses.filter(s => s === "no").length;

    if (dryRun) {
      console.log(`  [dry] ${audit.marketId}: ${yes} YES, ${partial} PARTIAL, ${no} NO`);
    } else {
      await prisma.ordinanceAudit.upsert({
        where: { marketId: audit.marketId },
        create: {
          marketId: audit.marketId,
          faaTerminology: audit.faaTerminology,
          faaTerminologyNote: audit.faaTerminologyNote,
          zoningOrdinance: audit.zoningOrdinance,
          zoningOrdinanceNote: audit.zoningOrdinanceNote,
          airspaceDetermination: audit.airspaceDetermination,
          airspaceDeterminationNote: audit.airspaceDeterminationNote,
          nfpa418Referenced: audit.nfpa418Referenced,
          nfpa418ReferencedNote: audit.nfpa418ReferencedNote,
          stateAdoptedAC: audit.stateAdoptedAC,
          stateAdoptedACNote: audit.stateAdoptedACNote,
          lastAuditedAt: new Date(),
          auditedBy: audit.auditedBy,
        },
        update: {
          faaTerminology: audit.faaTerminology,
          faaTerminologyNote: audit.faaTerminologyNote,
          zoningOrdinance: audit.zoningOrdinance,
          zoningOrdinanceNote: audit.zoningOrdinanceNote,
          airspaceDetermination: audit.airspaceDetermination,
          airspaceDeterminationNote: audit.airspaceDeterminationNote,
          nfpa418Referenced: audit.nfpa418Referenced,
          nfpa418ReferencedNote: audit.nfpa418ReferencedNote,
          stateAdoptedAC: audit.stateAdoptedAC,
          stateAdoptedACNote: audit.stateAdoptedACNote,
          lastAuditedAt: new Date(),
          auditedBy: audit.auditedBy,
        },
      });
      console.log(`  ✓ ${audit.marketId}: ${yes} YES, ${partial} PARTIAL, ${no} NO`);
    }
  }

  console.log(`\n${AUDITS.length} markets seeded.\n`);

  // Summary
  console.log("═══ Compliance Summary ═══");
  console.log("┌────────────┬─────┬─────────┬─────┐");
  console.log("│ Market     │ YES │ PARTIAL │ NO  │");
  console.log("├────────────┼─────┼─────────┼─────┤");
  for (const a of AUDITS) {
    const s = [a.faaTerminology, a.zoningOrdinance, a.airspaceDetermination, a.nfpa418Referenced, a.stateAdoptedAC];
    const market = a.marketId.padEnd(10);
    console.log(`│ ${market} │  ${s.filter(x=>x==="yes").length}  │    ${s.filter(x=>x==="partial").length}    │  ${s.filter(x=>x==="no").length}  │`);
  }
  console.log("└────────────┴─────┴─────────┴─────┘");
}

main()
  .catch((err) => { console.error("Error:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
