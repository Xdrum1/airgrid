/**
 * Send April 2026 UAM Market Readiness Brief — multi-recipient + tracked
 *
 * Mirrors scripts/send-pulse.ts: inner circle + Pulse subscribers by default,
 * per-recipient HTML with click tracking + open pixel, optional drip delay.
 *
 * Usage:
 *   npx tsx scripts/send-april-report.ts                          # full list (inner circle + subscribers)
 *   npx tsx scripts/send-april-report.ts --dry-run                # preview recipients only
 *   npx tsx scripts/send-april-report.ts --solo alan@airindex.io  # single recipient (test mode)
 *   npx tsx scripts/send-april-report.ts extra@x.com              # add extra to default list
 *   npx tsx scripts/send-april-report.ts --exclude foo@x.com bar@y.com
 *   npx tsx scripts/send-april-report.ts --drip-delay 30          # 30s between sends
 *   npx tsx scripts/send-april-report.ts --subject "..."          # override subject
 *   npx tsx scripts/send-april-report.ts --note "..."             # personal note in greeting
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { writeFileSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";
import { sendSesEmail } from "../src/lib/ses";
import {
  buildTrackingPixelUrl,
  buildClickTrackUrl,
} from "../src/lib/newsletter-token";

const prisma = new PrismaClient();

// -------------------------------------------------------
// Constants
// -------------------------------------------------------

const ISSUE = 3;
const SERIES = "report" as const;

// Inner circle — always receives the brief (mirrors send-pulse.ts).
const INNER_CIRCLE = [
  "alan@airindex.io",
  "robert.brzozowski@leonardocompany.us",
  "rex@five-alpha.com",
  "hirschberg@vstol.net",
  "kennethswartz@me.com",
  "Don.Berchoff@truweathersolutions.com",
];

const REPORT_URL =
  "https://www.airindex.io/reports/april-2026?utm_source=email&utm_medium=monthly_brief&utm_campaign=april_2026";
const HOMEPAGE_URL =
  "https://www.airindex.io/?utm_source=email&utm_medium=monthly_brief&utm_campaign=april_2026";
const REPLY_MAILTO = "mailto:hello@airindex.io?subject=Re%3A%20April%202026%20Market%20Readiness%20Brief";

// -------------------------------------------------------
// Palette (mirrors live page light theme)
// -------------------------------------------------------
const C = {
  primary: "#0a2540",
  secondary: "#425466",
  tertiary: "#697386",
  border: "#e3e8ee",
  bgSubtle: "#f6f9fc",
  accent: "#0a4f8a",
  accentSoft: "#e8f0f9",
  green: "#16a34a",
  amber: "#b45309",
  violet: "#6d28d9",
  red: "#b91c1c",
};

// -------------------------------------------------------
// Email HTML
// -------------------------------------------------------
function buildEmailHtml(name: string, note: string, urls: { report: string; home: string; reply: string }): string {
  const noteBlock = note
    ? `<tr><td style="padding:0 32px 16px;"><p style="margin:0;padding:16px 20px;background:${C.bgSubtle};border-left:3px solid ${C.accent};border-radius:0 6px 6px 0;color:${C.primary};font-size:20px;line-height:1.7;">${escapeHtml(note)}</p></td></tr>`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>UAM Market Readiness Brief — April 2026</title></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Helvetica Neue',Arial,sans-serif;color:${C.primary};">
<div style="background:#f4f4f7;padding:32px 16px;">
<table role="presentation" align="center" width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:640px;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(10,37,64,0.08);">

  <!-- Header (logo links to home) -->
  <tr><td style="background:#0a2540;padding:26px 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <a href="${urls.home}" style="text-decoration:none;">
            <span style="font-family:'Courier New',monospace;font-weight:800;font-size:20px;color:#ffffff;letter-spacing:0.14em;">AIR</span><span style="font-family:'Courier New',monospace;font-weight:400;font-size:20px;color:#7eb8ff;letter-spacing:0.14em;">INDEX</span>
          </a>
        </td>
        <td style="text-align:right;color:#7eb8ff;font-family:'Courier New',monospace;font-size:12px;letter-spacing:2px;">
          APRIL 2026 &middot; ISSUE 3
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Greeting -->
  <tr><td style="padding:32px 32px 8px;">
    <p style="margin:0 0 8px;color:${C.tertiary};font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;">UAM MARKET READINESS BRIEF</p>
    <h1 style="margin:0 0 16px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:36px;font-weight:700;color:${C.primary};line-height:1.2;letter-spacing:-0.02em;">What the market is telling us — April 2026</h1>
    <p style="margin:0;font-size:20px;color:${C.primary};">Hi ${escapeHtml(name)},</p>
  </td></tr>

  ${noteBlock}

  <!-- Opening thesis -->
  <tr><td style="padding:14px 32px 28px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.border};border-bottom:1px solid ${C.border};">
      <tr><td style="padding:26px 0;">
        <p style="margin:0 0 14px;font-size:21px;line-height:1.5;color:${C.primary};font-weight:600;font-family:'Helvetica Neue',Arial,sans-serif;letter-spacing:-0.005em;">April changed how markets move.</p>
        <p style="margin:0 0 14px;font-size:21px;line-height:1.5;color:${C.primary};font-weight:600;font-family:'Helvetica Neue',Arial,sans-serif;letter-spacing:-0.005em;">Federal program selection now drives readiness directly.</p>
        <p style="margin:0;font-size:21px;line-height:1.5;color:${C.primary};font-weight:600;font-family:'Helvetica Neue',Arial,sans-serif;letter-spacing:-0.005em;">Momentum is no longer state-driven — it is federally orchestrated.</p>
      </td></tr>
    </table>
  </td></tr>

  <!-- System Movement -->
  <tr><td style="padding:0 32px 28px;">
    <p style="margin:0 0 6px;font-family:'Courier New',monospace;font-size:11px;letter-spacing:2px;color:${C.tertiary};">SYSTEM MOVEMENT</p>
    <p style="margin:0 0 16px;font-size:20px;color:${C.primary};font-weight:500;line-height:1.6;">Four markets moved in April. Three repriced within a two-hour window from federal triggers.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:20px;border-collapse:collapse;">
      ${moveRow("+20", C.green, "Charlotte, NC", "25 → 45", "EARLY", "#166534", "#e8f5ec", "#c8e6cf", "USDOT approves NC's eVTOL proposals; Concord airport designated as first-phase site. Tier crossing — only crossing in April.", true)}
      ${moveRow("+15", C.green, "Houston, TX", "50 → 65", "MODERATE", C.accent, C.accentSoft, C.border, "TxDOT selected for the federal eVTOL Integration Pilot Program (eIPP). Operator presence factor lifted; intra-tier movement.", false)}
      ${moveRow("+15", C.green, "Atlanta, GA", "10 → 25", "NASCENT", C.amber, "#fff5e6", "#f5d9b0", "Operator press flagged Atlanta as a target market. Tied to a non-tracked operator — soft federal-cohort signal pending validation.", true)}
      ${moveRow("+10", C.green, "Washington D.C.", "0 → 10", "NASCENT", C.amber, "#fff5e6", "#f5d9b0", "Admin override consolidated federal posture signals. Adjacent to but not part of the Apr 26 federal cluster.", false)}
    </table>
  </td></tr>

  <!-- Dominant takeaway -->
  <tr><td style="padding:0 32px 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.accentSoft};border-left:4px solid ${C.accent};border-radius:0 8px 8px 0;">
      <tr><td style="padding:28px 26px;">
        <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:28px;font-weight:700;color:${C.primary};line-height:1.3;letter-spacing:-0.01em;">April confirms that federal signals — not local readiness — are now driving market movement.</p>
      </td></tr>
    </table>
  </td></tr>

  <!-- Primary Signal -->
  <tr><td style="padding:0 32px 14px;">
    <p style="margin:0 0 12px;font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;color:${C.green};font-weight:700;">PRIMARY SIGNAL</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:2px solid ${C.green};border-radius:8px;">
      <tr><td style="padding:22px 26px;">
        <p style="margin:0 0 12px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:24px;font-weight:700;color:${C.primary};line-height:1.3;letter-spacing:-0.005em;">Federal program selection now moves markets directly.</p>
        <p style="margin:0 0 14px;font-size:20px;color:${C.secondary};line-height:1.7;">On April 26, three markets repriced inside a two-hour window off three distinct federal channels firing the same day: TxDOT's selection for the federal eVTOL Integration Pilot Program, USDOT's approval of NC's eVTOL proposals + Concord airport designation, and an operator-press signal targeting Atlanta. AirIndex has not previously observed a synchronization of this size from federal activity.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.border};">
          <tr><td style="padding-top:12px;">
            <span style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;color:${C.green};font-weight:700;">CALL &nbsp;</span>
            <span style="font-size:20px;color:${C.primary};line-height:1.7;font-weight:500;">Next federal cohort announcement should move 3–5 additional markets, concentrated in the NASCENT→EARLY band. Site designations move infrastructure factors. Operator selections move presence factors. Corridor selections move both.</span>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <!-- Secondary Signals -->
  <tr><td style="padding:14px 32px 28px;">
    <p style="margin:0 0 14px;font-family:'Courier New',monospace;font-size:11px;letter-spacing:2px;color:${C.tertiary};">SECONDARY SIGNALS</p>
    ${secondarySignalRow(C.accent, "Legislative status is unstable.", "Phoenix moved 50 → 40 → 50 inside 11 days. A stale 'enacted' classification was pulled when the bill was found in committee (-10). SB1457 then advanced to engrossing (+10). One procedural change moved a market 10 points.", "Treat 'actively_moving' as a conditional read. ~30% of bills at this status revert to 'none' before passage. Re-validate at every committee milestone.")}
    ${secondarySignalRow(C.amber, "Media coverage decouples from readiness.", "~50 articles on Joby's JFK demo cycle. New York's score did not move; it remains at 55. Vertiport zoning, state legislation, regulatory posture untouched — only operator presence, already at maximum.", "Demo cycles will keep generating coverage without shifting score. The NY floor moves on Albany, not Manhattan. Next NY trigger: state legislation or vertiport zoning.")}
    ${secondarySignalRow(C.violet, "Tiers are sticky.", "One tier crossing held in April: Charlotte (NASCENT → EARLY). Two same-day excursions to MODERATE reverted within 24 hours (Charlotte Apr 27, San Antonio Apr 28) as the override pipeline tested then re-validated signals. 693 new records, 1,549 classifications, 304 applied overrides.", "≤2 tier crossings per month under current methodology. Each crossing warrants analyst review. Most monthly movement is intra-tier creep; tier landscape is the horizon for genuine market evolution.")}
    ${secondarySignalRow(C.red, "Federal reach is east, not west.", "All four April movers east of and including Texas. West Coast — LA (95), SF (75), San Diego (50) — quiet. The federal program is reaching for capacity not yet on the leaderboard.", "California's silence in April is signal, not noise. The federal layer is filling capacity gaps east and south. Pattern continues through Q2 absent a West Coast operator-presence event.")}
  </td></tr>

  <!-- Forward Signals -->
  <tr><td style="padding:0 32px 28px;">
    <p style="margin:0 0 6px;font-family:'Courier New',monospace;font-size:11px;letter-spacing:2px;color:${C.tertiary};">FORWARD SIGNALS (30–90 DAYS)</p>
    <p style="margin:0 0 16px;font-size:20px;color:${C.primary};font-weight:500;line-height:1.6;">Four markets where a near-term trigger has a credible path to a score-moving event.</p>
    ${watchRow("Phoenix, AZ", "30 days", "SB1457 floor vote", "If enacted, +10 from stateLegislationStatus moving to 'enacted'. If tabled, -10 regression. Confidence in directional move: medium-high.")}
    ${watchRow("New York, NY", "60 days", "State legislative session", "Albany has not introduced UAM-enabling legislation. NY's intra-tier ceiling is constrained without it; next +5 to +20 move requires a state-level milestone.")}
    ${watchRow("Charlotte, NC", "30 days", "Federal cohort follow-on; Concord airport progress", "Charlotte's April crossing into EARLY rests on USDOT proposal approval. Next move comes from a vertiport zoning action or a named-operator partnership.")}
    ${watchRow("San Antonio, TX", "30–90 days", "SkyGrid + Port San Antonio MOU → next milestone", "April's MOU did not move score (a partnership is not an approval). A vertiport approval, FAA OE/AAA, or named-operator partnership would lift approvedVertiport.")}
  </td></tr>

  <!-- Final Take -->
  <tr><td style="padding:0 32px 28px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a2540;border-radius:10px;">
      <tr><td style="padding:36px 30px;">
        <p style="margin:0 0 16px;font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;color:#7eb8ff;font-weight:700;">FINAL TAKE</p>
        <p style="margin:0 0 16px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:28px;font-weight:600;color:#ffffff;line-height:1.3;letter-spacing:-0.01em;">April marks a shift from isolated market development to synchronized federal-driven movement.</p>
        <p style="margin:0;font-size:20px;color:#cbd6e2;line-height:1.65;">The next phase of UAM readiness will be defined by how quickly markets convert federal signals into operational infrastructure.</p>
      </td></tr>
    </table>
  </td></tr>

  <!-- Dual CTA -->
  <tr><td style="padding:0 32px 36px;text-align:center;">
    <p style="margin:0 0 16px;font-size:20px;color:${C.secondary};line-height:1.6;">Read the full brief — market clusters, constraints, and end-of-month rankings:</p>
    <table role="presentation" align="center" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:0 6px;">
          <a href="${urls.report}" style="display:inline-block;padding:14px 32px;background:${C.accent};color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.06em;text-decoration:none;border-radius:6px;">View Full Brief →</a>
        </td>
        <td style="padding:0 6px;">
          <a href="${urls.reply}" style="display:inline-block;padding:14px 28px;background:#ffffff;color:${C.accent};font-size:20px;font-weight:700;letter-spacing:0.06em;text-decoration:none;border-radius:6px;border:1px solid ${C.accent};">Reply to Discuss</a>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:${C.bgSubtle};padding:20px 32px;border-top:1px solid ${C.border};">
    <p style="margin:0;color:${C.tertiary};font-size:20px;line-height:1.7;">
      <a href="${urls.home}" style="text-decoration:none;color:${C.primary};"><span style="font-family:'Courier New',monospace;font-weight:700;letter-spacing:0.1em;">AIRINDEX</span></a> &mdash; UAM Market Readiness Intelligence<br>
      &copy; 2026 Vertical Data Group, LLC &middot; <a href="${urls.home}" style="color:${C.tertiary};">airindex.io</a> &middot; <a href="mailto:hello@airindex.io" style="color:${C.tertiary};">hello@airindex.io</a><br>
      Forward calls in this brief are first-resolution candidates; verification window opens June 16, 2026.
    </p>
  </td></tr>

</table>
</div>
</body>
</html>`.trim();
}

function moveRow(
  delta: string,
  deltaColor: string,
  city: string,
  scores: string,
  tier: string,
  tierColor: string,
  tierBg: string,
  tierBorder: string,
  detail: string,
  zebra: boolean,
): string {
  const bg = zebra ? C.bgSubtle : "#ffffff";
  return `<tr style="background:${bg};">
    <td style="padding:12px 14px;border:1px solid ${C.border};color:${deltaColor};font-weight:700;font-family:'Courier New',monospace;font-size:20px;width:52px;vertical-align:top;">${delta}</td>
    <td style="padding:12px 14px;border:1px solid ${C.border};">
      <strong style="color:${C.primary};font-size:20px;">${escapeHtml(city)}</strong> &nbsp;<span style="color:${C.tertiary};font-family:'Courier New',monospace;font-size:12px;">${scores}</span>&nbsp;<span style="background:${tierBg};border:1px solid ${tierBorder};border-radius:3px;padding:2px 7px;color:${tierColor};font-size:10px;font-weight:700;letter-spacing:1px;">${tier}</span>
      <div style="color:${C.secondary};font-size:20px;line-height:1.7;margin-top:6px;">${escapeHtml(detail)}</div>
    </td>
  </tr>`;
}

function secondarySignalRow(accent: string, title: string, observation: string, call: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;background:${C.bgSubtle};border:1px solid ${C.border};border-left:3px solid ${accent};border-radius:0 6px 6px 0;">
    <tr><td style="padding:16px 20px;">
      <p style="margin:0 0 10px;font-size:20px;font-weight:700;color:${C.primary};line-height:1.35;">${escapeHtml(title)}</p>
      <p style="margin:0 0 12px;font-size:20px;color:${C.secondary};line-height:1.7;">${escapeHtml(observation)}</p>
      <p style="margin:0;padding-top:10px;border-top:1px solid ${C.border};font-size:20px;color:${C.primary};line-height:1.7;"><span style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:${accent};font-weight:700;">CALL &nbsp;</span>${escapeHtml(call)}</p>
    </td></tr>
  </table>`;
}

function watchRow(city: string, horizon: string, trigger: string, impact: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;background:${C.bgSubtle};border:1px solid ${C.border};border-radius:8px;">
    <tr><td style="padding:16px 20px;">
      <p style="margin:0 0 8px;">
        <strong style="color:${C.primary};font-size:20px;">${escapeHtml(city)}</strong>
        <span style="display:inline-block;margin-left:8px;padding:3px 9px;background:${C.accentSoft};border:1px solid ${C.border};border-radius:3px;color:${C.accent};font-family:'Courier New',monospace;font-size:10px;font-weight:700;letter-spacing:1px;">${escapeHtml(horizon)}</span>
      </p>
      <p style="margin:0 0 8px;font-size:20px;color:${C.secondary};line-height:1.6;"><span style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:1px;color:${C.tertiary};">TRIGGER: </span>${escapeHtml(trigger)}</p>
      <p style="margin:0;font-size:20px;color:${C.secondary};line-height:1.7;">${escapeHtml(impact)}</p>
    </td></tr>
  </table>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// -------------------------------------------------------
// Per-recipient tracking injection
// -------------------------------------------------------
function injectTracking(html: string, email: string): string {
  // Wrap airindex.io URLs (NOT mailtos) with click-tracking redirect.
  const tracked = html.replace(
    /href="(https?:\/\/(?:www\.)?airindex\.io[^"]*)"/g,
    (_match, url: string) => `href="${buildClickTrackUrl(email, ISSUE, url, SERIES)}"`,
  );
  // Open-tracking pixel just before </body>
  const pixelUrl = buildTrackingPixelUrl(email, ISSUE, SERIES);
  const pixel = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" />`;
  return tracked.replace("</body>", `${pixel}\n</body>`);
}

// -------------------------------------------------------
// Main
// -------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const solo = args.includes("--solo");
  const subjectIdx = args.indexOf("--subject");
  const customSubject = subjectIdx >= 0 ? args[subjectIdx + 1] : undefined;
  const noteIdx = args.indexOf("--note");
  const personalNote = noteIdx >= 0 ? args[noteIdx + 1] : "";
  const dripIdx = args.indexOf("--drip-delay");
  const dripDelaySec = dripIdx >= 0 ? parseInt(args[dripIdx + 1], 10) : 0;
  const extraEmails = args.filter((a) => a.includes("@") && !a.startsWith("--"));

  if (solo && extraEmails.length === 0) {
    throw new Error("--solo requires at least one explicit email address");
  }

  const subject = customSubject || "AirIndex April 2026 — UAM Market Readiness Brief";

  // Subscribers (skipped in solo mode)
  const subscribers = solo
    ? []
    : await prisma.pulseSubscriber.findMany({
        where: { unsubscribedAt: null },
        select: { email: true, name: true, organization: true },
      });

  // Build deduplicated recipient list
  const allEmails = new Set<string>();
  if (!solo) INNER_CIRCLE.forEach((e) => allEmails.add(e.toLowerCase()));
  extraEmails.forEach((e) => allEmails.add(e.toLowerCase()));
  subscribers.forEach((s) => allEmails.add(s.email.toLowerCase()));

  // --exclude
  const excludeIdx = args.indexOf("--exclude");
  if (excludeIdx >= 0) {
    for (let i = excludeIdx + 1; i < args.length; i++) {
      if (args[i].startsWith("--")) break;
      allEmails.delete(args[i].toLowerCase());
    }
  }

  const recipients = [...allEmails].sort();

  console.log(`\nApril 2026 Market Readiness Brief`);
  console.log(`Subject: ${subject}`);
  if (solo) {
    console.log(`SOLO MODE — sending ONLY to explicit addresses (${recipients.length})\n`);
  } else {
    console.log(`Recipients: ${recipients.length} total`);
    console.log(`  Inner circle: ${INNER_CIRCLE.length}`);
    console.log(`  Subscribers:  ${subscribers.length}`);
    console.log(`  Extra:        ${extraEmails.length}`);
  }
  if (dripDelaySec > 0) console.log(`Drip delay: ${dripDelaySec}s between sends\n`);
  else console.log("");

  if (dryRun) {
    console.log("DRY RUN — would send to:");
    for (const email of recipients) {
      const sub = subscribers.find((s) => s.email === email);
      const tag = INNER_CIRCLE.map((e) => e.toLowerCase()).includes(email)
        ? "[inner circle]"
        : sub
          ? `[subscriber: ${sub.organization || "no org"}]`
          : "[extra]";
      console.log(`  ${email} ${tag}`);
    }
    // Save preview HTML (untracked, for visual review)
    const previewPath = resolve(process.cwd(), "public/reports/email-april-preview.html");
    writeFileSync(
      previewPath,
      buildEmailHtml("Alan", personalNote, {
        report: REPORT_URL,
        home: HOMEPAGE_URL,
        reply: REPLY_MAILTO,
      }),
    );
    console.log(`\nPreview (untracked): ${previewPath}`);
    console.log(`Total: ${recipients.length} recipients`);
    await prisma.$disconnect();
    return;
  }

  if (!process.env.SES_ACCESS_KEY_ID || !process.env.SES_SECRET_ACCESS_KEY) {
    console.error("\n  SES credentials missing in .env.local\n");
    process.exit(1);
  }

  const from = "AirIndex <hello@airindex.io>";
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i++) {
    const to = recipients[i];
    try {
      // Resolve display name from subscriber row when available
      const sub = subscribers.find((s) => s.email === to);
      const name = sub?.name || (to === "alan@airindex.io" ? "Alan" : "there");

      const html = buildEmailHtml(name, personalNote, {
        report: REPORT_URL,
        home: HOMEPAGE_URL,
        reply: REPLY_MAILTO,
      });
      const trackedHtml = injectTracking(html, to);

      await sendSesEmail({ to, from, subject, html: trackedHtml });
      console.log(`[ok]   ${to} (tracked)`);
      sent++;

      if (dripDelaySec > 0 && i < recipients.length - 1) {
        await new Promise((r) => setTimeout(r, dripDelaySec * 1000));
      }
    } catch (err) {
      console.error(`[fail] ${to}:`, err);
      failed++;
    }
  }

  console.log(`\nDone: ${sent} sent, ${failed} failed.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Error:", err);
  await prisma.$disconnect();
  process.exit(1);
});
