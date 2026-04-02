"use client";

import Link from "next/link";
import { useIsMobile } from "@/hooks/useIsMobile";

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  corridors:
    "Corridor intelligence, route tracking, and operator-cleared flight paths.",
  filings:
    "Federal Register filings, regulatory actions, and document tracking.",
  intel:
    "Curated UAM intelligence — FAA rulings, city policy, operator expansions, and market developments.",
  analytics:
    "Market analytics, corridor statistics, and trend visualizations.",
  subscribe:
    "Market and corridor alert subscriptions.",
  history:
    "Score history timeline and factor trend analysis.",
};

interface UpgradeGateProps {
  feature: string;
}

export default function UpgradeGate({ feature }: UpgradeGateProps) {
  const isMobile = useIsMobile();
  const description =
    FEATURE_DESCRIPTIONS[feature] ??
    "This feature is available on Pro and above.";

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? 20 : 40,
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: "100%",
          textAlign: "center",
          padding: "40px 32px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12,
          position: "relative",
        }}
      >
        {/* Gradient top border accent */}
        <div
          style={{
            position: "absolute",
            top: -1,
            left: 40,
            right: 40,
            height: 2,
            background: "linear-gradient(90deg, #00ff88, #5B8DB8)",
            borderRadius: "2px 2px 0 0",
          }}
        />

        <img
          src="/images/logo/airindex-icon.svg"
          alt="AirIndex"
          style={{ width: 44, height: 44, margin: "0 auto 20px", display: "block" }}
        />

        <h2
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 18,
            fontWeight: 700,
            color: "#fff",
            margin: "0 0 8px",
          }}
        >
          Upgrade to Pro
        </h2>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            color: "#666",
            fontSize: 11,
            lineHeight: 1.7,
            marginBottom: 28,
          }}
        >
          {description}
        </p>

        <Link
          href="/contact?tier=pro&ref=upgrade"
          style={{
            display: "inline-block",
            padding: "13px 32px",
            background: "linear-gradient(135deg, #00ff88, #5B8DB8)",
            border: "none",
            borderRadius: 6,
            color: "#000",
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "'Syne', sans-serif",
            letterSpacing: "0.08em",
            textDecoration: "none",
            transition: "opacity 0.15s",
          }}
        >
          SCHEDULE A WALKTHROUGH
        </Link>

        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <Link
            href="/pricing"
            style={{
              color: "#555",
              fontSize: 10,
              textDecoration: "none",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              transition: "color 0.15s",
            }}
          >
            or view plans →
          </Link>
        </div>
      </div>
    </div>
  );
}
