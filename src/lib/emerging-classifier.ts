/**
 * Emerging Markets — Lightweight Haiku Classifier
 *
 * Much simpler than the AirIndex classifier. Three outputs only:
 * relevant (bool), signal_type (7 categories), momentum (pos/neg/neutral).
 * No city tagging, no factor mapping, no scoring overrides.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { EmergingRawRecord } from "@/lib/emerging-sources";
import { createLogger } from "@/lib/logger";

const log = createLogger("emerging-classifier");

// -------------------------------------------------------
// Constants
// -------------------------------------------------------

const PROMPT_VERSION = "emerging-v1";
const MODEL = "claude-haiku-4-5-20251001";
const BATCH_SIZE = 15;
const MAX_TOKENS = 4096;

// Lazy singleton
let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic();
  }
  return _client;
}

// -------------------------------------------------------
// Types
// -------------------------------------------------------

export interface EmergingClassification {
  sourceId: string;
  relevant: boolean;
  signalType: string;
  momentum: string;
  marketName: string;
  confidence: string;
}

/** Full batch result including raw API response for audit trail */
export interface EmergingClassificationBatch {
  classifications: EmergingClassification[];
  rawResponse: string;
  promptVersion: string;
  modelUsed: string;
}

// -------------------------------------------------------
// System prompt
// -------------------------------------------------------

const SYSTEM_PROMPT = `You are a signal classifier for an emerging infrastructure markets intelligence platform. Your job is to analyze records from government databases and determine whether they represent meaningful signals for emerging technology/infrastructure markets.

## Target Markets

1. Nuclear Microreactors / Small Modular Reactors (SMR)
2. Commercial Drone Infrastructure
3. Hydrogen Fueling Infrastructure (GROUND only — cars, trucks, industrial)
4. Autonomous Vehicle Infrastructure Corridors
5. Physical AI / Humanoid Robotics Deployment
6. Geothermal Energy 2.0
7. Space Economy Infrastructure
8. Longevity / Biological Age Intervention
9. Spatial Computing Infrastructure
10. Decentralized Physical Infrastructure Networks (DePIN)
11. Hydrogen-Electric Aviation (DISTINCT from #3: aircraft propulsion, FAA type certification, regional airport H2 infrastructure, airline procurement — NOT ground vehicle/industrial hydrogen)

## Classification Rules

For each record, output:

1. **relevant** (boolean): Is this record a meaningful signal for any of the 10 markets above? Be selective — routine administrative actions, unrelated medical trials, and generic grant renewals are NOT relevant. Look for: new funding, regulatory milestones, technology deployments, policy changes, pilot programs, or significant research breakthroughs.

2. **signal_type** (string, exactly one of):
   - "regulatory_filing" — government regulatory action, permit, license, rulemaking
   - "legislative_activity" — bill, law, resolution, executive order
   - "grant_award" — government or institutional funding award
   - "patent_filing" — patent application or grant
   - "investment_round" — private investment, SPAC, IPO-related
   - "research_publication" — study, trial, technical report
   - "other" — none of the above

3. **momentum** (string, exactly one of):
   - "positive" — signal indicates forward progress (new funding, approval, expansion, breakthrough)
   - "negative" — signal indicates setback (cancellation, denial, failure, delay)
   - "neutral" — informational, no clear directional signal

4. **market_name** (string): Which of the 11 markets does this primarily relate to? Use these exact names:
   - "Nuclear SMR"
   - "Commercial Drone"
   - "Hydrogen Fueling" (ground/industrial ONLY)
   - "Autonomous Vehicle"
   - "Physical AI / Robotics"
   - "Geothermal Energy"
   - "Space Economy"
   - "Longevity"
   - "Spatial Computing"
   - "DePIN"
   - "Hydrogen-Electric Aviation" (aircraft propulsion, airport H2 infrastructure, aviation-specific hydrogen supply — distinct from ground Hydrogen Fueling)
   - "Other" (if relevant but doesn't fit neatly)

5. **confidence** (string, exactly one of):
   - "high" — clear, unambiguous signal with direct relevance to a target market
   - "medium" — likely relevant but some ambiguity in market fit or signal strength
   - "low" — weak or tangential signal, borderline relevance

## Output Format

Return a JSON array. One object per input record, in the same order:

\`\`\`json
[
  {
    "source_id": "NCT12345678",
    "relevant": true,
    "signal_type": "grant_award",
    "momentum": "positive",
    "market_name": "Nuclear SMR",
    "confidence": "high"
  }
]
\`\`\`

If a record is not relevant, still include it with relevant: false. Use signal_type: "other", momentum: "neutral", market_name: "Other", and confidence: "low" for irrelevant records.`;

// -------------------------------------------------------
// Classification
// -------------------------------------------------------

async function classifyBatch(records: EmergingRawRecord[]): Promise<EmergingClassificationBatch> {
  const client = getClient();

  const recordList = records
    .map((r, i) => `[${i + 1}] ID: ${r.sourceId}\nSource: ${r.source}\nTitle: ${r.title}\nSummary: ${r.summary.slice(0, 300)}\nDate: ${r.date}`)
    .join("\n\n");

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Classify the following ${records.length} records:\n\n${recordList}`,
        },
      ],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    // Extract JSON from possible markdown wrapping
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      log.warn("No JSON array found in classifier response");
      return { classifications: [], rawResponse: text, promptVersion: PROMPT_VERSION, modelUsed: MODEL };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) {
      return { classifications: [], rawResponse: text, promptVersion: PROMPT_VERSION, modelUsed: MODEL };
    }

    const classifications = parsed.map((item: Record<string, unknown>) => ({
      sourceId: String(item.source_id ?? ""),
      relevant: Boolean(item.relevant),
      signalType: String(item.signal_type ?? "other"),
      momentum: String(item.momentum ?? "neutral"),
      marketName: String(item.market_name ?? "Other"),
      confidence: String(item.confidence ?? "low"),
    }));

    return { classifications, rawResponse: text, promptVersion: PROMPT_VERSION, modelUsed: MODEL };
  } catch (err) {
    log.error("Classification batch failed:", err);
    return { classifications: [], rawResponse: String(err), promptVersion: PROMPT_VERSION, modelUsed: MODEL };
  }
}

export async function classifyEmergingRecords(
  records: EmergingRawRecord[]
): Promise<EmergingClassificationBatch> {
  if (records.length === 0) {
    return { classifications: [], rawResponse: "", promptVersion: PROMPT_VERSION, modelUsed: MODEL };
  }

  const allClassifications: EmergingClassification[] = [];
  const allRawResponses: string[] = [];

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    log.info(`Classifying batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(records.length / BATCH_SIZE)} (${batch.length} records)`);

    const result = await classifyBatch(batch);
    allClassifications.push(...result.classifications);
    allRawResponses.push(result.rawResponse);

    // Small delay between batches to avoid rate limits
    if (i + BATCH_SIZE < records.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  const relevant = allClassifications.filter((r) => r.relevant).length;
  log.info(`Classification complete: ${allClassifications.length} classified, ${relevant} relevant (${PROMPT_VERSION})`);

  return {
    classifications: allClassifications,
    rawResponse: allRawResponses.join("\n---\n"),
    promptVersion: PROMPT_VERSION,
    modelUsed: MODEL,
  };
}
