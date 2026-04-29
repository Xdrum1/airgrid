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
import type { MarketLeadSignal } from "@/lib/market-leads";
import { CITIES, OPERATORS, STATE_TO_CITIES } from "@/data/seed";

// Dynamic import to prevent client bundle contamination
async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

// -------------------------------------------------------
// Constants
// -------------------------------------------------------

const PROMPT_VERSION = "v7";
const MODEL = "claude-haiku-4-5-20251001";
const BATCH_SIZE = 10;
const MAX_TOKENS = 4096;

// STATE_TO_CITIES is now imported from seed.ts (single source of truth)

// -------------------------------------------------------
// System prompt
// -------------------------------------------------------

// Generate city and operator tables dynamically from seed data
const CITY_TABLE = CITIES.map((c) => `| ${c.id} | ${c.city} | ${c.state} |`).join("\n");
const OPERATOR_TABLE = OPERATORS.map((o) => `| ${o.id} | ${o.name} |`).join("\n");

const SYSTEM_PROMPT = `You are a regulatory intelligence classifier for AirIndex, a UAM (Urban Air Mobility) market readiness platform. Your job is to analyze ingested documents and determine whether they affect the readiness scores of tracked US markets.

## Scoring Model (7 factors, 0–100 scale)

Each market is scored on 7 factors (v1.3 weights):
1. **hasActivePilotProgram** (15 pts) — Active eVTOL testing or pilot program in the city. Requires a specific city-level program, not just an operator having FAA certification.
2. **approvedVertiport** (15 pts) — At least one approved/built vertiport in this specific city.
3. **activeOperatorPresence** (15 pts) — A specific NAMED operator (from the Tracked Operators table, or another clearly identified eVTOL company) has announced or begun operations in this specific market (city). State-level program announcements, RFPs, "approved tests", or generic "operator(s)" language without a named company do NOT count — those affect hasActivePilotProgram only. General corporate news (earnings, stock offerings, fundraising) does NOT count.
4. **hasVertiportZoning** (15 pts) — Local zoning ordinance specifically allows vertiport construction in this city.
5. **regulatoryPosture** (10 pts) — City/state regulatory stance: "friendly" (10), "neutral" (5), "restrictive" (0). Requires explicit city or state policy action.
6. **stateLegislationStatus** (20 pts) — State legislation status: "enacted" (20 pts, signed into law), "actively_moving" (10 pts, bill in late stages — transmit to house, second reading, ordered enrolled, governor's desk), "none" (0 pts). Federal FAA actions do NOT count. Field name in output remains "hasStateLegislation" for compatibility.
7. **weatherInfraLevel** (10 pts) — Dedicated low-altitude weather sensing infrastructure for AAM operations: "full" (10 pts), "partial" (5 pts, airport weather stations only), "none" (0 pts).

## Tracked Markets (${CITIES.length} US cities)

| City ID | City | State |
|---------|------|-------|
${CITY_TABLE}

## Tracked Operators

| Operator ID | Name |
|-------------|------|
${OPERATOR_TABLE}

## Event Type Vocabulary

Classify each record into exactly one event type:
- \`state_legislation_signed\` — A specific STATE bill signed/enacted that enables UAM operations. Only factors affected: hasStateLegislation. NOT for federal actions.
- \`state_legislation_failed\` — A specific STATE AAM/UAM bill that FAILED in committee, was withdrawn, tabled, or died. This is a HIGH RELEVANCE negative signal — it means a market's legislative momentum has reversed. Factors affected: hasStateLegislation (value should reflect regression, e.g. from "actively_moving" to "none"). Look for keywords: "failed to pass", "withdrawn", "tabled indefinitely", "died in committee".
- \`vertiport_zoning_approved\` — Zoning ordinance for vertiport construction approved in a specific city. Only factors affected: hasVertiportZoning, approvedVertiport.
- \`faa_corridor_filing\` — FAA filing related to air corridors, airspace design, or powered-lift operations. Only factors affected: regulatoryPosture.
- \`faa_certification_milestone\` — FAA type certificate, airworthiness, or Part 135 milestone for an operator. This does NOT directly affect any city scoring factor unless it mentions a specific city launch. If no city is mentioned, classify as not_relevant.
- \`operator_market_expansion\` — Operator announcing expansion into a specific new city/market. Only factors affected: activeOperatorPresence, hasActivePilotProgram.
- \`regulatory_posture_change\` — Change in city/state regulatory stance toward UAM. Only factors affected: regulatoryPosture.
- \`infrastructure_development\` — New vertiport, charging infrastructure, or ground support in a specific city. Only factors affected: approvedVertiport, hasVertiportZoning.
- \`not_relevant\` — Document does not affect any specific city's readiness score. Use this for: general industry news, corporate earnings/financials, stock offerings, fundraising, federal policy without city-specific impact, opinion pieces, and analyst commentary. IMPORTANT: Do NOT classify failed/withdrawn/dead legislation as not_relevant — bill failures are negative scoring signals that affect hasStateLegislation. Use \`state_legislation_failed\` instead.

## Output Schema

Return a JSON array. For each record, output one object:
\`\`\`json
{
  "recordId": "string — the record's id field",
  "eventType": "string — one of the event types above",
  "factorsAffected": [
    {
      "field": "string — one of: hasActivePilotProgram, approvedVertiport, activeOperatorPresence, hasVertiportZoning, regulatoryPosture, hasStateLegislation, weatherInfraLevel",
      "value": "the new value (true/false for booleans, 'friendly'/'neutral'/'restrictive' for regulatoryPosture)",
      "reason": "string — brief explanation of why this factor is affected"
    }
  ],
  "affectedCityIds": ["string — city IDs from the table above"],
  "untrackedCities": [
    {
      "city": "string — city name mentioned in the document that is NOT in the tracked markets table",
      "state": "string — 2-letter state abbreviation",
      "reason": "string — why this city appears relevant to UAM readiness"
    }
  ],
  "confidence": "high | medium | needs_review",
  "summary": "string — one-sentence summary of the classification"
}
\`\`\`

## Confidence Guidelines

- **high**: Document explicitly states a completed action (bill signed, certificate issued, zoning approved, operator launch announced) AND you can map it to one or more specific city IDs from the table. Use this confidently when the evidence is clear — high confidence overrides get auto-applied.
- **medium**: Document describes a likely or in-progress impact (proposed bill, planned expansion, pilot announced but not launched) AND you can map to specific cities. Also use for state-level legislation mapped to all cities in that state.
- **needs_review**: You cannot map to specific cities, the evidence is ambiguous, or you're unsure which factors are affected.

## Rules

1. If a record is \`not_relevant\`, set \`factorsAffected\` to an empty array and \`affectedCityIds\` to an empty array.
2. **CRITICAL**: If you cannot identify at least one specific city affected, classify as \`not_relevant\`. A classification without affected cities has no value — it cannot be applied to any market's score. General federal news, industry trends, and corporate financials without city-specific impact are \`not_relevant\`.
3. For state-level legislation, map to ALL cities in that state using the table above. NEVER assign cities from a different state — an Arizona bill cannot affect \`las_vegas\` (Nevada) or \`dallas\` (Texas).
4. For SEC/operator filings, try to identify which specific markets/cities the content mentions. General corporate filings (earnings, stock offerings, capital raises) are \`not_relevant\` unless they mention specific city expansions.
5. For \`affectedCityIds\`, only output valid city IDs from the table above. If the document mentions UAM activity in a city NOT in the table, add it to \`untrackedCities\` instead (with city name, state, and reason). Set \`untrackedCities\` to an empty array if no untracked cities are mentioned.
6b. When you can identify a likely city but are uncertain, prefer assigning it at \`needs_review\` confidence over leaving \`affectedCityIds\` empty. An override with a city at \`needs_review\` can be manually verified; one with no city cannot be applied at all.
6. Each \`factorsAffected\` entry MUST use a field that is valid for the event type (see event type definitions above). Do not set \`hasStateLegislation\` for federal actions or certification milestones.
7. Return ONLY the JSON array — no markdown, no explanation, no wrapping.
8. **Named-operator guard**: Do NOT emit a \`factorsAffected\` entry with \`field: "activeOperatorPresence"\` and \`value: true\` unless the document names a specific eVTOL operator (Joby, Archer, Beta, Volocopter, Eve, Lilium, Wisk, Vertical, Blade, SkyDrive, EHang, etc.) AND ties that operator to the affected city. State programs, "approved tests," or unnamed-operator language belong on \`hasActivePilotProgram\` only. When in doubt, downgrade confidence to \`needs_review\` rather than asserting operator presence.

## IMPORTANT: Look Past Headlines — Identify the Underlying Event

Many relevant regulatory and market signals are reported through a financial/stock framing. Do NOT dismiss an article as not_relevant just because it leads with stock movement or analyst commentary. Always ask: "What is the underlying event?" before classifying.

Examples of stock-framed articles that contain real scoring signals:
- "Joby Stock Rises as First FAA Test Aircraft Flies" → The underlying event is an FAA certification milestone.
- "Archer, Joby Stocks Jump After Inclusion in Federal Program" → The underlying event is operator selection for a federal pilot program (operator_market_expansion if specific cities are mentioned).
- "Flying Cars Take Next Step with Joby's First FAA Flight" → FAA flight test = faa_certification_milestone.
- "eVTOL Stocks Rally on DOT Future of Flight Pilot Program Launch in Miami, Dallas" → The underlying event is a DOT/FAA pilot program selection for specific cities (hasActivePilotProgram for Miami, Dallas). The stock rally is commentary — the pilot program launch is the scoring signal.
- "Analysts Weigh In as DOT Selects 5 Cities for Advanced Air Mobility Integration" → The underlying event is a federal pilot program with city-specific impact. Classify by the cities selected, not the analyst commentary.

If the underlying event is a completed regulatory action, certification milestone, operator launch, or pilot program selection — classify it by the event, not the headline framing. This is especially critical for government program announcements (DOT, FAA, state DOTs) that are frequently reported through financial media with stock-focused framing.

## Metro Area Mappings

When a document mentions a city or location that is part of a tracked metro area, map it to the correct city ID:
- Oakland, San Jose, Berkeley, Palo Alto, Mountain View, Fremont → \`san_francisco\`
- Fort Worth, Arlington (TX), Plano, Irving → \`dallas\`
- Fort Lauderdale, Boca Raton, West Palm Beach, Hialeah → \`miami\`
- Jersey City, Newark (NJ), Hoboken, Brooklyn, Queens → \`new_york\`
- Long Beach, Pasadena, Santa Monica, Burbank, Inglewood → \`los_angeles\`
- Aurora, Lakewood, Boulder → \`denver\`
- Renton, Bellevue, Tacoma, Everett → \`seattle\`
- Tempe, Scottsdale, Mesa, Chandler → \`phoenix\`
- Sandy Springs, Marietta, Decatur → \`atlanta\`
- Cambridge, Somerville, Quincy → \`boston\`
- The Woodlands, Sugar Land, Katy, Galveston → \`houston\`
- Round Rock, Cedar Park, San Marcos → \`austin\`
- St. Paul, Bloomington (MN), Eden Prairie → \`minneapolis\`
- Arlington (VA), Alexandria, Tysons, Fairfax → \`washington_dc\`
- Henderson, North Las Vegas, Summerlin → \`las_vegas\`
- Kissimmee, Sanford, Lake Nona → \`orlando\`

## Federal vs. State Distinction

Be precise about federal versus state actions:
- **Federal** (FAA, DOT, White House, Congress): These affect \`hasActivePilotProgram\` (if city-specific pilot program), \`regulatoryPosture\`, or are \`faa_certification_milestone\` / \`faa_corridor_filing\`. They NEVER affect \`hasStateLegislation\`.
- **State** (state legislature, governor signing): These affect \`hasStateLegislation\`. A "five-state pilot program" led by a state DOT is state action. A "federal pilot program" selected by DOT/FAA is federal action.
- If unclear whether an action is federal or state, default to \`needs_review\`.`;

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
  untrackedCities?: {
    city: string;
    state: string;
    reason: string;
  }[];
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

