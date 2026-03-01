"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { City } from "@/types";

export default function DashboardHeader({
  cities,
  userEmail,
  isAdmin,
  isMobile,
  showSignOut,
  onToggleSignOut,
  onSignIn,
}: {
  cities: City[];
  userEmail: string | null | undefined;
  isAdmin: boolean;
  isMobile: boolean;
  showSignOut: boolean;
  onToggleSignOut: () => void;
  onSignIn: () => void;
}) {
  const router = useRouter();

  const headerStats = [
    { label: `${cities.length} MARKETS`, color: "#00d4ff" },
    {
      label: `${cities.filter((c) => (c.score ?? 0) >= 60).length} HIGH READINESS`,
      color: "#00ff88",
    },
    {
      label: `${cities.filter((c) => c.vertiportCount > 0).length} VERTIPORT CITIES`,
      color: "#f59e0b",
    },
    {
      label: `AVG SCORE ${Math.round(cities.reduce((a, b) => a + (b.score ?? 0), 0) / cities.length)}`,
      color: "#888",
    },
  ];

  return (
    <div
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: isMobile ? "0 12px" : "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: isMobile ? 48 : 54,
        flexShrink: 0,
      }}
    >
      <Link href={userEmail ? "/dashboard" : "/"} style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, textDecoration: "none", color: "inherit" }}>
        <img
          src="/images/logo/airindex-wordmark.svg"
          alt="AirIndex"
          style={{ height: isMobile ? 22 : 26 }}
        />
        {!isMobile && (
          <span
            style={{ color: "#444", fontSize: 9, letterSpacing: 2 }}
          >
            UAM MARKET INTELLIGENCE
          </span>
        )}
      </Link>
      <div style={{ display: "flex", gap: isMobile ? 8 : 24, alignItems: "center" }}>
        {!isMobile && headerStats.map((s, i) => (
          <span
            key={i}
            style={{ color: s.color, fontSize: 9, letterSpacing: 1 }}
          >
            {s.label}
          </span>
        ))}
        {isAdmin && (
          <Link
            href="/admin/review"
            style={{
              color: "#7c3aed",
              fontSize: 9,
              letterSpacing: 1,
              textDecoration: "none",
              fontWeight: 700,
              opacity: 0.7,
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
          >
            ADMIN
          </Link>
        )}
        {userEmail ? (
          <div style={{ position: "relative" }}>
            <button
              onClick={onToggleSignOut}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 4,
                padding: "6px 12px",
                color: "#888",
                fontSize: 9,
                letterSpacing: 1,
                cursor: "pointer",
                fontFamily: "'Space Mono', monospace",
                transition: "all 0.15s",
              }}
            >
              {userEmail.length > 20
                ? userEmail.slice(0, 20) + "..."
                : userEmail}
            </button>
            {showSignOut && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  background: "#0e0e16",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 6,
                  padding: "14px 18px",
                  zIndex: 100,
                  minWidth: 180,
                  fontFamily: "'Space Mono', monospace",
                }}
              >
                <div style={{ color: "#888", fontSize: 10, marginBottom: 12 }}>
                  Sign out?
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => {
                      fetch("/api/signout", { method: "POST" }).then(() => {
                        window.location.href = "/";
                      });
                    }}
                    style={{
                      background: "rgba(255,68,68,0.1)",
                      border: "1px solid rgba(255,68,68,0.3)",
                      borderRadius: 4,
                      padding: isMobile ? "8px 14px" : "6px 14px",
                      color: "#ff4444",
                      fontSize: 9,
                      letterSpacing: 1,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "'Space Mono', monospace",
                    }}
                  >
                    YES
                  </button>
                  <button
                    onClick={onToggleSignOut}
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 4,
                      padding: isMobile ? "8px 14px" : "6px 14px",
                      color: "#888",
                      fontSize: 9,
                      letterSpacing: 1,
                      cursor: "pointer",
                      fontFamily: "'Space Mono', monospace",
                    }}
                  >
                    NO
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onSignIn}
            style={{
              background: "linear-gradient(135deg, rgba(0,212,255,0.15), rgba(124,58,237,0.15))",
              border: "1px solid rgba(0,212,255,0.3)",
              borderRadius: 4,
              padding: isMobile ? "8px 14px" : "6px 14px",
              color: "#00d4ff",
              fontSize: 9,
              letterSpacing: 2,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'Space Mono', monospace",
              transition: "all 0.15s",
            }}
          >
            SIGN IN
          </button>
        )}
      </div>
    </div>
  );
}
