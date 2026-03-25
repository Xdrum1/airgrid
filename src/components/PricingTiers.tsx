"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import PreCheckoutModal from "./PreCheckoutModal";

// -------------------------------------------------------
// Tier data
// -------------------------------------------------------

type Interval = "monthly" | "annual";

interface Tier {
  name: string;
  tagline: string;
  monthly: number | null;
  annual: number | null;
  accent: string;
  highlight: boolean;
  features: string[];
  cta: "free" | "stripe" | "contact";
  stripeTier?: "alert" | "pro" | "institutional";
}

const TIERS: Tier[] = [
  {
    name: "Free",
    tagline: "The score is free. Explore the index.",
    monthly: 0,
    annual: 0,
    accent: "#00d4ff",
    highlight: false,
    features: [
      "Dashboard map with city markers",
      "Current readiness scores",
      "City rankings",
      "Basic market overview per city",
    ],
    cta: "free",
  },
  {
    name: "Alert",
    tagline: "Systematic monitoring for markets you're tracking.",
    monthly: 25,
    annual: 249,
    accent: "#f59e0b",
    highlight: false,
    features: [
      "Everything in Free, plus:",
      "Monitor up to 3 markets",
      "Monthly market summary",
    ],
    cta: "stripe",
    stripeTier: "alert",
  },
  {
    name: "Professional",
    tagline: "The full intelligence layer for analysts, consultants, and city planners making UAM decisions.",
    monthly: 149,
    annual: 1490,
    accent: "#00d4ff",
    highlight: true,
    features: [
      "Everything in Alert, plus:",
      "Full dashboard — all 20+ markets",
      "Score history & trend analysis",
      "Factor-level breakdown behind each score",
      "Corridor intelligence",
      "Operator tracker & SEC filings",
      "Market Watch status & analyst outlook",
      "Intel feed & deep-dives",
      "Gap analysis & downloadable city reports",
      "Full monthly market report",
    ],
    cta: "stripe",
    stripeTier: "pro",
  },
  {
    name: "Institutional",
    tagline: "Data access for teams and organizations embedding UAM intelligence into their workflows.",
    monthly: null,
    annual: null,
    accent: "#7a8fa8",
    highlight: false,
    features: [
      "Everything in Professional, plus:",
      "API access with dedicated rate limits",
      "Data export (JSON)",
      "Priority support & onboarding",
    ],
    cta: "contact",
  },
  {
    name: "Enterprise",
    tagline: "For organizations requiring custom data infrastructure, licensing, or integration.",
    monthly: null,
    annual: null,
    accent: "#7a8fa8",
    highlight: false,
    features: [
      "Everything in Institutional, plus:",
      "White-label endpoints",
      "Webhooks & event streams",
      "Embedded widgets",
      "Direct data feeds",
      "Custom SLA & data license",
    ],
    cta: "contact",
  },
];

// -------------------------------------------------------
// Component
// -------------------------------------------------------