// Derived from seed data — stays in sync automatically when markets are added
const VALID_CITY_IDS = new Set(CITIES.map((c) => c.id));

// Map cityId → state code, for cross-state validation
const CITY_TO_STATE = new Map(CITIES.map((c) => [c.id, c.state]));

const VALID_FIELDS = new Set([
  "hasActivePilotProgram", "hasVertiportZoning", "approvedVertiport",
  "activeOperatorPresence", "regulatoryPosture", "hasStateLegislation",
  "weatherInfraLevel",
]);

// Metro suburbs the classifier sometimes emits as standalone city IDs.
// These are not tracked markets — they should normalize to the parent metro.
// Mirrors the metro mapping in the system prompt so we don't lose signals
// when the model fails to apply the rule itself.
const METRO_SUBURB_TO_PARENT: Record<string, string> = {
  // SF Bay Area
  oakland: "san_francisco", san_jose: "san_francisco", berkeley: "san_francisco",
  palo_alto: "san_francisco", mountain_view: "san_francisco", fremont: "san_francisco",
  // DFW
  fort_worth: "dallas", arlington_tx: "dallas", plano: "dallas", irving: "dallas",
  // South Florida
  fort_lauderdale: "miami", boca_raton: "miami", west_palm_beach: "miami", hialeah: "miami",
  // NYC
  jersey_city: "new_york", newark: "new_york", hoboken: "new_york",
  brooklyn: "new_york", queens: "new_york",
  // LA metro
  long_beach: "los_angeles", pasadena: "los_angeles", santa_monica: "los_angeles",
  burbank: "los_angeles", inglewood: "los_angeles",
  // Denver
  aurora: "denver", lakewood: "denver", boulder: "denver",
  // Seattle
  renton: "seattle", bellevue: "seattle", tacoma: "seattle", everett: "seattle",
  // Phoenix metro — the cities Pulse Issue 5 named that don't exist
  tempe: "phoenix", scottsdale: "phoenix", mesa: "phoenix", chandler: "phoenix",
  // Atlanta
  sandy_springs: "atlanta", marietta: "atlanta", decatur: "atlanta",
  // Boston
  cambridge: "boston", somerville: "boston", quincy: "boston",
  // Houston
  the_woodlands: "houston", sugar_land: "houston", katy: "houston", galveston: "houston",
  // Austin
  round_rock: "austin", cedar_park: "austin", san_marcos: "austin",
  // Minneapolis
  st_paul: "minneapolis", bloomington: "minneapolis", eden_prairie: "minneapolis",
  // DC area
  arlington_va: "washington_dc", alexandria: "washington_dc", tysons: "washington_dc",
  fairfax: "washington_dc",
  // Las Vegas
  henderson: "las_vegas", north_las_vegas: "las_vegas", summerlin: "las_vegas",
  // Orlando
  kissimmee: "orlando", sanford: "orlando", lake_nona: "orlando",
};

