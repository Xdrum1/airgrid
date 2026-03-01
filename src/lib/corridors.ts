import type { Corridor } from "@/types";
import { CORRIDORS, CORRIDORS_MAP } from "@/data/seed";
import { createLogger } from "@/lib/logger";

const logger = createLogger("corridors");

// Dynamic import to prevent client bundle contamination
async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

// -------------------------------------------------------
// In-memory cache (60s TTL)
// -------------------------------------------------------

let cachedCorridors: Corridor[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000;

export function invalidateCorridorsCache() {
  cachedCorridors = null;
  cacheTimestamp = 0;
}

// -------------------------------------------------------
// DB row → Corridor interface mapper
// -------------------------------------------------------

interface CorridorRow {
  id: string;
  name: string;
  status: string;
  cityId: string;
  operatorId: string | null;
  startPointLat: number;
  startPointLng: number;
  startPointLabel: string;
  endPointLat: number;
  endPointLng: number;
  endPointLabel: string;
  waypoints: unknown;
  distanceKm: number;
  estimatedFlightMinutes: number;
  maxAltitudeFt: number;
  altitudeMinFt: number | null;
  faaAuthNumber: string | null;
  effectiveDate: string | null;
  expirationDate: string | null;
  clearedOperators: string[];
  notes: string | null;
  sourceUrl: string | null;
  lastUpdated: Date;
}

function dbRowToCorridor(row: CorridorRow): Corridor {
  const corridor: Corridor = {
    id: row.id,
    name: row.name,
    status: row.status as Corridor["status"],
    cityId: row.cityId,
    startPoint: {
      lat: row.startPointLat,
      lng: row.startPointLng,
      label: row.startPointLabel,
    },
    endPoint: {
      lat: row.endPointLat,
      lng: row.endPointLng,
      label: row.endPointLabel,
    },
    distanceKm: row.distanceKm,
    estimatedFlightMinutes: row.estimatedFlightMinutes,
    maxAltitudeFt: row.maxAltitudeFt,
    lastUpdated: row.lastUpdated.toISOString().split("T")[0],
  };

  if (row.operatorId) corridor.operatorId = row.operatorId;
  if (row.waypoints) corridor.waypoints = row.waypoints as { lat: number; lng: number }[];
  if (row.altitudeMinFt != null) corridor.altitudeMinFt = row.altitudeMinFt;
  if (row.faaAuthNumber) corridor.faaAuthNumber = row.faaAuthNumber;
  if (row.effectiveDate) corridor.effectiveDate = row.effectiveDate;
  if (row.expirationDate) corridor.expirationDate = row.expirationDate;
  if (row.clearedOperators.length > 0) corridor.clearedOperators = row.clearedOperators;
  if (row.notes) corridor.notes = row.notes;
  if (row.sourceUrl) corridor.sourceUrl = row.sourceUrl;

  return corridor;
}

// -------------------------------------------------------
// Public API
// -------------------------------------------------------

export async function getCorridors(): Promise<Corridor[]> {
  const now = Date.now();
  if (cachedCorridors && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedCorridors;
  }

  try {
    const prisma = await getPrisma();
    const rows = await prisma.corridor.findMany({
      orderBy: { name: "asc" },
    });
    const corridors = rows.map(dbRowToCorridor);
    cachedCorridors = corridors;
    cacheTimestamp = now;
    return corridors;
  } catch (err) {
    logger.error("DB read failed, falling back to seed:", err);
    return CORRIDORS;
  }
}

export async function getCorridorById(id: string): Promise<Corridor | null> {
  try {
    const prisma = await getPrisma();
    const row = await prisma.corridor.findUnique({ where: { id } });
    if (!row) return CORRIDORS_MAP[id] ?? null;
    return dbRowToCorridor(row);
  } catch (err) {
    logger.error("DB read failed, falling back to seed:", err);
    return CORRIDORS_MAP[id] ?? null;
  }
}

export async function getCorridorsForCity(cityId: string): Promise<Corridor[]> {
  try {
    const prisma = await getPrisma();
    const rows = await prisma.corridor.findMany({
      where: { cityId },
      orderBy: { name: "asc" },
    });
    if (rows.length === 0) {
      // Fallback to seed for cities that may not be in DB yet
      return CORRIDORS.filter((c) => c.cityId === cityId);
    }
    return rows.map(dbRowToCorridor);
  } catch (err) {
    logger.error("DB read failed, falling back to seed:", err);
    return CORRIDORS.filter((c) => c.cityId === cityId);
  }
}

export interface CorridorStatusHistoryEntry {
  id: string;
  corridorId: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  sourceUrl: string | null;
  changedAt: string;
}

export async function getCorridorStatusHistory(
  corridorId: string
): Promise<CorridorStatusHistoryEntry[]> {
  try {
    const prisma = await getPrisma();
    const rows = await prisma.corridorStatusHistory.findMany({
      where: { corridorId },
      orderBy: { changedAt: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      corridorId: r.corridorId,
      fromStatus: r.fromStatus,
      toStatus: r.toStatus,
      reason: r.reason,
      sourceUrl: r.sourceUrl,
      changedAt: r.changedAt.toISOString(),
    }));
  } catch (err) {
    logger.error("Failed to fetch status history:", err);
    return [];
  }
}

export async function updateCorridorStatus(
  corridorId: string,
  newStatus: string,
  reason?: string,
  sourceUrl?: string
): Promise<void> {
  const prisma = await getPrisma();

  const corridor = await prisma.corridor.findUnique({
    where: { id: corridorId },
    select: { status: true },
  });

  if (!corridor) throw new Error(`Corridor ${corridorId} not found`);

  const oldStatus = corridor.status;

  await prisma.$transaction([
    prisma.corridor.update({
      where: { id: corridorId },
      data: { status: newStatus, lastUpdated: new Date() },
    }),
    prisma.corridorStatusHistory.create({
      data: {
        corridorId,
        fromStatus: oldStatus,
        toStatus: newStatus,
        reason: reason ?? null,
        sourceUrl: sourceUrl ?? null,
      },
    }),
  ]);

  invalidateCorridorsCache();
}

// -------------------------------------------------------
// Admin CRUD
// -------------------------------------------------------

export interface CreateCorridorInput {
  name: string;
  status: string;
  cityId: string;
  operatorId?: string;
  startPointLabel: string;
  endPointLabel: string;
  distanceKm?: number;
  estimatedFlightMinutes?: number;
  notes?: string;
  sourceUrl?: string;
}

export async function createCorridor(data: CreateCorridorInput): Promise<Corridor> {
  const prisma = await getPrisma();

  const id = "cor_" + data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

  const row = await prisma.corridor.create({
    data: {
      id,
      name: data.name,
      status: data.status,
      cityId: data.cityId,
      operatorId: data.operatorId ?? null,
      startPointLat: 0,
      startPointLng: 0,
      startPointLabel: data.startPointLabel,
      endPointLat: 0,
      endPointLng: 0,
      endPointLabel: data.endPointLabel,
      distanceKm: data.distanceKm ?? 0,
      estimatedFlightMinutes: data.estimatedFlightMinutes ?? 0,
      maxAltitudeFt: 1500,
      clearedOperators: [],
      notes: data.notes ?? null,
      sourceUrl: data.sourceUrl ?? null,
      lastUpdated: new Date(),
    },
  });

  invalidateCorridorsCache();
  return dbRowToCorridor(row);
}

export interface UpdateCorridorInput {
  name?: string;
  status?: string;
  cityId?: string;
  operatorId?: string | null;
  startPointLabel?: string;
  endPointLabel?: string;
  distanceKm?: number;
  estimatedFlightMinutes?: number;
  notes?: string | null;
  sourceUrl?: string | null;
}

export async function updateCorridorById(
  id: string,
  data: UpdateCorridorInput
): Promise<Corridor> {
  const prisma = await getPrisma();

  const updateData: Record<string, unknown> = { lastUpdated: new Date() };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.cityId !== undefined) updateData.cityId = data.cityId;
  if (data.operatorId !== undefined) updateData.operatorId = data.operatorId;
  if (data.startPointLabel !== undefined) updateData.startPointLabel = data.startPointLabel;
  if (data.endPointLabel !== undefined) updateData.endPointLabel = data.endPointLabel;
  if (data.distanceKm !== undefined) updateData.distanceKm = data.distanceKm;
  if (data.estimatedFlightMinutes !== undefined) updateData.estimatedFlightMinutes = data.estimatedFlightMinutes;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.sourceUrl !== undefined) updateData.sourceUrl = data.sourceUrl;

  const row = await prisma.corridor.update({
    where: { id },
    data: updateData,
  });

  invalidateCorridorsCache();
  return dbRowToCorridor(row);
}

export async function deleteCorridor(id: string): Promise<void> {
  const prisma = await getPrisma();
  await prisma.corridor.delete({ where: { id } });
  invalidateCorridorsCache();
}
