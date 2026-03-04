/**
 * NLP Classifier — sends ingested records to Claude API for intelligent
 * document classification, producing OverrideCandidate[] output compatible
 * with the existing score-updater pipeline.
 *
 * Falls back to the regex rules engine if the API call fails.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { IngestedRecord } from "@/lib/ingestion";
import type { OverrideCandidate } from "@/lib/rules-engine";

// Dynamic import to prevent client bundle contamination
async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

// -------------------------------------------------------
// Constants
// -------------------------------------------------------

const PROMPT_VERSION = "v2";
const MODEL = "claude-haiku-4-5-20251001";
const BATCH_SIZE = 10;
const MAX_TOKENS = 4096;

// State → city ID mapping (mirrors rules-engine.ts)
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

// -------------------------------------------------------
// System prompt
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

## Tracked Operators

| Operator ID | Name |
|-------------|------|
| op_joby | Joby Aviation |
| op_archer | Archer Aviation |
| op_wisk | Wisk Aero |
| op_blade | Blade Air Mobility |
| op_volocopter | Volocopter |

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
// Types
// -------------------------------------------------------

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
// Claude API client (lazy singleton)
// -------------------------------------------------------

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

// -------------------------------------------------------
// Batch processing
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
  records: IngestedRecord[]
): Promise<ClassificationItem[]> {
  const client = getClient();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: 0,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildUserPrompt(records),
      },
    ],
  });

  // Extract text content from the response
  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in Claude response");
  }

  const rawText = textBlock.text.trim();

  // Parse JSON — handle potential markdown wrapping
  let jsonStr = rawText;
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonStr);

  if (!Array.isArray(parsed)) {
    throw new Error("Claude response is not a JSON array");
  }

  // Validate and return
  return parsed as ClassificationItem[];
}

// -------------------------------------------------------
// Map classifications to OverrideCandidates
// -------------------------------------------------------

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

function mapToOverrideCandidates(
  classifications: ClassificationItem[],
  recordsById: Map<string, IngestedRecord>
): OverrideCandidate[] {
  const candidates: OverrideCandidate[] = [];

  for (const item of classifications) {
    // Skip not_relevant classifications
    if (item.eventType === "not_relevant") continue;

    const record = recordsById.get(item.recordId);
    if (!record) continue;

    // Resolve city IDs
    let cityIds = item.affectedCityIds.filter((id) => VALID_CITY_IDS.has(id));

    // If no specific cities but record has a state, use state mapping
    if (cityIds.length === 0 && record.state) {
      const stateKey = record.state.toUpperCase();
      cityIds = STATE_TO_CITIES[stateKey] ?? [];
    }

    // If still no cities, mark as unresolved
    if (cityIds.length === 0) {
      cityIds = ["__unresolved__"];
    }

    // Create one OverrideCandidate per city per factor
    for (const factor of item.factorsAffected) {
      if (!VALID_FIELDS.has(factor.field)) continue;

      for (const cityId of cityIds) {
        candidates.push({
          cityId,
          field: factor.field,
          value: factor.value,
          reason: `[NLP] ${item.summary} — ${factor.reason}`,
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
// Persist classification results for audit trail
// -------------------------------------------------------

async function persistClassifications(
  classifications: ClassificationItem[],
  rawResponse: unknown
): Promise<void> {
  try {
    const prisma = await getPrisma();

    await prisma.classificationResult.createMany({
      data: classifications.map((item) => ({
        recordId: item.recordId,
        eventType: item.eventType,
        factorsJson: JSON.parse(JSON.stringify(item.factorsAffected)),
        affectedCities: item.affectedCityIds,
        confidence: item.confidence,
        rawResponse: JSON.parse(JSON.stringify(rawResponse)),
        modelUsed: MODEL,
        promptVersion: PROMPT_VERSION,
      })),
    });

    console.log(
      `[classifier] Persisted ${classifications.length} classification results`
    );
  } catch (err) {
    // Don't fail the pipeline if audit persistence fails
    console.error("[classifier] Failed to persist classification results:", err);
  }
}

// -------------------------------------------------------
// Public API
// -------------------------------------------------------

export async function classifyRecords(
  records: IngestedRecord[]
): Promise<OverrideCandidate[]> {
  if (records.length === 0) return [];

  const recordsById = new Map(records.map((r) => [r.id, r]));
  const allClassifications: ClassificationItem[] = [];
  const allRawResponses: unknown[] = [];

  // Process in batches
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    console.log(
      `[classifier] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(records.length / BATCH_SIZE)} (${batch.length} records)`
    );

    const classifications = await classifyBatch(batch);
    allClassifications.push(...classifications);
    allRawResponses.push({ batch: Math.floor(i / BATCH_SIZE) + 1, classifications });
  }

  // Persist audit trail
  await persistClassifications(allClassifications, allRawResponses);

  // Map to OverrideCandidates
  const candidates = mapToOverrideCandidates(allClassifications, recordsById);

  console.log(
    `[classifier] Classified ${records.length} records → ${allClassifications.length} classifications → ${candidates.length} override candidates`
  );

  return candidates;
}