// Match operator mentions in record content so federal/operator news without
// a specific city can route to the operator's known markets instead of
// black-holing into __unresolved__.
const OPERATOR_NAME_PATTERNS: { id: string; pattern: RegExp }[] = [
  { id: "op_joby",        pattern: /\bjoby\b/i },
  { id: "op_archer",      pattern: /\barcher\b/i },
  { id: "op_wisk",        pattern: /\bwisk\b/i },
  { id: "op_volocopter",  pattern: /\bvolocopter\b/i },
  { id: "op_blade",       pattern: /\bblade\b/i },
];

function detectOperators(text: string): string[] {
  return OPERATOR_NAME_PATTERNS.filter((p) => p.pattern.test(text)).map((p) => p.id);
}

// Deterministic guard for activeOperatorPresence — backstops the v7 prompt
// rule that the classifier alone wasn't enforcing (Apr 29 audit found 43
// activeOperatorPresence=true overrides emitted from NYC headlines like
// "Air-taxi company completes..." that don't actually name an operator).
//
// Patterns are intentionally tight: bare `\beve\b` / `\bbeta\b` would match
// "eve of the announcement" / "beta version", so the multi-word eVTOL
// companies require their corporate qualifier.
const NAMED_OPERATOR_GUARD: RegExp[] = [
  /\bjoby\b/i,
  /\barcher\b/i,
  /\bbeta\s+(technologies|aviation|aircraft|electric|air)\b/i,
  /\bvolocopter\b/i,
  /\beve\s+(air\s+mobility|holding|aerospace|aircraft)\b/i,
  /\blilium\b/i,
  /\bwisk\b/i,
  /\bvertical\s+aerospace\b/i,
  /\bblade\b/i,
  /\bskydrive\b/i,
  /\behang\b/i,
  /\boverair\b/i,
  /\bsupernal\b/i,
];

