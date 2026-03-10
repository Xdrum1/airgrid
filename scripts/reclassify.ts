/**
 * One-off reclassification script — reprocesses existing ingested records
 * through the fixed v2 classifier pipeline.
 *
 * Why: 1,494 records were ingested but produced zero score changes due to:
 *   1. Classifier prompt field name mismatch (4 of 7 fields silently dropped)
 *   2. SEC filings had empty summaries → everything classified as not_relevant
 *   3. Auto-reviewer couldn't read SEC source documents
 *
 * This script:
 *   - Loads data/ingested.json
 *   - Enriches SEC/news summaries with source content
 *   - Runs records through the v2 NLP classifier
 *   - Supersedes old bad overrides from v1 run
 *   - Persists new overrides and recalculates scores
 *   - Skips changelog entries and notifications (no noise)
 *
 * Usage:
 *   DATABASE_URL=<your-db-url> npx tsx scripts/reclassify.ts
 *
 * Options:
 *   --dry-run     Classify and report, but don't persist overrides
 *   --limit=N     Only process first N records (for testing)
 *   --source=X    Only process records from a specific source (sec_edgar, federal_register, etc.)
 */

import { promises as fs } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import Anthropic from "@anthropic-ai/sdk";

// -------------------------------------------------------
// CLI args
// -------------------------------------------------------

const dryRun = process.argv.includes("--dry-run");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : Infinity;
const sourceArg = process.argv.find((a) => a.startsWith("--source="));
const sourceFilter = sourceArg ? sourceArg.split("=")[1] : null;

// -------------------------------------------------------
// Types (mirrors ingestion.ts)
// -------------------------------------------------------

interface IngestedRecord {
  id: string;
  source: "federal_register" | "legiscan" | "sec_edgar" | "operator_news";
  sourceId: string;
  title: string;
  summary: string;
  status: string;
  date: string;
  url: string;
  state?: string;
  raw: Record<string, unknown>;
  ingestedAt: string;
}

interface ClassificationItem {
  recordId: string;
  eventType: string;
  factorsAffected: {
    field: string;
    value: unknown;
    reason: string;
  }[];
  affectedCityIds: string[];
  confidence: "high" | "medium" | "needs_review";
  summary: string;
}

// -------------------------------------------------------
// Constants
// -------------------------------------------------------

const MODEL = "claude-haiku-4-5-20251001";
const BATCH_SIZE = 10;
const MAX_TOKENS = 4096;
const ENRICH_TIMEOUT = 8000;
const SEC_MAX_CHARS = 2000;
const NEWS_MAX_CHARS = 1500;
const ENRICH_BATCH_SIZE = 5;

const DATA_DIR = path.join(process.cwd(), "data");
const INGESTED_FILE = path.join(DATA_DIR, "ingested.json");

const STATE_TO_CITIES: Record<string, string[]> = {
  CA: ["los_angeles", "san_diego", "san_francisco"],
  TX: ["dallas", "houston", "austin"],
  FL: ["miami", "orlando"],
  NY: ["new_york"],
  AZ: ["phoenix"],
  NV: ["las_vegas"],
  IL: ["chicago"],
  GA: ["atlanta"],
  TN: ["nashville"],
  NC: ["charlotte"],
  CO: ["denver"],
  WA: ["seattle"],
  MA: ["boston"],
  MN: ["minneapolis"],
  DC: ["washington_dc"],
};

const VALID_CITY_IDS = new Set([
  "los_angeles", "new_york", "dallas", "miami", "orlando",
  "las_vegas", "phoenix", "houston", "austin", "san_diego",
  "san_francisco", "chicago", "atlanta", "nashville", "charlotte",
  "denver", "seattle", "boston", "minneapolis", "washington_dc",
]);

const VALID_FIELDS = new Set([
  "hasActivePilotProgram", "hasVertiportZoning", "approvedVertiport",
  "activeOperatorPresence", "regulatoryPosture", "hasStateLegislation",
  "hasLaancCoverage",
]);

// -------------------------------------------------------
// Classifier prompt (v2 — matches VALID_FIELDS exactly)
// -------------------------------------------------------

