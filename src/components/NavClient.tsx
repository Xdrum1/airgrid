"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

// ── Types ──
interface NavItem {
  label: string;
  href?: string;
  children?: { label: string; href: string; desc: string }[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Products",
    href: "/#products",
  },
  {
    label: "Intelligence",
    children: [
      { label: "Methodology", href: "/methodology", desc: "Published 7-factor scoring model with full transparency" },
      { label: "Insights", href: "/insights", desc: "Analysis and commentary on UAM market developments" },
      { label: "Updates", href: "/updates", desc: "Platform releases, scoring changes, and data additions" },
      { label: "Terminology", href: "/terminology", desc: "Source-traced definitions for vertical flight infrastructure" },
    ],
  },
  {
    label: "Company",
    children: [
      { label: "About", href: "/about", desc: "The team, the mission, and how we rate the sky" },
      { label: "Contact", href: "/contact", desc: "Data licenses, reports, partnerships, and inquiries" },
    ],
  },
];

// ── Styles ──
const topLinkStyle: React.CSSProperties = {
  color: "#888",
  fontSize: 11,
  letterSpacing: "0.06em",
  textDecoration: "none",
  padding: "8px 14px",
  transition: "color 0.15s",
  borderRadius: 4,
  cursor: "pointer",
  position: "relative",
  whiteSpace: "nowrap",
};

