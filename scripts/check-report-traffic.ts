/**
 * Combined post-send analytics for any AirIndex publication.
 *
 * Cross-references the in-app pixel/click event log (NewsletterEvent table)
 * with Plausible pageviews on the live report page. Pixel events alone
 * understate engagement (Apple Privacy, Mimecast/Proofpoint strip remote
 * images), so the Plausible counts catch silent readers who clicked
 * through without firing the pixel.
 *
 * Usage:
 *   npx tsx scripts/check-report-traffic.ts                      # April brief defaults
 *   npx tsx scripts/check-report-traffic.ts --series pulse --issue 8
 *   npx tsx scripts/check-report-traffic.ts --page /reports/may-2026 --campaign may_2026
 *   npx tsx scripts/check-report-traffic.ts --days 7             # Plausible window (default: today)
 *
 * Requires PLAUSIBLE_API_KEY + PLAUSIBLE_SITE_ID in .env.local.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// -------------------------------------------------------
// Args
// -------------------------------------------------------
function flag(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  return process.argv[i + 1];
}

const SERIES = flag("series", "report")!;
const ISSUE = parseInt(flag("issue", "3")!, 10);
const PAGE = flag("page", "/reports/april-2026")!;
const CAMPAIGN = flag("campaign", "april_2026")!;
const DAYS = flag("days"); // optional: pass "7" for week-to-date, omit for today

const DATE_RANGE = DAYS ? `${DAYS}d` : "day";

const PLAUSIBLE_KEY = process.env.PLAUSIBLE_API_KEY;
const PLAUSIBLE_SITE = process.env.PLAUSIBLE_SITE_ID;

// -------------------------------------------------------
// Microsoft / Apple proxy IP heuristics (rough)
// -------------------------------------------------------
const MICROSOFT_IP_PREFIXES = [
  "13.", "20.", "40.", "51.", "52.", "104.40", "104.41", "104.42",
  "104.43", "104.44", "104.45", "104.46", "104.47",
];
const APPLE_PRIVACY_PREFIXES = ["17.", "172."]; // 17.x is Apple corp; broader Apple Privacy uses iCloud relays

function classifyIp(ip: string | null | undefined): string {
  if (!ip) return "?";
  if (MICROSOFT_IP_PREFIXES.some((p) => ip.startsWith(p))) return "MS-stack";
  if (APPLE_PRIVACY_PREFIXES.some((p) => ip.startsWith(p))) return "Apple";
  if (ip.includes(":")) return "v6"; // IPv6 — usually consumer mobile/cellular
  return "other";
}

// -------------------------------------------------------
// Plausible Stats v2 helper
// -------------------------------------------------------
async function plausible(body: Record<string, unknown>): Promise<unknown> {
  if (!PLAUSIBLE_KEY || !PLAUSIBLE_SITE) {
    return { results: [], _err: "PLAUSIBLE_API_KEY or PLAUSIBLE_SITE_ID missing in .env.local" };
  }
  const r = await fetch("https://plausible.io/api/v2/query", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PLAUSIBLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ site_id: PLAUSIBLE_SITE, ...body }),
  });
  return r.json();
}

type PlausibleResult = { results?: Array<{ metrics: number[]; dimensions: string[] }>; _err?: string };

// -------------------------------------------------------
// Main
// -------------------------------------------------------
async function main() {
  console.log(`\n${"=".repeat(72)}`);
  console.log(`  REPORT TRAFFIC CHECK`);
  console.log(`  series=${SERIES}  issue=${ISSUE}  page=${PAGE}  campaign=${CAMPAIGN}  range=${DATE_RANGE}`);
  console.log(`${"=".repeat(72)}\n`);

  // ---------------------------------------------------
  // 1) Pixel opens + clicks from NewsletterEvent
  // ---------------------------------------------------
  const events = await prisma.newsletterEvent.findMany({
    where: { series: SERIES, issue: ISSUE },
    orderBy: { createdAt: "asc" },
  });

  const opens = events.filter((e) => e.event === "open");
  const clicks = events.filter((e) => e.event === "click");

  console.log(`[1] PIXEL EVENTS — ${opens.length} opens · ${clicks.length} clicks\n`);

  // Per-recipient view
  const byEmail = new Map<string, { opens: typeof events; clicks: typeof events }>();
  for (const e of events) {
    if (!byEmail.has(e.email)) byEmail.set(e.email, { opens: [], clicks: [] });
    const slot = byEmail.get(e.email)!;
    if (e.event === "open") slot.opens.push(e);
    else if (e.event === "click") slot.clicks.push(e);
  }

  console.log("    Recipient                                  opens  clicks  first-open(UTC)  ip-class");
  console.log("    " + "-".repeat(94));
  const rows = [...byEmail.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [email, { opens: o, clicks: c }] of rows) {
    const first = o[0];
    const t = first ? first.createdAt.toISOString().slice(11, 19) : "—";
    const cls = first ? classifyIp(first.ip) : "—";
    console.log(
      `    ${email.padEnd(42)} ${String(o.length).padStart(5)}  ${String(c.length).padStart(6)}  ${t.padEnd(15)}  ${cls}`,
    );
  }

  // ---------------------------------------------------
  // 2) Plausible — pageviews to the report page
  // ---------------------------------------------------
  console.log(`\n[2] PLAUSIBLE — pageviews to ${PAGE} (${DATE_RANGE})\n`);
  const total = (await plausible({
    date_range: DATE_RANGE,
    metrics: ["visitors", "pageviews", "visits"],
    filters: [["is", "event:page", [PAGE]]],
  })) as PlausibleResult;

  if (total._err) {
    console.log(`    ERROR: ${total._err}`);
  } else {
    const r = total.results?.[0]?.metrics ?? [0, 0, 0];
    console.log(`    visitors=${r[0]}   pageviews=${r[1]}   visits=${r[2]}`);
  }

  // By source / campaign / medium
  const bySource = (await plausible({
    date_range: DATE_RANGE,
    metrics: ["visitors", "pageviews"],
    dimensions: ["visit:source", "visit:utm_campaign", "visit:utm_medium"],
    filters: [["is", "event:page", [PAGE]]],
  })) as PlausibleResult;

  if (bySource.results && bySource.results.length > 0) {
    console.log(`\n    By source · campaign · medium:`);
    console.log(`    source             campaign         medium           visitors  pv`);
    console.log("    " + "-".repeat(70));
    for (const row of bySource.results) {
      const [src, camp, med] = row.dimensions;
      console.log(
        `    ${(src || "—").padEnd(18)} ${(camp || "—").padEnd(16)} ${(med || "—").padEnd(15)} ${String(row.metrics[0]).padStart(8)}  ${row.metrics[1]}`,
      );
    }
  }

  // ---------------------------------------------------
  // 3) Plausible — campaign-wide (catches readers who landed on
  //    other pages via the email links: home, methodology, etc.)
  // ---------------------------------------------------
  console.log(`\n[3] PLAUSIBLE — entire campaign (${CAMPAIGN}) across all pages, ${DATE_RANGE}\n`);
  const camp = (await plausible({
    date_range: DATE_RANGE,
    metrics: ["visitors", "pageviews"],
    dimensions: ["event:page"],
    filters: [["is", "visit:utm_campaign", [CAMPAIGN]]],
  })) as PlausibleResult;

  if (camp.results && camp.results.length > 0) {
    console.log(`    page                                              visitors  pv`);
    console.log("    " + "-".repeat(66));
    for (const row of camp.results) {
      console.log(`    ${(row.dimensions[0] || "—").padEnd(50)} ${String(row.metrics[0]).padStart(8)}  ${row.metrics[1]}`);
    }
  } else {
    console.log("    (no campaign visits yet)");
  }

  // ---------------------------------------------------
  // 4) Quick reconciliation
  // ---------------------------------------------------
  const sentRecipients = byEmail.size;
  const pixelOpeners = [...byEmail.values()].filter((v) => v.opens.length > 0).length;
  const pixelClickers = [...byEmail.values()].filter((v) => v.clicks.length > 0).length;
  const pageVisitors = total.results?.[0]?.metrics?.[0] ?? 0;

  console.log(`\n[4] RECONCILIATION`);
  console.log(`    Recipients with at least one event: ${sentRecipients}`);
  console.log(`    Pixel openers (any UA):             ${pixelOpeners}`);
  console.log(`    Click-through (in NewsletterEvent): ${pixelClickers}`);
  console.log(`    Plausible page visitors:            ${pageVisitors}`);
  console.log(`\n    Note: pixel openers > Plausible visitors is normal (opens count`);
  console.log(`    automated scanners). Plausible visitors > clicks may indicate`);
  console.log(`    direct page visits (not via email link) — check campaign filter.`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
