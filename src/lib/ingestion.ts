import { fetchFederalRegisterUAM, fetchStateBills, fetchOperatorFilings, OPERATOR_CIKS } from "@/lib/faa-api";
import type { FederalFiling, StateBill, SecFiling } from "@/lib/faa-api";
import { fetchAllOperatorNews } from "@/lib/operator-news";
import { addChangelogEntries } from "@/lib/changelog";
import { notifySubscribers } from "@/lib/notifications";
import { evaluateRulesV2 } from "@/lib/rules-engine";
import { updateCorridorStatus } from "@/lib/corridors";
import { classifyRecords } from "@/lib/classifier";
import { applyOverrides } from "@/lib/score-updater";
import { alertCronFailure } from "@/lib/cron-alerts";
import { STATE_TO_CITIES } from "@/data/seed";
import type { ChangelogEntry } from "@/types";

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

// -------------------------------------------------------
// Types
// -------------------------------------------------------

export interface IngestedRecord {
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

export interface IngestionMeta {
  lastRunAt: string;
  recordCount: number;
  sources: string[];
}

export interface DiffResult {
  newRecords: IngestedRecord[];
  updatedRecords: IngestedRecord[];
  unchangedCount: number;
}

// -------------------------------------------------------
// DB-backed ingestion state (replaces ephemeral /tmp files)
// -------------------------------------------------------

let writeLock: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = writeLock;
  let resolve: () => void;
  writeLock = new Promise<void>((r) => (resolve = r));
  return prev.then(fn).finally(() => resolve!());
}

async function readIngested(): Promise<IngestedRecord[]> {
  try {
    const prisma = await getPrisma();
    const rows = await prisma.ingestedRecord.findMany();
    return rows.map((r) => ({
      id: r.id,
      source: r.source as IngestedRecord["source"],
      sourceId: r.sourceId,
      title: r.title,
      summary: r.summary,
      status: r.status,
      date: r.date,
      url: r.url,
      state: r.state ?? undefined,
      raw: r.raw as Record<string, unknown>,
      ingestedAt: r.ingestedAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

async function writeIngested(records: IngestedRecord[]): Promise<void> {
  const prisma = await getPrisma();
  // Upsert in batches of 100 to avoid overwhelming the DB
  const BATCH_SIZE = 100;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((r) =>
        prisma.ingestedRecord.upsert({
          where: { id: r.id },
          create: {
            id: r.id,
            source: r.source,
            sourceId: r.sourceId,
            title: r.title,
            summary: r.summary,
            status: r.status,
            date: r.date,
            url: r.url,
            state: r.state ?? null,
            raw: r.raw as unknown as Record<string, never>,
            ingestedAt: new Date(r.ingestedAt),
          },
          update: {
            summary: r.summary,
            status: r.status,
            raw: r.raw as unknown as Record<string, never>,
          },
        })
      )
    );
  }
}

// -------------------------------------------------------
// Normalizers
// -------------------------------------------------------

function normalizeFederalFiling(f: FederalFiling): IngestedRecord {
  return {
    id: `federal_register_${f.document_number}`,
    source: "federal_register",
    sourceId: f.document_number,
    title: f.title,
    summary: f.abstract ?? "",
    status: f.type ?? "unknown",
    date: f.publication_date,
    url: f.html_url,
    raw: f as unknown as Record<string, unknown>,
    ingestedAt: new Date().toISOString(),
  };
}

function normalizeStateBill(b: StateBill): IngestedRecord {
  return {
    id: `legiscan_${b.bill_id}`,
    source: "legiscan",
    sourceId: String(b.bill_id),
    title: `${b.state} ${b.bill_number}: ${b.title}`,
    summary: b.description ?? b.last_action ?? "",
    status: b.status ?? "unknown",
    date: b.last_action_date ?? "",
    url: b.url,
    state: b.state,
    raw: b as unknown as Record<string, unknown>,
    ingestedAt: new Date().toISOString(),
  };
}

function normalizeSecFiling(f: SecFiling, operatorId: string): IngestedRecord {
  return {
    id: `sec_edgar_${f.accessionNo}`,
    source: "sec_edgar",
    sourceId: f.accessionNo,
    title: `${operatorId} ${f.form}: ${f.primaryDescription || "Filing"}`,
    summary: f.primaryDescription || "",
    status: f.form,
    date: f.filingDate,
    url: `https://www.sec.gov/Archives/edgar/data/${OPERATOR_CIKS[operatorId]}/${f.accessionNo.replace(/-/g, "")}/${f.primaryDocument}`,
    raw: { ...f, operatorId } as unknown as Record<string, unknown>,
    ingestedAt: new Date().toISOString(),
  };
}

// -------------------------------------------------------
// Content enrichment — fetch actual document text for sparse summaries
// -------------------------------------------------------

const ENRICH_TIMEOUT = 8000;
const SEC_MAX_CHARS = 2000;
const NEWS_MAX_CHARS = 1500;
const ENRICH_BATCH_SIZE = 5;

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchDocumentText(
  url: string,
  maxChars: number
): Promise<string | null> {
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
    ) {
      return null;
    }

    const html = await response.text();
    const text = stripHtml(html);
    return text.length > 0 ? text.slice(0, maxChars) : null;
  } catch {
    return null;
  }
}

async function enrichSecFilings(records: IngestedRecord[]): Promise<void> {
  const secRecords = records.filter(
    (r) => r.source === "sec_edgar" && (!r.summary || r.summary === r.status || r.summary.length < 20)
  );
  if (secRecords.length === 0) return;

  console.log(`[ingestion] Enriching ${secRecords.length} SEC filings with source content`);

  for (let i = 0; i < secRecords.length; i += ENRICH_BATCH_SIZE) {
    const batch = secRecords.slice(i, i + ENRICH_BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (record) => {
        const text = await fetchDocumentText(record.url, SEC_MAX_CHARS);
        if (text && text.length > record.summary.length) {
          record.summary = text;
        }
      })
    );

    const enriched = results.filter((r) => r.status === "fulfilled").length;
    console.log(
      `[ingestion] SEC enrichment batch ${Math.floor(i / ENRICH_BATCH_SIZE) + 1}: ${enriched}/${batch.length} enriched`
    );
  }
}

