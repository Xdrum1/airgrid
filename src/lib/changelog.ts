import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import type { ChangelogEntry, ChangeType } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const CHANGELOG_FILE = path.join(DATA_DIR, "changelog.json");

let writeLock: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = writeLock;
  let resolve: () => void;
  writeLock = new Promise<void>((r) => (resolve = r));
  return prev.then(fn).finally(() => resolve!());
}

async function readChangelog(): Promise<ChangelogEntry[]> {
  try {
    const raw = await fs.readFile(CHANGELOG_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeChangelog(entries: ChangelogEntry[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(CHANGELOG_FILE, JSON.stringify(entries, null, 2) + "\n", "utf-8");
}

export interface GetChangelogOptions {
  changeType?: ChangeType;
  entityType?: ChangelogEntry["relatedEntityType"];
  limit?: number;
}

export async function getChangelogEntries(
  options?: GetChangelogOptions
): Promise<ChangelogEntry[]> {
  let entries = await readChangelog();

  // Sort newest first
  entries.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (options?.changeType) {
    entries = entries.filter((e) => e.changeType === options.changeType);
  }
  if (options?.entityType) {
    entries = entries.filter((e) => e.relatedEntityType === options.entityType);
  }
  if (options?.limit) {
    entries = entries.slice(0, options.limit);
  }

  return entries;
}

export async function addChangelogEntries(
  batch: Omit<ChangelogEntry, "id" | "timestamp">[]
): Promise<ChangelogEntry[]> {
  return withLock(async () => {
    const existing = await readChangelog();
    const now = new Date().toISOString();

    const newEntries: ChangelogEntry[] = batch.map((entry) => ({
      ...entry,
      id: crypto.randomUUID(),
      timestamp: now,
    }));

    const merged = [...existing, ...newEntries];
    await writeChangelog(merged);
    return newEntries;
  });
}
