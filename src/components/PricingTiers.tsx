"use client";

import Link from "next/link";

// -------------------------------------------------------
// Tier data
// -------------------------------------------------------

interface Tier {
  name: string;
  tagline: string;
  price: string;
  priceNote: string;
  accent: string;
  highlight: boolean;
  features: string[];
  cta: { label: string; href: string };
  learnMore?: string;
}

const TIERS: Tier[] = [
  {
    name: "Free",
    tagline: "Public research and market overview.",
    price: "$0",
    priceNote: "Open access.",
    accent: "#5B8DB8",
    highlight: false,
    features: [
      "Market Pulse weekly intelligence",
      "Published methodology",
      "Market overview and rankings",
      "Insights and research",
    ],
    cta: { label: "Request Access", href: "/request-access" },
  },
  {
    name: "Professional",
    tagline: "The full intelligence layer for analysts, consultants, and city planners making UAM decisions.",
    price: "Contact us",
    priceNote: "Annual license, billed monthly or annually.",
    accent: "#5B8DB8",
    highlight: true,
    features: [
      "Everything in Free, plus:",
      "Full dashboard — all 20+ markets",
      "Score history & trend analysis",
      "Factor-level breakdown behind each score",
      "Corridor intelligence",
      "Operator tracker & SEC filings",
      "Market Watch status & analyst outlook",
      "Intel feed & deep-dives",
      "Gap analysis & downloadable city reports",
      "Full monthly market report",
      "Email alerts & market subscriptions",
    ],
    cta: { label: "Request Access", href: "/contact?tier=pro" },
  },
  {
    name: "Institutional",
    tagline: "Data access for teams and organizations embedding UAM intelligence into their workflows.",
    price: "Contact us",
    priceNote: "Annual data license agreement.",
    accent: "#7a8fa8",
    highlight: false,
    features: [
      "Everything in Professional, plus:",
      "API access with dedicated rate limits",
      "Data export (JSON)",
      "Multi-seat access",
      "Priority support & onboarding",
    ],
    cta: { label: "Contact Sales", href: "/contact?tier=institutional" },
    learnMore: "/institutional",
  },
  {
    name: "Enterprise",
    tagline: "For organizations requiring custom data infrastructure, licensing, or integration.",
    price: "Custom",
    priceNote: "Custom data license for your organization.",
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
    cta: { label: "Contact Sales", href: "/contact?tier=enterprise" },
    learnMore: "/enterprise",
  },
];

// -------------------------------------------------------
// Component
// -------------------------------------------------------

export default function PricingTiers() {
  return (
    <>
      <style>{`
        .pricing-cta { transition: border-color 0.2s, color 0.2s, background 0.2s; }
        .pricing-cta:hover { border-color: rgba(91,141,184,0.35) !important; color: #5B8DB8 !important; background: rgba(91,141,184,0.06) !important; }
        .pricing-secondary { transition: color 0.2s; }
        .pricing-secondary:hover { color: #5B8DB8 !important; }
        @media (max-width: 900px) {
          .pricing-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 560px) {
          .pricing-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Tier cards */}
      <div
        className="pricing-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
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
              background: tier.highlight ? "rgba(91,141,184,0.03)" : "rgba(255,255,255,0.02)",
              border: tier.highlight
                ? "1px solid rgba(91,141,184,0.2)"
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

            {/* Price */}
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: tier.price === "$0" ? 32 : 18,
                  color: "#fff",
                  marginBottom: 4,
                }}
              >
                {tier.price}
              </div>
              <div style={{ color: "#555", fontSize: 10, minHeight: 14 }}>
                {tier.priceNote}
              </div>
            </div>

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
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Link
                href={tier.cta.href}
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
                  background: tier.highlight ? "#5B8DB8" : "rgba(255,255,255,0.08)",
                  border: tier.highlight
                    ? "1px solid #5B8DB8"
                    : "1px solid rgba(255,255,255,0.15)",
                  color: tier.highlight ? "#050508" : "#fff",
                }}
              >
                {tier.cta.label}
              </Link>
              {tier.learnMore && (
                <Link
                  href={tier.learnMore}
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
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
