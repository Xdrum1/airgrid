/**
 * RPL Phase 1 — Seed Document Taxonomy
 *
 * Migrates existing IngestedRecords + ClassificationResults into
 * RPL documents with proper document type classification,
 * momentum direction, and significance scoring.
 *
 * Build order: Document Taxonomy → Momentum Direction → Factor Mapping → Precedent Lookups
 *
 * Usage:
 *   npx tsx scripts/seed-rpl-documents.ts
 *   npx tsx scripts/seed-rpl-documents.ts --dry-run
 */

import { PrismaClient, Prisma } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────
// Document Type Classification Rules
//
// Maps pipeline source + classification to RPL doc types
// ─────────────────────────────────────────────────────────

function classifyDocType(source: string, title: string, eventType: string | null): string {
  const t = title.toLowerCase();
  const s = source.toLowerCase();

  // Federal Register sources
  if (s === "federal_register") {
    if (t.includes("final rule") || t.includes("amendment")) return "FEDERAL_RULE";
    if (t.includes("proposed rule") || t.includes("notice of proposed")) return "FEDERAL_NOPR";
    if (t.includes("advisory circular")) return "FEDERAL_AC";
    if (t.includes("order") || t.includes("waiver")) return "FEDERAL_ORDER";
    return "FEDERAL_RULE"; // Default for FR
  }

  // LegiScan / state legislation
  if (s === "legiscan") {
    if (t.includes("signed") || t.includes("enacted") || t.includes("approved by governor")) return "STATE_ENACTED";
    if (t.includes("resolution")) return "STATE_RESOLUTION";
    return "STATE_BILL";
  }

  // Congress.gov
  if (s === "congress_gov") {
    if (t.includes("hearing") || t.includes("testimony")) return "FEDERAL_HEARING";
    if (t.includes("markup") || t.includes("reported")) return "FEDERAL_MARKUP";
    if (t.includes("appropriation") || t.includes("funding")) return "FEDERAL_APPROPRIATION";
    return "FEDERAL_BILL";
  }

  // Regulations.gov
  if (s === "regulations_gov") {
    if (t.includes("proposed rule")) return "FEDERAL_NOPR";
    return "FEDERAL_RULE";
  }

  // SEC EDGAR
  if (s === "sec_edgar") {
    return "FEDERAL_RULE"; // SEC filings feed into regulatory landscape
  }

  // Operator news — map to closest regulatory type based on event
  if (s === "operator_news") {
    if (eventType?.includes("legislation")) return "STATE_BILL";
    if (eventType?.includes("pilot_program")) return "FEDERAL_ORDER";
    if (eventType?.includes("regulatory")) return "FEDERAL_RULE";
    return "FEDERAL_RULE"; // Default
  }

  return "FEDERAL_RULE"; // Fallback
}

// ─────────────────────────────────────────────────────────
// Momentum Direction Assessment
//
// POS = enables/funds UAM, NEG = restricts/delays,
// NEU = relevant but neutral, MIX = both elements
// ─────────────────────────────────────────────────────────

function assessMomentum(title: string, eventType: string | null): string {
  const t = title.toLowerCase();

  // Strong positive signals
  if (t.includes("signed into law") || t.includes("enacted") || t.includes("approved")) return "POS";
  if (t.includes("launch") || t.includes("partnership") || t.includes("agreement")) return "POS";
  if (t.includes("pilot program") || t.includes("demonstration")) return "POS";
  if (t.includes("funding") || t.includes("appropriation") || t.includes("grant")) return "POS";
  if (t.includes("certification") || t.includes("authorized")) return "POS";
  if (t.includes("expansion") || t.includes("deployment")) return "POS";

  // Negative signals
  if (t.includes("moratorium") || t.includes("ban") || t.includes("restrict")) return "NEG";
  if (t.includes("oppose") || t.includes("reject") || t.includes("delay")) return "NEG";
  if (t.includes("accident") || t.includes("crash") || t.includes("incident")) return "NEG";
  if (t.includes("withdraw") || t.includes("cancel") || t.includes("suspend")) return "NEG";

  // Mixed
  if (t.includes("amendment") || t.includes("revision")) return "MIX";

  // Event type fallback
  if (eventType?.includes("positive") || eventType?.includes("expansion")) return "POS";
  if (eventType?.includes("negative") || eventType?.includes("restriction")) return "NEG";

  return "NEU";
}

// ─────────────────────────────────────────────────────────
// Significance Assessment
// ─────────────────────────────────────────────────────────

