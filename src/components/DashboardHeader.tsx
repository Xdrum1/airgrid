"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { City } from "@/types";
import { hasProAccess } from "@/lib/billing-shared";

export default function DashboardHeader({
  cities,
  userEmail,
  userTier,
  isAdmin,
  isMobile,
  showSignOut,
  onToggleSignOut,
  onSignIn,
}: {
  cities: City[];
  userEmail: string | null | undefined;
  userTier: string;
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
            style={{ color: "#777", fontSize: 9, letterSpacing: 2 }}
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
        {!isMobile && (
          <>
          <Link
            href="/updates"
            style={{
              color: "#00d4ff",
              fontSize: 9,
              letterSpacing: 1,
              textDecoration: "none",
              opacity: 0.7,
              transition: "opacity 0.15s",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
          >
            <span style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#00d4ff",
              flexShrink: 0,
            }} />
            WHAT&apos;S NEW
          </Link>
          <Link
            href="/methodology"
            style={{
              color: "#999",
              fontSize: 9,
              letterSpacing: 1,
              textDecoration: "none",
              opacity: 0.8,
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
          >
            METHODOLOGY
          </Link>
          </>
        )}
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
                fontFamily: "'Inter', sans-serif",
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
                  padding: "10px 0",
                  zIndex: 100,
                  minWidth: 200,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {/* Tier badge */}
                <div style={{ padding: "6px 18px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 9, color: "#555", letterSpacing: 1, marginBottom: 4 }}>PLAN</div>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: userTier === "free" ? "#888" : "#00d4ff",
                    textTransform: "capitalize",
                  }}>
                    {userTier === "grandfathered" ? "Pro (Founding)" : userTier}
                  </div>
                </div>

                {/* Manage / Upgrade */}
                <div style={{ padding: "8px 0" }}>
                  {hasProAccess(userTier) ? (
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/billing/portal", { method: "POST" });
                          const data = await res.json();
                          if (data.url) window.location.href = data.url;
                        } catch (err) {
                          console.error("Portal error:", err);
                        }
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 18px",
                        background: "transparent",
                        border: "none",
                        color: "#aaa",
                        fontSize: 11,
                        cursor: "pointer",
                        fontFamily: "'Inter', sans-serif",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      Manage Subscription
                    </button>
                  ) : (
                    <a
                      href="/pricing"
                      style={{
                        display: "block",
                        padding: "8px 18px",
                        color: "#00d4ff",
                        fontSize: 11,
                        textDecoration: "none",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      Upgrade Plan
                    </a>
                  )}
                </div>

                {/* Sign out */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "8px 0 4px" }}>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 18px",
                      background: "transparent",
                      border: "none",
                      color: "#ff4444",
                      fontSize: 11,
                      cursor: "pointer",
                      fontFamily: "'Inter', sans-serif",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,68,68,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    Sign Out
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
              fontFamily: "'Inter', sans-serif",
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
