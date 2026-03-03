/**
 * AI-Powered Auto-Review for Admin Overrides
 *
 * Processes pending ScoringOverrides through Claude for a second-pass
 * evaluation, automatically applying approve/reject decisions above
 * confidence thresholds. Maintains an audit trail via AutoReviewResult.
 */

import Anthropic from "@anthropic-ai/sdk";
import { getPendingOverrides, approveOverride, rejectOverride } from "@/lib/admin";
import { CITIES_MAP } from "@/data/seed";
import { createLogger } from "@/lib/logger";

const logger = createLogger("auto-reviewer");

// Dynamic import to prevent client bundle contamination
async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

// -------------------------------------------------------
// Constants
// -------------------------------------------------------

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 1024;
const APPROVE_THRESHOLD = 0.85;
const REJECT_THRESHOLD = 0.90;
const SOURCE_FETCH_TIMEOUT = 5000;
const SOURCE_MAX_CHARS = 4000;
const DELAY_BETWEEN_CALLS_MS = 500;

// -------------------------------------------------------
// Claude API client (lazy singleton — same pattern as classifier.ts)
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
// Valid cities (mirrors classifier.ts)
// -------------------------------------------------------

const VALID_CITY_IDS = [
  "los_angeles", "new_york", "dallas", "miami", "orlando",
  "las_vegas", "phoenix", "houston", "austin", "san_diego",
  "san_francisco", "chicago", "atlanta", "nashville", "charlotte",
  "denver", "seattle", "boston", "minneapolis", "washington_dc",
];

// -------------------------------------------------------
// Types
// -------------------------------------------------------

export interface AutoReviewOptions {
  maxOverrides?: number;
  dryRun?: boolean;
  fetchSource?: boolean;
}

interface ReviewDecision {
  decision: "approve" | "reject" | "skip";
  confidence: number;
  assignedCityId: string | null;
  reasoning: string;
}

export interface AutoReviewResultItem {
  overrideId: string;
  decision: string;
  confidence: number;
  assignedCityId: string | null;
  reasoning: string;
  applied: boolean;
  error?: string;
}

export interface AutoReviewSummary {
  processed: number;
  approved: number;
  rejected: number;
  recommended: number;
  skipped: number;
  errors: number;
  results: AutoReviewResultItem[];
}

// -------------------------------------------------------
// Recommendation types
// -------------------------------------------------------

interface FactorRecommendation {
  field: string;
  currentValue: unknown;
  recommendedValue: unknown;
  confidence: number;
  reasoning: string;
}

interface RecommendationResponse {
  recommendations: FactorRecommendation[];
  noChangeReason: string | null;
}

// -------------------------------------------------------
// Valid scoring factor fields (City interface)
// -------------------------------------------------------

const SCORING_FACTORS = [
  "hasActivePilotProgram",
  "hasVertiportZoning",
  "vertiportCount",
  "activeOperators",
  "regulatoryPosture",
  "hasStateLegislation",
  "hasLaancCoverage",
] as const;

// -------------------------------------------------------
// Source document fetching
// -------------------------------------------------------

async function fetchSourceContent(url: string): Promise<string | null> {
  try {
    const parsedUrl = new URL(url);

    // Skip non-HTTP(S) URLs and PDFs
    if (!parsedUrl.protocol.startsWith("http")) return null;
    if (parsedUrl.pathname.endsWith(".pdf")) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SOURCE_FETCH_TIMEOUT);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "AirIndex-AutoReviewer/1.0" },
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      return null;
    }

    const text = await response.text();

    // Basic HTML stripping — extract text content
    const stripped = text
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return stripped.slice(0, SOURCE_MAX_CHARS) || null;
  } catch {
    logger.debug(`Failed to fetch source URL: ${url}`);
    return null;
  }
}

// -------------------------------------------------------
// Prompt building
// -------------------------------------------------------

