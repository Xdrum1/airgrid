/**
 * Emerging Market Lead Aggregator
 *
 * Aggregates EmergingMarketSignal records by domain + city to surface
 * which locations are accumulating signals across stealth pipeline
 * domains (Commercial Drone, Hydrogen Fueling, Autonomous Vehicle, etc.).
 *
 * Mirror of the AirIndex MarketLead system — but for non-public domains.
 */

import { createLogger } from "@/lib/logger";

const logger = createLogger("emerging-leads");

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

// Map emerging market domain name → tracked-in-pipeline
const DOMAINS = new Set([
  "Commercial Drone",
  "Hydrogen Fueling",
  "Autonomous Vehicle",
  "Nuclear SMR",
  "Longevity",
  "Physical AI / Robotics",
  "Geothermal Energy",
  "Space Economy",
  "Spatial Computing",
  "DePIN",
]);

// US state name → abbreviation (for city extraction)
const STATE_ABBREV: Record<string, string> = {
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

// Valid US state abbreviations (strict allow-list)
const VALID_STATE_CODES = new Set(Object.values(STATE_ABBREV));

/**
 * Extract city and state from a signal title/summary.
 * Strict matching — only returns locations with valid US state codes.
 * Returns null if no confident location match.
 */
function extractLocation(text: string): { city: string; state: string } | null {
  if (!text) return null;

  // Pattern 1: LegiScan prefix "[XX]" — most reliable for legislative signals
  const bracketMatch = text.match(/^\[([A-Z]{2})\]/);
  if (bracketMatch && VALID_STATE_CODES.has(bracketMatch[1])) {
    return { city: "Unknown", state: bracketMatch[1] };
  }

  // Pattern 2: "City, STATE" where STATE is a valid 2-letter code
  const abbrevMatch = text.match(/\b([A-Z][a-z]+(?:[\s-][A-Z][a-z]+){0,3}),\s*([A-Z]{2})\b/);
  if (abbrevMatch && VALID_STATE_CODES.has(abbrevMatch[2])) {
    return { city: abbrevMatch[1].trim(), state: abbrevMatch[2] };
  }

  // Pattern 3: "City, Full State Name"
  const fullNameMatch = text.match(/\b([A-Z][a-z]+(?:[\s-][A-Z][a-z]+){0,3}),\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b/);
  if (fullNameMatch) {
    const stateName = fullNameMatch[2].toLowerCase();
    const stateCode = STATE_ABBREV[stateName];
    if (stateCode) {
      return { city: fullNameMatch[1].trim(), state: stateCode };
    }
  }

  // Pattern 4: State name mentioned with legislative/regulatory context
  for (const [name, abbrev] of Object.entries(STATE_ABBREV)) {
    const pattern = new RegExp(`\\b${name}\\b`, "i");
    if (pattern.test(text)) {
      if (/\b(HB|SB|bill|legislation|governor|DOT|DOE|corridor|airport|pilot program)\b/i.test(text)) {
        return { city: "Unknown", state: abbrev };
      }
    }
  }

  return null;
}

/**
 * Determine priority based on signal count and type distribution.
 */
function computePriority(
  signalCount: number,
  hasHighMomentum: boolean,
  hasRegulatoryFiling: boolean,
): "low" | "normal" | "high" {
  if (signalCount >= 4 || (signalCount >= 2 && hasRegulatoryFiling)) return "high";
  if (signalCount >= 2 || hasHighMomentum) return "normal";
  return "low";
}

/**
 * Aggregate relevant EmergingMarketSignals into EmergingMarketLead records.
 * Groups by (domain, city, state) and accumulates signal counts.
 */
export async function aggregateEmergingLeads(daysBack = 90): Promise<{
  leadsCreated: number;
  leadsUpdated: number;
  signalsProcessed: number;
}> {
  const prisma = await getPrisma();
  const since = new Date(Date.now() - daysBack * 86400000);

  // Get relevant signals from stealth domains
  const signals = await prisma.emergingMarketSignal.findMany({
    where: {
      relevant: true,
      ingestedAt: { gte: since },
      marketName: { in: [...DOMAINS] },
    },
    orderBy: { ingestedAt: "desc" },
  });

  // Group by (domain, city, state)
  interface GroupEntry {
    domain: string;
    city: string;
    state: string;
    signals: typeof signals;
  }
  const groups = new Map<string, GroupEntry>();

  for (const signal of signals) {
    // Try to extract location from title first, then raw fields
    const location =
      extractLocation(signal.title) ??
      extractLocation(JSON.stringify(signal.raw).slice(0, 500));

    if (!location) continue; // Skip signals we can't geo-locate

    const key = `${signal.marketName}|${location.city}|${location.state}`;
    const existing = groups.get(key);
    if (existing) {
      existing.signals.push(signal);
    } else {
      groups.set(key, {
        domain: signal.marketName,
        city: location.city,
        state: location.state,
        signals: [signal],
      });
    }
  }

  let leadsCreated = 0;
  let leadsUpdated = 0;

  for (const [, group] of groups) {
    // Skip groups with only Unknown city and a single signal (too noisy)
    if (group.city === "Unknown" && group.signals.length < 2) continue;

    const signalSources = group.signals.slice(0, 20).map((s) => ({
      source: s.source,
      url: s.url,
      date: s.ingestedAt.toISOString(),
      summary: s.title.slice(0, 300),
      signalType: s.signalType,
    }));

    const hasHighMomentum = group.signals.some((s) => s.momentum === "positive");
    const hasRegFiling = group.signals.some(
      (s) => s.signalType === "regulatory_filing" || s.signalType === "legislative_activity"
    );
    const priority = computePriority(group.signals.length, hasHighMomentum, hasRegFiling);

    const latestSignal = group.signals.reduce(
      (max, s) => (s.ingestedAt > max ? s.ingestedAt : max),
      group.signals[0].ingestedAt
    );

    const existing = await prisma.emergingMarketLead.findUnique({
      where: {
        domain_city_state_country: {
          domain: group.domain,
          city: group.city,
          state: group.state,
          country: "US",
        },
      },
    });

    if (existing) {
      // Only update if signal count or priority changed
      if (existing.signalCount !== group.signals.length || existing.priority !== priority) {
        await prisma.emergingMarketLead.update({
          where: { id: existing.id },
          data: {
            signalCount: group.signals.length,
            signalSources: JSON.parse(JSON.stringify(signalSources)),
            lastSignalAt: latestSignal,
            priority,
          },
        });
        leadsUpdated++;
      }
    } else {
      await prisma.emergingMarketLead.create({
        data: {
          domain: group.domain,
          city: group.city,
          state: group.state,
          signalCount: group.signals.length,
          signalSources: JSON.parse(JSON.stringify(signalSources)),
          lastSignalAt: latestSignal,
          priority,
          researchNotes: `Auto-aggregated from emerging pipeline. Domain: ${group.domain}`,
        },
      });
      leadsCreated++;
    }
  }

  logger.info(
    `Emerging lead aggregation: ${signals.length} signals → ${leadsCreated} leads created, ${leadsUpdated} updated`
  );

  return {
    leadsCreated,
    leadsUpdated,
    signalsProcessed: signals.length,
  };
}

/**
 * Get active emerging market leads for admin display.
 */
export async function getEmergingLeads(opts?: {
  domain?: string;
  status?: string;
}) {
  const prisma = await getPrisma();
  return prisma.emergingMarketLead.findMany({
    where: {
      ...(opts?.domain && { domain: opts.domain }),
      ...(opts?.status && { status: opts.status }),
    },
    orderBy: [
      { priority: "desc" },
      { signalCount: "desc" },
      { updatedAt: "desc" },
    ],
  });
}
