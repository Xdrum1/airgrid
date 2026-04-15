/**
 * Generate a Pulse newsletter template with the Markets to Watch
 * section auto-populated from current Forward Signals data.
 *
 * Output: HTML file at public/docs/UAM_Market_Pulse_IssueN_template.html
 *
 * Workflow:
 *   1. Run this script to produce a template with predictive content baked in
 *   2. Open the file, write editorial commentary above/around the auto-section
 *   3. Rename to UAM_Market_Pulse_IssueN.html when ready to send
 *   4. Run pulse-preflight.ts then send-pulse.ts
 *
 * Usage:
 *   npx tsx scripts/generate-pulse-template.ts --issue 6
 *   npx tsx scripts/generate-pulse-template.ts --issue 6 --top 5  # control # of markets shown
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { writeFileSync } from "fs";
import { join } from "path";
import { getPlatformForecastDigest, renderSignalNarrative } from "../src/lib/forward-signals";
import { getStateContext, getRegionalClusters } from "../src/lib/mcs";
import { draftPulse, type PulseDraft } from "../src/lib/pulse-drafter";

const args = process.argv.slice(2);
const issueIdx = args.indexOf("--issue");
if (issueIdx < 0) {
  console.error("Usage: npx tsx scripts/generate-pulse-template.ts --issue N [--top N] [--draft]");
  process.exit(1);
}
const issue = parseInt(args[issueIdx + 1]);
const topIdx = args.indexOf("--top");
const topN = topIdx >= 0 ? parseInt(args[topIdx + 1]) : 5;
const doDraft = args.includes("--draft");

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function watchBadge(status: string | null, outlook: string | null): string {
  if (!status) return "";
  const color = status === "POSITIVE_WATCH" ? "#16a34a" : status === "NEGATIVE_WATCH" ? "#dc2626" : "#888";
  return `<span style="font-size:10px;font-family:'Courier New',monospace;color:${color};font-weight:700;letter-spacing:1px;">${status.replace("_", " ")} / ${outlook}</span>`;
}

async function main() {
  const digest = await getPlatformForecastDigest();
  const top = digest.slice(0, topN);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const isoDate = today.toISOString().slice(0, 10);

  // Pre-fetch MCS context for each top market
  const contextByCity = new Map<string, { statePosture: string | null; cluster: string | null }>();
  await Promise.all(
    top.map(async (m) => {
      const [ctx, clusters] = await Promise.all([
        getStateContext(m.state).catch(() => null),
        getRegionalClusters(m.cityId).catch(() => []),
      ]);
      const statePosture = ctx
        ? `${ctx.stateName}: ${ctx.enforcementPosture} enforcement, ${ctx.dotAamEngagement} DOT`
        : null;
      const cluster = clusters[0]?.name ?? null;
      contextByCity.set(m.cityId, { statePosture, cluster });
    }),
  );

  const marketRows = top.map((m, i) => {
    const watch = watchBadge(m.marketWatch?.status ?? null, m.marketWatch?.outlook ?? null);
    const accel = m.accelerating
      ? `<span style="font-size:9px;font-family:'Courier New',monospace;color:#16a34a;background:rgba(22,163,74,0.1);border-radius:3px;padding:2px 6px;letter-spacing:1px;font-weight:700;margin-left:6px;">ACCELERATING</span>`
      : "";
    const forecast = m.expectedScoreChange30d
      ? `<div style="font-size:11px;color:${m.expectedScoreChange30d > 0 ? "#16a34a" : "#dc2626"};font-family:'Courier New',monospace;font-weight:700;margin-top:4px;">30d forecast: ${m.expectedScoreChange30d > 0 ? "+" : ""}${m.expectedScoreChange30d} points</div>`
      : "";
    const signals = m.topSignals.map((s) =>
      `<li style="font-size:12px;color:#555;line-height:1.6;margin-bottom:4px;">${escape(renderSignalNarrative(s))}</li>`
    ).join("");
    const ctx = contextByCity.get(m.cityId);
    const contextLine = (ctx?.statePosture || ctx?.cluster)
      ? `<div style="font-size:11px;color:#888;font-style:italic;margin:4px 0 6px;">${ctx?.statePosture ?? ""}${ctx?.statePosture && ctx?.cluster ? " · " : ""}${ctx?.cluster ? `Cluster: ${escape(ctx.cluster)}` : ""}</div>`
      : "";

    return `
      <tr>
        <td style="padding:16px 18px;border-bottom:1px solid #e0e0e0;vertical-align:top;">
          <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:6px;">
            <span style="font-family:'Courier New',monospace;font-size:18px;font-weight:700;color:#5B8DB8;">#${i + 1}</span>
            <a href="https://www.airindex.io/city/${m.cityId}" style="font-size:16px;font-weight:700;color:#111;text-decoration:none;">${escape(m.cityName)}, ${escape(m.state)}</a>
            <span style="font-size:12px;color:#888;">Score ${m.currentScore}/100</span>
            ${accel}
          </div>
          <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;font-size:11px;color:#666;margin-bottom:8px;">
            ${watch}
            <span>Signals 30d: <strong style="color:#333;">${m.signalsLast30d}</strong> (#${m.rankNational ?? "—"})</span>
          </div>
          ${contextLine}
          ${forecast}
          ${signals ? `<ul style="margin:10px 0 0;padding-left:18px;">${signals}</ul>` : ""}
        </td>
      </tr>
    `;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>UAM Market Pulse — Issue ${issue}</title>
</head>
<body style="margin:0;padding:0;background:#f5f6f8;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f8;">
  <tr><td align="center" style="padding:40px 16px;">
    <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:640px;">

      <!-- Header -->
      <tr><td style="padding:40px 48px 20px;">
        <div style="font:700 11px/1 'Courier New',monospace;color:#5B8DB8;letter-spacing:0.15em;text-transform:uppercase;">
          UAM MARKET PULSE · ISSUE ${String(issue).padStart(2, "0")}
        </div>
        <div style="font:11px/1 'Courier New',monospace;color:#999;margin-top:8px;">
          ${dateStr}
        </div>
      </td></tr>

      <!-- Editorial Lede [WRITE THIS] -->
      <tr><td style="padding:0 48px 24px;">
        <h1 style="font:700 26px/1.25 'Helvetica Neue',Arial,sans-serif;color:#111;margin:0 0 16px;letter-spacing:-0.02em;">
          [WRITE HEADLINE HERE]
        </h1>
        <p style="font:italic 16px/1.7 Georgia,serif;color:#444;margin:0;border-left:3px solid #5B8DB8;padding-left:18px;">
          [WRITE LEDE HERE — the one-paragraph hook for this week's Pulse]
        </p>
      </td></tr>

      <!-- ════════════════════════════════════════════════════════ -->
      <!-- AUTO-GENERATED: Markets to Watch (do not edit unless you ran -->
      <!-- generate-pulse-template.ts again with refreshed data)        -->
      <!-- ════════════════════════════════════════════════════════ -->
      <tr><td style="padding:8px 48px 0;">
        <h2 style="font:700 20px/1.3 'Helvetica Neue',Arial,sans-serif;color:#111;margin:24px 0 8px;">
          Markets to Watch This Week
        </h2>
        <p style="font:13px/1.7 'Helvetica Neue',Arial,sans-serif;color:#666;margin:0 0 16px;">
          Top ${topN} markets by predictive significance, generated from the AirIndex
          Forward Signals pipeline as of ${isoDate}.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e0e0e0;border-radius:8px;">
          ${marketRows}
        </table>
        <p style="font:11px/1.6 'Helvetica Neue',Arial,sans-serif;color:#999;margin:12px 0 0;text-align:right;">
          <a href="https://www.airindex.io/insights/markets-to-watch" style="color:#5B8DB8;text-decoration:none;font-weight:600;">See full ranked digest →</a>
        </p>
      </td></tr>
      <!-- ════════════════════════════════════════════════════════ -->
      <!-- END AUTO-GENERATED                                          -->
      <!-- ════════════════════════════════════════════════════════ -->

      <!-- Editorial Body [WRITE THIS] -->
      <tr><td style="padding:32px 48px 0;">
        <h2 style="font:700 20px/1.3 'Helvetica Neue',Arial,sans-serif;color:#111;margin:24px 0 12px;">
          [WRITE NEXT SECTION HEADING]
        </h2>
        <p style="font:15px/1.75 'Helvetica Neue',Arial,sans-serif;color:#333;margin:0 0 16px;">
          [Editorial body — analyze the top 1-2 markets above in depth, surface a non-obvious pattern, etc.]
        </p>
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding:32px 48px 40px;border-top:1px solid #eef0f2;">
        <p style="font:12px/1.7 'Helvetica Neue',Arial,sans-serif;color:#888;margin:0 0 12px;">
          UAM Market Pulse is a weekly intelligence digest from AirIndex. Forward signals are derived from the AirIndex Forward Signals pipeline aggregating classifier outputs, MarketWatch trajectory, and pre-development facility milestones.
        </p>
        <p style="font:11px/1.6 'Helvetica Neue',Arial,sans-serif;color:#aaa;margin:0;">
          AirIndex · UAM Market Readiness Intelligence · <a href="https://www.airindex.io" style="color:#5B8DB8;text-decoration:none;">airindex.io</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

  let finalHtml = html;

  // Optional AI draft — replaces [WRITE HEADLINE/LEDE/NEXT/BODY] placeholders
  // with a first-pass editorial draft from Opus 4.6 in the Pulse voice.
  // Alan still reviews + edits before send; this removes the blank-page problem.
  if (doDraft) {
    console.log(`\n[drafting] Calling Opus 4.6 for editorial first draft...`);
    try {
      const draft: PulseDraft = await draftPulse(top);
      finalHtml = finalHtml
        .replace("[WRITE HEADLINE HERE]", escape(draft.headline))
        .replace(
          "[WRITE LEDE HERE — the one-paragraph hook for this week's Pulse]",
          escape(draft.lede),
        )
        .replace("[WRITE NEXT SECTION HEADING]", escape(draft.nextSectionHeading))
        .replace(
          "[Editorial body — analyze the top 1-2 markets above in depth, surface a non-obvious pattern, etc.]",
          escape(draft.body).replace(/\n\n/g, '</p><p style="font:15px/1.75 \'Helvetica Neue\',Arial,sans-serif;color:#333;margin:0 0 16px;">'),
        );
      console.log(`[drafting] Headline: ${draft.headline}`);
      console.log(`[drafting] Lede head: ${draft.lede.slice(0, 100)}...`);
    } catch (err) {
      console.error(`[drafting] Failed — keeping placeholders. ${(err as Error).message}`);
    }
  }

  const outPath = join(__dirname, `../public/docs/UAM_Market_Pulse_Issue${issue}_template.html`);
  writeFileSync(outPath, finalHtml);
  console.log(`\n[ok] Generated Pulse Issue ${issue} template`);
  console.log(`     → ${outPath}`);
  console.log(`\nNext steps:`);
  console.log(`  1. ${doDraft ? "Review AI-drafted headline, lede, and body — edit if needed" : "Open the file and write headline, lede, and editorial body sections marked [WRITE...]"}`);
  console.log(`  2. When ready, rename to UAM_Market_Pulse_Issue${issue}.html`);
  console.log(`  3. Run pulse-preflight.ts to validate`);
  console.log(`  4. Run send-pulse.ts to send`);
  console.log(`\nTop ${topN} markets in this template:`);
  top.forEach((m, i) => {
    const watch = m.marketWatch ? `${m.marketWatch.status}/${m.marketWatch.outlook}` : "no watch";
    const fcst = m.expectedScoreChange30d ? ` | 30d: ${m.expectedScoreChange30d > 0 ? "+" : ""}${m.expectedScoreChange30d}` : "";
    console.log(`  #${i + 1} ${m.cityName.padEnd(20)} ${m.currentScore}/100 | ${watch}${fcst}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