const SYSTEM_PROMPT = `You are a senior reviewer for AirIndex, a UAM (Urban Air Mobility) market readiness platform. Your job is to review pending scoring overrides that were created by an automated ingestion pipeline and decide whether they should be approved, rejected, or left for human review.

## Scoring Model (7 factors, 0–100 scale)

Each market is scored on 7 binary factors:
1. **hasActivePilotProgram** (20 pts) — Active eVTOL testing or pilot program
2. **approvedVertiport** (20 pts) — At least one approved/built vertiport
3. **activeOperatorPresence** (15 pts) — At least one eVTOL operator active
4. **hasVertiportZoning** (15 pts) — Local zoning ordinance allows vertiport construction
5. **regulatoryPosture** (10 pts) — "friendly" (10), "neutral" (5), "restrictive" (0)
6. **hasStateLegislation** (10 pts) — State has signed UAM-enabling legislation
7. **hasLaancCoverage** (10 pts) — FAA LAANC low-altitude authorization coverage

## Review Guidelines

- **approve**: The override is well-supported by its reason/source, the field and value make sense for the city, and the evidence is clear
- **reject**: The override is incorrect, irrelevant, duplicative, or the evidence doesn't support the claimed change
- **skip**: The evidence is ambiguous, you need more context, or you're not confident enough in either direction

## Output

Return ONLY a JSON object (no markdown, no wrapping):
{
  "decision": "approve" | "reject" | "skip",
  "confidence": 0.0 to 1.0,
  "assignedCityId": "city_id" | null,
  "reasoning": "Brief explanation of your decision"
}

If the override has cityId "__unresolved__", try to determine the correct city from the reason/source content and set assignedCityId. Otherwise set assignedCityId to null.`;

function buildUserPrompt(
  override: {
    id: string;
    cityId: string;
    field: string;
    value: unknown;
    reason: string | null;
    confidence: string | null;
    sourceUrl: string | null;
  },
  sourceContent: string | null
): string {
  const parts = [
    `Review this pending scoring override:`,
    ``,
    `- **Override ID**: ${override.id}`,
    `- **City ID**: ${override.cityId}`,
    `- **Field**: ${override.field}`,
    `- **Proposed Value**: ${JSON.stringify(override.value)}`,
    `- **Reason**: ${override.reason ?? "No reason provided"}`,
    `- **Pipeline Confidence**: ${override.confidence ?? "unknown"}`,
    `- **Source URL**: ${override.sourceUrl ?? "None"}`,
  ];

  if (override.cityId === "__unresolved__") {
    parts.push(``);
    parts.push(`This override has an unresolved city. Valid city IDs are:`);
    parts.push(VALID_CITY_IDS.map((id) => `  - ${id}`).join("\n"));
  }

  if (sourceContent) {
    parts.push(``);
    parts.push(`## Source Document Content (truncated)`);
    parts.push(sourceContent);
  }

  return parts.join("\n");
}

// -------------------------------------------------------
// Recommendation prompt (for __review__ overrides)
// -------------------------------------------------------

const RECOMMENDATION_SYSTEM_PROMPT = `You are a senior analyst for AirIndex, a UAM (Urban Air Mobility) market readiness platform. Your job is to analyze filings and source documents to determine which scoring factors should change for a given city.

## Scoring Model (7 factors, 0–100 scale)

Each market is scored on 7 binary/enum factors:
1. **hasActivePilotProgram** (boolean, 20 pts) — Active eVTOL testing or pilot program in the city
2. **hasVertiportZoning** (boolean, 15 pts) — Local zoning ordinance allows vertiport construction
3. **vertiportCount** (number, 20 pts if > 0) — Number of approved/operational vertiports
4. **activeOperators** (string[], 15 pts if non-empty) — IDs of eVTOL operators active in the city
5. **regulatoryPosture** ("friendly" | "neutral" | "restrictive", 10 pts) — City/state regulatory stance toward UAM
6. **hasStateLegislation** (boolean, 10 pts) — State has signed UAM-enabling legislation
7. **hasLaancCoverage** (boolean, 10 pts) — FAA LAANC low-altitude authorization coverage

## Guidelines

- Only recommend changes that are clearly supported by the source document
- If the source is ambiguous or doesn't clearly indicate a factor change, set noChangeReason
- Be conservative — false positives waste admin time
- For activeOperators, recommend adding a specific operator ID (e.g. "op_joby", "op_archer")
- For regulatoryPosture, only recommend changes with strong evidence

## Output

Return ONLY a JSON object (no markdown, no wrapping):
{
  "recommendations": [
    {
      "field": "hasActivePilotProgram",
      "currentValue": false,
      "recommendedValue": true,
      "confidence": 0.87,
      "reasoning": "Filing describes signed agreement for active eVTOL pilot program"
    }
  ],
  "noChangeReason": null
}

If no factors should change, return an empty recommendations array with a noChangeReason string.`;