async function enrichOperatorNews(records: IngestedRecord[]): Promise<void> {
  const newsRecords = records.filter(
    (r) => r.source === "operator_news" && r.summary.startsWith("[")
  );
  if (newsRecords.length === 0) return;

  console.log(`[ingestion] Enriching ${newsRecords.length} operator news articles`);

  for (let i = 0; i < newsRecords.length; i += ENRICH_BATCH_SIZE) {
    const batch = newsRecords.slice(i, i + ENRICH_BATCH_SIZE);
    await Promise.allSettled(
      batch.map(async (record) => {
        const text = await fetchDocumentText(record.url, NEWS_MAX_CHARS);
        if (text && text.length > 50) {
          record.summary = `${record.summary} | Content: ${text}`;
        }
      })
    );
  }
}

// -------------------------------------------------------
// Diff engine
// -------------------------------------------------------

function diffRecords(
  existing: IngestedRecord[],
  incoming: IngestedRecord[]
): DiffResult {
  const existingMap = new Map(existing.map((r) => [r.id, r]));
  const newRecords: IngestedRecord[] = [];
  const updatedRecords: IngestedRecord[] = [];
  let unchangedCount = 0;

  for (const record of incoming) {
    const prev = existingMap.get(record.id);
    if (!prev) {
      newRecords.push(record);
    } else if (prev.status !== record.status || prev.summary !== record.summary) {
      updatedRecords.push(record);
    } else {
      unchangedCount++;
    }
  }

  return { newRecords, updatedRecords, unchangedCount };
}

// -------------------------------------------------------
// Target states for LegiScan
// -------------------------------------------------------
// Monitor all 50 states + DC for UAM legislation — the cost of missing
// a state (Ohio/HB 251) is higher than the cost of extra API calls.
const TARGET_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC",
];

