/**
 * Market Lead Accumulator — single entry point for creating/updating
 * MarketLead records from auto-discovery signals.
 *
 * Deduplicates by (city, state, country) and accumulates signals:
 *   - Tracks signal count and audit trail
 *   - Escalates priority based on count and signal type
 *   - Preserves human research notes when appending signals
 */

export interface MarketLeadSignal {
  city: string;
  state: string;
  source: string; // e.g. "legiscan-OR", "classifier", "rules-engine", "operator-news"
  sourceRecordId: string;
  sourceUrl: string;
  signalText: string; // record title/summary
  signalType:
    | "state_legislation"
    | "federal_filing"
    | "operator_expansion"
    | "infrastructure"
    | "news_mention"
    | "classifier_detection";
  confidence: "high" | "medium" | "low";
}

interface SignalSourceEntry {
  source: string;
  url: string;
  date: string;
  summary: string;
  signalType: string;
  confidence: string;
}

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

/**
 * Determine initial priority based on signal type and confidence.
 */
function initialPriority(signal: MarketLeadSignal): "low" | "normal" | "high" {
  // Signed legislation or operator expansion = immediate normal
  if (
    signal.signalType === "state_legislation" ||
    signal.signalType === "operator_expansion"
  ) {
    return "normal";
  }
  // High-confidence classifier detection = normal
  if (signal.confidence === "high") return "normal";
  // Everything else starts low
  return "low";
}

/**
 * Escalate priority based on accumulated signal count.
 */
function escalatedPriority(
  currentPriority: string,
  signalCount: number
): string {
  if (signalCount >= 4) return "high";
  if (signalCount >= 2 && currentPriority === "low") return "normal";
  return currentPriority;
}

/**
 * Process a batch of market lead signals, upserting into the database.
 * Returns counts of created and updated leads.
 */
export async function processMarketLeadSignals(
  signals: MarketLeadSignal[]
): Promise<{ created: number; updated: number }> {
  if (signals.length === 0) return { created: 0, updated: 0 };

  const prisma = await getPrisma();

  // Deduplicate signals by city+state within this batch
  const grouped = new Map<string, MarketLeadSignal[]>();
  for (const signal of signals) {
    const key = `${signal.city.toLowerCase().trim()}|${signal.state.toUpperCase().trim()}`;
    const arr = grouped.get(key) || [];
    arr.push(signal);
    grouped.set(key, arr);
  }

  let created = 0;
  let updated = 0;

  for (const [, groupSignals] of grouped) {
    const first = groupSignals[0];
    const city = first.city.trim();
    const state = first.state.toUpperCase().trim();
    const country = "US";

    // Build signal source entries for this batch
    const newSources: SignalSourceEntry[] = groupSignals.map((s) => ({
      source: s.source,
      url: s.sourceUrl,
      date: new Date().toISOString(),
      summary: s.signalText.slice(0, 300),
      signalType: s.signalType,
      confidence: s.confidence,
    }));

    try {
      // Check if lead already exists
      const existing = await prisma.marketLead.findUnique({
        where: { city_state_country: { city, state, country } },
      });

      if (existing) {
        // Don't update dismissed or added leads
        if (existing.status === "dismissed" || existing.status === "added") {
          continue;
        }

        // Merge signal sources
        const existingSources = (existing.signalSources as unknown as SignalSourceEntry[]) ?? [];

        // Deduplicate by URL to avoid recording the same filing twice
        const existingUrls = new Set(existingSources.map((s) => s.url));
        const genuinelyNew = newSources.filter((s) => !existingUrls.has(s.url));

        if (genuinelyNew.length === 0) continue; // already know about these signals

        const mergedSources = [...existingSources, ...genuinelyNew];
        const newCount = existing.signalCount + genuinelyNew.length;
        const newPriority = escalatedPriority(existing.priority, newCount);

        await prisma.marketLead.update({
          where: { id: existing.id },
          data: {
            signalCount: newCount,
            signalSources: JSON.parse(JSON.stringify(mergedSources)),
            lastSignalAt: new Date(),
            priority: newPriority,
            // If city was "Unknown", update it when we get a real city name
            ...(existing.city === "Unknown" && city !== "Unknown" ? { city } : {}),
          },
        });
        updated++;
      } else {
        // Create new lead
        const priority = initialPriority(first);

        await prisma.marketLead.create({
          data: {
            city,
            state,
            country,
            source: "auto-discovery",
            signal: first.signalText.slice(0, 500),
            status: "new",
            priority,
            signalCount: newSources.length,
            lastSignalAt: new Date(),
            signalSources: JSON.parse(JSON.stringify(newSources)),
            researchNotes: `Auto-discovered by ingestion pipeline.\nFirst signal: ${first.source}`,
          },
        });
        created++;
      }
    } catch (err) {
      // Log but don't fail — unique constraint violations are expected
      // when concurrent ingestion runs process the same city
      console.error(`[market-leads] Failed to upsert lead for ${city}, ${state}:`, err);
    }
  }

  if (created > 0 || updated > 0) {
    console.log(
      `[market-leads] Processed ${signals.length} signals → ${created} created, ${updated} updated`
    );
  }

  return { created, updated };
}