export function namesTrackedOperator(text: string): boolean {
  return NAMED_OPERATOR_GUARD.some((p) => p.test(text));
}

function getOperatorCities(operatorId: string): string[] {
  const op = OPERATORS.find((o) => o.id === operatorId);
  return op?.activeMarkets ?? [];
}

function mapToOverrideCandidates(
  classifications: ClassificationItem[],
  recordsById: Map<string, IngestedRecord>
): OverrideCandidate[] {
  const candidates: OverrideCandidate[] = [];
  let guardDrops = 0;

  for (const item of classifications) {
    // Skip not_relevant classifications unless they identified factor changes
    if (item.eventType === "not_relevant" && (!item.factorsAffected || item.factorsAffected.length === 0)) continue;

    const record = recordsById.get(item.recordId);
    if (!record) continue;

    // Step 1: Normalize metro suburbs to their parent city BEFORE filtering.
    // The classifier sometimes emits "scottsdale", "mesa", etc. as standalone
    // IDs even though the prompt says to map them to the metro. Catch them
    // here so we don't lose the signal.
    const normalized = item.affectedCityIds.map((id) => METRO_SUBURB_TO_PARENT[id] ?? id);

    // Step 2: Filter to only valid tracked city IDs (dedup after normalization)
    let cityIds = Array.from(new Set(normalized.filter((id) => VALID_CITY_IDS.has(id))));

    // Step 2b: Cross-state guard. If the source record has an explicit state
    // (e.g. LegiScan bill from AZ), the classifier sometimes still emits
    // out-of-state cityIds (las_vegas on an AZ bill, washington_dc on a VA
    // bill). Drop any cityId whose home state doesn't match the source state.
    // Only applies when the source record has a state — operator news has
    // none, in which case we trust the classifier's geographic inference.
    if (record.state && cityIds.length > 0) {
      const sourceState = record.state.toUpperCase();
      cityIds = cityIds.filter((id) => CITY_TO_STATE.get(id) === sourceState);
    }

    // Step 3: If no specific cities but record has a state, use state mapping
    if (cityIds.length === 0 && record.state) {
      const stateKey = record.state.toUpperCase();
      cityIds = STATE_TO_CITIES[stateKey] ?? [];
    }

    // Step 4: If still no cities, try operator → markets routing.
    // Catches "Joby announces national thing" → route to all 6 Joby markets
    // instead of black-holing into __unresolved__.
    if (cityIds.length === 0) {
      const text = `${record.title} ${record.summary}`;
      const operators = detectOperators(text);
      const operatorCities = new Set<string>();
      for (const opId of operators) {
        for (const c of getOperatorCities(opId)) operatorCities.add(c);
      }
      if (operatorCities.size > 0) {
        cityIds = Array.from(operatorCities);
      }
    }

    // Step 5: If still no cities, mark as unresolved
    if (cityIds.length === 0) {
      cityIds = ["__unresolved__"];
    }

    // Create one OverrideCandidate per city per factor
    for (const factor of item.factorsAffected) {
      if (!VALID_FIELDS.has(factor.field)) continue;

      // v7 named-operator guard (deterministic backstop for prompt rule #8).
      // The classifier sees only title + summary; if neither names a tracked
      // eVTOL operator, an activeOperatorPresence=true claim is unsupported
      // by its input and must be dropped regardless of confidence.
      if (factor.field === "activeOperatorPresence" && factor.value === true) {
        const sourceText = `${record.title} ${record.summary}`;
        if (!namesTrackedOperator(sourceText)) {
          guardDrops++;
          console.log(
            `[classifier] guard drop: activeOperatorPresence=true with no ` +
              `named operator in source — record=${record.id} ` +
              `title="${record.title.slice(0, 80)}"`,
          );
          continue;
        }
      }

      for (const cityId of cityIds) {
        candidates.push({
          cityId,
          field: factor.field,
          value: factor.value,
          reason: `[NLP] ${item.summary} — ${factor.reason}`,
          sourceRecordId: record.id,
          sourceUrl: record.url,
          // Operator-routed (no explicit city in source) gets needs_review
          // since it's a fan-out, not a direct attribution.
          confidence: cityId === "__unresolved__" ? "needs_review" : item.confidence,
        });
      }
    }
  }

  if (guardDrops > 0) {
    console.log(`[classifier] Named-operator guard dropped ${guardDrops} activeOperatorPresence=true factor(s)`);
  }

  return candidates;
}