// -------------------------------------------------------
// LegiScan batched fetcher (10 states at a time)
// -------------------------------------------------------

async function batchFetchStates(): Promise<StateBill[]> {
  const BATCH_SIZE = 10;
  const allBills: StateBill[] = [];

  for (let i = 0; i < TARGET_STATES.length; i += BATCH_SIZE) {
    const batch = TARGET_STATES.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map((state) => fetchStateBills(state)));
    allBills.push(...results.flat());
  }

  return allBills;
}

// -------------------------------------------------------
// Orchestrator
// -------------------------------------------------------

export async function runIngestion(): Promise<{
  diff: DiffResult;
  meta: IngestionMeta;
}> {
  return withLock(async () => {
    console.log("[ingestion] Starting ingestion run...");
    const prisma = await getPrisma();
    const runStartedAt = new Date();

    // 1-4. Fetch all sources in parallel
    const SEC_FORM_TYPES = ["8-K", "10-K", "10-Q"];

    const [federalFilings, legiscanResults, secEdgarResults, operatorNews] = await Promise.all([
      // 1. Federal Register
      fetchFederalRegisterUAM(90),
      // 2. LegiScan for all target states (batched to avoid rate limits)
      batchFetchStates(),
      // 3. SEC EDGAR for all operator × form type combos in parallel
      Promise.all(
        Object.keys(OPERATOR_CIKS).flatMap((operatorId) =>
          SEC_FORM_TYPES.map(async (formType) => {
            const filings = await fetchOperatorFilings(operatorId, formType);
            return filings.map((f) => normalizeSecFiling(f, operatorId));
          })
        )
      ),
      // 4. Operator news via Google News RSS
      fetchAllOperatorNews(30),
    ]);

    const allBills = legiscanResults;
    const allSecFilings = secEdgarResults.flat();

    console.log(`[ingestion] Federal Register: ${federalFilings.length} filings`);
    console.log(`[ingestion] LegiScan: ${allBills.length} bills`);
    console.log(`[ingestion] SEC EDGAR: ${allSecFilings.length} filings (${SEC_FORM_TYPES.join(", ")})`);

    // 5. Normalize and merge all sources
    const incomingRecords: IngestedRecord[] = [
      ...federalFilings.map(normalizeFederalFiling),
      ...allBills.map(normalizeStateBill),
      ...allSecFilings,
      ...operatorNews,
    ];

    // 5. Diff against existing
    const existing = await readIngested();
    const diff = diffRecords(existing, incomingRecords);
    console.log(
      `[ingestion] Diff: ${diff.newRecords.length} new, ${diff.updatedRecords.length} updated, ${diff.unchangedCount} unchanged`
    );

    // 6. Merge and persist to DB
    const existingMap = new Map(existing.map((r) => [r.id, r]));
    for (const r of diff.newRecords) existingMap.set(r.id, r);
    for (const r of diff.updatedRecords) existingMap.set(r.id, r);
    const merged = Array.from(existingMap.values());

    // Only write changed records to DB (not the full set every time)
    const changedForDb = [...diff.newRecords, ...diff.updatedRecords];
    if (changedForDb.length > 0) {
      await writeIngested(changedForDb);
    }

    // 7. Build meta
    const sources = Array.from(new Set(incomingRecords.map((r) => r.source)));
    const meta: IngestionMeta = {
      lastRunAt: new Date().toISOString(),
      recordCount: merged.length,
      sources,
    };

    // Track override/score stats for the run log
    let runOverridesCreated = 0;
    let runOverridesApplied = 0;
    let runScoreChanges = 0;

    // 8. Zero-record alert — if all 4 sources returned nothing, something is wrong
    if (incomingRecords.length === 0) {
      console.warn("[ingestion] ALERT: All sources returned 0 records — possible API failure");
      await alertCronFailure(
        "ingest-zero-records",
        new Error(
          `Ingestion returned 0 records across all sources. This likely means all external APIs are failing or returning empty results. Sources checked: ${sources.length > 0 ? sources.join(", ") : "none responded"}`
        )
      );
    }

    // 9. Create changelog entries
    const changelogBatch: Omit<ChangelogEntry, "id" | "timestamp">[] = [];

    for (const r of diff.newRecords) {
      changelogBatch.push({
        changeType: r.source === "legiscan" ? "new_law" : "new_filing",
        relatedEntityType: "filing",
        relatedEntityId: r.id,
        summary: r.title,
        sourceUrl: r.url,
      });
    }

    for (const r of diff.updatedRecords) {
      changelogBatch.push({
        changeType: "status_change",
        relatedEntityType: "filing",
        relatedEntityId: r.id,
        summary: `Status updated: ${r.title}`,
        sourceUrl: r.url,
      });
    }

    if (changelogBatch.length > 0) {
      const newEntries = await addChangelogEntries(changelogBatch);
      console.log(`[ingestion] Added ${newEntries.length} changelog entries`);

      // Dispatch notifications in background (non-blocking)
      notifySubscribers(newEntries).catch((err) =>
        console.error("[ingestion] Notification dispatch error:", err)
      );
    }

    // 10. Enrich sparse summaries before classification
    const changedRecords = [...diff.newRecords, ...diff.updatedRecords];
    if (changedRecords.length > 0) {
      await enrichSecFilings(changedRecords);
      await enrichOperatorNews(changedRecords);

      // 11. Classify new/updated records with NLP (falls back to regex rules)
      const { overrideCandidates: regexOverrides, corridorEvents } = evaluateRulesV2(changedRecords);

      let overrideCandidates;
      try {
        overrideCandidates = await classifyRecords(changedRecords);
        console.log(`[ingestion] NLP classifier: ${overrideCandidates.length} candidates`);
      } catch (err) {
        console.warn("[ingestion] NLP classifier failed, falling back to regex rules:", err);
        overrideCandidates = regexOverrides;
      }
      if (overrideCandidates.length > 0) {
        const result = await applyOverrides(overrideCandidates);
        runOverridesCreated = result.persisted;
        runOverridesApplied = result.applied;
        runScoreChanges = result.scoreChanges.length;
        console.log(
          `[ingestion] Score updater: ${result.persisted} overrides persisted, ${result.applied} auto-applied, ${result.scoreChanges.length} score changes`
        );
      }

      // 12. Process corridor events
      if (corridorEvents.length > 0) {
        console.log(`[ingestion] Processing ${corridorEvents.length} corridor events`);
        const corridorChangelogBatch: Omit<ChangelogEntry, "id" | "timestamp">[] = [];

        for (const event of corridorEvents) {
          if (event.corridorId && event.newStatus) {
            try {
              await updateCorridorStatus(
                event.corridorId,
                event.newStatus,
                event.reason,
                event.sourceUrl
              );
              corridorChangelogBatch.push({
                changeType: "status_change",
                relatedEntityType: "corridor",
                relatedEntityId: event.corridorId,
                summary: event.reason,
                sourceUrl: event.sourceUrl,
              });
              console.log(`[ingestion] Updated corridor ${event.corridorId} → ${event.newStatus}`);
            } catch (err) {
              console.error(`[ingestion] Failed to update corridor ${event.corridorId}:`, err);
            }
          } else {
            console.log(`[ingestion] Unresolved corridor event: ${event.reason}`);
          }
        }

        if (corridorChangelogBatch.length > 0) {
          const corEntries = await addChangelogEntries(corridorChangelogBatch);
          notifySubscribers(corEntries).catch((err) =>
            console.error("[ingestion] Corridor notification error:", err)
          );
        }
      }

      // 13. Auto-create market leads for cities not in our tracked markets
      await autoCreateMarketLeads(changedRecords, overrideCandidates);
    }

    // 14. Log the ingestion run to DB
    try {
      await prisma.ingestionRun.create({
        data: {
          startedAt: runStartedAt,
          completedAt: new Date(),
          newRecords: diff.newRecords.length,
          updatedRecords: diff.updatedRecords.length,
          unchangedCount: diff.unchangedCount,
          totalRecords: merged.length,
          sources,
          overridesCreated: runOverridesCreated,
          overridesApplied: runOverridesApplied,
          scoreChanges: runScoreChanges,
          alertSent: incomingRecords.length === 0,
        },
      });
    } catch (err) {
      console.error("[ingestion] Failed to log ingestion run:", err);
    }

    console.log("[ingestion] Run complete.");
    return { diff, meta };
  });
}