const SYSTEM_PROMPT = `You are a regulatory intelligence classifier for AirIndex, a UAM (Urban Air Mobility) market readiness platform. Your job is to analyze ingested documents and determine whether they affect the readiness scores of tracked US markets.

## Scoring Model (7 factors, 0–100 scale)

Each market is scored on 7 binary factors:
1. **hasActivePilotProgram** (20 pts) — Active eVTOL testing or pilot program in the city
2. **approvedVertiport** (20 pts) — At least one approved/built vertiport
3. **activeOperatorPresence** (15 pts) — At least one eVTOL operator active in the market
4. **hasVertiportZoning** (15 pts) — Local zoning ordinance allows vertiport construction
5. **regulatoryPosture** (10 pts) — City/state regulatory stance: "friendly" (10), "neutral" (5), "restrictive" (0)
6. **hasStateLegislation** (10 pts) — State has signed UAM-enabling legislation
7. **hasLaancCoverage** (10 pts) — FAA LAANC low-altitude authorization coverage exists

## Tracked Markets (20 US cities)

| City ID | City | State |
|---------|------|-------|
| los_angeles | Los Angeles | CA |
| new_york | New York | NY |
| dallas | Dallas | TX |
| miami | Miami | FL |
| orlando | Orlando | FL |
| las_vegas | Las Vegas | NV |
| phoenix | Phoenix | AZ |
| houston | Houston | TX |
| austin | Austin | TX |
| san_diego | San Diego | CA |
| san_francisco | San Francisco | CA |
| chicago | Chicago | IL |
| atlanta | Atlanta | GA |
| nashville | Nashville | TN |
| charlotte | Charlotte | NC |
| denver | Denver | CO |
| seattle | Seattle | WA |
| boston | Boston | MA |
| minneapolis | Minneapolis | MN |
| washington_dc | Washington D.C. | DC |

## Event Type Vocabulary

Classify each record into exactly one event type:
- \`state_legislation_signed\` — State bill signed/enacted that enables UAM operations
- \`vertiport_zoning_approved\` — Zoning ordinance for vertiport construction approved
- \`faa_corridor_filing\` — FAA filing related to air corridors, airspace design, or powered-lift operations
- \`faa_certification_milestone\` — FAA type certificate, airworthiness, or Part 135 milestone
- \`operator_market_expansion\` — Operator announcing expansion into a new market
- \`regulatory_posture_change\` — Change in city/state regulatory stance toward UAM
- \`infrastructure_development\` — New vertiport, charging infrastructure, or ground support development
- \`not_relevant\` — Document is not relevant to UAM market readiness scoring

## Output Schema

Return a JSON array. For each record, output one object:
\`\`\`json
{
  "recordId": "string — the record's id field",
  "eventType": "string — one of the event types above",
  "factorsAffected": [
    {
      "field": "string — one of: hasActivePilotProgram, approvedVertiport, activeOperatorPresence, hasVertiportZoning, regulatoryPosture, hasStateLegislation, hasLaancCoverage",
      "value": "the new value (true/false for booleans, 'friendly'/'neutral'/'restrictive' for regulatoryPosture)",
      "reason": "string — brief explanation of why this factor is affected"
    }
  ],
  "affectedCityIds": ["string — city IDs from the table above"],
  "confidence": "high | medium | needs_review",
  "summary": "string — one-sentence summary of the classification"
}
\`\`\`

## Confidence Guidelines

- **high**: Document explicitly states a completed action (bill signed, certificate issued, zoning approved) AND you can map it to specific cities
- **medium**: Document implies a likely impact but uses less definitive language (proposed, in progress, planned) OR you can only map to a state (not specific cities)
- **needs_review**: Document mentions relevant topics but the impact on specific markets is unclear, OR it's a federal filing that could affect multiple markets

## Rules

1. If a record is \`not_relevant\`, set \`factorsAffected\` to an empty array and \`affectedCityIds\` to an empty array
2. For state-level legislation, map to ALL cities in that state using the table above
3. For federal filings, try to identify specific affected markets from the content; if you can't, use an empty \`affectedCityIds\` array
4. For SEC/operator filings, try to identify which markets the operator is active in from the content
5. Only output valid city IDs from the table above
6. Return ONLY the JSON array — no markdown, no explanation, no wrapping`;

