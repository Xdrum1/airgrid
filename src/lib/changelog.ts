import crypto from "crypto";
import type { ChangelogEntry, ChangeType } from "@/types";
import { CHANGELOG_SEED } from "@/data/changelog-seed";

// Dynamic import to prevent client bundle contamination
async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

// -------------------------------------------------------
// Seed check — runs once per process lifetime
// -------------------------------------------------------

let seeded = false;

async function ensureSeeded(): Promise<void> {
  if (seeded) return;

  const prisma = await getPrisma();
  const count = await prisma.changelogEntry.count();

  if (count === 0) {
    console.log("[changelog] Seeding database with initial entries...");
    await prisma.changelogEntry.createMany({
      data: CHANGELOG_SEED.map((entry) => ({
        id: entry.id,
        changeType: entry.changeType,
        relatedEntityType: entry.relatedEntityType,
        relatedEntityId: entry.relatedEntityId,
        summary: entry.summary,
        sourceUrl: entry.sourceUrl ?? null,
        timestamp: new Date(entry.timestamp),
      })),
    });
    console.log(`[changelog] Seeded ${CHANGELOG_SEED.length} entries`);
  }

  seeded = true;
}

// -------------------------------------------------------
// Public API (interface unchanged)
// -------------------------------------------------------

export interface GetChangelogOptions {
  changeType?: ChangeType;
  entityType?: ChangelogEntry["relatedEntityType"];
  limit?: number;
}

export async function getChangelogEntries(
  options?: GetChangelogOptions
): Promise<ChangelogEntry[]> {
  await ensureSeeded();

  const prisma = await getPrisma();

  const where: Record<string, unknown> = {};
  if (options?.changeType) where.changeType = options.changeType;
  if (options?.entityType) where.relatedEntityType = options.entityType;

  const rows = await prisma.changelogEntry.findMany({
    where,
    orderBy: { timestamp: "desc" },
    take: options?.limit ?? undefined,
  });

  return rows.map((r) => ({
    id: r.id,
    changeType: r.changeType as ChangeType,
    relatedEntityType: r.relatedEntityType as ChangelogEntry["relatedEntityType"],
    relatedEntityId: r.relatedEntityId,
    summary: r.summary,
    timestamp: r.timestamp.toISOString(),
    sourceUrl: r.sourceUrl ?? undefined,
  }));
}

export async function addChangelogEntries(
  batch: Omit<ChangelogEntry, "id" | "timestamp">[]
): Promise<ChangelogEntry[]> {
  await ensureSeeded();

  const prisma = await getPrisma();
  const now = new Date();

  const newEntries = batch.map((entry) => ({
    id: crypto.randomUUID(),
    changeType: entry.changeType,
    relatedEntityType: entry.relatedEntityType,
    relatedEntityId: entry.relatedEntityId,
    summary: entry.summary,
    sourceUrl: entry.sourceUrl ?? null,
    timestamp: now,
  }));

  await prisma.changelogEntry.createMany({ data: newEntries });

  return newEntries.map((r) => ({
    id: r.id,
    changeType: r.changeType as ChangeType,
    relatedEntityType: r.relatedEntityType as ChangelogEntry["relatedEntityType"],
    relatedEntityId: r.relatedEntityId,
    summary: r.summary,
    timestamp: r.timestamp.toISOString(),
    sourceUrl: r.sourceUrl ?? undefined,
  }));
}
