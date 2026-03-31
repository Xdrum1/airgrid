/**
 * RPL Phase 2 — Seed Factor Mappings + City Associations
 *
 * Uses existing ClassificationResults to populate:
 * - RplDocumentFactorMapping (which factors each doc affects)
 * - RplDocumentCityAssociation (which cities each doc affects)
 *
 * Build order: Document Taxonomy ✅ → Factor Mapping (this) → Precedent Lookups
 *
 * Usage:
 *   npx tsx scripts/seed-rpl-mappings.ts
 *   npx tsx scripts/seed-rpl-mappings.ts --dry-run
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

// Map pipeline event types → FKB factor codes + mapping type
const EVENT_TO_FACTORS: Record<string, { code: string; type: string }[]> = {
  state_legislation_signed: [{ code: "LEG", type: "PRIMARY" }],
  state_legislation_introduced: [{ code: "LEG", type: "PRIMARY" }],
  state_legislation_advanced: [{ code: "LEG", type: "PRIMARY" }],
  state_legislation_enacted: [{ code: "LEG", type: "PRIMARY" }],
  vertiport_zoning_approved: [{ code: "ZON", type: "PRIMARY" }, { code: "VRT", type: "SECONDARY" }],
  vertiport_development: [{ code: "VRT", type: "PRIMARY" }],
  infrastructure_development: [{ code: "VRT", type: "PRIMARY" }],
  faa_corridor_filing: [{ code: "REG", type: "PRIMARY" }],
  regulatory_posture_change: [{ code: "REG", type: "PRIMARY" }],
  faa_rulemaking: [{ code: "REG", type: "PRIMARY" }],
  faa_update: [{ code: "REG", type: "PRIMARY" }],
  operator_market_expansion: [{ code: "OPR", type: "PRIMARY" }],
  operator_announcement: [{ code: "OPR", type: "PRIMARY" }],
  operator_certification: [{ code: "OPR", type: "PRIMARY" }, { code: "REG", type: "SECONDARY" }],
  pilot_program_launch: [{ code: "PLT", type: "PRIMARY" }, { code: "REG", type: "SECONDARY" }],
  pilot_program_update: [{ code: "PLT", type: "PRIMARY" }],
  weather_infrastructure: [{ code: "WTH", type: "PRIMARY" }],
  not_relevant: [],
};

// Fallback: derive factor from RPL doc type
function factorsFromDocType(docType: string): { code: string; type: string }[] {
  switch (docType) {
    case "FEDERAL_RULE": return [{ code: "REG", type: "PRIMARY" }];
    case "FEDERAL_NOPR": return [{ code: "REG", type: "PRIMARY" }];
    case "FEDERAL_AC": return [{ code: "REG", type: "PRIMARY" }];
    case "FEDERAL_ORDER": return [{ code: "REG", type: "PRIMARY" }];
    case "FEDERAL_HEARING": return [{ code: "LEG", type: "SECONDARY" }, { code: "REG", type: "PRIMARY" }];
    case "FEDERAL_MARKUP": return [{ code: "LEG", type: "PRIMARY" }];
    case "FEDERAL_BILL": return [{ code: "LEG", type: "PRIMARY" }];
    case "FEDERAL_APPROPRIATION": return [{ code: "LEG", type: "PRIMARY" }, { code: "PLT", type: "SECONDARY" }];
    case "STATE_BILL": return [{ code: "LEG", type: "PRIMARY" }];
    case "STATE_ENACTED": return [{ code: "LEG", type: "PRIMARY" }];
    case "STATE_RESOLUTION": return [{ code: "LEG", type: "SECONDARY" }];
    case "STATE_EXEC_ORDER": return [{ code: "REG", type: "PRIMARY" }, { code: "LEG", type: "SECONDARY" }];
    default: return [{ code: "REG", type: "SECONDARY" }];
  }
}

// City association type based on document scope
function getAssociationType(docType: string): string {
  if (docType.startsWith("FEDERAL_")) return "NATIONAL";
  if (docType.startsWith("STATE_")) return "STATE_APPLIES";
  return "DIRECTLY_NAMES";
}

async function main() {
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

  // Get all RPL documents with their linked signal IDs
  const rplDocs = await prisma.rplDocument.findMany({
    select: { id: true, docType: true, rawSignalId: true },
  });
  const rplBySignal = new Map(rplDocs.filter(d => d.rawSignalId).map(d => [d.rawSignalId!, d]));

  // Get all classifications
  const classifications = await prisma.classificationResult.findMany({
    select: {
      recordId: true,
      eventType: true,
      affectedCities: true,
      confidence: true,
    },
  });
  const classMap = new Map(classifications.map(c => [c.recordId, c]));

  // Get valid market IDs
  const markets = await prisma.market.findMany({ select: { id: true } });
  const marketIds = new Set(markets.map(m => m.id));

  console.log(`${rplDocs.length} RPL documents, ${classifications.length} classifications, ${markets.length} markets.\n`);

  let factorMappingsCreated = 0;
  let cityAssociationsCreated = 0;
  let docsProcessed = 0;

  // Check if we've already seeded
  const existingMappings = await prisma.rplDocumentFactorMapping.count();
  const existingAssociations = await prisma.rplDocumentCityAssociation.count();
  if (existingMappings > 0 || existingAssociations > 0) {
    console.log(`Already seeded: ${existingMappings} factor mappings, ${existingAssociations} city associations.`);
    console.log("Skipping to avoid duplicates. Delete existing rows to re-seed.\n");

    // Just show stats
    const byFactor = await prisma.rplDocumentFactorMapping.groupBy({
      by: ["factorCode"],
      _count: true,
      orderBy: { _count: { factorCode: "desc" } },
    });
    console.log("═══ Factor Mapping Distribution ═══");
    for (const row of byFactor) {
      console.log(`  ${row.factorCode}: ${row._count}`);
    }

    const byType = await prisma.rplDocumentCityAssociation.groupBy({
      by: ["associationType"],
      _count: true,
    });
    console.log("\n═══ City Association Types ═══");
    for (const row of byType) {
      console.log(`  ${row.associationType}: ${row._count}`);
    }
    return;
  }

  console.log("═══ Seeding Factor Mappings + City Associations ═══\n");

  // Batch arrays for bulk insert
  const factorMappingBatch: {
    documentId: string;
    factorCode: string;
    mappingType: string;
    scoreDeltaEstimate: number | null;
  }[] = [];

  const cityAssociationBatch: {
    documentId: string;
    cityId: string;
    associationType: string;
    scoringWeight: number;
  }[] = [];

  for (const doc of rplDocs) {
    const classification = doc.rawSignalId ? classMap.get(doc.rawSignalId) : null;

    // ── Factor Mappings ──
    let factorMaps = classification?.eventType
      ? EVENT_TO_FACTORS[classification.eventType] ?? []
      : [];

    // Fallback to doc type if no event type mapping
    if (factorMaps.length === 0) {
      factorMaps = factorsFromDocType(doc.docType);
    }

    for (const fm of factorMaps) {
      factorMappingBatch.push({
        documentId: doc.id,
        factorCode: fm.code,
        mappingType: fm.type,
        scoreDeltaEstimate: null,
      });
      factorMappingsCreated++;
    }

    // ── City Associations ──
    const cities = classification?.affectedCities ?? [];
    const assocType = getAssociationType(doc.docType);

    if (cities.length > 0) {
      for (const cityId of cities) {
        if (!marketIds.has(cityId)) continue;

        // Check for duplicates in batch
        const alreadyInBatch = cityAssociationBatch.some(
          a => a.documentId === doc.id && a.cityId === cityId
        );
        if (alreadyInBatch) continue;

        cityAssociationBatch.push({
          documentId: doc.id,
          cityId,
          associationType: assocType === "NATIONAL" ? "DIRECTLY_NAMES" : assocType,
          scoringWeight: 1.0,
        });
        cityAssociationsCreated++;
      }
    }

    docsProcessed++;
    if (docsProcessed % 500 === 0) {
      console.log(`  ... processed ${docsProcessed} documents`);
    }
  }

  if (dryRun) {
    console.log(`\n[DRY RUN] Would create ${factorMappingsCreated} factor mappings, ${cityAssociationsCreated} city associations.\n`);
  } else {
    // Bulk insert factor mappings
    console.log(`\nInserting ${factorMappingBatch.length} factor mappings...`);
    for (let i = 0; i < factorMappingBatch.length; i += 500) {
      const chunk = factorMappingBatch.slice(i, i + 500);
      await prisma.rplDocumentFactorMapping.createMany({ data: chunk });
    }

    // Bulk insert city associations
    console.log(`Inserting ${cityAssociationBatch.length} city associations...`);
    for (let i = 0; i < cityAssociationBatch.length; i += 500) {
      const chunk = cityAssociationBatch.slice(i, i + 500);
      await prisma.rplDocumentCityAssociation.createMany({
        data: chunk,
        skipDuplicates: true,
      });
    }

    console.log(`\n✓ ${factorMappingsCreated} factor mappings created`);
    console.log(`✓ ${cityAssociationsCreated} city associations created\n`);
  }

  // ── Stats ──
  console.log("═══ Factor Mapping Distribution ═══");
  const factorCounts: Record<string, number> = {};
  for (const fm of factorMappingBatch) {
    factorCounts[fm.factorCode] = (factorCounts[fm.factorCode] ?? 0) + 1;
  }
  for (const [code, count] of Object.entries(factorCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${code}: ${count}`);
  }

  console.log("\n═══ City Association Distribution (top 10) ═══");
  const cityCounts: Record<string, number> = {};
  for (const ca of cityAssociationBatch) {
    cityCounts[ca.cityId] = (cityCounts[ca.cityId] ?? 0) + 1;
  }
  const sortedCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  for (const [cityId, count] of sortedCities) {
    console.log(`  ${cityId}: ${count} documents`);
  }
}

main()
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