// -------------------------------------------------------
// Enrichment
// -------------------------------------------------------

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchDocumentText(url: string, maxChars: number): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ENRICH_TIMEOUT);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "AirIndex/1.0 contact@airindex.io",
        Accept: "text/html, application/xhtml+xml, text/plain",
      },
    });
    clearTimeout(timeout);
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("text/plain") &&
      !contentType.includes("application/xhtml+xml")
    ) return null;

    const html = await response.text();
    const text = stripHtml(html);
    return text.length > 0 ? text.slice(0, maxChars) : null;
  } catch {
    return null;
  }
}

async function enrichRecords(records: IngestedRecord[]): Promise<{ secEnriched: number; newsEnriched: number }> {
  let secEnriched = 0;
  let newsEnriched = 0;

  // Enrich SEC filings with sparse summaries
  const secRecords = records.filter(
    (r) => r.source === "sec_edgar" && (!r.summary || r.summary === r.status || r.summary.length < 20)
  );
  if (secRecords.length > 0) {
    console.log(`  Enriching ${secRecords.length} SEC filings...`);
    for (let i = 0; i < secRecords.length; i += ENRICH_BATCH_SIZE) {
      const batch = secRecords.slice(i, i + ENRICH_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (record) => {
          const text = await fetchDocumentText(record.url, SEC_MAX_CHARS);
          if (text && text.length > record.summary.length) {
            record.summary = text;
            return true;
          }
          return false;
        })
      );
      secEnriched += results.filter(
        (r) => r.status === "fulfilled" && r.value === true
      ).length;
    }
    console.log(`  SEC enrichment: ${secEnriched}/${secRecords.length} enriched`);
  }

  // Enrich operator news
  const newsRecords = records.filter(
    (r) => r.source === "operator_news" && r.summary.startsWith("[")
  );
  if (newsRecords.length > 0) {
    console.log(`  Enriching ${newsRecords.length} operator news articles...`);
    for (let i = 0; i < newsRecords.length; i += ENRICH_BATCH_SIZE) {
      const batch = newsRecords.slice(i, i + ENRICH_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (record) => {
          const text = await fetchDocumentText(record.url, NEWS_MAX_CHARS);
          if (text && text.length > 50) {
            record.summary = `${record.summary} | Content: ${text}`;
            return true;
          }
          return false;
        })
      );
      newsEnriched += results.filter(
        (r) => r.status === "fulfilled" && r.value === true
      ).length;
    }
    console.log(`  News enrichment: ${newsEnriched}/${newsRecords.length} enriched`);
  }

  return { secEnriched, newsEnriched };
}

// -------------------------------------------------------
// Classification
// -------------------------------------------------------

function buildUserPrompt(records: IngestedRecord[]): string {
  const recordsJson = records.map((r) => ({
    id: r.id,
    source: r.source,
    title: r.title,
    summary: r.summary,
    status: r.status,
    date: r.date,
    state: r.state ?? null,
    url: r.url,
  }));
  return `Classify the following ${records.length} record(s):\n\n${JSON.stringify(recordsJson, null, 2)}`;
}

async function classifyBatch(
  client: Anthropic,
  records: IngestedRecord[]
): Promise<ClassificationItem[]> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: 0,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(records) }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("No text in response");

  let jsonStr = textBlock.text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonStr);
  if (!Array.isArray(parsed)) throw new Error("Response is not a JSON array");
  return parsed as ClassificationItem[];
}

// -------------------------------------------------------
// Map classifications → override candidates
// -------------------------------------------------------

interface OverrideCandidate {
  cityId: string;
  field: string;
  value: unknown;
  reason: string;
  sourceRecordId: string;
  sourceUrl: string;
  confidence: string;
}

