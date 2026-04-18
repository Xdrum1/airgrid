/**
 * Send AIS Alert — event-driven market intelligence.
 *
 * Usage:
 *   npx tsx scripts/send-ais-alert.ts                          # sends latest alert
 *   npx tsx scripts/send-ais-alert.ts --slug phoenix-sb1827-failure
 *   npx tsx scripts/send-ais-alert.ts --dry-run                # preview recipients
 *   npx tsx scripts/send-ais-alert.ts --solo alan@airindex.io   # preview to one address
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { sendSesEmail } from "../src/lib/ses";
import {
  AIS_ALERTS,
  getAlertBySlug,
  getLatestAlert,
  type AisAlert,
} from "../src/data/ais-alerts";
import {
  buildTrackingPixelUrl,
  buildClickTrackUrl,
} from "../src/lib/newsletter-token";

const prisma = new PrismaClient();

const INNER_CIRCLE = [
  "alan@airindex.io",
  "robert.brzozowski@leonardocompany.us",
  "rex@five-alpha.com",
  "hirschberg@vstol.net",
  "kennethswartz@me.com",
  "Don.Berchoff@truweathersolutions.com",
];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderAlertHtml(alert: AisAlert, recipientEmail?: string): string {
  const track = (url: string) =>
    recipientEmail
      ? buildClickTrackUrl(recipientEmail, alert.alertNumber, url, "alert")
      : url;

  const tierChanged = alert.aisImpact.tierBefore && alert.aisImpact.tierAfter &&
    alert.aisImpact.tierBefore !== alert.aisImpact.tierAfter;
  const delta = alert.aisImpact.scoreAfter - alert.aisImpact.scoreBefore;
  const deltaStr = delta > 0 ? `+${delta}` : `${delta}`;
  const deltaColor = delta > 0 ? "#047857" : "#b91c1c";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(alert.headline)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f6f8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f8;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;">

        <!-- Header -->
        <tr><td style="padding:32px 40px 16px;">
          <div style="font:700 10px/1 'Courier New',monospace;color:#b91c1c;letter-spacing:0.18em;text-transform:uppercase;">
            AIS ALERT
          </div>
          <div style="font:11px/1 'Courier New',monospace;color:#999;margin-top:6px;">
            ${alert.publishDate}
          </div>
        </td></tr>

        <!-- Headline -->
        <tr><td style="padding:0 40px 20px;">
          <h1 style="font:700 24px/1.3 'Helvetica Neue',Arial,sans-serif;color:#111;margin:0;letter-spacing:-0.02em;">
            ${escapeHtml(alert.headline)}
          </h1>
        </td></tr>

        <!-- What happened -->
        <tr><td style="padding:0 40px 20px;">
          <p style="font:15px/1.7 'Helvetica Neue',Arial,sans-serif;color:#333;margin:0;">
            ${escapeHtml(alert.whatHappened)}
          </p>
        </td></tr>

        <!-- AIS Impact card -->
        <tr><td style="padding:0 40px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fb;border:1px solid #e3e8ee;border-radius:8px;">
            <tr><td style="padding:20px 24px;">
              <div style="font:700 10px/1 'Courier New',monospace;color:#5B8DB8;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:14px;">
                AIS IMPACT
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font:13px/1.5 'Helvetica Neue',sans-serif;color:#666;padding:4px 0;">Score</td>
                  <td style="font:700 14px/1.5 'Courier New',monospace;color:#111;text-align:right;padding:4px 0;">
                    ${alert.aisImpact.scoreBefore} → ${alert.aisImpact.scoreAfter}
                    <span style="color:${deltaColor};margin-left:6px;">(${deltaStr})</span>
                  </td>
                </tr>
                <tr>
                  <td style="font:13px/1.5 'Helvetica Neue',sans-serif;color:#666;padding:4px 0;">Factor</td>
                  <td style="font:13px/1.5 'Helvetica Neue',sans-serif;color:#111;text-align:right;padding:4px 0;">${escapeHtml(alert.aisImpact.factor)}</td>
                </tr>
                <tr>
                  <td style="font:13px/1.5 'Helvetica Neue',sans-serif;color:#666;padding:4px 0;">Change</td>
                  <td style="font:12px/1.5 'Courier New',monospace;color:#444;text-align:right;padding:4px 0;">${escapeHtml(alert.aisImpact.factorChange)}</td>
                </tr>
                ${tierChanged ? `<tr>
                  <td style="font:13px/1.5 'Helvetica Neue',sans-serif;color:#666;padding:4px 0;">Tier</td>
                  <td style="font:700 13px/1.5 'Helvetica Neue',sans-serif;color:${deltaColor};text-align:right;padding:4px 0;">${alert.aisImpact.tierBefore} → ${alert.aisImpact.tierAfter}</td>
                </tr>` : ""}
              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- Why it matters -->
        <tr><td style="padding:0 40px 24px;">
          <div style="font:700 10px/1 'Courier New',monospace;color:#374151;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:10px;">
            WHY IT MATTERS
          </div>
          <p style="font:15px/1.75 'Helvetica Neue',Arial,sans-serif;color:#333;margin:0;">
            ${escapeHtml(alert.whyItMatters)}
          </p>
        </td></tr>

        <!-- Source -->
        <tr><td style="padding:0 40px 32px;">
          <div style="font:11px/1.5 'Helvetica Neue',sans-serif;color:#999;">
            Source: ${alert.sourceUrl ? `<a href="${track(alert.sourceUrl)}" style="color:#5B8DB8;text-decoration:none;">${escapeHtml(alert.source)}</a>` : escapeHtml(alert.source)}
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 40px;border-top:1px solid #e5e7eb;">
          <p style="font:11px/1.5 'Helvetica Neue',sans-serif;color:#999;margin:0;">
            AIS Alerts are event-driven signals from the AirIndex scoring system. Full market data at
            <a href="${track("https://www.airindex.io")}" style="color:#5B8DB8;text-decoration:none;">airindex.io</a>.
          </p>
          <p style="font:10px/1.5 'Courier New',monospace;color:#ccc;margin:8px 0 0;">
            AirIndex by Vertical Data Group, LLC
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const solo = args.includes("--solo");
  const slugIdx = args.indexOf("--slug");
  const slug = slugIdx >= 0 ? args[slugIdx + 1] : undefined;
  const extraEmails = args.filter((a) => a.includes("@") && !a.startsWith("--"));

  const alert = slug ? getAlertBySlug(slug) : getLatestAlert();
  if (!alert) throw new Error(slug ? `Alert not found: ${slug}` : "No alerts defined");

  console.log(`Alert: ${alert.slug} (#${alert.alertNumber})`);
  console.log(`Date:  ${alert.publishDate}`);
  console.log(`Subject: AIS Alert — ${alert.headline}\n`);

  // Build recipient list
  const subscribers = solo
    ? []
    : await prisma.pulseSubscriber.findMany({
        where: { unsubscribedAt: null },
        select: { email: true },
      });

  const allEmails = new Set<string>();
  if (!solo) INNER_CIRCLE.forEach((e) => allEmails.add(e.toLowerCase()));
  extraEmails.forEach((e) => allEmails.add(e.toLowerCase()));
  subscribers.forEach((s) => allEmails.add(s.email.toLowerCase()));

  const excludeIdx = args.indexOf("--exclude");
  if (excludeIdx >= 0) {
    for (let i = excludeIdx + 1; i < args.length; i++) {
      if (args[i].startsWith("--")) break;
      allEmails.delete(args[i].toLowerCase());
    }
  }

  const recipients = [...allEmails].sort();

  if (solo) {
    console.log(`SOLO MODE — sending ONLY to explicit addresses (${recipients.length})\n`);
  } else {
    console.log(`Recipients: ${recipients.length} total\n`);
  }

  if (dryRun) {
    console.log("DRY RUN — would send to:");
    recipients.forEach((e) => console.log(`  ${e}`));
    console.log(`\nTotal: ${recipients.length}`);
    await prisma.$disconnect();
    return;
  }

  const from = "AirIndex <hello@airindex.io>";
  const subject = `AIS Alert — ${alert.headline}`;
  let sent = 0;
  let failed = 0;

  for (const to of recipients) {
    try {
      const html = renderAlertHtml(alert, to);
      const pixelUrl = buildTrackingPixelUrl(to, alert.alertNumber, "alert");
      const pixel = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;" />`;
      const trackedHtml = html.replace("</body>", `${pixel}\n</body>`);
      await sendSesEmail({ to, from, subject, html: trackedHtml });
      console.log(`[ok]   ${to}`);
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
