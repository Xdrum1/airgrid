/**
 * Register a new outreach contact for follow-up tracking.
 *
 * Creates an OutreachContact row that the daily reminder cron will
 * watch. When replyReceivedAt is set (via this script with --mark-replied
 * or directly in DB), the cron stops pinging.
 *
 * Usage:
 *   npx tsx scripts/log-outreach.ts --name "Larry Mattiello" \
 *     --email larry@loomiscompany.com --org "The Loomis Company" \
 *     --title "Director of Aviation" --referrer "Rex Alexander" \
 *     --subject "Rex Alexander intro — AAM risk intelligence for underwriters" \
 *     --sent 2026-04-15 \
 *     --url https://www.airindex.io/reports/briefing-insurance/miami
 *
 *   npx tsx scripts/log-outreach.ts --mark-replied --email larry@loomiscompany.com
 *   npx tsx scripts/log-outreach.ts --close --email larry@... --status declined
 *   npx tsx scripts/log-outreach.ts --list                             # show all open outreach
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

async function list() {
  const rows = await prisma.outreachContact.findMany({
    orderBy: { firstEmailSentAt: "desc" },
  });
  if (rows.length === 0) {
    console.log("No outreach contacts logged yet.");
    return;
  }
  for (const r of rows) {
    const ago = Math.floor((Date.now() - r.firstEmailSentAt.getTime()) / 86400000);
    console.log(
      `[${r.status.padEnd(15)}] ${r.name.padEnd(24)} ${r.email.padEnd(32)} sent ${ago}d ago${r.replyReceivedAt ? ` · replied` : ""}${r.org ? ` · ${r.org}` : ""}`,
    );
  }
}

async function main() {
  if (process.argv.includes("--list")) {
    await list();
    await prisma.$disconnect();
    return;
  }

  if (process.argv.includes("--mark-replied")) {
    const email = arg("email");
    if (!email) throw new Error("--email required with --mark-replied");
    const updated = await prisma.outreachContact.updateMany({
      where: { email },
      data: { replyReceivedAt: new Date(), status: "replied" },
    });
    console.log(`Marked ${updated.count} row(s) as replied for ${email}`);
    await prisma.$disconnect();
    return;
  }

  if (process.argv.includes("--close")) {
    const email = arg("email");
    const status = arg("status") ?? "closed";
    if (!email) throw new Error("--email required with --close");
    const updated = await prisma.outreachContact.updateMany({
      where: { email },
      data: { closedAt: new Date(), status },
    });
    console.log(`Closed ${updated.count} row(s) for ${email} (status=${status})`);
    await prisma.$disconnect();
    return;
  }

  // Register new outreach
  const name = arg("name");
  const email = arg("email");
  const subject = arg("subject");
  const sentRaw = arg("sent");

  if (!name || !email || !subject) {
    console.error(
      "Usage:\n" +
        "  Register:     --name <n> --email <e> --subject <s> [--sent YYYY-MM-DD] [--org <o>] [--title <t>] [--referrer <r>] [--url <briefing>]\n" +
        "  Mark replied: --mark-replied --email <e>\n" +
        "  Close:        --close --email <e> [--status declined|ghosted|active]\n" +
        "  List:         --list",
    );
    process.exit(1);
  }

  const firstEmailSentAt = sentRaw ? new Date(sentRaw) : new Date();
  const row = await prisma.outreachContact.create({
    data: {
      name,
      email,
      org: arg("org") ?? null,
      title: arg("title") ?? null,
      referrer: arg("referrer") ?? null,
      firstEmailSentAt,
      firstEmailSubject: subject,
      briefingUrl: arg("url") ?? null,
      manualNote: arg("note") ?? null,
    },
  });
  console.log(`Registered: ${row.name} <${row.email}> (id=${row.id})`);
  console.log(`Sent:       ${row.firstEmailSentAt.toISOString().slice(0, 10)}`);
  console.log(`Status:     ${row.status}`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
