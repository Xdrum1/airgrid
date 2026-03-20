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

async function main() {
  const where = issueFilter ? { issue: issueFilter } : {};

  const events = await prisma.newsletterEvent.findMany({
    where,
    orderBy: { createdAt: "asc" },
  });

  if (events.length === 0) {
    console.log("No tracking events yet.");
    return;
  }

  // Group by issue
  const byIssue = new Map<number, typeof events>();
  for (const e of events) {
    const arr = byIssue.get(e.issue) ?? [];
    arr.push(e);
    byIssue.set(e.issue, arr);
  }

  for (const [issue, issueEvents] of [...byIssue.entries()].sort((a, b) => a[0] - b[0])) {
    const opens = issueEvents.filter((e) => e.event === "open");
    const clicks = issueEvents.filter((e) => e.event === "click");
    const uniqueOpeners = new Set(opens.map((e) => e.email));
    const uniqueClickers = new Set(clicks.map((e) => e.email));

    console.log(`\n${"═".repeat(60)}`);
    console.log(`  ISSUE ${issue} — ENGAGEMENT REPORT`);
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
