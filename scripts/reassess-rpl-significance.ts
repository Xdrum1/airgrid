/**
 * Re-assess significance on existing RPL documents using the stricter
 * v2 logic (federal HIGH now gated on UAM-specific keywords). Run once
 * after shipping the logic change in rpl-writer.ts.
 *
 * Usage:
 *   npx tsx scripts/reassess-rpl-significance.ts --dry-run
 *   npx tsx scripts/reassess-rpl-significance.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { PrismaClient } from "@prisma/client";

const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

const FEDERAL_HIGH_TERMS = [
  "advanced air mobility", "aam", "urban air mobility", "uam",
  "evtol", "electric vertical", "powered lift", "vertiport", "vtol",
  "air taxi", "unmanned aircraft system", "unmanned aerial system",
  "uas ", " uas", "drone", "bvlos", "laanc", "sfar-88", "part 135",
];
function hasFederalHighSignal(title: string, summary: string | null): boolean {
  const haystack = `${title} ${summary ?? ""}`.toLowerCase();
  return FEDERAL_HIGH_TERMS.some((t) => haystack.includes(t));
}

function assessSignificanceV2(
  docType: string,
  title: string,
  summary: string | null,
  existingConfidence: string | null,
): string {
  if (docType === "STATE_ENACTED") return "HIGH";
  if (docType === "FEDERAL_RULE") {
    return hasFederalHighSignal(title, summary) ? "HIGH" : "MEDIUM";
  }
  if (docType === "FEDERAL_APPROPRIATION" || docType === "FEDERAL_HEARING") {
    return hasFederalHighSignal(title, summary) ? "HIGH" : "MEDIUM";
  }
  if (docType === "FEDERAL_NOPR" || docType === "FEDERAL_MARKUP" || docType === "FEDERAL_AC") {
    return "MEDIUM";
  }
  if (existingConfidence === "high") return "MEDIUM";
  return "LOW";
}

async function main() {
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

  const docs = await prisma.rplDocument.findMany({
    select: {
      id: true,
      docType: true,
      title: true,
      summary: true,
      significance: true,
      rawSignalId: true,
    },
  });

  // Pull original classifier confidence from ClassificationResult
  const rawIds = docs.map((d) => d.rawSignalId).filter((x): x is string => !!x);
  const classifications = await prisma.classificationResult.findMany({
    where: { recordId: { in: rawIds } },
    select: { recordId: true, confidence: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const confidenceById = new Map<string, string | null>();
  for (const c of classifications) {
    if (!confidenceById.has(c.recordId)) {
      confidenceById.set(c.recordId, c.confidence);
    }
  }

  const before: Record<string, number> = {};
  const after: Record<string, number> = {};
  const changes: Array<{ id: string; from: string; to: string; title: string; docType: string }> = [];

  for (const d of docs) {
    const conf = d.rawSignalId ? (confidenceById.get(d.rawSignalId) ?? null) : null;
    const newSig = assessSignificanceV2(d.docType, d.title, d.summary, conf);
    before[d.significance] = (before[d.significance] ?? 0) + 1;
    after[newSig] = (after[newSig] ?? 0) + 1;
    if (newSig !== d.significance) {
      changes.push({
        id: d.id,
        from: d.significance,
        to: newSig,
        title: d.title.slice(0, 70),
        docType: d.docType,
      });
    }
  }

  console.log("Significance distribution — before:", before);
  console.log("Significance distribution — after: ", after);
  console.log(`\nChanges: ${changes.length}`);
  const sampleByTransition: Record<string, string[]> = {};
  for (const c of changes) {
    const key = `${c.from}→${c.to}`;
    if (!sampleByTransition[key]) sampleByTransition[key] = [];
    if (sampleByTransition[key].length < 3) {
      sampleByTransition[key].push(`[${c.docType}] ${c.title}`);
    }
  }
  for (const [k, samples] of Object.entries(sampleByTransition)) {
    console.log(`\n${k}:`);
    for (const s of samples) console.log(`  - ${s}`);
  }

  if (!dryRun && changes.length > 0) {
    console.log(`\nApplying ${changes.length} updates...`);
    for (const c of changes) {
      await prisma.rplDocument.update({
        where: { id: c.id },
        data: { significance: c.to },
      });
    }
    console.log("Done.");
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
