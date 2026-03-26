"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import Link from "next/link";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export default function EmbeddedCheckoutForm() {
  const searchParams = useSearchParams();
  const tier = searchParams.get("tier") || "pro";
  const interval = searchParams.get("interval") || "monthly";

  const tierLabels: Record<string, string> = {
    alert: "Alert",
    pro: "Professional",
    institutional: "Institutional",
  };

  const fetchClientSecret = useCallback(async () => {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier, interval }),
    });
    const data = await res.json();
    if (!data.clientSecret) {
      throw new Error(data.error || "Failed to create checkout session");
    }
    return data.clientSecret;
  }, [tier, interval]);

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <Link
          href="/pricing"
          style={{
            fontSize: 11,
            color: "#555",
            textDecoration: "none",
            letterSpacing: 0.5,
          }}
        >
          &larr; Back to Pricing
        </Link>
      </div>

      <div
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: "clamp(20px, 3vw, 28px)",
          color: "#fff",
          marginBottom: 6,
        }}
      >
        Subscribe to AirIndex {tierLabels[tier] || tier}
      </div>
      <div
        style={{
          fontSize: 13,
          color: "#888",
          marginBottom: 32,
          lineHeight: 1.6,
        }}
      >
        {interval === "annual" ? "Annual billing" : "Monthly billing"} — cancel
        anytime from your dashboard.
      </div>

      <div
        style={{
          background: "#0a0a12",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12,
          overflow: "hidden",
          minHeight: 400,
        }}
      >
        <EmbeddedCheckoutProvider
          stripe={stripePromise}
          options={{ fetchClientSecret }}
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>

      <div
        style={{
          marginTop: 20,
          textAlign: "center",
          fontSize: 10,
          color: "#444",
          lineHeight: 1.6,
        }}
      >
        Secured by Stripe. Your payment details are encrypted and never touch
        our servers.
      </div>
    </>
  );
}