// -------------------------------------------------------
// Persist classification results for audit trail
// -------------------------------------------------------

function normalizeAffectedCities(raw: string[]): string[] {
  // Apply the same rules used downstream at override-candidate generation:
  //   1) Map metro suburbs to their parent city (scottsdale → phoenix, etc.)
  //   2) Drop any ID not in the tracked city set
  //   3) Preserve the sentinel `__unresolved__` if explicitly present
  // Writing only validated IDs to ClassificationResult.affectedCities means
  // every downstream reader (forward-signals, market-watch, admin debug) sees
  // a clean set — the suburb map + valid-city filter stop being a last-line
  // defense and become the only defense needed.
  const normalized = raw.map((id) => METRO_SUBURB_TO_PARENT[id] ?? id);
  const filtered = normalized.filter(
    (id) => id === "__unresolved__" || VALID_CITY_IDS.has(id),
  );
  return Array.from(new Set(filtered));
}

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
        affectedCities: normalizeAffectedCities(item.affectedCityIds),
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

// -------------------------------------------------------
// Extract market lead signals from classifier output
// -------------------------------------------------------

function extractMarketLeadSignals(
  classifications: ClassificationItem[],
  recordsById: Map<string, IngestedRecord>
): MarketLeadSignal[] {
  const signals: MarketLeadSignal[] = [];

  for (const item of classifications) {
    if (item.eventType === "not_relevant") continue;
    if (!item.untrackedCities || item.untrackedCities.length === 0) continue;

    const record = recordsById.get(item.recordId);
    if (!record) continue;

    for (const uc of item.untrackedCities) {
      if (!uc.city || !uc.state) continue;

      signals.push({
        city: uc.city,
        state: uc.state.toUpperCase(),
        source: "classifier",
        sourceRecordId: record.id,
        sourceUrl: record.url,
        signalText: `${item.summary} — ${uc.reason}`,
        signalType: "classifier_detection",
        confidence: item.confidence === "high" ? "high" : item.confidence === "medium" ? "medium" : "low",
      });
    }
  }

  return signals;
}

