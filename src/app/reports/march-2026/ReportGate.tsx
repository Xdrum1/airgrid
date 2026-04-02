"use client";

import { useState } from "react";
import Link from "next/link";

export default function ReportGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);

  if (unlocked) {
    return <>{children}</>;
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Blurred preview of gated content */}
      <div
        style={{
          maxHeight: 400,
          overflow: "hidden",
          filter: "blur(6px)",
          opacity: 0.4,
          pointerEvents: "none",
          userSelect: "none",
        }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Gate overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(to bottom, transparent 0%, rgba(5,5,8,0.95) 40%)",
        }}
      >
        <div
          style={{
            maxWidth: 440,
            width: "100%",
            textAlign: "center",
            padding: "40px 32px",
            background: "rgba(10,10,18,0.95)",
            border: "1px solid rgba(91,141,184,0.15)",
            borderRadius: 12,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -1,
              left: 60,
              right: 60,
              height: 2,
              background: "linear-gradient(90deg, transparent, #5B8DB8, transparent)",
              borderRadius: 2,
            }}
          />
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 9,
              letterSpacing: 3,
              color: "#5B8DB8",
              marginBottom: 16,
            }}
          >
            FULL REPORT
          </div>
          <h3
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 20,
              fontWeight: 700,
              color: "#fff",
              marginBottom: 10,
            }}
          >
            Methodology, corridors, operators, and more
          </h3>
          <p
            style={{
              color: "#888",
              fontSize: 13,
              lineHeight: 1.7,
              marginBottom: 24,
            }}
          >
            The full report includes scoring methodology deep-dive, corridor intelligence,
            operator analysis, heliport infrastructure data, markets to watch, and the
            downloadable PDF.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
            <Link
              href="/contact?tier=pro&ref=report"
              style={{
                display: "inline-block",
                padding: "14px 32px",
                background: "#5B8DB8",
                color: "#050508",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textDecoration: "none",
                borderRadius: 6,
                transition: "opacity 0.15s",
              }}
            >
              Get the Full Report
            </Link>
            <button
              onClick={() => setUnlocked(true)}
              style={{
                background: "none",
                border: "none",
                color: "#555",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                padding: "8px 16px",
                transition: "color 0.15s",
              }}
            >
              Continue reading preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
