import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const logger = createLogger("events");

// -------------------------------------------------------
// Throttled lastActiveAt update (once per 5 min per user)
// -------------------------------------------------------

const lastActiveCache = new Map<string, number>();
const LAST_ACTIVE_THROTTLE_MS = 5 * 60 * 1000;

function updateLastActive(userId: string) {
  const now = Date.now();
  const last = lastActiveCache.get(userId) ?? 0;
  if (now - last < LAST_ACTIVE_THROTTLE_MS) return;
  lastActiveCache.set(userId, now);
  prisma.user.update({
    where: { id: userId },
    data: { lastActiveAt: new Date() },
  }).catch((err) => logger.error("Failed to update lastActiveAt:", err));
}

// -------------------------------------------------------
// Allowed values
// -------------------------------------------------------

const ALLOWED_EVENTS = [
  "page_view",
  "page_leave",
  "city_detail",
  "corridor_click",
  "tab_switch",
  "report_download",
  "operator_click",
  "filing_click",
  "alert_subscribe",
  "alert_unsubscribe",
  "watchlist_add",
  "watchlist_remove",
] as const;

export type EventName = (typeof ALLOWED_EVENTS)[number];

// -------------------------------------------------------
// Write — fire-and-forget from API route
// -------------------------------------------------------

export async function logEvent(
  userId: string,
  event: string,
  entityType?: string | null,
  entityId?: string | null,
  metadata?: Record<string, unknown> | null
): Promise<void> {
  if (!ALLOWED_EVENTS.includes(event as EventName)) {
    logger.warn("Rejected unknown event type:", event);
    return;
  }

  try {
    await prisma.userEvent.create({
      data: {
        userId,
        event,
        entityType: entityType ?? null,
        entityId: entityId ?? null,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
      },
    });

    // Throttled lastActiveAt update (once per 5 min per user)
    updateLastActive(userId);
  } catch (err) {
    // Never throw — callers are fire-and-forget
    logger.error("Failed to log event:", err);
  }
}

// -------------------------------------------------------
// Read — admin query
// -------------------------------------------------------

export interface EventFilters {
  userId?: string;
  event?: string;
  limit?: number;
}

export async function getRecentEvents(filters: EventFilters = {}) {
  const { userId, event, limit = 100 } = filters;

  const where: Record<string, unknown> = {};
  if (userId) where.userId = userId;
  if (event) where.event = event;

  return prisma.userEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 500),
    include: {
      user: { select: { email: true } },
    },
  });
}

export function isValidEvent(event: string): boolean {
  return ALLOWED_EVENTS.includes(event as EventName);
}
