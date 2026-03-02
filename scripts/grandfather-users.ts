/**
 * One-time script: sets tier = "grandfathered" for all users created before PAYWALL_LAUNCH_DATE.
 *
 * Run after deploying the billing schema migration, before enabling the paywall.
 *
 * Usage:
 *   DATABASE_URL=<your-db-url> npx tsx scripts/grandfather-users.ts
 *
 * Options:
 *   --dry-run   Show what would be updated without making changes
 */

import { PrismaClient } from "@prisma/client";

const PAYWALL_LAUNCH_DATE = process.env.PAYWALL_LAUNCH_DATE || "2026-04-15";
const dryRun = process.argv.includes("--dry-run");

async function main() {
  const prisma = new PrismaClient();

  try {
    const launchDate = new Date(PAYWALL_LAUNCH_DATE + "T00:00:00Z");
    console.log(`Paywall launch date: ${launchDate.toISOString()}`);
    console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

    // Find all users created before launch who are currently "free"
    const eligibleUsers = await prisma.user.findMany({
      where: {
        createdAt: { lt: launchDate },
        tier: "free",
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    console.log(`Found ${eligibleUsers.length} eligible users:\n`);

    for (const user of eligibleUsers) {
      console.log(`  ${user.email} (created ${user.createdAt.toISOString()})`);
    }

    if (eligibleUsers.length === 0) {
      console.log("\nNo users to update.");
      return;
    }

    if (dryRun) {
      console.log(`\n[DRY RUN] Would update ${eligibleUsers.length} users to tier "grandfathered".`);
      return;
    }

    const result = await prisma.user.updateMany({
      where: {
        createdAt: { lt: launchDate },
        tier: "free",
      },
      data: { tier: "grandfathered" },
    });

    console.log(`\nUpdated ${result.count} users to tier "grandfathered".`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