function buildRecommendationPrompt(
  cityId: string,
  reason: string | null,
  sourceContent: string | null
): string {
  const city = CITIES_MAP[cityId];
  const parts = [
    `Analyze this filing and determine which scoring factors should change for ${city?.city ?? cityId}.`,
    ``,
    `## Current Factor Values for ${city?.city ?? cityId}`,
  ];

  if (city) {
    parts.push(`- hasActivePilotProgram: ${city.hasActivePilotProgram}`);
    parts.push(`- hasVertiportZoning: ${city.hasVertiportZoning}`);
    parts.push(`- vertiportCount: ${city.vertiportCount}`);
    parts.push(`- activeOperators: ${JSON.stringify(city.activeOperators)}`);
    parts.push(`- regulatoryPosture: "${city.regulatoryPosture}"`);
    parts.push(`- hasStateLegislation: ${city.hasStateLegislation}`);
    parts.push(`- hasLaancCoverage: ${city.hasLaancCoverage}`);
  } else {
    parts.push(`(City data not found — use your best judgment)`);
  }

  if (reason) {
    parts.push(``);
    parts.push(`## Pipeline Reason`);
    parts.push(reason);
  }

  if (sourceContent) {
    parts.push(``);
    parts.push(`## Source Document Content (truncated)`);
    parts.push(sourceContent);
  }

  return parts.join("\n");
}

// -------------------------------------------------------
// Recommend factor changes for __review__ overrides
// -------------------------------------------------------

async function recommendFactorChanges(
  override: {
    id: string;
    cityId: string;
    field: string;
    value: unknown;
    reason: string | null;
    confidence: string | null;
    sourceUrl: string | null;
  },
  sourceContent: string | null
): Promise<{
  recommendations: FactorRecommendation[];
  noChangeReason: string | null;
}> {
  const client = getClient();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: 0,
    system: RECOMMENDATION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildRecommendationPrompt(
          override.cityId,
          override.reason,
          sourceContent
        ),
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in Claude response");
  }

  let jsonStr = textBlock.text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonStr) as RecommendationResponse;

  // Validate recommendations — filter to valid scoring fields only
  const validRecs = (parsed.recommendations ?? []).filter(
    (r) => SCORING_FACTORS.includes(r.field as (typeof SCORING_FACTORS)[number])
  );

  // Clamp confidence values
  for (const rec of validRecs) {
    rec.confidence = Math.max(0, Math.min(1, rec.confidence));
  }

  return {
    recommendations: validRecs,
    noChangeReason: parsed.noChangeReason ?? null,
  };
}

// -------------------------------------------------------
// Apply recommendations — upgrade __review__ override
// -------------------------------------------------------

