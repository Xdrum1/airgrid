/**
 * Client-side fire-and-forget event tracking.
 * Only sends if user is authenticated (server rejects 401 silently).
 */
export function trackEvent(
  event: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>
): void {
  fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, entityType, entityId, metadata }),
  }).catch(() => {});
}

/**
 * Send event via navigator.sendBeacon — survives page unload.
 * Falls back to fetch if sendBeacon is unavailable.
 */
export function beaconEvent(
  event: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>
): void {
  const payload = JSON.stringify({ event, entityType, entityId, metadata });

  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon("/api/events", blob);
  } else {
    trackEvent(event, entityType, entityId, metadata);
  }
}
