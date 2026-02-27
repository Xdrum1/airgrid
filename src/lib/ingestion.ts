import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { fetchFederalRegisterUAM, fetchStateBills, fetchOperatorFilings, OPERATOR_CIKS } from "@/lib/faa-api";
import type { FederalFiling, StateBill, SecFiling } from "@/lib/faa-api";
import { addChangelogEntries } from "@/lib/changelog";
import { notifySubscribers } from "@/lib/notifications";
import { evaluateRules } from "@/lib/rules-engine";
import { applyOverrides } from "@/lib/score-updater";
import type { ChangelogEntry } from "@/types";

// -------------------------------------------------------
// Types
// -------------------------------------------------------

export interface IngestedRecord {
  id: string;
  source: "federal_register" | "legiscan" | "sec_edgar";
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
const TARGET_STATES = ["CA", "TX", "FL", "NY", "AZ", "NV", "IL", "GA"];

// -------------------------------------------------------
// Orchestrator
// -------------------------------------------------------

export async function runIngestion(): Promise<{
  diff: DiffResult;
  meta: IngestionMeta;
}> {
  return withLock(async () => {
    console.log("[ingestion] Starting ingestion run...");

    // 1. Fetch Federal Register
    const federalFilings = await fetchFederalRegisterUAM(90);
    console.log(`[ingestion] Federal Register: ${federalFilings.length} filings`);

    // 2. Fetch LegiScan for target states (graceful no-op without key)
    const allBills: StateBill[] = [];
    for (const state of TARGET_STATES) {
      const bills = await fetchStateBills(state);
      allBills.push(...bills);
    }
    console.log(`[ingestion] LegiScan: ${allBills.length} bills`);

    // 3. Fetch SEC EDGAR 8-K filings for tracked operators
    const allSecFilings: IngestedRecord[] = [];
    for (const operatorId of Object.keys(OPERATOR_CIKS)) {
      const filings = await fetchOperatorFilings(operatorId, "8-K");
      allSecFilings.push(...filings.map((f) => normalizeSecFiling(f, operatorId)));
    }
    console.log(`[ingestion] SEC EDGAR: ${allSecFilings.length} 8-K filings`);

    // 4. Normalize and merge all sources
    const incomingRecords: IngestedRecord[] = [
      ...federalFilings.map(normalizeFederalFiling),
      ...allBills.map(normalizeStateBill),
      ...allSecFilings,
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

    // 9. Run rules engine on new/updated records
    const changedRecords = [...diff.newRecords, ...diff.updatedRecords];
    if (changedRecords.length > 0) {
      const overrideCandidates = evaluateRules(changedRecords);
      if (overrideCandidates.length > 0) {
        const result = await applyOverrides(overrideCandidates);
        console.log(
          `[ingestion] Rules engine: ${result.persisted} overrides persisted, ${result.applied} auto-applied, ${result.scoreChanges.length} score changes`
        );
      }
    }

    console.log("[ingestion] Run complete.");
    return { diff, meta };
  });
}
