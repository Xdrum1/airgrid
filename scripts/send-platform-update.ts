/**
 * Send platform update email via SES.
 *
 * Usage:
 *   npx tsx scripts/send-platform-update.ts alan@airindex.io
 *   npx tsx scripts/send-platform-update.ts don@truweather.com rex@heliexperts.com
 */

import { sendSesEmail } from "../src/lib/ses";
import { readFileSync } from "fs";
import path from "path";

// Load env
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const recipients = process.argv.slice(2);
if (recipients.length === 0) {
  console.error("Usage: npx tsx scripts/send-platform-update.ts email1 email2 ...");
  process.exit(1);
}

const htmlPath = path.join(process.cwd(), "public/reports/platform-update-mar30.html");
const html = readFileSync(htmlPath, "utf-8");
const subject = "What's new on AirIndex — Week of March 30";
const from = "AirIndex <hello@airindex.io>";

async function main() {
  for (const to of recipients) {
    try {
      await sendSesEmail({ to, from, subject, html });
      console.log(`✓ Sent to ${to}`);
    } catch (err) {
      console.error(`✗ Failed to send to ${to}:`, err instanceof Error ? err.message : err);
    }
  }
}

main();
