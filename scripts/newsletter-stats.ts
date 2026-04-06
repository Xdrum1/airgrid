/**
 * UAM Market Pulse — Newsletter Engagement Stats
 *
 * Usage:
 *   npx tsx scripts/newsletter-stats.ts                # All issues
 *   npx tsx scripts/newsletter-stats.ts --issue=2      # Specific issue
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const issueFilter = parseInt(
  process.argv.find((a) => a.startsWith("--issue="))?.split("=")[1] ?? "0",
  10
);
const seriesFilter = process.argv.find((a) => a.startsWith("--series="))?.split("=")[1];

async function main() {
  const where: Record<string, unknown> = {};
  if (issueFilter) where.issue = issueFilter;
  if (seriesFilter) where.series = seriesFilter;

  const events = await prisma.newsletterEvent.findMany({
    where,
    orderBy: { createdAt: "asc" },
  });

  if (events.length === 0) {
    console.log("No tracking events yet.");
    return;
  }

  // Group by series + issue
  const byKey = new Map<string, typeof events>();
  for (const e of events) {
    const key = `${(e as { series?: string }).series ?? "newsletter"}:${e.issue}`;
    const arr = byKey.get(key) ?? [];
    arr.push(e);
    byKey.set(key, arr);
  }

  const SERIES_LABELS: Record<string, string> = {
    newsletter: "NEWSLETTER",
    pulse: "PULSE",
    monday: "ONE MARKET MONDAY",
  };

  for (const [key, issueEvents] of [...byKey.entries()].sort()) {
    const [series, issueStr] = key.split(":");
    const issue = parseInt(issueStr);
    const opens = issueEvents.filter((e) => e.event === "open");
    const clicks = issueEvents.filter((e) => e.event === "click");
    const uniqueOpeners = new Set(opens.map((e) => e.email));
    const uniqueClickers = new Set(clicks.map((e) => e.email));

    console.log(`\n${"═".repeat(60)}`);
    console.log(`  ${SERIES_LABELS[series] ?? series.toUpperCase()} #${issue} — ENGAGEMENT REPORT`);
    console.log(`${"═".repeat(60)}\n`);

    console.log(`  Opens: ${opens.length} total, ${uniqueOpeners.size} unique`);
    console.log(`  Clicks: ${clicks.length} total, ${uniqueClickers.size} unique\n`);

    // Per-recipient breakdown
    const recipients = new Set(issueEvents.map((e) => e.email));
    console.log(`  RECIPIENT BREAKDOWN:\n`);
    for (const email of [...recipients].sort()) {
      const recipOpens = opens.filter((e) => e.email === email);
      const recipClicks = clicks.filter((e) => e.email === email);
      const firstOpen = recipOpens.length > 0
        ? recipOpens[0].createdAt.toISOString().replace("T", " ").slice(0, 19)
        : "—";

      console.log(`  ${email.padEnd(35)} opens: ${recipOpens.length}  clicks: ${recipClicks.length}  first open: ${firstOpen}`);

      // Show clicked URLs
      const clickedUrls = new Set(recipClicks.map((e) => e.url).filter(Boolean));
      for (const url of clickedUrls) {
        console.log(`    → ${url}`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
