import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { fetchFederalRegisterUAM, fetchStateBills, fetchOperatorFilings, OPERATOR_CIKS } from "@/lib/faa-api";
import type { FederalFiling, StateBill, SecFiling } from "@/lib/faa-api";
import { fetchAllOperatorNews } from "@/lib/operator-news";
import { addChangelogEntries } from "@/lib/changelog";
import { notifySubscribers } from "@/lib/notifications";
import { evaluateRulesV2 } from "@/lib/rules-engine";
import { updateCorridorStatus } from "@/lib/corridors";
import { classifyRecords } from "@/lib/classifier";
import { applyOverrides } from "@/lib/score-updater";
import type { ChangelogEntry } from "@/types";

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
// File I/O
// -------------------------------------------------------

// Use /tmp on serverless (Lambda), process.cwd()/data locally
const IS_LAMBDA = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const DATA_DIR = IS_LAMBDA ? "/tmp" : path.join(process.cwd(), "data");
const INGESTED_FILE = path.join(DATA_DIR, "ingested.json");
const META_FILE = path.join(DATA_DIR, "ingestion-meta.json");

let writeLock: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = writeLock;
  let resolve: () => void;
  writeLock = new Promise<void>((r) => (resolve = r));
  return prev.then(fn).finally(() => resolve!());
}

async function readIngested(): Promise<IngestedRecord[]> {
  try {
    const raw = await fs.readFile(INGESTED_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeIngested(records: IngestedRecord[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(INGESTED_FILE, JSON.stringify(records, null, 2) + "\n", "utf-8");
}

async function writeMeta(meta: IngestionMeta): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(META_FILE, JSON.stringify(meta, null, 2) + "\n", "utf-8");
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
const TARGET_STATES = ["CA", "TX", "FL", "NY", "AZ", "NV", "IL", "GA", "TN", "NC", "CO", "WA", "MA", "MN", "DC", "OH"];

// -------------------------------------------------------
// Orchestrator
// -------------------------------------------------------

export async function runIngestion(): Promise<{
  diff: DiffResult;
  meta: IngestionMeta;
}> {
  return withLock(async () => {
    console.log("[ingestion] Starting ingestion run...");

    // 1-4. Fetch all sources in parallel
    const SEC_FORM_TYPES = ["8-K", "10-K", "10-Q"];

    const [federalFilings, legiscanResults, secEdgarResults, operatorNews] = await Promise.all([
      // 1. Federal Register
      fetchFederalRegisterUAM(90),
      // 2. LegiScan for all target states in parallel
      Promise.all(TARGET_STATES.map((state) => fetchStateBills(state))),
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

    const allBills = legiscanResults.flat();
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

    // 6. Merge and persist
    const existingMap = new Map(existing.map((r) => [r.id, r]));
    for (const r of diff.newRecords) existingMap.set(r.id, r);
    for (const r of diff.updatedRecords) existingMap.set(r.id, r);
    const merged = Array.from(existingMap.values());

    await writeIngested(merged);

    // 7. Write meta
    const sources = Array.from(new Set(incomingRecords.map((r) => r.source)));
    const meta: IngestionMeta = {
      lastRunAt: new Date().toISOString(),
      recordCount: merged.length,
      sources,
    };
    await writeMeta(meta);

    // 8. Create changelog entries
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

    // 9. Enrich sparse summaries before classification
    const changedRecords = [...diff.newRecords, ...diff.updatedRecords];
    if (changedRecords.length > 0) {
      await enrichSecFilings(changedRecords);
      await enrichOperatorNews(changedRecords);

      // 10. Classify new/updated records with NLP (falls back to regex rules)
      // Run rules engine once for both overrides (fallback) and corridor events
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
        console.log(
          `[ingestion] Score updater: ${result.persisted} overrides persisted, ${result.applied} auto-applied, ${result.scoreChanges.length} score changes`
        );
      }

      // 11. Process corridor events
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
            // Unresolved corridor — log for admin review
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
    }

    console.log("[ingestion] Run complete.");
    return { diff, meta };
  });
}
