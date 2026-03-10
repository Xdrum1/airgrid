import dotenv from "dotenv";
dotenv.config({ path: ".env.development.local" });
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

  // Recent snapshots
  const snapshots = await prisma.scoreSnapshot.findMany({
    where: { capturedAt: { gte: cutoff } },
    orderBy: { capturedAt: "desc" },
    take: 30,
    select: { cityId: true, score: true, tier: true, capturedAt: true },
  });

  console.log("=== RECENT SNAPSHOTS (last 48h) ===");
  console.log("Count:", snapshots.length);
  if (snapshots.length > 0) {
    const grouped: Record<string, number> = {};
    snapshots.forEach((s) => {
      const date = s.capturedAt.toISOString().split("T")[0];
      grouped[date] = (grouped[date] || 0) + 1;
    });
    console.log("By date:", grouped);
    console.log(
      "Sample:",
      snapshots
        .slice(0, 3)
        .map((s) => `${s.cityId} ${s.score} ${s.capturedAt.toISOString()}`)
    );
  }

  // Recent changelog entries
  const events = await prisma.changelogEntry.findMany({
    where: { timestamp: { gte: cutoff } },
    orderBy: { timestamp: "desc" },
    take: 10,
    select: {
      id: true,
      changeType: true,
      relatedEntityId: true,
      summary: true,
      timestamp: true,
    },
  });

  console.log("\n=== RECENT CHANGELOG ENTRIES (last 48h) ===");
  console.log("Count:", events.length);
  events.forEach((e) =>
    console.log(
      " ",
      e.timestamp.toISOString().slice(0, 16),
      e.changeType,
      "-",
      e.summary.slice(0, 80)
    )
  );

  // Recent user activity
  const userEvents = await prisma.userEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      event: true,
      userId: true,
      metadata: true,
      createdAt: true,
    },
  });

  console.log("\n=== RECENT USER ACTIVITY ===");
  console.log("Count:", userEvents.length);
  userEvents.forEach((e) => {
    const meta = (e.metadata as Record<string, string>) || {};
    console.log(
      " ",
      e.createdAt.toISOString().slice(0, 16),
      e.event,
      meta.path || meta.cityId || ""
    );
  });

  // Recent users
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { email: true, createdAt: true },
  });

  console.log("\n=== RECENT USERS ===");
  users.forEach((u) =>
    console.log(" ", u.createdAt.toISOString().slice(0, 16), u.email)
  );

  // Subscriptions
  const subs = await prisma.subscription.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { userId: true, cityIds: true, corridorIds: true, changeTypes: true, createdAt: true },
  });

  console.log("\n=== RECENT SUBSCRIPTIONS ===");
  console.log("Count:", subs.length);
  subs.forEach((s) =>
    console.log(" ", s.createdAt.toISOString().slice(0, 16), "cities:", s.cityIds, "corridors:", s.corridorIds)
  );

  // Total counts
  const totalUsers = await prisma.user.count();
  const totalSnapshots = await prisma.scoreSnapshot.count();
  const totalChangelog = await prisma.changelogEntry.count();
  const totalSubs = await prisma.subscription.count();

  console.log("\n=== TOTALS ===");
  console.log("Users:", totalUsers);
  console.log("Snapshots:", totalSnapshots);
  console.log("Changelog entries:", totalChangelog);
  console.log("Subscriptions:", totalSubs);

  await prisma.$disconnect();
}

main();
