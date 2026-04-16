/**
 * Send UAM Market Pulse Issue 6 email.
 *
 * Usage:
 *   # Test send to Alan only (default):
 *   npx tsx scripts/send-pulse-issue6.ts
 *
 *   # Send to named recipients:
 *   npx tsx scripts/send-pulse-issue6.ts mike@... ken@... rex@... don@...
 *
 * Before sending to the real list, run the pre-flight check:
 *   npx tsx scripts/pulse-preflight.ts public/docs/UAM_Market_Pulse_Issue6.html
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { readFileSync } from "fs";
import { join } from "path";
import { sendSesEmail } from "../src/lib/ses";

const recipients = process.argv.slice(2);
if (recipients.length === 0) {
  recipients.push("alan@airindex.io");
}

const html = readFileSync(
  join(__dirname, "../public/docs/UAM_Market_Pulse_Issue6.html"),
  "utf-8",
);

const from = "AirIndex <hello@airindex.io>";
const subject = "UAM Market Pulse — Issue 6 · Methodology in print · Apr 17, 2026";

async function main() {
  for (const to of recipients) {
    try {
      await sendSesEmail({ to, from, subject, html });
      console.log(`[ok] Sent to ${to}`);
    } catch (err) {
      console.error(`[fail] ${to}:`, err);
    }
  }
}

main();
