/**
 * Send UAM Market Pulse — auto-includes all Pulse subscribers.
 *
 * Usage:
 *   npx tsx scripts/send-pulse.ts                     # sends latest Pulse to all subscribers + default inner circle
 *   npx tsx scripts/send-pulse.ts --issue 4           # sends specific issue
 *   npx tsx scripts/send-pulse.ts --dry-run           # preview who would receive it
 *   npx tsx scripts/send-pulse.ts extra@email.com     # add extra recipients
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import { sendSesEmail } from "../src/lib/ses";
import {
  buildTrackingPixelUrl,
  buildClickTrackUrl,
} from "../src/lib/newsletter-token";

const prisma = new PrismaClient();

// Inner circle — always receives the Pulse
const INNER_CIRCLE = [
  "alan@airindex.io",
  "robert.brzozowski@leonardocompany.us",
  "rex@five-alpha.com",
  "hirschberg@vstol.net",
  "kennethswartz@me.com",
  "Don.Berchoff@truweathersolutions.com",
];

function injectTracking(html: string, email: string, issue: number): string {
  // Wrap airindex.io links with click tracking
  let tracked = html.replace(
    /href="(https?:\/\/(?:www\.)?airindex\.io[^"]*)"/g,
    (_match, url: string) => {
      return `href="${buildClickTrackUrl(email, issue, url, "pulse")}"`;
    },
  );

  // Inject tracking pixel before </body>
  const pixelUrl = buildTrackingPixelUrl(email, issue, "pulse");
  const pixel = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" />`;
  tracked = tracked.replace("</body>", `${pixel}\n</body>`);

  return tracked;
}

function findPulseFile(issueNum?: number): { path: string; issue: number; subject: string } {
  const docsDir = join(__dirname, "../public/docs");
  const files = readdirSync(docsDir)
    .filter((f) => f.startsWith("UAM_Market_Pulse_Issue") && f.endsWith(".html"))
    .sort();

  if (issueNum) {
    const target = files.find((f) => f.includes(`Issue${issueNum}`));
    if (!target) throw new Error(`Pulse Issue ${issueNum} not found in public/docs/`);
    return {
      path: join(docsDir, target),
      issue: issueNum,
      subject: `UAM Market Pulse — Issue ${issueNum}`,
    };
  }

  // Latest
  const latest = files[files.length - 1];
  if (!latest) throw new Error("No Pulse HTML files found in public/docs/");
  const match = latest.match(/Issue(\d+)/);
  const issue = match ? parseInt(match[1]) : 0;
  return {
    path: join(docsDir, latest),
    issue,
    subject: `UAM Market Pulse — Issue ${issue}`,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const issueIdx = args.indexOf("--issue");
  const issueNum = issueIdx >= 0 ? parseInt(args[issueIdx + 1]) : undefined;
  const extraEmails = args.filter((a) => a.includes("@") && !a.startsWith("--"));

  // Find the Pulse file
  const pulse = findPulseFile(issueNum);
  const html = readFileSync(pulse.path, "utf-8");
  console.log(`\nPulse: Issue ${pulse.issue}`);
  console.log(`File:  ${pulse.path}\n`);

  // Fetch subscribers from DB
  const subscribers = await prisma.pulseSubscriber.findMany({
    where: { unsubscribedAt: null },
    select: { email: true, name: true, organization: true },
  });

  // Build deduplicated recipient list
  const allEmails = new Set<string>();
  INNER_CIRCLE.forEach((e) => allEmails.add(e.toLowerCase()));
  extraEmails.forEach((e) => allEmails.add(e.toLowerCase()));
  subscribers.forEach((s) => allEmails.add(s.email.toLowerCase()));

  const recipients = [...allEmails].sort();

  console.log(`Recipients: ${recipients.length} total`);
  console.log(`  Inner circle: ${INNER_CIRCLE.length}`);
  console.log(`  Subscribers:  ${subscribers.length}`);
  console.log(`  Extra:        ${extraEmails.length}`);
  console.log("");

  if (dryRun) {
    console.log("DRY RUN — would send to:");
    for (const email of recipients) {
      const sub = subscribers.find((s) => s.email === email);
      const tag = INNER_CIRCLE.includes(email)
        ? "[inner circle]"
        : sub
        ? `[subscriber: ${sub.organization || "no org"}]`
        : "[extra]";
      console.log(`  ${email} ${tag}`);
    }
    console.log(`\nTotal: ${recipients.length} recipients`);
    await prisma.$disconnect();
    return;
  }

  // Send (per-recipient HTML with tracking)
  const from = "AirIndex <hello@airindex.io>";
  let sent = 0;
  let failed = 0;

  for (const to of recipients) {
    try {
      const trackedHtml = injectTracking(html, to, pulse.issue);
      await sendSesEmail({ to, from, subject: pulse.subject, html: trackedHtml });
      console.log(`[ok]   ${to} (tracked)`);
      sent++;
    } catch (err) {
      console.error(`[fail] ${to}:`, err);
      failed++;
    }
  }

  console.log(`\nDone: ${sent} sent, ${failed} failed.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
