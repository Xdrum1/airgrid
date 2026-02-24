import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import type { AlertSubscription, ChangeType } from "@/types";
import { CITIES_MAP } from "@/data/seed";

// Use /tmp on serverless (Lambda), process.cwd()/data locally
const IS_LAMBDA = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const DATA_DIR = IS_LAMBDA ? "/tmp" : path.join(process.cwd(), "data");
const SUBS_FILE = path.join(DATA_DIR, "subscriptions.json");

// Simple write mutex to prevent concurrent file corruption
let writeLock: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = writeLock;
  let resolve: () => void;
  writeLock = new Promise<void>((r) => (resolve = r));
  return prev.then(fn).finally(() => resolve!());
}

async function readSubs(): Promise<AlertSubscription[]> {
  try {
    const raw = await fs.readFile(SUBS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeSubs(subs: AlertSubscription[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(SUBS_FILE, JSON.stringify(subs, null, 2) + "\n", "utf-8");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_CHANGE_TYPES: ChangeType[] = [
  "new_filing",
  "status_change",
  "new_law",
  "faa_update",
];

export function validateEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

export function validateCityIds(cityIds: string[]): boolean {
  if (cityIds.length === 0) return true; // empty = all cities
  return cityIds.every((id) => id in CITIES_MAP);
}

export function validateChangeTypes(types: ChangeType[]): boolean {
  if (types.length === 0) return true; // empty = all types
  return types.every((t) => VALID_CHANGE_TYPES.includes(t));
}

export async function getSubscriptions(): Promise<AlertSubscription[]> {
  return readSubs();
}

export async function addSubscription(
  email: string,
  cityIds: string[],
  changeTypes: ChangeType[]
): Promise<AlertSubscription> {
  return withLock(async () => {
    const subs = await readSubs();

    // Duplicate check: same email + same cityIds (sorted) + same changeTypes (sorted)
    const sortedCities = [...cityIds].sort();
    const sortedTypes = [...changeTypes].sort();
    const isDuplicate = subs.some(
      (s) =>
        s.email === email &&
        JSON.stringify([...s.cityIds].sort()) ===
          JSON.stringify(sortedCities) &&
        JSON.stringify([...s.changeTypes].sort()) ===
          JSON.stringify(sortedTypes)
    );
    if (isDuplicate) {
      throw new Error("DUPLICATE");
    }

    const sub: AlertSubscription = {
      id: crypto.randomUUID(),
      email,
      cityIds,
      changeTypes,
      createdAt: new Date().toISOString(),
    };

    subs.push(sub);
    await writeSubs(subs);
    return sub;
  });
}

export async function removeSubscription(
  id: string,
  email: string
): Promise<boolean> {
  return withLock(async () => {
    const subs = await readSubs();
    const idx = subs.findIndex((s) => s.id === id && s.email === email);
    if (idx === -1) return false;
    subs.splice(idx, 1);
    await writeSubs(subs);
    return true;
  });
}
