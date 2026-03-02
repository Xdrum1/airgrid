import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
// Re-export client-safe helpers so existing server-side imports from "@/lib/billing" still work
import { hasProAccess } from "@/lib/billing-shared";
export { hasProAccess, hasInstitutionalAccess } from "@/lib/billing-shared";

const PAYWALL_LAUNCH_DATE = process.env.PAYWALL_LAUNCH_DATE || "2026-04-15";
const GRANDFATHERED_EXPIRY = process.env.GRANDFATHERED_EXPIRY || "2026-12-31";

/** Resolve the effective tier for a user */
export async function getUserTier(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      tier: true,
      createdAt: true,
      billingSubscriptions: {
        where: { status: { in: ["active", "trialing", "past_due"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!user) return "free";

  // Active Stripe subscription takes priority
  if (user.billingSubscriptions.length > 0) {
    return user.billingSubscriptions[0].tier;
  }

  // Admin-assigned tier (institutional/enterprise) — stored directly on User.tier
  if (user.tier === "institutional" || user.tier === "enterprise") {
    return user.tier;
  }

  // Grandfathered: user created before paywall launch, not expired
  if (user.tier === "grandfathered") {
    const expiry = new Date(GRANDFATHERED_EXPIRY + "T23:59:59Z");
    if (new Date() <= expiry) return "grandfathered";
    return "free";
  }

  // Check if user should be grandfathered (created before launch)
  const launchDate = new Date(PAYWALL_LAUNCH_DATE + "T00:00:00Z");
  if (user.createdAt < launchDate && user.tier === "free") {
    // Auto-mark as grandfathered
    await prisma.user.update({
      where: { id: userId },
      data: { tier: "grandfathered" },
    });
    const expiry = new Date(GRANDFATHERED_EXPIRY + "T23:59:59Z");
    if (new Date() <= expiry) return "grandfathered";
    return "free";
  }

  return "free";
}


/**
 * Require Pro+ access for an API route.
 * Returns a NextResponse error if not authorized, or null if authorized.
 * Follows the same pattern as requireAdmin() in admin-helpers.ts.
 */
export async function requirePro(): Promise<{ session: { user: { id: string; email: string; tier?: string } }; denied: null } | { session: null; denied: NextResponse }> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      session: null,
      denied: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }

  const tier = await getUserTier(session.user.id);
  if (!hasProAccess(tier)) {
    return {
      session: null,
      denied: NextResponse.json({ error: "Pro subscription required" }, { status: 403 }),
    };
  }

  return { session: session as { user: { id: string; email: string; tier?: string } }, denied: null };
}
