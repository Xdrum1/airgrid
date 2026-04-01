/**
 * Seed AirIndex Terminology Database
 *
 * Source-traced, scoring-linked terminology reference.
 * Initial seed: 5 terms from the dev brief + additional
 * terms from Rex call and methodology.
 *
 * Usage:
 *   npx tsx scripts/seed-terminology.ts
 *   npx tsx scripts/seed-terminology.ts --dry-run
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

interface TermDef {
  id: string;
  term: string;
  definition: string;
  sourceRef: string;
  sourceUrl?: string;
  incorrectAlternatives: string[];
  contextOfUse: string;
  factorCodes: string[];
  scoringImplication: string;
  category: string;
  versionAdded: string;
}

const TERMS: TermDef[] = [
  {
    id: "vertiport",
    term: "Vertiport",
    definition: "A designated landing and takeoff area for eVTOL aircraft. The FAA classifies vertiports as a subclass of heliport under Engineering Brief 105A. A vertiport includes a touchdown and liftoff area (TLOF), a final approach and takeoff area (FATO), and a safety area — all with larger dimensional requirements than traditional heliports.",
    sourceRef: "FAA Engineering Brief 105A (2022)",
    sourceUrl: "https://www.faa.gov/airports/engineering/engineering_briefs",
    incorrectAlternatives: ["helipad", "landing pad", "air taxi pad", "eVTOL pad", "skyport"],
    contextOfUse: "Use in zoning ordinance permitted-use definitions, building permit applications, infrastructure planning documents, and insurance policy language. The FAA unified Advisory Circular (expected June 2026) will merge vertiport and heliport standards into a single 'vertical flight infrastructure' document.",
    factorCodes: ["LEG", "ZON", "VRT"],
    scoringImplication: "Cities that use 'vertiport' in their zoning ordinance as a permitted or conditional use score higher on the ZON factor. Using 'helipad' instead creates legal ambiguity and suppresses the LEG score. Under EB 105A, vertiports are a subclass of heliport — existing heliport ordinances automatically cover vertiports without requiring new legislative language.",
    category: "infrastructure",
    versionAdded: "v1.3",
  },
  {
    id: "heliport",
    term: "Heliport",
    definition: "A designated area used for helicopter landing and takeoff, as defined by the FAA. The FAA defines heliport as the umbrella category that includes helistops and, as of EB 105A, vertiports. 'Helipad' is not a defined FAA term and should not appear in city code, permit applications, or insurance policies.",
    sourceRef: "14 CFR Part 157; FAA AC 150/5390-2D",
    sourceUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-I/part-157",
    incorrectAlternatives: ["helipad", "helicopter pad", "helicopter landing area", "chopper pad"],
    contextOfUse: "Use in all regulatory, zoning, and permit documents where vertical flight infrastructure is referenced. 14 CFR Part 157 requires notification to the FAA for any construction or alteration of a heliport. The term 'helipad' has no legal definition in FAA regulations.",
    factorCodes: ["VRT", "REG"],
    scoringImplication: "Heliport is the FAA-defined term for a designated area used for helicopter landing and takeoff. 'Helipad' is not a defined FAA term. Cities using 'helipad' in their code create legal ambiguity that can affect permit validity and liability exposure. This distinction directly affects the ordinance audit score in the Municipality briefing.",
    category: "infrastructure",
    versionAdded: "v1.0",
  },
  {
    id: "helistop",
    term: "Helistop",
    definition: "A heliport without fueling, maintenance, or hangar facilities — typically a rooftop or ground-level landing area with minimal supporting infrastructure. Defined in FAA regulations as a subset of heliport.",
    sourceRef: "14 CFR Part 157; FAA AC 150/5390-2D",
    sourceUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-I/part-157",
    incorrectAlternatives: ["helipad", "landing spot", "touchdown point"],
    contextOfUse: "Use when referencing a heliport that provides only landing and takeoff capability. Most hospital heliports are technically helistops. The distinction matters for NFPA 418 fire code applicability and building code requirements.",
    factorCodes: ["VRT", "REG"],
    scoringImplication: "Helistop is a recognized FAA term. Cities that correctly distinguish heliport and helistop in their code demonstrate regulatory sophistication that contributes to a higher REG factor score.",
    category: "infrastructure",
    versionAdded: "v1.0",
  },
  {
    id: "tlof",
    term: "Touchdown and Liftoff Area (TLOF)",
    definition: "The load-bearing surface within the FATO where the aircraft actually touches down. For eVTOL operations, the FAA requires a minimum TLOF of 1.0 times the controlling dimension of the aircraft (approximately 50x50 ft for current eVTOL designs). For traditional helicopters, the multiplier is 0.83. This size differential is why fewer than 20% of existing heliports can accommodate eVTOL operations.",
    sourceRef: "FAA AC 150/5390-2D; ICAO Annex 14 Vol. II",
    sourceUrl: "https://www.faa.gov/airports/resources/advisory_circulars/index.cfm/go/document.current/documentNumber/150_5390-2",
    incorrectAlternatives: ["landing pad", "landing zone", "touch-down area", "touchdown pad"],
    contextOfUse: "Use in vertiport design specifications, site feasibility studies, and compliance assessments. The TLOF dimension is the primary determinant of whether an existing heliport can support eVTOL operations. Hospital helipads built to 40x40 ft TLOF standards cannot accommodate eVTOL aircraft requiring 50x50 ft.",
    factorCodes: ["VRT"],
    scoringImplication: "The TLOF is the load-bearing surface within the FATO where the aircraft actually touches down. eVTOL requires a minimum 50x50 ft TLOF vs. the 40x40 ft standard most hospital helipads were built to. This distinction is critical in site compliance scoring — sites below the eVTOL TLOF minimum are flagged as non-viable for conversion.",
    category: "infrastructure",
    versionAdded: "v1.3",
  },
  {
    id: "fato",
    term: "Final Approach and Takeoff Area (FATO)",
    definition: "The defined area over which the final phase of approach to a hover or a landing is completed and from which the takeoff is initiated. For eVTOL, the FATO is 2.0 times the controlling dimension (approximately 100x100 ft). For helicopters, the multiplier is 1.5. The FATO must be obstacle-free.",
    sourceRef: "FAA AC 150/5390-2D; FAA EB 105A",
    incorrectAlternatives: ["approach area", "flight path", "landing approach"],
    contextOfUse: "Use in site design, obstruction analysis, and compliance assessments. The FATO dimension determines the obstacle-free zone around the TLOF. Encroachment into the FATO by buildings, trees, or power lines is the primary reason existing heliports fail eVTOL compliance checks.",
    factorCodes: ["VRT"],
    scoringImplication: "FATO encroachment is the most common compliance failure at existing heliport sites. Markets with vertiport sites that have clear, documented FATO compliance score higher on VRT.",
    category: "infrastructure",
    versionAdded: "v1.3",
  },
  {
    id: "aam",
    term: "Advanced Air Mobility (AAM)",
    definition: "The federal government's preferred term for the ecosystem of new aviation technologies, infrastructure, and operations enabling urban and regional air transportation. AAM encompasses eVTOL aircraft, vertiport infrastructure, airspace integration, and supporting regulatory frameworks. UAM (Urban Air Mobility) remains in common use but AAM is the term appearing in federal legislation, DOT policy, and FAA program names (eIPP).",
    sourceRef: "FAA AAM National Strategy (Dec 2025); USDOT AAM Comprehensive Plan (Dec 2025)",
    incorrectAlternatives: ["urban air mobility (UAM)", "eVTOL industry", "air taxi sector", "flying car industry"],
    contextOfUse: "Use AAM when referencing the federal policy framework, DOT programs, or the industry at large. UAM is acceptable when specifically discussing urban (intracity) operations. State legislation using AAM aligns with the federal framework and scores higher on LEG.",
    factorCodes: ["LEG", "PLT", "REG"],
    scoringImplication: "AAM is the federal government's preferred term as of the Dec 2025 National Strategy. State legislation using AAM aligns with the federal framework and scores higher on LEG. States using 'drone' or 'UAS' terminology for eVTOL-related legislation score lower because the language doesn't align with federal standards.",
    category: "regulatory",
    versionAdded: "v1.0",
  },
  {
    id: "nfpa-418",
    term: "NFPA 418",
    definition: "NFPA 418: Standard for Heliports, published by the National Fire Protection Association. The national fire safety standard governing heliport and vertiport facilities. Covers fire suppression, fuel storage, emergency access, and operational safety requirements. Referenced in the International Building Code (IBC) for rooftop heliports and helistops.",
    sourceRef: "NFPA 418: Standard for Heliports (2016 ed.); National Fire Protection Association",
    sourceUrl: "https://www.nfpa.org/codes-and-standards/nfpa-418-standard-for-heliports",
    incorrectAlternatives: ["helicopter fire code", "helipad safety standard", "aviation fire standard"],
    contextOfUse: "Reference in municipal fire code, building code, and vertiport permitting requirements. Cities whose fire or building code explicitly references NFPA 418 score higher on the REG factor. Cities that reference it only indirectly through IBC receive a partial score. Cities with no reference score zero on this sub-factor.",
    factorCodes: ["REG", "VRT"],
    scoringImplication: "NFPA 418 is the national fire safety standard for heliports. Cities whose fire or building code explicitly references NFPA 418 score higher on the REG factor. Cities that reference it only indirectly through IBC receive a partial score. Cities with no reference score zero on this compliance question.",
    category: "standards",
    versionAdded: "v1.3",
  },
  {
    id: "faa-ac-150-5390-2d",
    term: "FAA AC 150/5390-2D",
    definition: "FAA Advisory Circular 150/5390-2D: Heliport Design. The primary FAA design standard for heliport infrastructure. While advisory (not legally enforceable by the FAA for private-use facilities), many states have adopted it as an enforceable standard through state legislation. The FAA is merging this document with Engineering Brief 105A into a unified 'vertical flight infrastructure' Advisory Circular expected for public comment in June 2026.",
    sourceRef: "FAA Advisory Circular 150/5390-2D",
    sourceUrl: "https://www.faa.gov/airports/resources/advisory_circulars/index.cfm/go/document.current/documentNumber/150_5390-2",
    incorrectAlternatives: ["FAA heliport rules", "heliport regulations", "FAA heliport law"],
    contextOfUse: "Reference in state legislation, municipal ordinances, and compliance assessments. The AC is advisory at the federal level but becomes enforceable when adopted by states. Florida, California, Illinois, and New Jersey are among the states that have adopted it as enforceable. Texas has limited enforcement.",
    factorCodes: ["REG", "LEG", "VRT"],
    scoringImplication: "States that have adopted FAA AC 150/5390-2D as enforceable score higher on both REG and LEG factors. This is one of the five questions in the AirIndex ordinance audit. The June 2026 unified AC will supersede this document — cities that update their ordinance language before publication will be positioned to align with the new standard from day one.",
    category: "standards",
    versionAdded: "v1.3",
  },
  {
    id: "airspace-determination",
    term: "FAA Airspace Determination",
    definition: "A formal FAA evaluation of proposed heliport or vertiport locations resulting in one of three outcomes: Concur (favorable), Concur with Exception (favorable with conditions), or Objectionable (unfavorable). The FAA issues approximately 3,868 conditional determinations and 42 objectionable determinations on record. The FAA has no enforcement mechanism to verify that conditions are ever implemented.",
    sourceRef: "14 CFR Part 157; FAA Form 7480-1",
    incorrectAlternatives: ["FAA approval", "airspace clearance", "FAA permit"],
    contextOfUse: "Reference in heliport/vertiport permit processes. Cities that require a favorable FAA airspace determination as a condition of heliport/vertiport permit approval provide regulatory teeth that the FAA alone cannot. This is one of the five questions in the AirIndex ordinance audit.",
    factorCodes: ["REG", "ZON"],
    scoringImplication: "Cities that write the FAA airspace determination requirement into their permit process score higher on the ordinance audit. This simple addition gives the advisory FAA standard enforceable weight at the municipal level. Without it, heliports can be approved without any FAA airspace review — creating liability exposure.",
    category: "regulatory",
    versionAdded: "v1.3",
  },
  {
    id: "eipp",
    term: "Enhanced Instrument Performance Products (eIPP)",
    definition: "An FAA program establishing partnerships between FAA and weather technology providers to deploy enhanced weather sensing at airports and vertiports. eIPP data provides low-altitude weather intelligence critical for eVTOL operations — wind, turbulence, and visibility conditions at altitudes below 500 ft AGL that standard ASOS/AWOS stations do not capture.",
    sourceRef: "FAA Weather Technology in the Cockpit (WTIC) Program; USDOT AAM National Strategy",
    incorrectAlternatives: ["weather station program", "FAA weather upgrade"],
    contextOfUse: "Reference in weather infrastructure scoring, market readiness assessments, and partnership discussions with weather technology providers. TruWeather Solutions (Don Berchoff, CEO) participates in 5 of 8 FAA eIPP teams.",
    factorCodes: ["WTH"],
    scoringImplication: "eIPP deployment in a market upgrades Weather Infrastructure from partial to full, adding 5 points to the composite score. No US market currently has full eIPP coverage — this is the gap that caps every market below 100.",
    category: "operational",
    versionAdded: "v1.3",
  },
];

async function main() {
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);
  console.log("═══ AirIndex Terminology Database ═══\n");

  let created = 0;
  for (const t of TERMS) {
    if (dryRun) {
      console.log(`  [dry] ${t.id}: ${t.term} (${t.category}, factors: ${t.factorCodes.join(",")})`);
      created++;
      continue;
    }

    await prisma.airIndexTerm.upsert({
      where: { id: t.id },
      create: {
        id: t.id,
        term: t.term,
        definition: t.definition,
        sourceRef: t.sourceRef,
        sourceUrl: t.sourceUrl ?? null,
        incorrectAlternatives: t.incorrectAlternatives,
        contextOfUse: t.contextOfUse,
        factorCodes: t.factorCodes,
        scoringImplication: t.scoringImplication,
        category: t.category,
        versionAdded: t.versionAdded,
        lastUpdated: new Date(),
        isPublic: true,
      },
      update: {
        term: t.term,
        definition: t.definition,
        sourceRef: t.sourceRef,
        sourceUrl: t.sourceUrl ?? null,
        incorrectAlternatives: t.incorrectAlternatives,
        contextOfUse: t.contextOfUse,
        factorCodes: t.factorCodes,
        scoringImplication: t.scoringImplication,
        category: t.category,
        lastUpdated: new Date(),
      },
    });
    console.log(`  ✓ ${t.id}: ${t.term} [${t.category}]`);
    created++;
  }

  console.log(`\n${created} terms seeded.\n`);

  // Summary
  const categories: Record<string, number> = {};
  const factorCoverage: Record<string, number> = {};
  for (const t of TERMS) {
    categories[t.category] = (categories[t.category] ?? 0) + 1;
    for (const f of t.factorCodes) {
      factorCoverage[f] = (factorCoverage[f] ?? 0) + 1;
    }
  }

  console.log("By category:");
  for (const [cat, count] of Object.entries(categories).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`);
  }

  console.log("\nFactor coverage:");
  for (const [code, count] of Object.entries(factorCoverage).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${code}: ${count} terms`);
  }
}

main()
  .catch((err) => { console.error("Error:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
