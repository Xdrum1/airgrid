import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getClientIp } from "@/lib/admin-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const rl = await rateLimit(`admin-billing:${getClientIp(req)}`, 30, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const users = await prisma.user.findMany({
    where: { tier: { not: "free" } },
    select: {
      id: true,
      email: true,
      tier: true,
      stripeCustomerId: true,
      createdAt: true,
      billingSubscriptions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          tier: true,
          status: true,
          stripePriceId: true,
          stripeSubscriptionId: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Summary stats
  const activePro = users.filter(
    (u) => u.billingSubscriptions[0]?.status === "active" && u.billingSubscriptions[0]?.tier === "pro"
  ).length;
  const activeInstitutional = users.filter(
    (u) => u.tier === "institutional" || u.billingSubscriptions[0]?.tier === "institutional"
  ).length;
  const grandfathered = users.filter((u) => u.tier === "grandfathered").length;

  return NextResponse.json({
    data: users,
    summary: {
      activePro,
      activeInstitutional,
      grandfathered,
      totalPaid: users.length,
    },
  });
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const rl = await rateLimit(`admin-billing:${getClientIp(req)}`, 10, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  let body: { userId?: string; tier?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { userId, tier } = body;
  if (!userId || !tier) {
    return NextResponse.json({ error: "userId and tier are required" }, { status: 400 });
  }

  const validTiers = ["free", "pro", "institutional", "enterprise", "grandfathered"];
  if (!validTiers.includes(tier)) {
    return NextResponse.json({ error: `Invalid tier. Must be one of: ${validTiers.join(", ")}` }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { tier },
  });

  return NextResponse.json({ success: true, userId, tier });
}