export default function PricingTiers() {
  const [interval, setInterval] = useState<Interval>("annual");
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [checkoutTier, setCheckoutTier] = useState<Tier | null>(null);
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();

  // Auto-open checkout modal when returning from login with ?checkout=tier
  useEffect(() => {
    if (status !== "authenticated") return;
    const tierParam = searchParams.get("checkout");
    const intervalParam = searchParams.get("interval");
    if (!tierParam) return;
    const tier = TIERS.find((t) => t.stripeTier === tierParam);
    if (!tier) return;
    if (intervalParam === "monthly" || intervalParam === "annual") {
      setInterval(intervalParam);
    }
    setCheckoutTier(tier);
    // Clean up URL params
    window.history.replaceState({}, "", "/pricing");
  }, [status, searchParams]);

  function getDisplayPrice(tier: Tier): string {
    if (tier.monthly === null) return "";
    if (tier.monthly === 0) return "$0";
    if (interval === "annual") {
      const perMonth = Math.round(tier.annual! / 12);
      return `$${perMonth}`;
    }
    return `$${tier.monthly}`;
  }

  function getPeriod(tier: Tier): string {
    if (tier.monthly === null || tier.monthly === 0) return "";
    return "/mo";
  }

  function getBillingNote(tier: Tier): string {
    if (tier.monthly === 0) return "Free forever.";
    if (tier.monthly === null) return "";
    if (interval === "annual" && tier.annual) {
      return `Billed $${tier.annual.toLocaleString()}/year`;
    }
    if (interval === "monthly" && tier.annual) {
      return `Save with annual — $${tier.annual.toLocaleString()}/year`;
    }
    return "";
  }

  function handleCheckout(tier: Tier) {
    if (!session?.user) {
      const callbackUrl = `/pricing?checkout=${tier.stripeTier}&interval=${interval}`;
      window.location.href = `/login?mode=signup&callbackUrl=${encodeURIComponent(callbackUrl)}`;
      return;
    }
    // Open pre-checkout modal instead of going straight to Stripe
    setCheckoutTier(tier);
  }

  async function proceedToStripe(profileData: { organization: string; jobTitle: string }) {
    if (!checkoutTier) return;
    const tier = checkoutTier;
    setCheckoutTier(null);
    setLoadingTier(tier.stripeTier ?? null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: tier.stripeTier,
          interval,
          organization: profileData.organization,
          jobTitle: profileData.jobTitle,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("[pricing] Checkout error:", data.error);
        setLoadingTier(null);
      }
    } catch (err) {
      console.error("[pricing] Checkout error:", err);
      setLoadingTier(null);
    }
  }

  return (
    <>
      <style>{`
        .pricing-cta { transition: border-color 0.2s, color 0.2s, background 0.2s; }
        .pricing-cta:hover { border-color: rgba(0,212,255,0.35) !important; color: #00d4ff !important; background: rgba(0,212,255,0.06) !important; }
        .pricing-secondary { transition: color 0.2s; }
        .pricing-secondary:hover { color: #00d4ff !important; }
      `}</style>
      {/* Tier cards */}
      <div
        className="pricing-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              background: tier.highlight ? "rgba(0,212,255,0.03)" : "rgba(255,255,255,0.02)",
              border: tier.highlight
                ? "1px solid rgba(0,212,255,0.2)"
                : "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12,
              padding: "36px 24px 28px",
            }}
          >
            {/* Top accent line — only on highlighted tier */}
            {tier.highlight && (
              <div
                style={{
                  position: "absolute",
                  top: -1,
                  left: 28,
                  right: 28,
                  height: 2,
                  background: tier.accent,
                  borderRadius: "2px 2px 0 0",
                }}
              />
            )}

            {/* Tier name */}
            <div
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: 15,
                color: tier.highlight ? "#fff" : "#aaa",
                marginBottom: 6,
                letterSpacing: "0.02em",
              }}
            >
              {tier.name}
            </div>

            {/* Tagline */}
            <div
              style={{
                fontSize: 12,
                color: "#666",
                lineHeight: 1.6,
                marginBottom: 20,
                minHeight: 38,
              }}
            >
              {tier.tagline}
            </div>

            {/* Price or Contact prompt */}
            {tier.monthly !== null ? (
              <>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                  <span
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: 700,
                      fontSize: 32,
                      color: "#fff",
                    }}
                  >
                    {getDisplayPrice(tier)}
                  </span>
                  <span style={{ color: "#666", fontSize: 13 }}>{getPeriod(tier)}</span>
                </div>
                <div style={{ color: "#555", fontSize: 10, marginBottom: 24, minHeight: 14 }}>
                  {getBillingNote(tier)}
                </div>
              </>
            ) : (
              <div style={{ marginBottom: 24 }}>
                <div
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700,
                    fontSize: 18,
                    color: "#fff",
                    marginBottom: 4,
                  }}
                >
                  Let&apos;s talk
                </div>
                <div style={{ color: "#555", fontSize: 10, minHeight: 14 }}>
                  Custom data license for your organization
                </div>
              </div>
            )}

            {/* Features */}
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", flex: 1 }}>
              {tier.features.map((f) => (
                <li
                  key={f}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    color: "#888",
                    fontSize: 12,
                    lineHeight: 1.6,
                    marginBottom: 8,
                  }}
                >
                  {f.endsWith(":") ? null : (
                    <span style={{ color: "#555", fontSize: 10, marginTop: 3, flexShrink: 0 }}>
                      &#10003;
                    </span>
                  )}
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            {tier.cta === "free" ? (
              <Link
                href="/login?mode=signup"
                className="pricing-cta"
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "12px 0",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textDecoration: "none",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff",
                }}
              >
                Get Free
              </Link>
            ) : tier.cta === "contact" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Link
                  href={`/contact?tier=${tier.name.toLowerCase()}`}
                  className="pricing-cta"
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "12px 0",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textDecoration: "none",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#fff",
                  }}
                >
                  Contact Sales
                </Link>
                <Link
                  href={`/${tier.name.toLowerCase()}`}
                  className="pricing-secondary"
                  style={{
                    textAlign: "center",
                    padding: "4px 0",
                    fontSize: 10,
                    color: "#555",
                    textDecoration: "none",
                    letterSpacing: "0.02em",
                  }}
                >
                  learn more →
                </Link>
              </div>
            ) : (
              <button
                onClick={() => handleCheckout(tier)}
                disabled={loadingTier === tier.stripeTier}
                className="pricing-cta"
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "center",
                  padding: "12px 0",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  fontFamily: "'Inter', sans-serif",
                  cursor: loadingTier === tier.stripeTier ? "wait" : "pointer",
                  opacity: loadingTier === tier.stripeTier ? 0.6 : 1,
                  background: tier.highlight ? "#00d4ff" : `${tier.accent}18`,
                  border: `1px solid ${tier.highlight ? "#00d4ff" : tier.accent}`,
                  color: tier.highlight ? "#050508" : "#fff",
                }}
              >
                {loadingTier === tier.stripeTier ? "Redirecting..." : `Get ${tier.name}`}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Billing toggle — de-emphasized below cards */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 12,
          marginTop: 32,
        }}
      >
        <span style={{ fontSize: 11, color: interval === "monthly" ? "#999" : "#444" }}>
          Monthly
        </span>
        <button
          onClick={() => setInterval((v) => (v === "monthly" ? "annual" : "monthly"))}
          style={{
            width: 40,
            height: 20,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.04)",
            cursor: "pointer",
            position: "relative",
            transition: "background 0.2s",
            padding: 0,
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: interval === "annual" ? "#00d4ff" : "#555",
              position: "absolute",
              top: 2,
              left: interval === "annual" ? 22 : 2,
              transition: "left 0.2s, background 0.2s",
            }}
          />
        </button>
        <span style={{ fontSize: 11, color: interval === "annual" ? "#999" : "#444" }}>
          Annual
        </span>
        {interval === "annual" && (
          <span style={{ fontSize: 9, color: "#555", letterSpacing: "0.04em" }}>
            Save ~17%
          </span>
        )}
      </div>

      {checkoutTier && session?.user?.email && (
        <PreCheckoutModal
          tier={checkoutTier.stripeTier ?? "pro"}
          interval={interval}
          userEmail={session.user.email}
          onSubmit={proceedToStripe}
          onCancel={() => setCheckoutTier(null)}
        />
      )}
    </>
  );
}
