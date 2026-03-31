/**
 * RPL Phase 3 — Seed Legislation Details + Build Precedent Lookup Engine
 *
 * Two parts:
 * 1. Migrate LegiScan state bill data into RplLegislationDetail
 * 2. Verify the precedent lookup query works: "What did [city] do to improve [factor]?"
 *
 * Build order: Document Taxonomy ✅ → Factor Mapping ✅ → Precedent Lookups (this)
 *
 * Usage:
 *   npx tsx scripts/seed-rpl-precedents.ts
 *   npx tsx scripts/seed-rpl-precedents.ts --dry-run
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────
// State code extraction from bill titles
// ─────────────────────────────────────────────────────────

const STATE_PATTERNS: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO",
  montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND",
  ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI",
  "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX",
  utah: "UT", vermont: "VT", virginia: "VA", washington: "WA",
  "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
};

function extractState(title: string): string {
  const t = title.toLowerCase();
  for (const [name, code] of Object.entries(STATE_PATTERNS)) {
    if (t.includes(name)) return code;
  }
  // Try two-letter codes
  const match = title.match(/\b([A-Z]{2})\b/);
  if (match && Object.values(STATE_PATTERNS).includes(match[1])) return match[1];
  return "US"; // Federal default
}

function extractBillNumber(title: string): string {
  // Try common patterns: SB 1826, HB 1735, HR 3935, S. 3866
  const patterns = [
    /\b(SB|HB|AB|SJR|HJR|SCR|HCR)\s*(\d+)\b/i,
    /\b(S|HR|H\.?R\.?)\s*\.?\s*(\d+)\b/i,
  ];
  for (const p of patterns) {
    const m = title.match(p);
    if (m) return `${m[1].toUpperCase()} ${m[2]}`;
  }
  return "Unknown";
}

function extractChamber(title: string, billNum: string): string {
  const b = billNum.toUpperCase();
  if (b.startsWith("S") || b.startsWith("SB") || b.startsWith("SJR") || b.startsWith("SCR")) return "SENATE";
  if (b.startsWith("H") || b.startsWith("AB") || b.startsWith("HJR") || b.startsWith("HCR")) return "HOUSE";
  return "JOINT";
}

function extractStage(title: string, momentum: string): string {
  const t = title.toLowerCase();
  if (t.includes("signed") || t.includes("enacted") || t.includes("approved by governor")) return "ENACTED";
  if (t.includes("enrolled") || t.includes("engrossed")) return "ENROLLED";
  if (t.includes("passed") || t.includes("adopted")) return "PASSED_CHAMBER";
  if (t.includes("committee") || t.includes("referred")) return "IN_COMMITTEE";
  if (t.includes("vetoed")) return "VETOED";
  if (t.includes("dead") || t.includes("failed") || t.includes("tabled")) return "DEAD";
  if (momentum === "POS") return "IN_COMMITTEE"; // Active bills default
  return "INTRODUCED";
}

async function main() {
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

  // ─── Part 1: Legislation Details ───
  console.log("═══ Part 1: Legislation Details ═══\n");

  // Find all STATE_BILL and STATE_ENACTED RPL documents
  const stateDocs = await prisma.rplDocument.findMany({
    where: { docType: { in: ["STATE_BILL", "STATE_ENACTED", "STATE_RESOLUTION"] } },
    select: { id: true, title: true, docType: true, momentumDirection: true, publishedDate: true },
  });

  console.log(`Found ${stateDocs.length} state legislative documents.\n`);

  // Check existing
  const existingDetails = await prisma.rplLegislationDetail.count();
  if (existingDetails > 0) {
    console.log(`Already seeded: ${existingDetails} legislation details. Skipping.\n`);
  } else {
    let created = 0;
    const jurisdictionCounts: Record<string, number> = {};
    const stageCounts: Record<string, number> = {};

    for (const doc of stateDocs) {
      const jurisdiction = extractState(doc.title);
      const billNumber = extractBillNumber(doc.title);
      const chamber = extractChamber(doc.title, billNumber);
      const stage = extractStage(doc.title, doc.momentumDirection);

      jurisdictionCounts[jurisdiction] = (jurisdictionCounts[jurisdiction] ?? 0) + 1;
      stageCounts[stage] = (stageCounts[stage] ?? 0) + 1;

      if (dryRun) {
        if (created < 10) {
          console.log(`  [dry] ${jurisdiction} ${billNumber} (${chamber}) — ${stage}`);
        }
        created++;
      } else {
        await prisma.rplLegislationDetail.create({
          data: {
            documentId: doc.id,
            jurisdiction,
            billNumber,
            chamber,
            session: "2025-2026", // Current session default
            currentStage: stage,
            lastActionDate: doc.publishedDate,
            enactedDate: stage === "ENACTED" ? doc.publishedDate : null,
          },
        });
        created++;
      }
    }

    console.log(`${created} legislation details ${dryRun ? "would be" : ""} created.\n`);

    console.log("By jurisdiction (top 10):");
    const sortedJurisdictions = Object.entries(jurisdictionCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    for (const [j, c] of sortedJurisdictions) {
      console.log(`  ${j}: ${c}`);
    }

    console.log("\nBy stage:");
    for (const [s, c] of Object.entries(stageCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${s}: ${c}`);
    }
  }

  // ─── Part 2: Precedent Lookup Verification ───
  console.log("\n═══ Part 2: Precedent Lookup Queries ═══\n");

  // Query: "What regulatory documents affected Dallas?"
  const dallasQuery = await prisma.rplDocumentCityAssociation.findMany({
    where: { cityId: "dallas" },
    include: {
      document: {
        select: {
          title: true,
          docType: true,
          momentumDirection: true,
          significance: true,
          publishedDate: true,
          sourceUrl: true,
        },
      },
    },
    orderBy: { document: { publishedDate: "desc" } },
    take: 5,
  });

  console.log(`"What regulatory activity affected Dallas?" (top 5):`);
  for (const row of dallasQuery) {
    console.log(`  ${row.document.momentumDirection} | ${row.document.docType} | ${row.document.title.slice(0, 70)}...`);
  }

  // Query: "What did markets do to improve LEG factor?" (positive momentum, LEG-mapped)
  const legPrecedents = await prisma.rplDocumentFactorMapping.findMany({
    where: {
      factorCode: "LEG",
      mappingType: "PRIMARY",
      document: {
        momentumDirection: "POS",
        significance: { in: ["HIGH", "MEDIUM"] },
      },
    },
    include: {
      document: {
        select: {
          title: true,
          docType: true,
          significance: true,
          publishedDate: true,
          cityAssociations: {
            select: { cityId: true },
            take: 5,
          },
        },
      },
    },
    orderBy: { document: { publishedDate: "desc" } },
    take: 10,
  });

  console.log(`\n"What positive legislation exists across markets?" (top 10):`);
  for (const row of legPrecedents) {
    const cities = row.document.cityAssociations.map(ca => ca.cityId).join(", ") || "national";
    console.log(`  ${row.document.significance} | ${cities} | ${row.document.title.slice(0, 60)}...`);
  }

  // Query: "Show me the regulatory trail for Phoenix"
  const phoenixTrail = await prisma.rplDocumentCityAssociation.findMany({
    where: { cityId: "phoenix" },
    include: {
      document: {
        select: {
          title: true,
          docType: true,
          momentumDirection: true,
          publishedDate: true,
          factorMappings: { select: { factorCode: true } },
        },
      },
    },
    orderBy: { document: { publishedDate: "asc" } },
  });

  console.log(`\n"Regulatory trail for Phoenix" (${phoenixTrail.length} documents, chronological):`);
  for (const row of phoenixTrail) {
    const factors = row.document.factorMappings.map(fm => fm.factorCode).join(",");
    const date = row.document.publishedDate.toISOString().split("T")[0];
    console.log(`  ${date} | ${row.document.momentumDirection} | [${factors}] | ${row.document.title.slice(0, 55)}...`);
  }

  console.log("\n═══ RPL Precedent Engine — Operational ═══");
  console.log("Queries supported:");
  console.log("  1. Documents by city (with factor + momentum filtering)");
  console.log("  2. Cross-market factor precedents (what did other cities do?)");
  console.log("  3. Chronological regulatory trail per market");
  console.log("  4. Legislation details (jurisdiction, stage, bill number)");
}

main()
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
