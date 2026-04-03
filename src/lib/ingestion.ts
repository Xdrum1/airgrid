import { fetchFederalRegisterUAM, fetchStateBills, fetchOperatorFilings, OPERATOR_CIKS } from "@/lib/faa-api";
import type { FederalFiling, StateBill, SecFiling } from "@/lib/faa-api";
import { fetchAllOperatorNews } from "@/lib/operator-news";
import { searchCongressBills, type CongressBill } from "@/lib/congress-api";
import { searchRegulations, type RegulationDocument } from "@/lib/regulations-api";
import { addChangelogEntries } from "@/lib/changelog";
import { notifySubscribers } from "@/lib/notifications";
import { evaluateRulesV2 } from "@/lib/rules-engine";
import { updateCorridorStatus } from "@/lib/corridors";
import { classifyRecords } from "@/lib/classifier";
import { applyOverrides } from "@/lib/score-updater";
import { alertCronFailure } from "@/lib/cron-alerts";
import { processMarketLeadSignals, type MarketLeadSignal } from "@/lib/market-leads";
import { writeToRpl } from "@/lib/rpl-writer";
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
  source: "federal_register" | "legiscan" | "sec_edgar" | "operator_news" | "congress_gov" | "regulations_gov";
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

function normalizeCongressBill(b: CongressBill): IngestedRecord {
  return {
    id: `congress_gov_${b.congress}_${b.type}_${b.number}`,
    source: "congress_gov",
    sourceId: `${b.congress}-${b.type}-${b.number}`,
    title: b.title,
    summary: `${b.type.toUpperCase()} ${b.number} (${b.congress}th Congress) — ${b.latestAction?.text ?? "No action recorded"}`,
    status: b.latestAction?.text ?? "introduced",
    date: b.latestAction?.actionDate ?? b.introducedDate,
    url: b.url,
    raw: b as unknown as Record<string, unknown>,
    ingestedAt: new Date().toISOString(),
  };
}

