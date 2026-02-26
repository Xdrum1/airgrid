import type { ChangelogEntry } from "@/types";
import { getSubscriptions } from "@/lib/subscriptions";
import { sendAlertEmail } from "@/lib/email";
import { CITIES_MAP } from "@/data/seed";

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

      if (typeMatch && cityMatch) {
        const cityName =
          CITIES_MAP[entry.relatedEntityId]?.city ?? entry.relatedEntityId;

        await sendAlertEmail({
          to: sub.email,
          subscriptionId: sub.id,
          cityName,
          changeType: entry.changeType,
          summary: entry.summary,
          sourceUrl: entry.sourceUrl,
        });
      }
    }
  }
}
