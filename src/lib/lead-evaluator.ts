/**
 * AI Lead Evaluator — uses Claude Haiku to assess MarketLead records
 * and produce a recommendation (ADD / WATCH / DISMISS / ENRICH) with reasoning.
 *
 * Reduces manual review burden by pre-classifying every lead against
 * the tracked market criteria.
 */

import Anthropic from "@anthropic-ai/sdk";
import { createLogger } from "@/lib/logger";
import { CITIES } from "@/data/seed";

const logger = createLogger("lead-evaluator");
const MODEL = "claude-haiku-4-5-20251001";

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

export interface LeadEvaluation {
  recommendation: "ADD" | "WATCH" | "DISMISS" | "ENRICH";
  confidence: "high" | "medium" | "low";
  reasoning: string;
}

const SYSTEM_PROMPT_BASE = `You are an intelligence analyst for AirIndex, a UAM (Urban Air Mobility) market readiness platform. Your job is to evaluate MarketLead records — candidate cities detected by our pipeline — and recommend whether they should be added to the tracked markets index.

## Context

AirIndex tracks US metro markets on their readiness for commercial eVTOL operations. We currently track markets that have some combination of:
- State AAM-enabling legislation (enacted or actively moving)
- Federal program participation (eIPP, RAISE, SBIR)
- Operator presence (Joby, Archer, Wisk, BETA, etc.)
- Vertiport or heliport infrastructure commitments
- Regulatory framework (zoning, NFPA 418, airspace determinations)
- Cargo logistics angle (DHL, Amazon Air, UPS hubs are relevant — cargo eVTOL is the first commercial use case)

## Currently Tracked Markets

{TRACKED_MARKETS}

## Your Task

Analyze the MarketLead below and output one of four recommendations:

1. **ADD** — The lead has enough structural evidence to justify becoming a tracked market. Strong signals from diverse sources, a real city (not a state-level or unresolved signal), meaningful differentiation from existing markets, and clear commercial relevance.

2. **WATCH** — The lead shows momentum but isn't ready yet. Accumulating signals, real city, but fewer than 3-4 structural signals or missing key factors. Should be monitored.

3. **DISMISS** — The lead is noise. Duplicate of an existing market (e.g., suburb of a tracked city), state-level signal without city resolution, unrelated UAS legislation, or manufacturing-only location.

4. **ENRICH** — City name is "Unknown" or ambiguous. Needs manual city name resolution before any other decision can be made.

{FEW_SHOT_EXAMPLES}

## Output Format

Return ONLY a JSON object with these fields:
{
  "recommendation": "ADD" | "WATCH" | "DISMISS" | "ENRICH",
  "confidence": "high" | "medium" | "low",
  "reasoning": "2-3 sentences explaining the recommendation. Be specific about which factors matter."
}

No markdown, no preamble. Just the JSON object.`;

/**
 * Fetch recent correct AI decisions to use as few-shot examples.
 * Injects them into the prompt so the AI learns the user's pattern.
 */
async function getFewShotExamples(): Promise<string> {
  try {
    const prisma = await getPrisma();
    const correctDecisions = await prisma.marketLead.findMany({
      where: { aiOutcome: "correct", aiReasoning: { not: null } },
      orderBy: { aiOutcomeAt: "desc" },
      take: 8,
      select: {
        city: true,
        state: true,
        aiRecommendation: true,
        aiReasoning: true,
        signalCount: true,
      },
    });

    if (correctDecisions.length === 0) return "";

    const examples = correctDecisions
      .map(
        (d, i) =>
          `Example ${i + 1}: ${d.city}, ${d.state} (${d.signalCount} signals) → ${d.aiRecommendation}\nReasoning: ${d.aiReasoning}`
      )
      .join("\n\n");

    return `\n## Recent Correct Decisions (Learn the Pattern)\n\nThe following evaluations were verified as correct by a human analyst. Apply the same reasoning pattern:\n\n${examples}\n`;
  } catch {
    return "";
  }
}

/**
 * Evaluate a single MarketLead and return a recommendation.
 */
export async function evaluateLead(leadId: string): Promise<LeadEvaluation | null> {
  const prisma = await getPrisma();

  const lead = await prisma.marketLead.findUnique({ where: { id: leadId } });
  if (!lead) return null;

  return evaluateLeadData({
    city: lead.city,
    state: lead.state,
    signal: lead.signal,
    signalCount: lead.signalCount,
    signalSources: lead.signalSources as unknown as Array<{ source: string; summary: string; signalType: string }> | null,
    researchNotes: lead.researchNotes,
  });
}