// -------------------------------------------------------
// Public API
// -------------------------------------------------------

export async function classifyRecords(
  records: IngestedRecord[]
): Promise<{ overrideCandidates: OverrideCandidate[]; marketLeadSignals: MarketLeadSignal[] }> {
  if (records.length === 0) return { overrideCandidates: [], marketLeadSignals: [] };

  const recordsById = new Map(records.map((r) => [r.id, r]));
  const allClassifications: ClassificationItem[] = [];
  const allRawResponses: unknown[] = [];

  // Build batches
  const batches: IngestedRecord[][] = [];
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    batches.push(records.slice(i, i + BATCH_SIZE));
  }

  // Process batches in parallel groups of MAX_PARALLEL to balance speed vs rate limits.
  // Pure sequential was too slow (exceeded Lambda timeout with 1s delays).
  // Pure parallel (Promise.all) caused all batches to fail on rate limit.
  // Compromise: parallel groups of 3 with retry per batch.
  const MAX_PARALLEL = 3;
  console.log(
    `[classifier] Processing ${batches.length} batches (${records.length} records) in groups of ${MAX_PARALLEL} with retry`
  );

  for (let g = 0; g < batches.length; g += MAX_PARALLEL) {
    const group = batches.slice(g, g + MAX_PARALLEL);
    const groupResults = await Promise.allSettled(
      group.map(async (batch, localIdx) => {
        const batchNum = g + localIdx + 1;
        let attempt = 0;
        const maxRetries = 1;
        while (attempt <= maxRetries) {
          try {
            const classifications = await classifyBatch(batch);
            return { batch: batchNum, classifications };
          } catch (err) {
            attempt++;
            if (attempt > maxRetries) {
              console.error(`[classifier] Batch ${batchNum}/${batches.length} failed after ${maxRetries + 1} attempts:`, err);
              return { batch: batchNum, classifications: [] };
            }
            await new Promise((r) => setTimeout(r, 2000));
          }
        }
        return { batch: g + localIdx + 1, classifications: [] };
      })
    );

    for (const result of groupResults) {
      if (result.status === "fulfilled") {
        allClassifications.push(...result.value.classifications);
        allRawResponses.push(result.value);
      }
    }

    // Brief pause between groups if more remain
    if (g + MAX_PARALLEL < batches.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // Persist audit trail
  await persistClassifications(allClassifications, allRawResponses);

  // Map to OverrideCandidates
  const overrideCandidates = mapToOverrideCandidates(allClassifications, recordsById);

  // Extract market lead signals from untracked cities
  const marketLeadSignals = extractMarketLeadSignals(allClassifications, recordsById);

  console.log(
    `[classifier] Classified ${records.length} records → ${allClassifications.length} classifications → ${overrideCandidates.length} override candidates, ${marketLeadSignals.length} market lead signals`
  );

  return { overrideCandidates, marketLeadSignals };
}