async function applyRecommendations(
  overrideId: string,
  override: {
    id: string;
    cityId: string;
    reason: string | null;
    sourceRecordId?: string | null;
    sourceUrl: string | null;
  },
  recommendations: FactorRecommendation[],
  sourceContent: string | null,
  dryRun: boolean
): Promise<AutoReviewResultItem[]> {
  if (recommendations.length === 0) return [];
  if (dryRun) {
    return recommendations.map((rec) => ({
      overrideId,
      decision: "recommend",
      confidence: rec.confidence,
      assignedCityId: null,
      reasoning: rec.reasoning,
      applied: false,
    }));
  }

  const prisma = await getPrisma();
  const results: AutoReviewResultItem[] = [];

  // First recommendation upgrades the existing __review__ override
  const first = recommendations[0];
  await prisma.scoringOverride.update({
    where: { id: overrideId },
    data: {
      field: first.field,
      value: first.recommendedValue as never,
      reason: `[AI RECOMMENDATION] ${first.reasoning}${override.reason ? ` | Original: ${override.reason}` : ""}`,
      confidence: "needs_review",
    },
  });

  // Persist audit trail for first recommendation
  await persistResult(
    overrideId,
    {
      decision: "recommend",
      confidence: first.confidence,
      assignedCityId: null,
      reasoning: first.reasoning,
    },
    false, // not auto-applied — stays in queue for admin
    dryRun,
    sourceContent
  );

  results.push({
    overrideId,
    decision: "recommend",
    confidence: first.confidence,
    assignedCityId: null,
    reasoning: first.reasoning,
    applied: true,
  });

  // Additional recommendations create new ScoringOverride records
  for (let i = 1; i < recommendations.length; i++) {
    const rec = recommendations[i];
    const newOverride = await prisma.scoringOverride.create({
      data: {
        cityId: override.cityId,
        field: rec.field,
        value: rec.recommendedValue as never,
        reason: `[AI RECOMMENDATION] ${rec.reasoning}${override.reason ? ` | Original: ${override.reason}` : ""}`,
        sourceRecordId: override.sourceRecordId ?? undefined,
        sourceUrl: override.sourceUrl,
        confidence: "needs_review",
      },
    });

    await persistResult(
      newOverride.id,
      {
        decision: "recommend",
        confidence: rec.confidence,
        assignedCityId: null,
        reasoning: rec.reasoning,
      },
      false,
      dryRun,
      sourceContent
    );

    results.push({
      overrideId: newOverride.id,
      decision: "recommend",
      confidence: rec.confidence,
      assignedCityId: null,
      reasoning: rec.reasoning,
      applied: true,
    });
  }

  return results;
}

// -------------------------------------------------------
// Single override review
// -------------------------------------------------------

async function reviewOverride(
  override: {
    id: string;
    cityId: string;
    field: string;
    value: unknown;
    reason: string | null;
    confidence: string | null;
    sourceUrl: string | null;
  },
  fetchSource: boolean
): Promise<{ decision: ReviewDecision; sourceContent: string | null }> {
  const client = getClient();

  // Optionally fetch source document for unresolved or needs_review overrides
  let sourceContent: string | null = null;
  if (
    fetchSource &&
    override.sourceUrl &&
    (override.cityId === "__unresolved__" || override.confidence === "needs_review")
  ) {
    sourceContent = await fetchSourceContent(override.sourceUrl);
  }

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: 0,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildUserPrompt(override, sourceContent),
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in Claude response");
  }

  let jsonStr = textBlock.text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonStr) as ReviewDecision;

  // Validate decision
  if (!["approve", "reject", "skip"].includes(parsed.decision)) {
    throw new Error(`Invalid decision: ${parsed.decision}`);
  }

  // Validate assignedCityId if provided
  if (
    parsed.assignedCityId &&
    !VALID_CITY_IDS.includes(parsed.assignedCityId)
  ) {
    parsed.assignedCityId = null;
  }

  // Clamp confidence
  parsed.confidence = Math.max(0, Math.min(1, parsed.confidence));

  return { decision: parsed, sourceContent };
}

// -------------------------------------------------------
// Apply decisions
// -------------------------------------------------------

async function applyDecision(
  overrideId: string,
  decision: ReviewDecision,
  dryRun: boolean
): Promise<boolean> {
  if (dryRun) return false;

  if (decision.decision === "approve" && decision.confidence >= APPROVE_THRESHOLD) {
    await approveOverride(overrideId, decision.assignedCityId ?? undefined);
    return true;
  }

  if (decision.decision === "reject" && decision.confidence >= REJECT_THRESHOLD) {
    await rejectOverride(overrideId);
    return true;
  }

  return false;
}

// -------------------------------------------------------
// Persist audit trail
// -------------------------------------------------------

async function persistResult(
  overrideId: string,
  decision: { decision: string; confidence: number; assignedCityId: string | null; reasoning: string },
  applied: boolean,
  dryRun: boolean,
  sourceContent: string | null
): Promise<void> {
  try {
    const prisma = await getPrisma();
    await prisma.autoReviewResult.create({
      data: {
        overrideId,
        decision: decision.decision,
        confidence: decision.confidence,
        assignedCityId: decision.assignedCityId,
        reasoning: decision.reasoning,
        applied,
        dryRun,
        modelUsed: MODEL,
        sourceContent,
      },
    });
  } catch (err) {
    logger.error("Failed to persist auto-review result:", err);
  }
}

