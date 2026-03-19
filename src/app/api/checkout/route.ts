import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getStripe, getPriceId } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Rate limit: 5 per 5 min per user
  const rl = await rateLimit(`checkout:${session.user.id}`, 5, 5 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: { interval?: string; tier?: string; organization?: string; jobTitle?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const interval = body.interval === "annual" ? "annual" : "monthly";
  type PaidTier = "alert" | "pro" | "institutional";
  const validTiers: PaidTier[] = ["alert", "pro", "institutional"];
  const tier: PaidTier = validTiers.includes(body.tier as PaidTier) ? (body.tier as PaidTier) : "pro";

  try {
    const stripe = getStripe();
    const priceId = getPriceId(tier, interval);

    // Find or create Stripe customer
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true, email: true, firstName: true, lastName: true },
    });

    let customerId = user?.stripeCustomerId;
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || undefined;
    const customerMeta = {
      userId: session.user.id,
      ...(body.organization && { organization: body.organization }),
      ...(body.jobTitle && { jobTitle: body.jobTitle }),
    };

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        ...(fullName && { name: fullName }),
        metadata: customerMeta,
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: session.user.id },
        data: { stripeCustomerId: customerId },
      });
    } else {
      // Update existing customer with latest profile data
      await stripe.customers.update(customerId, {
        ...(fullName && { name: fullName }),
        metadata: customerMeta,
      });
    }

    const appUrl = process.env.APP_URL || "https://www.airindex.io";

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?checkout=success`,
      cancel_url: `${appUrl}/pricing?checkout=canceled`,
      metadata: { userId: session.user.id, tier },
      subscription_data: {
        metadata: { userId: session.user.id, tier },
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("[checkout] Error:", err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
