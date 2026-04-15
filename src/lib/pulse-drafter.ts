/**
 * Pulse draft generator — AI-drafts the Pulse issue's headline, lede,
 * next-section heading, and editorial body from the week's top-5 digest.
 *
 * Uses the Opus 4.6 model for quality (Pulse is weekly + high-stakes;
 * worth the spend per issue). Voice is captured explicitly in the prompt
 * from feedback_pulse_voice.md.
 *
 * Consumed by scripts/generate-pulse-template.ts when --draft flag set.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { MarketForecastSummary } from "@/lib/forward-signals";
import { createLogger } from "@/lib/logger";

const logger = createLogger("pulse-drafter");

const MODEL = "claude-opus-4-6";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

export interface PulseDraft {
  headline: string;
  lede: string;
  nextSectionHeading: string;
  body: string;
}

const SYSTEM_PROMPT = `You are drafting the UAM Market Pulse, a weekly intelligence brief from AirIndex for licensed clients, design partners, and enterprise subscribers in the Urban Air Mobility / Advanced Air Mobility sector.

Voice rules (non-negotiable):

1. **Show the platform proving itself.** Do not write generic "this week in AAM" framing. Lead with something the platform's classifier or forward-signals pipeline caught that a human watching trade press would have missed, or caught only after the fact. Self-validation narratives are gold — e.g. "the classifier independently flagged X six days before it hit Aviation Week."

2. **Give the reader something to act on.** Every section should leave the reader with either (a) a specific market to watch, (b) a specific bill/filing/operator move that changes the picture, or (c) a methodology insight that lets them interpret future signals themselves.

3. **Institutional tone.** This audience is underwriters, operator strategy teams, investors, municipal planners. Not hype. Not retail. Specific, sourced, confident.

4. **No filler.** Don't lead with rankings tables, source counts, or generic framing. Don't claim accomplishments the data doesn't support.

Output format: JSON with exactly these keys:
- headline: short (5-12 words), specific to what the platform caught this week. Not a tagline.
- lede: one paragraph (2-4 sentences) that states the lead story. Name markets, cite the specific signal, hook the reader.
- nextSectionHeading: the section heading for the editorial body that follows the Markets-to-Watch table (5-8 words).
- body: 2-3 paragraphs analyzing the top 1-2 markets in depth. Surface a non-obvious pattern or methodology callout. End with a concrete thing to watch or do.

No markdown. Plain text only. Escape any quotes in JSON strings.`;

function buildUserPrompt(top: MarketForecastSummary[]): string {
  const marketLines = top.map((m, i) => {
    const watch = m.marketWatch
      ? `${m.marketWatch.status}/${m.marketWatch.outlook}`
      : "no watch";
    const forecast = m.expectedScoreChange30d
      ? `projected ${m.expectedScoreChange30d > 0 ? "+" : ""}${m.expectedScoreChange30d} pts / 30d`
      : "no projected move";
    const signals = m.topSignals
      .map((s) => `    - ${s.description} [${s.confidence} confidence, ${s.windowLabel}]`)
      .join("\n");
    return `#${i + 1} ${m.cityName}, ${m.state} — ${m.currentScore}/100 (${watch}) — ${forecast} — signals 30d: ${m.signalsLast30d}${m.accelerating ? " ACCELERATING" : ""}
  Top signals:
${signals || "    (none)"}`;
  });

  return `Draft this week's UAM Market Pulse from the following platform digest.

TOP 5 MARKETS BY PREDICTIVE SIGNIFICANCE (auto-generated from the Forward Signals pipeline):

${marketLines.join("\n\n")}

Before drafting, identify:
- Which market has the most concrete platform-caught signal (watch status change, score projection, accelerating events)?
- What pattern connects 2+ of these markets that a casual reader wouldn't notice?

Output the JSON draft now. No preamble.`;
}

export async function draftPulse(top: MarketForecastSummary[]): Promise<PulseDraft> {
  const client = getClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(top) }],
  });

  const text = response.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();

  // Strip code-fence wrappers if model added them
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed: PulseDraft;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    logger.error("Failed to parse model output as JSON", { text, err });
    throw new Error(`Pulse drafter returned non-JSON output: ${text.slice(0, 200)}`);
  }

  const required = ["headline", "lede", "nextSectionHeading", "body"] as const;
  for (const key of required) {
    if (typeof parsed[key] !== "string" || !parsed[key]) {
      throw new Error(`Pulse draft missing required field: ${key}`);
    }
  }

  return parsed;
}