function mapToOverrides(
  classifications: ClassificationItem[],
  recordsById: Map<string, IngestedRecord>
): OverrideCandidate[] {
  const candidates: OverrideCandidate[] = [];

  for (const item of classifications) {
    if (item.eventType === "not_relevant") continue;

    const record = recordsById.get(item.recordId);
    if (!record) continue;

    let cityIds = item.affectedCityIds.filter((id) => VALID_CITY_IDS.has(id));
    if (cityIds.length === 0 && record.state) {
      cityIds = STATE_TO_CITIES[record.state.toUpperCase()] ?? [];
    }
    if (cityIds.length === 0) cityIds = ["__unresolved__"];

    for (const factor of item.factorsAffected) {
      if (!VALID_FIELDS.has(factor.field)) continue;

      for (const cityId of cityIds) {
        candidates.push({
          cityId,
          field: factor.field,
          value: factor.value,
          reason: `[NLP v2 reclassify] ${item.summary} — ${factor.reason}`,
          sourceRecordId: record.id,
          sourceUrl: record.url,
          confidence: cityId === "__unresolved__" ? "needs_review" : item.confidence,
        });
      }
    }
  }

  return candidates;
}

// -------------------------------------------------------
// Persist overrides (bypasses score-updater dedup by superseding old ones first)
// -------------------------------------------------------

async function persistOverrides(
  prisma: PrismaClient,
  candidates: OverrideCandidate[]
): Promise<{ persisted: number; applied: number; superseded: number }> {
  const now = new Date();
  let persisted = 0;
  let applied = 0;
  let superseded = 0;

  for (const candidate of candidates) {
    // Supersede any existing override from the old v1 run for the same source record
    const oldOverrides = await prisma.scoringOverride.findMany({
      where: { sourceRecordId: candidate.sourceRecordId, supersededAt: null },
      select: { id: true },
    });

    if (oldOverrides.length > 0) {
      await prisma.scoringOverride.updateMany({
        where: { id: { in: oldOverrides.map((o) => o.id) } },
        data: { supersededAt: now },
      });
      superseded += oldOverrides.length;
    }

    const isResolvable = candidate.cityId !== "__unresolved__" && candidate.field !== "__review__";

    // Supersede any existing active override for the same city+field
    if (isResolvable) {
      await prisma.scoringOverride.updateMany({
        where: {
          cityId: candidate.cityId,
          field: candidate.field,
          supersededAt: null,
        },
        data: { supersededAt: now },
      });
    }

    await prisma.scoringOverride.create({
      data: {
        cityId: candidate.cityId,
        field: candidate.field,
        value: candidate.value as never,
        reason: candidate.reason,
        sourceRecordId: candidate.sourceRecordId,
        sourceUrl: candidate.sourceUrl,
        confidence: candidate.confidence,
        appliedAt: candidate.confidence === "high" && isResolvable ? now : null,
      },
    });
    persisted++;

    if (candidate.confidence === "high" && isResolvable) {
      applied++;
    }
  }

  return { persisted, applied, superseded };
}

// -------------------------------------------------------
// Main
// -------------------------------------------------------