function normalizeRegulation(doc: RegulationDocument): IngestedRecord {
  const attrs = doc.attributes;
  return {
    id: `regulations_gov_${doc.id}`,
    source: "regulations_gov",
    sourceId: doc.id,
    title: attrs.title,
    summary: `${attrs.documentType} — Docket ${attrs.docketId} (${attrs.agencyId})${attrs.commentEndDate ? `. Comment period ends ${attrs.commentEndDate}` : ""}`,
    status: attrs.documentType,
    date: attrs.postedDate,
    url: `https://www.regulations.gov/document/${doc.id}`,
    raw: doc as unknown as Record<string, unknown>,
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

    const [federalFilings, legiscanResults, secEdgarResults, operatorNews, congressBills, regulationDocs] = await Promise.all([
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
      // 5. Congress.gov federal bills (skips gracefully if no API key)
      searchCongressBills().catch((err) => {
        console.warn("[ingestion] Congress.gov fetch failed:", err);
        return [] as CongressBill[];
      }),
      // 6. Regulations.gov FAA dockets (skips gracefully if no API key)
      searchRegulations({ postedAfter: new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0] }).catch((err) => {
        console.warn("[ingestion] Regulations.gov fetch failed:", err);
        return [] as RegulationDocument[];
      }),
    ]);

    const allBills = legiscanResults;
    const allSecFilings = secEdgarResults.flat();

    console.log(`[ingestion] Federal Register: ${federalFilings.length} filings`);
    console.log(`[ingestion] LegiScan: ${allBills.length} bills`);
    console.log(`[ingestion] SEC EDGAR: ${allSecFilings.length} filings (${SEC_FORM_TYPES.join(", ")})`);
    console.log(`[ingestion] Congress.gov: ${congressBills.length} bills`);
    console.log(`[ingestion] Regulations.gov: ${regulationDocs.length} documents`);

    // 7. Normalize and merge all sources
    const incomingRecords: IngestedRecord[] = [
      ...federalFilings.map(normalizeFederalFiling),
      ...allBills.map(normalizeStateBill),
      ...allSecFilings,
      ...operatorNews,
      ...congressBills.map(normalizeCongressBill),
      ...regulationDocs.map(normalizeRegulation),
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
        changeType: (r.source === "legiscan" || r.source === "congress_gov") ? "new_law" : "new_filing",
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

      // 10b. Deduplicate by URL before classification (same article can appear in multiple operator feeds)
      // Normalize URLs: strip tracking params and aggregator path variations
      function normalizeUrl(url: string): string {
        try {
          const u = new URL(url);
          // Strip common tracking params
          for (const p of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref", "fbclid", "gclid"]) {
            u.searchParams.delete(p);
          }
          // Domain-level normalization for known aggregators
          if (u.hostname.includes("marketscreener.com")) {
            // MarketScreener republishes same article at multiple paths — normalize to article ID
            const match = u.pathname.match(/\/(\d{8,})/);
            if (match) return `marketscreener:${match[1]}`;
          }
          return u.toString();
        } catch {
          return url;
        }
      }
      const seenUrls = new Set<string>();
      const dedupedRecords = changedRecords.filter((r) => {
        if (!r.url) return false;
        const normalized = normalizeUrl(r.url);
        if (seenUrls.has(normalized)) return false;
        seenUrls.add(normalized);
        return true;
      });
      if (dedupedRecords.length < changedRecords.length) {
        console.log(`[ingestion] Deduped ${changedRecords.length} → ${dedupedRecords.length} records by URL before classification`);
      }

      // 11. Classify new/updated records with NLP (falls back to regex rules)
      const { overrideCandidates: regexOverrides, corridorEvents, marketLeadSignals: rulesSignals } = evaluateRulesV2(dedupedRecords);

      // Collect market lead signals from all layers
      const allMarketLeadSignals: MarketLeadSignal[] = [...rulesSignals];

      let overrideCandidates;
      try {
        const classifierResult = await classifyRecords(dedupedRecords);
        overrideCandidates = classifierResult.overrideCandidates;
        allMarketLeadSignals.push(...classifierResult.marketLeadSignals);
        console.log(`[ingestion] NLP classifier: ${overrideCandidates.length} candidates, ${classifierResult.marketLeadSignals.length} lead signals`);
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

      // 11c. Write to RPL — persist classified records to Regulatory Precedent Library
      try {
        // Build RPL write inputs from classified records + their classification results
        const rplInputs = dedupedRecords.map((r) => {
          // Find this record's classification result from the DB
          // ClassificationResults were just written by classifyRecords() above
          return {
            recordId: r.id,
            source: r.source,
            title: r.title,
            summary: r.summary,
            url: r.url,
            date: r.date,
            // Classification data will be pulled from ClassificationResult table by rpl-writer
          };
        });

        // Fetch classification results for these records
        const classResults = await prisma.classificationResult.findMany({
          where: { recordId: { in: dedupedRecords.map(r => r.id) } },
          select: { recordId: true, eventType: true, confidence: true, affectedCities: true },
        });
        const classMap = new Map(classResults.map(c => [c.recordId, c]));

        const rplWriteInputs = rplInputs.map(r => {
          const cls = classMap.get(r.recordId);
          return {
            ...r,
            eventType: cls?.eventType ?? null,
            confidence: cls?.confidence ?? null,
            affectedCities: cls?.affectedCities ?? [],
          };
        });

        const rplResult = await writeToRpl(rplWriteInputs);
        console.log(
          `[ingestion] RPL: ${rplResult.documentsCreated} docs created, ${rplResult.documentsUpdated} updated, ` +
          `${rplResult.factorMappingsCreated} factor mappings, ${rplResult.cityAssociationsCreated} city associations`
        );
      } catch (err) {
        console.error("[ingestion] RPL write failed (non-blocking):", err);
      }

      // 11d. Refresh FKB scores from RPL evidence — update signal counts + confidence
      try {
        const { refreshAllMarketScores } = await import("@/lib/fkb");
        const fkbResult = await refreshAllMarketScores();
        console.log(
          `[ingestion] FKB refresh: ${fkbResult.factorsUpdated} factors updated, ` +
          `${fkbResult.confidenceUpgrades} confidence upgrades, ${fkbResult.totalSignals} signals`
        );
      } catch (err) {
        console.error("[ingestion] FKB refresh failed (non-blocking):", err);
      }

      // 11e. Auto-promote high-confidence signals to Intel Feed (drafts for review)
      try {
        const { promoteSignalsToFeed } = await import("@/lib/feed-promoter");
        const feedResult = await promoteSignalsToFeed(7);
        if (feedResult.promoted > 0) {
          console.log(
            `[ingestion] Feed promoter: ${feedResult.promoted} new drafts from ${feedResult.scanned} signals`
          );
        }
      } catch (err) {
        console.error("[ingestion] Feed promoter failed (non-blocking):", err);
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

      // 13. Auto-discover market leads from all signal layers
      if (allMarketLeadSignals.length > 0) {
        try {
          const leadResult = await processMarketLeadSignals(allMarketLeadSignals);
          console.log(`[ingestion] Market leads: ${leadResult.created} created, ${leadResult.updated} updated from ${allMarketLeadSignals.length} signals`);
        } catch (err) {
          console.error("[ingestion] Failed to process market lead signals:", err);
        }
      }
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