export default function NavClient({
  isAuthed,
  theme = "dark",
}: {
  isAuthed: boolean;
  theme?: "dark" | "light";
}) {
  const isLight = theme === "light";
  const linkColor = isLight ? "#525866" : "#888";
  const linkActiveColor = isLight ? "#0a2540" : "#fff";
  const linkHoverColor = isLight ? "#0a2540" : "#ccc";
  const ctaBg = "#5B8DB8";
  const ctaFg = isLight ? "#ffffff" : "#050508";
  const dropdownBg = isLight ? "rgba(255,255,255,0.98)" : "rgba(10,10,18,0.98)";
  const dropdownBorder = isLight ? "1px solid rgba(10,37,64,0.08)" : "1px solid rgba(255,255,255,0.08)";
  const dropdownShadow = isLight ? "0 10px 40px rgba(10,37,64,0.08)" : "0 12px 40px rgba(0,0,0,0.5)";
  const dropdownHoverBg = isLight ? "rgba(91,141,184,0.06)" : "rgba(255,255,255,0.04)";
  const childLabel = isLight ? "#0a2540" : "#ccc";
  const childDesc = isLight ? "#6b7280" : "#555";
  const mobileMenuBg = isLight ? "rgba(255,255,255,0.98)" : "rgba(5,5,8,0.98)";
  const mobileMenuDivider = isLight ? "1px solid rgba(10,37,64,0.06)" : "1px solid rgba(255,255,255,0.04)";
  const mobileItemColor = isLight ? "#334155" : "#aaa";
  const mobileLabelColor = isLight ? "#8792a2" : "#555";
  const signinColor = isLight ? "#6b7280" : "#666";

  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  // Ref — not state — so closures always see the latest handle. Avoids
  // the rapid-hover race where setHoverTimeout(state) + stale closure
  // could leak a pending close timer past a new open.
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close everything on route change
  useEffect(() => {
    setMobileOpen(false);
    setOpenDropdown(null);
  }, [pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        setOpenDropdown(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const isActive = useCallback(
    (href: string) => {
      if (href === "/") return pathname === "/";
      return pathname === href || pathname.startsWith(href + "/");
    },
    [pathname]
  );

  const isGroupActive = useCallback(
    (item: NavItem) => {
      if (item.href) return isActive(item.href);
      return item.children?.some((c) => isActive(c.href)) ?? false;
    },
    [isActive]
  );

  const handleMouseEnter = (label: string) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setOpenDropdown(label);
  };

  const handleMouseLeave = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setOpenDropdown(null);
      closeTimerRef.current = null;
    }, 180);
  };

  // Clear pending timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  return (
    <>
      {/* ── Desktop nav ── */}
      <div className="nav-desktop" style={{ display: "flex", alignItems: "center", gap: 2 }}>
        {NAV_ITEMS.map((item) => (
          <div
            key={item.label}
            style={{ position: "relative" }}
            onMouseEnter={() => item.children && handleMouseEnter(item.label)}
            onMouseLeave={() => item.children && handleMouseLeave()}
          >
            {item.href ? (
              <Link
                href={item.href}
                className="nav-link"
                style={{
                  ...topLinkStyle,
                  color: isGroupActive(item) ? linkActiveColor : linkColor,
                }}
              >
                {item.label}
              </Link>
            ) : (
              <span
                className="nav-link"
                style={{
                  ...topLinkStyle,
                  color: isGroupActive(item) ? linkActiveColor : openDropdown === item.label ? linkHoverColor : linkColor,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {item.label}
                <svg width="8" height="5" viewBox="0 0 8 5" fill="none" style={{ opacity: 0.5 }}>
                  <path d="M1 1L4 4L7 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}

            {/* Dropdown */}
            {item.children && openDropdown === item.label && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  paddingTop: 8,
                  zIndex: 300,
                }}
              >
                <div
                  style={{
                    background: dropdownBg,
                    backdropFilter: "blur(16px)",
                    border: dropdownBorder,
                    borderRadius: 10,
                    padding: "8px 0",
                    minWidth: 280,
                    boxShadow: dropdownShadow,
                  }}
                >
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      style={{
                        display: "block",
                        padding: "10px 20px",
                        textDecoration: "none",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = dropdownHoverBg)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <div style={{
                        fontSize: 12,
                        color: isActive(child.href) ? linkActiveColor : childLabel,
                        fontWeight: isActive(child.href) ? 600 : 400,
                        marginBottom: 2,
                      }}>
                        {child.label}
                      </div>
                      <div style={{ fontSize: 10, color: childDesc, lineHeight: 1.4 }}>
                        {child.desc}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Auth actions */}
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
              background: ctaBg,
              color: ctaFg,
              borderRadius: 6,
              transition: "opacity 0.15s",
              marginLeft: 8,
              whiteSpace: "nowrap",
            }}
          >
            Dashboard
          </Link>
        ) : (
          <>
            <Link
              href="/contact"
              className="nav-cta"
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textDecoration: "none",
                padding: "8px 20px",
                background: ctaBg,
                color: ctaFg,
                borderRadius: 6,
                transition: "opacity 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              Talk to Us
            </Link>
          </>
        )}
      </div>

      {/* ── Mobile hamburger ── */}
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
          color: linkColor,
          fontSize: 20,
        }}
      >
        {mobileOpen ? "\u2715" : "\u2630"}
      </button>

      {/* ── Mobile menu ── */}
      {mobileOpen && createPortal(
        <div
          className="nav-mobile-menu"
          style={{
            position: "fixed",
            top: 64,
            left: 0,
            right: 0,
            bottom: 0,
            background: mobileMenuBg,
            backdropFilter: "blur(16px)",
            zIndex: 10000,
            padding: "24px 20px",
            overflowY: "auto",
          }}
        >
          {NAV_ITEMS.map((item) => (
            <div key={item.label} style={{ marginBottom: 16 }}>
              {item.href ? (
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: "block",
                    padding: "10px 0",
                    color: isGroupActive(item) ? linkActiveColor : mobileItemColor,
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: "none",
                    borderBottom: mobileMenuDivider,
                  }}
                >
                  {item.label}
                </Link>
              ) : (
                <>
                  <div style={{
                    fontSize: 9,
                    letterSpacing: 2,
                    color: mobileLabelColor,
                    padding: "4px 0 8px",
                    fontWeight: 600,
                  }}>
                    {item.label.toUpperCase()}
                  </div>
                  {item.children?.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => setMobileOpen(false)}
                      style={{
                        display: "block",
                        padding: "10px 0 10px 12px",
                        color: isActive(child.href) ? linkActiveColor : mobileItemColor,
                        fontSize: 13,
                        textDecoration: "none",
                        borderBottom: mobileMenuDivider,
                      }}
                    >
                      {child.label}
                    </Link>
                  ))}
                </>
              )}
            </div>
          ))}

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
            {isAuthed ? (
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "14px 0",
                  background: "#5B8DB8",
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
                  href="/contact"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "14px 0",
                    background: "#5B8DB8",
                    color: "#050508",
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textDecoration: "none",
                    borderRadius: 6,
                  }}
                >
                  Talk to Us
                </Link>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