// -------------------------------------------------------
// Public API
// -------------------------------------------------------

export async function runAutoReview(
  options: AutoReviewOptions = {}
): Promise<AutoReviewSummary> {
  const {
    maxOverrides = 20,
    dryRun = false,
    fetchSource = true,
  } = options;

  const pending = await getPendingOverrides();
  const toProcess = pending.slice(0, maxOverrides);

  logger.info(
    `[auto-review] Starting review of ${toProcess.length}/${pending.length} pending overrides (dryRun=${dryRun})`
  );

  const summary: AutoReviewSummary = {
    processed: 0,
    approved: 0,
    rejected: 0,
    recommended: 0,
    skipped: 0,
    errors: 0,
    results: [],
  };

  for (const override of toProcess) {
    try {
      // Branch: __review__ overrides get the recommendation flow
      if (override.field === "__review__") {
        // Fetch source document for recommendation context
        let sourceContent: string | null = null;
        if (fetchSource && override.sourceUrl) {
          sourceContent = await fetchSourceContent(override.sourceUrl);
        }

        const { recommendations, noChangeReason } =
          await recommendFactorChanges(override, sourceContent);

        if (recommendations.length > 0) {
          const recResults = await applyRecommendations(
            override.id,
            override,
            recommendations,
            sourceContent,
            dryRun
          );
          summary.recommended += recResults.length;
          summary.results.push(...recResults);

          logger.info(
            `[auto-review] Override ${override.id}: ${recommendations.length} recommendation(s) generated`
          );
        } else {
          // No recommendations — persist a skip result
          const skipReason = noChangeReason ?? "No factor changes identified";
          await persistResult(
            override.id,
            {
              decision: "skip",
              confidence: 0,
              assignedCityId: null,
              reasoning: skipReason,
            },
            false,
            dryRun,
            sourceContent
          );

          summary.skipped++;
          summary.results.push({
            overrideId: override.id,
            decision: "skip",
            confidence: 0,
            assignedCityId: null,
            reasoning: skipReason,
            applied: false,
          });

          logger.info(
            `[auto-review] Override ${override.id}: no recommendations (${skipReason})`
          );
        }

        summary.processed++;
      } else {
        // Standard approve/reject flow for non-__review__ overrides
        const resultItem: AutoReviewResultItem = {
          overrideId: override.id,
          decision: "skip",
          confidence: 0,
          assignedCityId: null,
          reasoning: "",
          applied: false,
        };

        const { decision, sourceContent } = await reviewOverride(
          override,
          fetchSource
        );

        resultItem.decision = decision.decision;
        resultItem.confidence = decision.confidence;
        resultItem.assignedCityId = decision.assignedCityId;
        resultItem.reasoning = decision.reasoning;

        const applied = await applyDecision(override.id, decision, dryRun);
        resultItem.applied = applied;

        await persistResult(override.id, decision, applied, dryRun, sourceContent);

        if (decision.decision === "approve" && applied) {
          summary.approved++;
        } else if (decision.decision === "reject" && applied) {
          summary.rejected++;
        } else {
          summary.skipped++;
        }

        summary.processed++;
        summary.results.push(resultItem);

        logger.info(
          `[auto-review] Override ${override.id}: ${decision.decision} (confidence=${decision.confidence.toFixed(2)}, applied=${applied})`
        );
      }
    } catch (err) {
      summary.errors++;
      summary.processed++;

      const errorItem: AutoReviewResultItem = {
        overrideId: override.id,
        decision: "skip",
        confidence: 0,
        assignedCityId: null,
        reasoning: "",
        applied: false,
        error: err instanceof Error ? err.message : String(err),
      };
      errorItem.reasoning = `Error: ${errorItem.error}`;
      summary.results.push(errorItem);

      logger.error(`[auto-review] Error processing override ${override.id}:`, err);
    }

    // Delay between Claude calls to avoid hammering the API
    if (toProcess.indexOf(override) < toProcess.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_CALLS_MS));
    }
  }

  logger.info(
    `[auto-review] Complete: ${summary.processed} processed, ${summary.approved} approved, ${summary.rejected} rejected, ${summary.recommended} recommended, ${summary.skipped} skipped, ${summary.errors} errors`
  );

  return summary;
}
