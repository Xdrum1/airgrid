"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";

const linkStyle: React.CSSProperties = {
  color: "#888",
  fontSize: 11,
  letterSpacing: "0.06em",
  textDecoration: "none",
  padding: "8px 14px",
  transition: "all 0.15s",
  borderRadius: 4,
};

const NAV_LINKS = [
  { label: "Methodology", href: "/methodology" },
  { label: "Intel", href: "/feed" },
  { label: "API", href: "/api" },
  { label: "Pricing", href: "/pricing" },
];

export default function NavClient({ isAuthed }: { isAuthed: boolean }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close mobile menu on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const isActive = useCallback(
    (href: string) => {
      return pathname === href || pathname.startsWith(href + "/");
    },
    [pathname]
  );

  return (
    <>
      {/* Desktop nav */}
      <div className="nav-desktop" style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {NAV_LINKS.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="nav-link"
            style={{
              ...linkStyle,
              color: isActive(link.href) ? "#fff" : "#888",
            }}
          >
            {link.label}
          </Link>
        ))}

        {isAuthed ? (
          <Link
            href="/dashboard"
            className="nav-cta"
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textDecoration: "none",
              padding: "8px 20px",
              background: "#00d4ff",
              color: "#050508",
              borderRadius: 6,
              transition: "opacity 0.15s",
              marginLeft: 4,
            }}
          >
            Dashboard
          </Link>
        ) : (
          <>
            <Link
              href="/login"
              className="nav-link"
              style={{
                ...linkStyle,
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 6,
                marginLeft: 4,
              }}
            >
              Sign in
            </Link>
            <Link
              href="/login?mode=signup"
              className="nav-cta"
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textDecoration: "none",
                padding: "8px 20px",
                background: "#00d4ff",
                color: "#050508",
                borderRadius: 6,
                transition: "opacity 0.15s",
              }}
            >
              Sign up free
            </Link>
          </>
        )}
      </div>

      {/* Mobile hamburger */}
      <button
        className="nav-mobile-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle navigation"
        style={{
          display: "none",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 8,
          color: "#888",
          fontSize: 20,
        }}
      >
        {mobileOpen ? "\u2715" : "\u2630"}
      </button>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="nav-mobile-menu"
          style={{
            position: "fixed",
            top: 64,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(5,5,8,0.98)",
            backdropFilter: "blur(16px)",
            zIndex: 999,
            padding: "24px 20px",
            overflowY: "auto",
          }}
        >
          {/* Main links */}
          <div style={{ marginBottom: 24 }}>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: "block",
                  padding: "12px 0",
                  color: isActive(link.href) ? "#fff" : "#aaa",
                  fontSize: 14,
                  textDecoration: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  transition: "color 0.15s",
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Auth actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
            {isAuthed ? (
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "14px 0",
                  background: "#00d4ff",
                  color: "#050508",
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textDecoration: "none",
                  borderRadius: 6,
                }}
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "14px 0",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#aaa",
                    fontSize: 13,
                    letterSpacing: "0.06em",
                    textDecoration: "none",
                    borderRadius: 6,
                  }}
                >
                  Sign in
                </Link>
                <Link
                  href="/login?mode=signup"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "14px 0",
                    background: "#00d4ff",
                    color: "#050508",
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textDecoration: "none",
                    borderRadius: 6,
                  }}
                >
                  Sign up free
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