function assessSignificance(source: string, confidence: string | null, docType: string): string {
  // Enacted laws and final rules are always HIGH
  if (docType === "STATE_ENACTED" || docType === "FEDERAL_RULE") return "HIGH";

  // Federal appropriations and hearings are HIGH
  if (docType === "FEDERAL_APPROPRIATION" || docType === "FEDERAL_HEARING") return "HIGH";

  // NOPRs and markups are MEDIUM (pre-decisional)
  if (docType === "FEDERAL_NOPR" || docType === "FEDERAL_MARKUP") return "MEDIUM";

  // High-confidence classifications
  if (confidence === "high") return "MEDIUM";

  // Everything else
  return "LOW";
}

// ─────────────────────────────────────────────────────────
// Issuing Authority
// ─────────────────────────────────────────────────────────

function getAuthority(source: string, docType: string): string {
  if (docType.startsWith("FEDERAL_")) {
    if (source === "congress_gov") return "U.S. Congress";
    if (source === "regulations_gov") return "FAA";
    if (source === "sec_edgar") return "SEC";
    return "FAA";
  }
  if (docType.startsWith("STATE_")) {
    return "State Legislature";
  }
  return "Various";
}

// ─────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────

async function main() {
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

  // Fetch ingested records with their classifications
  const records = await prisma.ingestedRecord.findMany({
    select: {
      id: true,
      source: true,
      title: true,
      summary: true,
      url: true,
      date: true,
      ingestedAt: true,
    },
    orderBy: { ingestedAt: "desc" },
  });

  // Fetch classifications for mapping
  const classifications = await prisma.classificationResult.findMany({
    select: {
      id: true,
      recordId: true,
      eventType: true,
      confidence: true,
      affectedCities: true,
    },
  });
  const classMap = new Map(classifications.map(c => [c.recordId, c]));

  console.log(`Found ${records.length} ingested records, ${classifications.length} classifications.\n`);
  console.log("═══ RPL Document Migration ═══\n");

  let created = 0;
  let skipped = 0;
  const typeCounts: Record<string, number> = {};
  const momentumCounts: Record<string, number> = {};
  const sigCounts: Record<string, number> = {};

  for (const record of records) {
    const classification = classMap.get(record.id);
    const eventType = classification?.eventType ?? null;
    const confidence = classification?.confidence ?? null;

    const docType = classifyDocType(record.source, record.title, eventType);
    const momentum = assessMomentum(record.title, eventType);
    const significance = assessSignificance(record.source, confidence, docType);
    const authority = getAuthority(record.source, docType);

    typeCounts[docType] = (typeCounts[docType] ?? 0) + 1;
    momentumCounts[momentum] = (momentumCounts[momentum] ?? 0) + 1;
    sigCounts[significance] = (sigCounts[significance] ?? 0) + 1;

    if (dryRun) {
      if (created < 10) {
        console.log(`  [dry] ${docType} | ${momentum} | ${significance} | ${record.title.slice(0, 60)}...`);
      }
      created++;
    } else {
      // Check if already migrated (by rawSignalId linkage)
      const existing = await prisma.rplDocument.findFirst({
        where: { rawSignalId: record.id },
      });

      if (existing) {
        skipped++;
        continue;
      }

      const publishedDate = new Date(record.date || record.ingestedAt);

      await prisma.rplDocument.create({
        data: {
          docType,
          title: record.title.slice(0, 500),
          shortTitle: record.title.slice(0, 200),
          issuingAuthority: authority,
          publishedDate,
          momentumDirection: momentum,
          significance,
          summary: record.summary || null,
          sourceUrl: record.url || null,
          rawSignalId: record.id,
          isActive: true,
        },
      });
      created++;

      if (created % 100 === 0) {
        console.log(`  ... ${created} documents created`);
      }
    }
  }

  console.log(`\n${created} RPL documents ${dryRun ? "would be" : ""} created, ${skipped} skipped.\n`);

  // ── Document Type Distribution ──
  console.log("═══ Document Type Distribution ═══");
  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
  for (const [type, count] of sortedTypes) {
    const pct = ((count / records.length) * 100).toFixed(1);
    console.log(`  ${type.padEnd(25)} ${String(count).padStart(5)} (${pct}%)`);
  }

  // ── Momentum Distribution ──
  console.log("\n═══ Momentum Direction Distribution ═══");
  for (const dir of ["POS", "NEG", "NEU", "MIX"]) {
    const count = momentumCounts[dir] ?? 0;
    const pct = ((count / records.length) * 100).toFixed(1);
    console.log(`  ${dir}: ${count} (${pct}%)`);
  }

  // ── Significance Distribution ──
  console.log("\n═══ Significance Distribution ═══");
  for (const sig of ["HIGH", "MEDIUM", "LOW"]) {
    const count = sigCounts[sig] ?? 0;
    const pct = ((count / records.length) * 100).toFixed(1);
    console.log(`  ${sig}: ${count} (${pct}%)`);
  }
}

main()
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
