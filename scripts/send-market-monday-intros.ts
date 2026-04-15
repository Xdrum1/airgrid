/**
 * Send One Market Monday issue with a personalized intro message —
 * for first-time recipients where a plain list-send would feel cold.
 *
 * The personal intro is prepended as a block ABOVE the standard issue
 * HTML. Subject line and tracking match the main list send.
 *
 * Usage:
 *   npx tsx scripts/send-market-monday-intros.ts --dry-run  # preview
 *   npx tsx scripts/send-market-monday-intros.ts            # send live
 *   npx tsx scripts/send-market-monday-intros.ts --slug miami-april-2026  # pin issue
 *
 * Edit the RECIPIENTS array below to set who gets an intro for this issue.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { sendSesEmail } from "../src/lib/ses";
import {
  ONE_MARKET_MONDAY_ISSUES,
  getIssueBySlug,
  getLatestIssue,
  type OneMarketMondayIssue,
} from "../src/data/one-market-monday";
import { CITIES } from "../src/data/seed";
import { calculateReadinessScore, getScoreTier, SCORE_WEIGHTS } from "../src/lib/scoring";
import { buildTrackingPixelUrl, buildClickTrackUrl } from "../src/lib/newsletter-token";

const BASE_URL = "https://www.airindex.io";
const FROM = "Alan Holmes <hello@airindex.io>"; // signed intros come from Alan

// ════════════════════════════════════════════════════════════
// EDIT THIS: recipients and their personalized intro copy.
// Intro is HTML — a single <p> per paragraph, keep it short.
// ════════════════════════════════════════════════════════════
interface IntroRecipient {
  email: string;
  name: string;
  introHtml: string;
}

const RECIPIENTS: IntroRecipient[] = [
  {
    email: "jon@theaircurrent.com",
    name: "Jon Ostrower",
    introHtml: `
      <p>Jon,</p>
      <p>I'm Alan Holmes, founder of AirIndex (airindex.io) — an independent market readiness intelligence platform that scores U.S. cities on their readiness for commercial eVTOL operations.</p>
      <p>I'm reaching out because I think the research behind our work surfaces stories your readers don't have access to yet.</p>
      <p>This morning we published our second One Market Monday issue on Miami — and the primary research turned up a few things worth knowing:</p>
      <p style="margin:0 0 6px;">— A widely-referenced Miami-Dade vertiport feasibility study doesn't exist in the form it's cited. The actual document is a TPO policy framework that explicitly recommends a siting study that hasn't been commissioned.</p>
      <p style="margin:0 0 6px;">— Watson Island — the most strategically significant AAM site in Miami, with a 30-year city lease and a Skyports Infrastructure MOU — is completely invisible to FAA NASR data.</p>
      <p style="margin:0 0 16px;">— Archer's December 2025 Miami network announcement covers 4 sites. None are purpose-built or registered for eVTOL operations.</p>
      <p>Miami scores 80 on our 100-point readiness index — tied with Orlando as Florida's highest-scoring market and one of five US markets in our ADVANCED tier. The full issue is below.</p>
      <p>Happy to be a data resource for your AAM coverage going forward.</p>
      <p>Alan Holmes<br/>Founder &amp; CEO, Vertical Data Group<br/><a href="https://airindex.io">airindex.io</a> | <a href="https://verticaldatagroup.com">verticaldatagroup.com</a></p>
    `,
  },
  // Ben received his intro on 2026-04-13 at ~6:15am ET (premature send during testing).
  // Removed from active list so he doesn't get a duplicate. Re-add for future issues
  // by restoring a recipient entry here.
];
// ════════════════════════════════════════════════════════════

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

function renderIntroBlock(introHtml: string): string {
  return `
    <tr><td style="padding:32px 48px 24px;border-bottom:1px solid #eef0f2;background:#fcfcfd;">
      <div style="font:15px/1.7 'Helvetica Neue',Arial,sans-serif;color:#333;">
        ${introHtml}
      </div>
    </td></tr>
  `;
}

function renderEmailHtml(issue: OneMarketMondayIssue, recipient: IntroRecipient): string {
  const city = CITIES.find((c) => c.id === issue.cityId);
  if (!city) throw new Error(`City not found: ${issue.cityId}`);

  const { score, breakdown } = calculateReadinessScore(city);
  const tier = getScoreTier(score);

  const track = (url: string) =>
    buildClickTrackUrl(recipient.email, issue.issueNumber, url, "monday");

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

        <!-- Personal intro block -->
        ${renderIntroBlock(recipient.introHtml)}

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
          <p style="font:11px/1.6 'Helvetica Neue',Arial,sans-serif;color:#aaa;margin:0;">
            AirIndex · UAM Market Readiness Intelligence · <a href="${track(BASE_URL)}" style="color:#5B8DB8;text-decoration:none;">airindex.io</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
  <img src="${buildTrackingPixelUrl(recipient.email, issue.issueNumber, "monday")}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" />
</body>
</html>`;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const slugIdx = args.indexOf("--slug");
  const slugArg = slugIdx >= 0 ? args[slugIdx + 1] : undefined;

  // Resolve the issue
  let issue: OneMarketMondayIssue | undefined;
  if (slugArg) {
    issue = getIssueBySlug(slugArg);
    if (!issue) throw new Error(`Issue not found with slug: ${slugArg}`);
  } else {
    issue = getLatestIssue();
    if (!issue) throw new Error("No issues defined in one-market-monday.ts");
  }

  const subject = `One Market Monday #${String(issue.issueNumber).padStart(2, "0")} — ${issue.headline}`;

  console.log(`\nIssue: ${issue.slug} (#${issue.issueNumber})`);
  console.log(`Subject: ${subject}`);
  console.log(`From: ${FROM}`);
  console.log(`Recipients (with personal intro):`);
  RECIPIENTS.forEach((r) => console.log(`  ${r.email} (${r.name})`));
  console.log("");

  if (dryRun) {
    console.log("DRY RUN — not sending.\n");
    // Render preview sizes for each
    for (const r of RECIPIENTS) {
      const html = renderEmailHtml(issue, r);
      console.log(`  ${r.email}: ${html.length} bytes`);
    }
    return;
  }

  let sent = 0;
  let failed = 0;

  for (const r of RECIPIENTS) {
    try {
      const html = renderEmailHtml(issue, r);
      await sendSesEmail({ to: r.email, from: FROM, subject, html });
      console.log(`[ok]   ${r.email} (${r.name}) — tracked`);
      sent++;
    } catch (err) {
      console.error(`[fail] ${r.email}:`, err);
      failed++;
    }
  }

  console.log(`\nDone: ${sent} sent, ${failed} failed.`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