async function main() {
  const prisma = new PrismaClient();

  console.log("=== AirIndex Reclassification Script ===");
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  if (sourceFilter) console.log(`Source filter: ${sourceFilter}`);
  if (limit < Infinity) console.log(`Limit: ${limit}`);
  console.log();

  // 1. Load ingested records
  const raw = await fs.readFile(INGESTED_FILE, "utf-8");
  let records: IngestedRecord[] = JSON.parse(raw);
  console.log(`Loaded ${records.length} records from ${INGESTED_FILE}`);

  // Apply filters
  if (sourceFilter) {
    records = records.filter((r) => r.source === sourceFilter);
    console.log(`Filtered to ${records.length} ${sourceFilter} records`);
  }
  if (limit < Infinity) {
    records = records.slice(0, limit);
    console.log(`Limited to ${records.length} records`);
  }

  // 2. Enrich summaries
  console.log("\n--- Enrichment Phase ---");
  const { secEnriched, newsEnriched } = await enrichRecords(records);
  console.log(`Enrichment complete: ${secEnriched} SEC + ${newsEnriched} news`);

  // 3. Classify in batches
  console.log("\n--- Classification Phase ---");
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ERROR: ANTHROPIC_API_KEY not set");
    process.exit(1);
  }
  const client = new Anthropic({ apiKey });

  const recordsById = new Map(records.map((r) => [r.id, r]));
  const allClassifications: ClassificationItem[] = [];
  const totalBatches = Math.ceil(records.length / BATCH_SIZE);

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    try {
      console.log(`  Batch ${batchNum}/${totalBatches} (${batch.length} records)...`);
      const classifications = await classifyBatch(client, batch);
      allClassifications.push(...classifications);

      const relevant = classifications.filter((c) => c.eventType !== "not_relevant");
      const withFactors = classifications.filter((c) => c.factorsAffected.length > 0);
      console.log(
        `    → ${relevant.length} relevant, ${withFactors.length} with factor changes`
      );
    } catch (err) {
      console.error(`    → ERROR in batch ${batchNum}:`, err instanceof Error ? err.message : err);
    }
  }

  // 4. Map to override candidates
  const candidates = mapToOverrides(allClassifications, recordsById);
  const relevant = allClassifications.filter((c) => c.eventType !== "not_relevant");
  const byEventType = new Map<string, number>();
  for (const c of allClassifications) {
    byEventType.set(c.eventType, (byEventType.get(c.eventType) ?? 0) + 1);
  }

  console.log("\n--- Classification Summary ---");
  console.log(`  Total classified: ${allClassifications.length}`);
  console.log(`  Relevant: ${relevant.length}`);
  console.log(`  Override candidates: ${candidates.length}`);
  console.log(`  Event types:`);
  for (const [type, count] of Array.from(byEventType.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${type}: ${count}`);
  }

  // Show candidate breakdown
  if (candidates.length > 0) {
    const byField = new Map<string, number>();
    const byConfidence = new Map<string, number>();
    const byCityId = new Map<string, number>();

    for (const c of candidates) {
      byField.set(c.field, (byField.get(c.field) ?? 0) + 1);
      byConfidence.set(c.confidence, (byConfidence.get(c.confidence) ?? 0) + 1);
      byCityId.set(c.cityId, (byCityId.get(c.cityId) ?? 0) + 1);
    }

    console.log(`\n  By field:`);
    for (const [f, n] of Array.from(byField.entries()).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${f}: ${n}`);
    }
    console.log(`\n  By confidence:`);
    for (const [c, n] of Array.from(byConfidence.entries()).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${c}: ${n}`);
    }
    console.log(`\n  By city (top 10):`);
    for (const [c, n] of Array.from(byCityId.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      console.log(`    ${c}: ${n}`);
    }
  }

  // 5. Persist overrides
  if (dryRun) {
    console.log("\n--- DRY RUN — no overrides persisted ---");
    if (candidates.length > 0) {
      console.log("\nSample candidates (first 10):");
      for (const c of candidates.slice(0, 10)) {
        console.log(`  ${c.cityId} | ${c.field} = ${JSON.stringify(c.value)} | ${c.confidence} | ${c.reason.slice(0, 80)}...`);
      }
    }
  } else if (candidates.length > 0) {
    console.log("\n--- Persisting Overrides ---");
    const { persisted, applied, superseded } = await persistOverrides(prisma, candidates);
    console.log(`  Superseded ${superseded} old overrides`);
    console.log(`  Persisted ${persisted} new overrides`);
    console.log(`  Auto-applied ${applied} high-confidence overrides`);
  } else {
    console.log("\n--- No override candidates to persist ---");
  }

  // 6. Persist classification audit trail
  if (!dryRun && allClassifications.length > 0) {
    try {
      await prisma.classificationResult.createMany({
        data: allClassifications.map((item) => ({
          recordId: item.recordId,
          eventType: item.eventType,
          factorsJson: JSON.parse(JSON.stringify(item.factorsAffected)),
          affectedCities: item.affectedCityIds,
          confidence: item.confidence,
          rawResponse: {},
          modelUsed: MODEL,
          promptVersion: "v2-reclassify",
        })),
      });
      console.log(`  Persisted ${allClassifications.length} classification results (audit trail)`);
    } catch (err) {
      console.error("  Failed to persist classification audit trail:", err instanceof Error ? err.message : err);
    }
  }

  console.log("\n=== Done ===");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