export async function evaluateLeadData(lead: {
  city: string;
  state: string;
  signal: string;
  signalCount: number;
  signalSources: Array<{ source: string; summary: string; signalType: string }> | null;
  researchNotes: string | null;
}): Promise<LeadEvaluation | null> {
  const client = getClient();

  // Build tracked markets list for context
  const trackedList = CITIES.map((c) => `- ${c.city}, ${c.state} (score ${c.score})`).join("\n");
  const fewShot = await getFewShotExamples();
  const systemPrompt = SYSTEM_PROMPT_BASE
    .replace("{TRACKED_MARKETS}", trackedList)
    .replace("{FEW_SHOT_EXAMPLES}", fewShot);

  // Build lead description
  const sources = lead.signalSources ?? [];
  const sourceSummary = sources.slice(0, 5)
    .map((s, i) => `${i + 1}. [${s.signalType}] ${s.source}: ${s.summary.slice(0, 200)}`)
    .join("\n");

  const userPrompt = `MarketLead for evaluation:

City: ${lead.city}
State: ${lead.state}
Signal count: ${lead.signalCount}
Primary signal: ${lead.signal.slice(0, 500)}

Source breakdown (${sources.length} total):
${sourceSummary || "(no detailed sources)"}

${lead.researchNotes ? `Research notes: ${lead.researchNotes.slice(0, 300)}` : ""}

Evaluate this lead.`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn(`No JSON in evaluation response for ${lead.city}, ${lead.state}`);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      recommendation: parsed.recommendation,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
    };
  } catch (err) {
    logger.error(`Evaluation failed for ${lead.city}, ${lead.state}:`, err);
    return null;
  }
}

/**
 * Record the outcome of a lead decision to train the AI via feedback loop.
 * Called when a lead is promoted to "added" or "dismissed" by an admin.
 */
export async function recordLeadOutcome(
  leadId: string,
  humanDecision: "added" | "dismissed"
): Promise<void> {
  const prisma = await getPrisma();
  const lead = await prisma.marketLead.findUnique({
    where: { id: leadId },
    select: { aiRecommendation: true },
  });

  if (!lead?.aiRecommendation) return; // No AI rec to compare against

  // Compare AI recommendation to human decision
  let outcome: "correct" | "false_positive" | "false_negative" | "pending";

  if (humanDecision === "added") {
    outcome = lead.aiRecommendation === "ADD" ? "correct" : "false_negative";
  } else {
    // dismissed
    outcome = lead.aiRecommendation === "DISMISS" ? "correct"
      : lead.aiRecommendation === "ADD" ? "false_positive"
      : "correct"; // WATCH or ENRICH that got dismissed counts as correct
  }

  await prisma.marketLead.update({
    where: { id: leadId },
    data: { aiOutcome: outcome, aiOutcomeAt: new Date() },
  });
}

/**
 * Get AI accuracy metrics over the last N days.
 */
export async function getAiAccuracyStats(days = 30): Promise<{
  total: number;
  correct: number;
  falsePositive: number;
  falseNegative: number;
  accuracyPct: number;
}> {
  const prisma = await getPrisma();
  const since = new Date(Date.now() - days * 86400000);

  const results = await prisma.marketLead.findMany({
    where: { aiOutcomeAt: { gte: since }, aiOutcome: { not: null } },
    select: { aiOutcome: true },
  });

  const total = results.length;
  const correct = results.filter((r) => r.aiOutcome === "correct").length;
  const falsePositive = results.filter((r) => r.aiOutcome === "false_positive").length;
  const falseNegative = results.filter((r) => r.aiOutcome === "false_negative").length;
  const accuracyPct = total > 0 ? Math.round((correct / total) * 100) : 0;

  return { total, correct, falsePositive, falseNegative, accuracyPct };
}

/**
 * Evaluate all pending leads (status: new or researching) and persist results.
 */
export async function evaluateAllPendingLeads(): Promise<{
  evaluated: number;
  recommendations: Record<string, number>;
}> {
  const prisma = await getPrisma();

  const leads = await prisma.marketLead.findMany({
    where: { status: { in: ["new", "researching"] } },
    orderBy: { updatedAt: "desc" },
  });

  const result = {
    evaluated: 0,
    recommendations: { ADD: 0, WATCH: 0, DISMISS: 0, ENRICH: 0 } as Record<string, number>,
  };

  for (const lead of leads) {
    const evaluation = await evaluateLeadData({
      city: lead.city,
      state: lead.state,
      signal: lead.signal,
      signalCount: lead.signalCount,
      signalSources: lead.signalSources as unknown as Array<{ source: string; summary: string; signalType: string }> | null,
      researchNotes: lead.researchNotes,
    });

    if (!evaluation) continue;

    await prisma.marketLead.update({
      where: { id: lead.id },
      data: {
        aiRecommendation: evaluation.recommendation,
        aiReasoning: evaluation.reasoning,
        aiConfidence: evaluation.confidence,
        aiEvaluatedAt: new Date(),
      },
    });

    result.evaluated++;
    result.recommendations[evaluation.recommendation] = (result.recommendations[evaluation.recommendation] ?? 0) + 1;
  }

  logger.info(
    `Lead evaluation: ${result.evaluated} evaluated, ` +
    `ADD: ${result.recommendations.ADD}, WATCH: ${result.recommendations.WATCH}, ` +
    `DISMISS: ${result.recommendations.DISMISS}, ENRICH: ${result.recommendations.ENRICH}`
  );

  return result;
}
