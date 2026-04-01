/**
 * Send Charlotte courtesy outreach emails
 *
 * Usage:
 *   npx tsx scripts/send-charlotte-outreach.ts --test     (sends to alan@airindex.io only)
 *   npx tsx scripts/send-charlotte-outreach.ts --send     (sends to all recipients)
 */

import { sendSesEmail } from "../src/lib/ses";
import { readFileSync } from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const templatePath = path.join(process.cwd(), "public/reports/charlotte-outreach.html");
const template = readFileSync(templatePath, "utf-8");

const from = "Alan Michael <alan@airindex.io>";

interface Recipient {
  name: string;
  email: string;
  subject: string;
  intro: string;
}

const RECIPIENTS: Recipient[] = [
  {
    name: "Nick Short",
    email: "nshort2@ncdot.gov",
    subject: "Charlotte scores 25/100 on UAM readiness — four gaps within city control",
    intro: `<p style="font-size:14px; color:#333; line-height:1.7; margin:0 0 16px;">Nick,</p>
<p style="font-size:14px; color:#333; line-height:1.7; margin:0 0 16px;">I run AirIndex — a market intelligence platform that scores U.S. cities on readiness for commercial eVTOL operations across seven factors: legislation, vertiport infrastructure, regulatory posture, pilot programs, zoning, operator presence, and weather infrastructure.</p>
<p style="font-size:14px; color:#333; line-height:1.7; margin:0 0 16px;">Charlotte scores 25 out of 100 — NASCENT tier, ranking in the bottom third of 21 tracked markets. Given the Charlotte-Atlanta corridor announcement, I ran the ordinance audit we use for municipality briefings and found four gaps that are entirely within the city's control to fix:</p>
<ul style="font-size:14px; color:#333; line-height:1.7; margin:0 0 16px; padding-left:20px;">
  <li>No vertiport terminology in the city code ("helipad" appears in several sections — not a defined FAA term)</li>
  <li>Heliport/vertiport not addressed as a permitted use in the zoning ordinance</li>
  <li>FAA airspace determination not written into the permit process</li>
  <li>NFPA 418 not referenced in the standalone fire code</li>
</ul>
<p style="font-size:14px; color:#333; line-height:1.7; margin:0 0 16px;">None of these require state legislation or private capital. They're ordinance updates. Adopting vertiport zoning alone moves Charlotte's score from 25 to 40 — crossing from NASCENT into EARLY tier. Combined with the other three fixes, Charlotte's profile changes completely for operators evaluating the Charlotte-Atlanta corridor.</p>
<p style="font-size:14px; color:#333; line-height:1.7; margin:0 0 16px;">I also want to flag something worth paying attention to: the FAA is expected to publish a unified vertical flight infrastructure Advisory Circular for public comment around June 2026. Cities that haven't updated their ordinance language before that publication will face a more complex update process. That's a 90-day window.</p>
<p style="font-size:14px; color:#333; line-height:1.7; margin:0 0 4px;">Below is a one-page Charlotte briefing covering the current gaps and the exact actions that move the score.</p>`,
  },
  {
    name: "Haley Gentry",
    email: "haley.gentry@charlottenc.gov",
    subject: "Charlotte scores 25/100 on UAM readiness — four gaps within city control",
    intro: `<p style="font-size:14px; color:#333; line-height:1.7; margin:0 0 16px;">Haley,</p>
<p style="font-size:14px; color:#333; line-height:1.7; margin:0 0 16px;">I run AirIndex — a market intelligence platform that scores U.S. cities on readiness for commercial eVTOL operations. Charlotte scores 25 out of 100, placing it in NASCENT tier and in the bottom third of the 21 markets we track.</p>
<p style="font-size:14px; color:#333; line-height:1.7; margin:0 0 16px;">Given CLT's position as the anchor airport for the Charlotte-Atlanta AAM corridor, I looked at what's holding the score down. The issue isn't infrastructure investment — it's four ordinance gaps that sit entirely at the city level:</p>
<ul style="font-size:14px; color:#333; line-height:1.7; margin:0 0 16px; padding-left:20px;">
  <li>Vertiport not defined or addressed as a permitted use in Charlotte's zoning code</li>
  <li>No FAA airspace determination requirement in the city's heliport permit process</li>
  <li>Incorrect terminology in the city code ("helipad" is not a defined FAA term)</li>
  <li>NFPA 418 not referenced in the standalone fire code</li>
</ul>
<p style="font-size:14px; color:#333; line-height:1.7; margin:0 0 16px;">Fixing the zoning gap alone moves Charlotte from 25 to 40 — crossing from NASCENT into EARLY tier. That single change signals to operators evaluating where to launch that Charlotte has a viable path.</p>
<p style="font-size:14px; color:#333; line-height:1.7; margin:0 0 16px;">There's also a timing element worth flagging: the FAA is expected to publish a unified vertical flight infrastructure Advisory Circular for public comment around June 2026. Cities that update their ordinance language before that publication will be positioned to align with the new standard from day one. That's roughly a 90-day window.</p>
<p style="font-size:14px; color:#333; line-height:1.7; margin:0 0 4px;">Below is a one-page Charlotte briefing covering the current gaps and the exact actions that move the score.</p>`,
  },
];

function buildEmail(recipient: Recipient): string {
  return template.replace(
    `<div id="intro-copy" style="margin-bottom:32px;">
    <!-- This section gets swapped per recipient in the send script -->
  </div>`,
    `<div style="margin-bottom:32px;">${recipient.intro}</div>`
  );
}

async function main() {
  const mode = process.argv.includes("--send") ? "send" : "test";

  if (mode === "test") {
    // Send test to Alan only (using Nick's version)
    const testRecipient = { ...RECIPIENTS[0], email: "alan@airindex.io", name: "Alan (TEST)" };
    const html = buildEmail(testRecipient);
    try {
      await sendSesEmail({ to: testRecipient.email, from, subject: `[TEST] ${testRecipient.subject}`, html });
      console.log(`✓ Test sent to ${testRecipient.email}`);
    } catch (err) {
      console.error(`✗ Failed:`, err instanceof Error ? err.message : err);
    }
    return;
  }

  // Send to all recipients
  for (const recipient of RECIPIENTS) {
    const html = buildEmail(recipient);
    try {
      await sendSesEmail({ to: recipient.email, from, subject: recipient.subject, html });
      console.log(`✓ Sent to ${recipient.name} (${recipient.email})`);
    } catch (err) {
      console.error(`✗ Failed to send to ${recipient.name}:`, err instanceof Error ? err.message : err);
    }
  }
}

main();
