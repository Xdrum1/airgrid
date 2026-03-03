/**
 * AI-Powered Auto-Review for Admin Overrides
 *
 * Processes pending ScoringOverrides through Claude for a second-pass
 * evaluation, automatically applying approve/reject decisions above
 * confidence thresholds. Maintains an audit trail via AutoReviewResult.
 */

import Anthropic from "@anthropic-ai/sdk";
import { getPendingOverrides, approveOverride, rejectOverride } from "@/lib/admin";
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
  skipped: number;
  errors: number;
  results: AutoReviewResultItem[];
}

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
  decision: ReviewDecision,
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
    skipped: 0,
    errors: 0,
    results: [],
  };

  for (const override of toProcess) {
    const resultItem: AutoReviewResultItem = {
      overrideId: override.id,
      decision: "skip",
      confidence: 0,
      assignedCityId: null,
      reasoning: "",
      applied: false,
    };

    try {
      const { decision, sourceContent } = await reviewOverride(
        override,
        fetchSource
      );

      resultItem.decision = decision.decision;
      resultItem.confidence = decision.confidence;
      resultItem.assignedCityId = decision.assignedCityId;
      resultItem.reasoning = decision.reasoning;

      // Apply decision based on thresholds
      const applied = await applyDecision(override.id, decision, dryRun);
      resultItem.applied = applied;

      // Persist audit trail
      await persistResult(override.id, decision, applied, dryRun, sourceContent);

      // Update summary counters
      if (decision.decision === "approve" && applied) {
        summary.approved++;
      } else if (decision.decision === "reject" && applied) {
        summary.rejected++;
      } else {
        summary.skipped++;
      }

      summary.processed++;

      logger.info(
        `[auto-review] Override ${override.id}: ${decision.decision} (confidence=${decision.confidence.toFixed(2)}, applied=${applied})`
      );
    } catch (err) {
      summary.errors++;
      summary.processed++;
      resultItem.error = err instanceof Error ? err.message : String(err);
      resultItem.reasoning = `Error: ${resultItem.error}`;

      logger.error(`[auto-review] Error processing override ${override.id}:`, err);
    }

    summary.results.push(resultItem);

    // Delay between Claude calls to avoid hammering the API
    if (toProcess.indexOf(override) < toProcess.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_CALLS_MS));
    }
  }

  logger.info(
    `[auto-review] Complete: ${summary.processed} processed, ${summary.approved} approved, ${summary.rejected} rejected, ${summary.skipped} skipped, ${summary.errors} errors`
  );

  return summary;
}
