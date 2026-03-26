import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import type Stripe from "stripe";

const logger = createLogger("stripe-webhook");

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    logger.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpsert(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    logger.error(`Error handling ${event.type}:`, err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const customerId = session.customer as string;

  if (!userId || !customerId) {
    logger.error("Missing userId or customerId in checkout session metadata");
    return;
  }

  // Link Stripe customer to user
  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customerId },
  });

  logger.info(`Checkout completed for user ${userId}, customer ${customerId}`);
}

async function handleSubscriptionUpsert(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const userId = subscription.metadata?.userId;

  // Find user by stripeCustomerId
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : await prisma.user.findUnique({ where: { stripeCustomerId: customerId } });

  if (!user) {
    logger.error(`No user found for subscription ${subscription.id} (customer: ${customerId})`);
    return;
  }

  const item = subscription.items.data[0];
  const priceId = item?.price?.id ?? "";
  const tier = subscription.metadata?.tier || "pro";

  // In clover API, use start_date and billing_cycle_anchor for period tracking
  const periodStart = new Date(subscription.start_date * 1000);
  const cancelAt = subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null;
  // Estimate period end from billing_cycle_anchor + interval
  const anchorMs = subscription.billing_cycle_anchor * 1000;
  const now = Date.now();
  let periodEnd = new Date(anchorMs);
  // Advance period end to next future billing date
  const intervalMs = item?.price?.recurring?.interval === "year" ? 365.25 * 24 * 60 * 60 * 1000 : 30.44 * 24 * 60 * 60 * 1000;
  while (periodEnd.getTime() < now) {
    periodEnd = new Date(periodEnd.getTime() + intervalMs);
  }

  await prisma.billingSubscription.upsert({
    where: { stripeSubscriptionId: subscription.id },
    create: {
      userId: user.id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      tier,
      status: subscription.status,
      currentPeriodStart: periodStart,
      currentPeriodEnd: cancelAt ?? periodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    },
    update: {
      stripePriceId: priceId,
      tier,
      status: subscription.status,
      currentPeriodStart: periodStart,
      currentPeriodEnd: cancelAt ?? periodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    },
  });

  // Update cached tier on User
  const effectiveTier = ["active", "trialing"].includes(subscription.status) ? tier : "free";
  await prisma.user.update({
    where: { id: user.id },
    data: { tier: effectiveTier },
  });

  logger.info(`Subscription ${subscription.id} upserted: ${subscription.status} / ${tier} for user ${user.id}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  await prisma.billingSubscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: "canceled",
      canceledAt: new Date(),
    },
  }).catch(() => {
    logger.error(`BillingSubscription not found for ${subscription.id}`);
  });

  // Check if user has any remaining active subscriptions
  const user = await prisma.user.findUnique({ where: { stripeCustomerId: customerId } });
  if (!user) return;

  const activeCount = await prisma.billingSubscription.count({
    where: {
      userId: user.id,
      status: { in: ["active", "trialing"] },
    },
  });

  if (activeCount === 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: { tier: "free" },
    });

    // Revoke all API keys on downgrade to free
    const revoked = await prisma.apiKey.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (revoked.count > 0) {
      logger.info(`Revoked ${revoked.count} API key(s) for user ${user.id} on downgrade`);
    }

    logger.info(`User ${user.id} reverted to free tier`);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  logger.error(`Payment failed for customer ${customerId}, invoice ${invoice.id}`);
}