// -------------------------------------------------------
// Auto-create market leads from ingestion data
// -------------------------------------------------------
// When the classifier identifies a city/state NOT in our tracked markets,
// auto-create a MarketLead so we don't miss emerging markets (the Ohio problem).

async function autoCreateMarketLeads(
  records: IngestedRecord[],
  overrideCandidates: { cityId: string; field: string; reason: string; sourceUrl?: string; confidence: string }[]
): Promise<void> {
  try {
    const prisma = await getPrisma();

    // Collect state references from records that aren't in our tracked markets
    const untrackedSignals = new Map<string, { source: string; signal: string; url: string }>();

    // Check override candidates for unresolved cities — these are signals for unknown markets
    for (const candidate of overrideCandidates) {
      if (candidate.cityId === "__unresolved__" && candidate.confidence !== "needs_review") {
        // This means the classifier found something relevant but couldn't map it to a tracked city
        const key = `unresolved_${candidate.field}_${candidate.reason.slice(0, 50)}`;
        if (!untrackedSignals.has(key)) {
          untrackedSignals.set(key, {
            source: "ingestion-pipeline",
            signal: candidate.reason,
            url: candidate.sourceUrl ?? "",
          });
        }
      }
    }

    // Check LegiScan records from states that have NO tracked cities
    for (const record of records) {
      if (record.source === "legiscan" && record.state) {
        const stateUpper = record.state.toUpperCase();
        const trackedCities = STATE_TO_CITIES[stateUpper];
        if (!trackedCities || trackedCities.length === 0) {
          // This state has UAM legislation but we don't track any cities there
          const key = `${stateUpper}_${record.sourceId}`;
          if (!untrackedSignals.has(key)) {
            untrackedSignals.set(key, {
              source: `legiscan-${stateUpper}`,
              signal: record.title,
              url: record.url,
            });
          }
        }
      }
    }

    if (untrackedSignals.size === 0) return;

    // Check for existing leads to avoid duplicates (by signal text similarity)
    const existingLeads = await prisma.marketLead.findMany({
      where: { status: { in: ["new", "researching"] } },
      select: { signal: true, source: true },
    });
    const existingSignalSet = new Set(existingLeads.map((l) => l.signal.slice(0, 80)));

    let created = 0;
    for (const [, { source, signal, url }] of untrackedSignals) {
      // Skip if we already have a lead with a similar signal
      if (existingSignalSet.has(signal.slice(0, 80))) continue;

      // Extract state from source if possible
      const stateMatch = source.match(/legiscan-([A-Z]{2})/);
      const state = stateMatch ? stateMatch[1] : "??";

      await prisma.marketLead.create({
        data: {
          city: "Unknown",
          state,
          source: "auto-ingestion",
          signal: signal.slice(0, 500),
          status: "new",
          priority: "normal",
          researchNotes: `Auto-created from ingestion pipeline.\nSource: ${source}\nURL: ${url}`,
        },
      });
      created++;
      existingSignalSet.add(signal.slice(0, 80));
    }

    if (created > 0) {
      console.log(`[ingestion] Auto-created ${created} market lead(s) from untracked signals`);
    }
  } catch (err) {
    // Non-fatal — don't let lead creation failures break ingestion
    console.error("[ingestion] Failed to auto-create market leads:", err);
  }
}
