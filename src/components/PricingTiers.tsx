"use client";

import { useState } from "react";
import Link from "next/link";

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
    tagline: "Explore the index.",
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
    tagline: "Stay ahead of score changes.",
    monthly: 25,
    annual: 249,
    accent: "#f59e0b",
    highlight: false,
    features: [
      "Everything in Free, plus:",
      "Monitor up to 3 markets",
      "Score change email notifications",
      "Watch list alerts",
      "Monthly market summary email",
    ],
    cta: "stripe",
    stripeTier: "alert",
  },
  {
    name: "Pro",
    tagline: "Full market intelligence for active UAM professionals.",
    monthly: 149,
    annual: 1490,
    accent: "#00ff88",
    highlight: true,
    features: [
      "Everything in Alert, plus:",
      "Full dashboard — all 20+ markets",
      "Score history & trend lines",
      "Factor-level breakdown behind each score",
      "Corridor intelligence",
      "Operator tracker & SEC filings",
      "Market Watch status & analyst outlook",
      "Intel Feed & deep-dives",
      "Full monthly market report",
    ],
    cta: "stripe",
    stripeTier: "pro",
  },
  {
    name: "Team",
    tagline: "API access and multi-seat for teams making market decisions.",
    monthly: 499,
    annual: 4990,
    accent: "#7c3aed",
    highlight: false,
    features: [
      "Everything in Pro, plus:",
      "API access with dedicated rate limits",
      "Data export (JSON / CSV)",
      "3 seats included (+$99/seat/mo)",
      "Custom alert configurations",
      "Priority support & onboarding",
    ],
    cta: "stripe",
    stripeTier: "institutional",
  },
  {
    name: "Enterprise",
    tagline: "For organizations embedding UAM data into their workflows.",
    monthly: null,
    annual: null,
    accent: "#ff6b35",
    highlight: false,
    features: [
      "Everything in Team, plus:",
      "White-label endpoints",
      "Webhooks & event streams",
      "Embedded widgets",
      "Direct data feeds",
      "Custom SLA",
    ],
    cta: "contact",
  },
];

// -------------------------------------------------------
// Component
// -------------------------------------------------------

export default function PricingTiers() {
  const [interval, setInterval] = useState<Interval>("annual");

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
      const savings = Math.round((1 - tier.annual / (tier.monthly * 12)) * 100);
      return `$${tier.annual.toLocaleString()}/year (save ${savings}%)`;
    }
    return "";
  }

  return (
    <>
      {/* Monthly / Annual toggle */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 12,
          marginBottom: 48,
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: interval === "monthly" ? "#fff" : "#555",
            transition: "color 0.15s",
          }}
        >
          Monthly
        </span>
        <button
          onClick={() => setInterval((v) => (v === "monthly" ? "annual" : "monthly"))}
          style={{
            width: 44,
            height: 24,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background: interval === "annual" ? "rgba(0,255,136,0.15)" : "rgba(255,255,255,0.06)",
            cursor: "pointer",
            position: "relative",
            transition: "background 0.2s",
            padding: 0,
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: interval === "annual" ? "#00ff88" : "#888",
              position: "absolute",
              top: 2,
              left: interval === "annual" ? 22 : 2,
              transition: "left 0.2s, background 0.2s",
            }}
          />
        </button>
        <span
          style={{
            fontSize: 12,
            color: interval === "annual" ? "#fff" : "#555",
            transition: "color 0.15s",
          }}
        >
          Annual
        </span>
        {interval === "annual" && (
          <span
            style={{
              fontSize: 9,
              letterSpacing: 1,
              color: "#00ff88",
              border: "1px solid rgba(0,255,136,0.25)",
              borderRadius: 3,
              padding: "3px 8px",
            }}
          >
            2 MONTHS FREE
          </span>
        )}
      </div>

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
              background: tier.highlight ? "rgba(0,255,136,0.03)" : "rgba(255,255,255,0.02)",
              border: tier.highlight
                ? `1px solid ${tier.accent}44`
                : "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12,
              padding: "36px 24px 28px",
            }}
          >
            {/* Top accent line */}
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

            {/* Tier name */}
            <div
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: 16,
                color: "#ccc",
                marginBottom: 4,
              }}
            >
              {tier.name}
            </div>

            {/* Tagline */}
            <div
              style={{
                fontSize: 11,
                color: "#777",
                lineHeight: 1.5,
                marginBottom: 16,
                minHeight: 34,
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
                      fontSize: 36,
                      color: "#fff",
                    }}
                  >
                    {getDisplayPrice(tier)}
                  </span>
                  <span style={{ color: "#888", fontSize: 13 }}>{getPeriod(tier)}</span>
                </div>
                <div style={{ color: "#666", fontSize: 10, marginBottom: 24, minHeight: 14 }}>
                  {getBillingNote(tier)}
                </div>
              </>
            ) : (
              <div style={{ marginBottom: 24 }}>
                <div
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700,
                    fontSize: 20,
                    color: "#fff",
                    marginBottom: 4,
                  }}
                >
                  Let&apos;s talk
                </div>
                <div style={{ color: "#666", fontSize: 10, minHeight: 14 }}>
                  Custom pricing for your organization
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
                    color: "#999",
                    fontSize: 12,
                    lineHeight: 1.6,
                    marginBottom: 8,
                  }}
                >
                  {f.endsWith(":") ? null : (
                    <span style={{ color: tier.accent, fontSize: 10, marginTop: 3, flexShrink: 0 }}>
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
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "12px 0",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textDecoration: "none",
                  transition: "opacity 0.15s",
                  background: `${tier.accent}15`,
                  border: `1px solid ${tier.accent}44`,
                  color: tier.accent,
                }}
              >
                Sign up free
              </Link>
            ) : tier.cta === "contact" ? (
              <a
                href={`mailto:sales@airindex.io?subject=${tier.name} inquiry`}
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "12px 0",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textDecoration: "none",
                  transition: "opacity 0.15s",
                  background: `${tier.accent}15`,
                  border: `1px solid ${tier.accent}44`,
                  color: tier.accent,
                }}
              >
                Contact sales
              </a>
            ) : (
              <Link
                href="/login?mode=signup"
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "12px 0",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textDecoration: "none",
                  transition: "opacity 0.15s",
                  background: tier.highlight ? tier.accent : `${tier.accent}15`,
                  border: `1px solid ${tier.accent}44`,
                  color: tier.highlight ? "#050508" : tier.accent,
                }}
              >
                Get started
              </Link>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
