import type { Corridor } from "@/types";
import { CORRIDORS, CORRIDORS_MAP } from "@/data/seed";

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
    console.error("[corridors] DB read failed, falling back to seed:", err);
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
    console.error("[corridors] DB read failed, falling back to seed:", err);
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
    console.error("[corridors] DB read failed, falling back to seed:", err);
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
    console.error("[corridors] Failed to fetch status history:", err);
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
