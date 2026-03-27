/**
 * Send UAM Market Pulse Issue 3 email.
 * Usage: npx tsx scripts/send-pulse-issue3.ts [email1] [email2] ...
 * Default: sends to alan@airindex.io (test)
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
  join(__dirname, "../public/reports/email-pulse-issue3.html"),
  "utf-8"
);

const from = "AirIndex <hello@airindex.io>";
const subject = "UAM Market Pulse — Issue 3 · Week of March 27, 2026";

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
