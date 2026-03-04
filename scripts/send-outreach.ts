/**
 * Batch send city outreach emails.
 *
 * Usage:
 *   npx tsx scripts/send-outreach.ts contacts.json
 *
 * contacts.json format:
 *   [{ "email": "jane@city.gov", "name": "Jane Smith", "cityId": "austin" }]
 *
 * Optional env:
 *   CALENDAR_URL — booking link for the CTA button (defaults to a placeholder)
 *   DRY_RUN=1   — log what would be sent without actually sending
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { CITIES } from "../src/data/seed";
import { analyzeGaps, getPeerContext } from "../src/lib/gap-analysis";
import { sendCityOutreachEmail } from "../src/lib/email";

interface Contact {
  email: string;
  name?: string;
  cityId: string;
}

const calendarUrl =
  process.env.CALENDAR_URL || "https://calendly.com/airindex/20min";
const dryRun = process.env.DRY_RUN === "1";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const contactsPath = process.argv[2];
  if (!contactsPath) {
    console.error("Usage: npx tsx scripts/send-outreach.ts <contacts.json>");
    process.exit(1);
  }

  const resolved = path.resolve(contactsPath);
  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(resolved, "utf-8");
  let contacts: Contact[];
  try {
    contacts = JSON.parse(raw);
  } catch {
    console.error("Invalid JSON in contacts file");
    process.exit(1);
  }

  if (!Array.isArray(contacts) || contacts.length === 0) {
    console.error("Contacts file must be a non-empty array");
    process.exit(1);
  }

  const citiesMap = new Map(CITIES.map((c) => [c.id, c]));

  console.log(
    `\n${dryRun ? "[DRY RUN] " : ""}Sending outreach to ${contacts.length} contact(s)...\n`
  );

  let sent = 0;
  let failed = 0;

  for (const contact of contacts) {
    const city = citiesMap.get(contact.cityId);
    if (!city) {
      console.error(`  SKIP: Unknown cityId "${contact.cityId}" for ${contact.email}`);
      failed++;
      continue;
    }

    const gap = analyzeGaps(city);
    const peers = getPeerContext(city, CITIES);

    const topGaps = gap.gaps.slice(0, 3).map((g) => ({
      label: g.label,
      weight: g.max - g.earned,
    }));

    const peerCityNames = peers.sameTier.slice(0, 3).map((p) => p.city);

    if (dryRun) {
      console.log(
        `  [DRY] ${contact.email} — ${city.city}, ${city.state} (${gap.score}/${gap.tier})`
      );
      sent++;
      continue;
    }

    try {
      const ok = await sendCityOutreachEmail({
        to: contact.email,
        recipientName: contact.name,
        cityName: city.city,
        state: city.state,
        score: gap.score,
        tier: gap.tier,
        tierColor: gap.tierColor,
        achievedCount: gap.achievedCount,
        topGaps,
        peerCityNames,
        calendarUrl,
      });

      if (ok) {
        console.log(`  SENT: ${contact.email} — ${city.city}`);
        sent++;
      } else {
        console.log(`  SKIP: ${contact.email} — no SES credentials`);
        failed++;
      }
    } catch (err) {
      console.error(`  FAIL: ${contact.email} —`, err);
      failed++;
    }

    // 1-second delay between sends for SES rate limiting
    if (contacts.indexOf(contact) < contacts.length - 1) {
      await sleep(1000);
    }
  }

  console.log(`\nDone. Sent: ${sent}, Failed/Skipped: ${failed}\n`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
