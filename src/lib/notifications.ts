import type { ChangelogEntry } from "@/types";
import { getSubscriptions } from "@/lib/subscriptions";
import { getChangelogEntries } from "@/lib/changelog";
import { sendAlertEmail, sendDigestEmail } from "@/lib/email";
import { CITIES_MAP, CORRIDORS_MAP } from "@/data/seed";

export async function notifySubscribers(
  entries: ChangelogEntry[]
): Promise<void> {
  if (entries.length === 0) return;

  const subs = await getSubscriptions();
  if (subs.length === 0) {
    console.log("[notifications] No subscribers — skipping notifications.");
    return;
  }

  for (const entry of entries) {
    for (const sub of subs) {
      // Match by changeType (empty = all)
      const typeMatch =
        sub.changeTypes.length === 0 ||
        sub.changeTypes.includes(entry.changeType);

      // Match by city
      const cityMatch =
        sub.cityIds.length === 0 ||
        sub.cityIds.includes(entry.relatedEntityId);

      // Match by corridor
      const corridorMatch =
        entry.relatedEntityType === "corridor" &&
        sub.corridorIds.length > 0 &&
        sub.corridorIds.includes(entry.relatedEntityId);

      if (typeMatch && (cityMatch || corridorMatch)) {
        let entityName: string;
        if (corridorMatch) {
          entityName = CORRIDORS_MAP[entry.relatedEntityId]?.name ?? entry.relatedEntityId;
        } else {
          entityName = CITIES_MAP[entry.relatedEntityId]?.city ?? entry.relatedEntityId;
        }

        await sendAlertEmail({
          to: sub.email,
          subscriptionId: sub.id,
          cityName: entityName,
          changeType: entry.changeType,
          summary: entry.summary,
          sourceUrl: entry.sourceUrl,
        });
      }
    }
  }
}

function resolveEntityName(entry: ChangelogEntry): string {
  if (entry.relatedEntityType === "corridor") {
    return CORRIDORS_MAP[entry.relatedEntityId]?.name ?? entry.relatedEntityId;
  }
  return CITIES_MAP[entry.relatedEntityId]?.city ?? entry.relatedEntityId;
}

export async function sendWeeklyDigests(): Promise<{
  digestsSent: number;
  entriesProcessed: number;
}> {
  const now = new Date();
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const entries = await getChangelogEntries({ since });
  if (entries.length === 0) {
    console.log("[digest] No changelog entries in past 7 days — skipping.");
    return { digestsSent: 0, entriesProcessed: 0 };
  }

  const subs = await getSubscriptions();
  if (subs.length === 0) {
    console.log("[digest] No subscribers — skipping.");
    return { digestsSent: 0, entriesProcessed: entries.length };
  }

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const weekStart = fmt(since);
  const weekEnd = fmt(now);

  let digestsSent = 0;

  for (const sub of subs) {
    const matched = entries.filter((entry) => {
      const typeMatch =
        sub.changeTypes.length === 0 ||
        sub.changeTypes.includes(entry.changeType);

      const cityMatch =
        sub.cityIds.length === 0 ||
        sub.cityIds.includes(entry.relatedEntityId);

      const corridorMatch =
        entry.relatedEntityType === "corridor" &&
        sub.corridorIds.length > 0 &&
        sub.corridorIds.includes(entry.relatedEntityId);

      return typeMatch && (cityMatch || corridorMatch);
    });

    if (matched.length === 0) continue;

    const sent = await sendDigestEmail({
      to: sub.email,
      subscriptionId: sub.id,
      entries: matched.map((e) => ({
        entityName: resolveEntityName(e),
        changeType: e.changeType,
        summary: e.summary,
        sourceUrl: e.sourceUrl,
      })),
      weekStart,
      weekEnd,
    });

    if (sent) digestsSent++;
  }

  console.log(
    `[digest] Sent ${digestsSent} digests covering ${entries.length} entries.`
  );
  return { digestsSent, entriesProcessed: entries.length };
}
