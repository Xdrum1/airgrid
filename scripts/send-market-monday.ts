/**
 * Send One Market Monday — weekly single-market deep-dive.
 * Source of truth: src/data/one-market-monday.ts
 * Subscribers: reuses PulseSubscriber list (same audience, no list fragmentation)
 *
 * Usage:
 *   npx tsx scripts/send-market-monday.ts                  # sends latest issue
 *   npx tsx scripts/send-market-monday.ts --issue 1        # sends specific issue by number
 *   npx tsx scripts/send-market-monday.ts --slug phoenix-april-2026
 *   npx tsx scripts/send-market-monday.ts --dry-run        # preview recipients + subject
 *   npx tsx scripts/send-market-monday.ts extra@email.com  # add extra recipients
 *   npx tsx scripts/send-market-monday.ts --solo you@example.com  # preview mode: ONLY to listed emails (skips inner circle + subscribers)
 *   npx tsx scripts/send-market-monday.ts --exclude a@x.com,b@y.com  # omit specific addresses (e.g. first-time recipients receiving a personal intro)
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { sendSesEmail } from "../src/lib/ses";
import {
  ONE_MARKET_MONDAY_ISSUES,
  getIssueBySlug,
  getLatestIssue,
  type OneMarketMondayIssue,
} from "../src/data/one-market-monday";
import { CITIES } from "../src/data/seed";
import {
  calculateReadinessScore,
  getScoreTier,
  SCORE_WEIGHTS,
} from "../src/lib/scoring";
import {
  buildTrackingPixelUrl,
  buildClickTrackUrl,
} from "../src/lib/newsletter-token";

const prisma = new PrismaClient();

// Inner circle — always receives the issue (matches send-pulse.ts)
const INNER_CIRCLE = [
  "alan@airindex.io",
  "robert.brzozowski@leonardocompany.us",
  "rex@five-alpha.com",
  "hirschberg@vstol.net",
  "kennethswartz@me.com",
  "Don.Berchoff@truweathersolutions.com",
];

const BASE_URL = "https://www.airindex.io";

const FACTOR_LABELS: Record<keyof typeof SCORE_WEIGHTS, string> = {
  stateLegislation: "State Legislation",
  activePilotProgram: "Active Pilot Program",
  activeOperatorPresence: "Active Operators",
  approvedVertiport: "Approved Vertiport",
  vertiportZoning: "Vertiport Zoning",
  regulatoryPosture: "Regulatory Posture",
  weatherInfrastructure: "Weather Infrastructure",
};

const FACTOR_ORDER: (keyof typeof SCORE_WEIGHTS)[] = [
  "stateLegislation",
  "activePilotProgram",
  "activeOperatorPresence",
  "approvedVertiport",
  "vertiportZoning",
  "regulatoryPosture",
  "weatherInfrastructure",
];

function formatDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderEmailHtml(issue: OneMarketMondayIssue, recipientEmail?: string): string {
  const city = CITIES.find((c) => c.id === issue.cityId);
  if (!city) throw new Error(`City not found: ${issue.cityId}`);

  const { score, breakdown } = calculateReadinessScore(city);
  const tier = getScoreTier(score);

  // When tracking is enabled, wrap links with click tracking
  const track = (url: string) =>
    recipientEmail
      ? buildClickTrackUrl(recipientEmail, issue.issueNumber, url, "monday")
      : url;

  const issueUrl = `${BASE_URL}/insights/one-market-monday/${issue.slug}`;
  const cityUrl = `${BASE_URL}/city/${city.id}`;

  const factorRows = FACTOR_ORDER.map((key) => {
    const value = breakdown[key];
    const max = SCORE_WEIGHTS[key];
    const pct = Math.round((value / max) * 100);
    return `
      <tr>
        <td style="padding:7px 0;font:12px/1.4 'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;width:180px;font-weight:500;">${FACTOR_LABELS[key]}</td>
        <td style="padding:7px 0;width:100%;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#d8dde3;border-radius:3px;">
            <tr><td style="padding:0;">
              <div style="width:${pct}%;height:6px;background:#5B8DB8;border-radius:3px;opacity:${pct > 0 ? 1 : 0};"></div>
            </td></tr>
          </table>
        </td>
        <td style="padding:7px 0 7px 12px;font:12px/1.4 'Courier New',monospace;color:#444;text-align:right;white-space:nowrap;font-weight:600;">${value} / ${max}</td>
      </tr>`;
  }).join("");

  const sectionsHtml = issue.sections
    .map(
      (s) => `
      <h2 style="font:700 22px/1.3 'Helvetica Neue',Arial,sans-serif;color:#111;margin:36px 0 16px;letter-spacing:-0.01em;">${escapeHtml(s.heading)}</h2>
      ${s.paragraphs
        .map(
          (p) =>
            `<p style="font:17px/1.75 'Helvetica Neue',Arial,sans-serif;color:#333;margin:0 0 18px;">${escapeHtml(p)}</p>`,
        )
        .join("")}
    `,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(issue.headline)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f6f8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f8;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:640px;">

        <!-- Header -->
        <tr><td style="padding:40px 48px 20px;">
          <div style="font:700 11px/1 'Courier New',monospace;color:#5B8DB8;letter-spacing:0.15em;text-transform:uppercase;">
            ONE MARKET MONDAY · Issue ${String(issue.issueNumber).padStart(2, "0")}
          </div>
          <div style="font:11px/1 'Courier New',monospace;color:#999;margin-top:8px;">
            ${formatDate(issue.publishDate)}
          </div>
        </td></tr>

        <!-- Headline -->
        <tr><td style="padding:0 48px 16px;">
          <h1 style="font:700 28px/1.25 'Helvetica Neue',Arial,sans-serif;color:#111;margin:0;letter-spacing:-0.02em;">
            ${escapeHtml(issue.headline)}
          </h1>
        </td></tr>

        <!-- Lede -->
        <tr><td style="padding:12px 48px 32px;">
          <p style="font:italic 17px/1.7 Georgia,serif;color:#444;margin:0;border-left:3px solid #5B8DB8;padding-left:18px;">
            ${escapeHtml(issue.subhead)}
          </p>
        </td></tr>

        <!-- Score card -->
        <tr><td style="padding:0 48px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f8;border:1px solid #d8dde3;border-radius:8px;">
            <tr><td style="padding:26px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font:700 20px/1.2 'Helvetica Neue',Arial,sans-serif;color:#0a0a0a;">${city.city}, ${city.state}</div>
                    <div style="font:12px/1.4 'Courier New',monospace;color:#555;margin-top:5px;">AirIndex Readiness Score · v1.3 methodology</div>
                  </td>
                  <td align="right" style="vertical-align:top;">
                    <div style="font:700 44px/1 'Helvetica Neue',Arial,sans-serif;color:#5B8DB8;">${score}</div>
                    <div style="font:700 10px/1 'Courier New',monospace;color:#5B8DB8;letter-spacing:0.15em;margin-top:6px;">${tier}</div>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;">
                ${factorRows}
              </table>

              <div style="margin-top:22px;padding-top:16px;border-top:1px solid #d8dde3;font:12px/1.5 'Courier New',monospace;color:#444;">
                Last updated ${city.lastUpdated} ·
                <a href="${track(cityUrl)}" style="color:#5B8DB8;text-decoration:none;font-weight:600;">view full market profile →</a>
              </div>
            </td></tr>
          </table>
        </td></tr>

        <!-- Body sections -->
        <tr><td style="padding:8px 48px 0;">
          ${sectionsHtml}
        </td></tr>

        <!-- Read on web -->
        <tr><td style="padding:24px 48px 16px;" align="center">
          <a href="${track(issueUrl)}" style="display:inline-block;padding:12px 28px;background:#5B8DB8;color:#ffffff;font:700 12px/1 'Helvetica Neue',Arial,sans-serif;text-decoration:none;border-radius:6px;letter-spacing:0.06em;">
            READ THIS ISSUE ON AIRINDEX →
          </a>
        </td></tr>

        <!-- Footer note -->
        <tr><td style="padding:32px 48px 40px;border-top:1px solid #eef0f2;">
          <p style="font:12px/1.7 'Helvetica Neue',Arial,sans-serif;color:#888;margin:0 0 16px;">
            ${escapeHtml(issue.footerNote)}
          </p>
          <p style="font:13px/1.7 'Helvetica Neue',Arial,sans-serif;color:#666;margin:0 0 14px;font-style:italic;">
            Evaluating a specific market or facility? Happy to run a quick assessment — just reply to this email.
          </p>
          <p style="font:11px/1.6 'Helvetica Neue',Arial,sans-serif;color:#aaa;margin:0;">
            AirIndex · UAM Market Readiness Intelligence · <a href="${track(BASE_URL)}" style="color:#5B8DB8;text-decoration:none;">airindex.io</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
  ${recipientEmail ? `<img src="${buildTrackingPixelUrl(recipientEmail, issue.issueNumber, "monday")}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" />` : ""}
</body>
</html>`;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const solo = args.includes("--solo");
  const issueIdx = args.indexOf("--issue");
  const slugIdx = args.indexOf("--slug");
  const issueNum = issueIdx >= 0 ? parseInt(args[issueIdx + 1]) : undefined;
  const slugArg = slugIdx >= 0 ? args[slugIdx + 1] : undefined;

  // --exclude takes a comma-separated list: --exclude a@x.com,b@y.com
  // Used when sending personalized intros separately (e.g. first-time recipients).
  const excludeIdx = args.indexOf("--exclude");
  const excludeEmails = excludeIdx >= 0
    ? args[excludeIdx + 1].split(",").map((e) => e.trim().toLowerCase())
    : [];

  // Extra emails: any @ address that isn't the --exclude argument
  const excludeArgValue = excludeIdx >= 0 ? args[excludeIdx + 1] : "";
  const extraEmails = args.filter(
    (a) => a.includes("@") && !a.startsWith("--") && a !== excludeArgValue,
  );

  if (solo && extraEmails.length === 0) {
    throw new Error("--solo requires at least one explicit email address");
  }

  // Resolve the issue
  let issue: OneMarketMondayIssue | undefined;
  if (slugArg) {
    issue = getIssueBySlug(slugArg);
    if (!issue) throw new Error(`Issue not found with slug: ${slugArg}`);
  } else if (issueNum !== undefined) {
    issue = ONE_MARKET_MONDAY_ISSUES.find((i) => i.issueNumber === issueNum);
    if (!issue) throw new Error(`Issue #${issueNum} not found`);
  } else {
    issue = getLatestIssue();
    if (!issue) throw new Error("No issues defined in one-market-monday.ts");
  }

  const subject = `One Market Monday #${String(issue.issueNumber).padStart(2, "0")} — ${issue.headline}`;

  console.log(`\nIssue: ${issue.slug} (#${issue.issueNumber})`);
  console.log(`City:  ${issue.cityId}`);
  console.log(`Date:  ${issue.publishDate}`);
  console.log(`Subject: ${subject}\n`);

  // Fetch subscribers — reuse the Pulse list (same audience). Skipped in --solo mode.
  const subscribers = solo
    ? []
    : await prisma.pulseSubscriber.findMany({
        where: { unsubscribedAt: null },
        select: { email: true, name: true, organization: true },
      });

  const allEmails = new Set<string>();
  if (!solo) INNER_CIRCLE.forEach((e) => allEmails.add(e.toLowerCase()));
  extraEmails.forEach((e) => allEmails.add(e.toLowerCase()));
  subscribers.forEach((s) => allEmails.add(s.email.toLowerCase()));

  // Apply exclusions (e.g. for first-time recipients getting a personalized intro)
  for (const excluded of excludeEmails) {
    allEmails.delete(excluded);
  }

  const recipients = [...allEmails].sort();

  if (solo) {
    console.log(`SOLO MODE — sending ONLY to explicit addresses (${recipients.length})`);
    console.log("Inner circle and subscribers are excluded.\n");
  } else {
    console.log(`Recipients: ${recipients.length} total`);
    console.log(`  Inner circle: ${INNER_CIRCLE.length}`);
    console.log(`  Subscribers:  ${subscribers.length}`);
    console.log(`  Extra:        ${extraEmails.length}\n`);
  }

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
    const previewHtml = renderEmailHtml(issue);
    console.log(`\nHTML length: ${previewHtml.length} bytes (without tracking)`);
    await prisma.$disconnect();
    return;
  }

  const from = "AirIndex <hello@airindex.io>";
  let sent = 0;
  let failed = 0;

  for (const to of recipients) {
    try {
      const html = renderEmailHtml(issue, to);
      await sendSesEmail({ to, from, subject, html });
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
