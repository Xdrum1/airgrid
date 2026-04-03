"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
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
    label: "Solutions",
    children: [
      { label: "Dashboard", href: "/dashboard", desc: "Live market readiness scores across 21 US markets" },
      { label: "API", href: "/api", desc: "Programmatic access to market scores and regulatory data" },
      { label: "Market Reports", href: "/reports/march-2026", desc: "Monthly intelligence reports with full analysis" },
      { label: "Briefings", href: "/briefings", desc: "Custom market intelligence packages for your use case" },
      { label: "Heliport Audit", href: "/reports/audit/SC", desc: "State-level heliport compliance screening" },
    ],
  },
  {
    label: "Intelligence",
    children: [
      { label: "Methodology", href: "/methodology", desc: "Published 7-factor scoring model with full transparency" },
      { label: "Terminology", href: "/terminology", desc: "Source-traced definitions for vertical flight infrastructure" },
      { label: "Insights", href: "/insights", desc: "Analysis and commentary on UAM market developments" },
      { label: "Updates", href: "/updates", desc: "Platform releases, scoring changes, and data additions" },
    ],
  },
  {
    label: "Use Cases",
    href: "/use-cases",
  },
  {
    label: "About",
    children: [
      { label: "About AirIndex", href: "/about", desc: "Who we are and how we rate the sky" },
      { label: "Contact", href: "/contact", desc: "Data licenses, reports, partnerships, and inquiries" },
      { label: "Pricing", href: "/pricing", desc: "Enterprise intelligence, scoped per engagement" },
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

export default function NavClient({ isAuthed }: { isAuthed: boolean }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

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
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setOpenDropdown(label);
  };

  const handleMouseLeave = () => {
    const t = setTimeout(() => setOpenDropdown(null), 150);
    setHoverTimeout(t);
  };

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
                  color: isGroupActive(item) ? "#fff" : "#888",
                }}
              >
                {item.label}
              </Link>
            ) : (
              <span
                className="nav-link"
                style={{
                  ...topLinkStyle,
                  color: isGroupActive(item) ? "#fff" : openDropdown === item.label ? "#ccc" : "#888",
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
                    background: "rgba(10,10,18,0.98)",
                    backdropFilter: "blur(16px)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    padding: "8px 0",
                    minWidth: 280,
                    boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
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
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <div style={{
                        fontSize: 12,
                        color: isActive(child.href) ? "#fff" : "#ccc",
                        fontWeight: isActive(child.href) ? 600 : 400,
                        marginBottom: 2,
                      }}>
                        {child.label}
                      </div>
                      <div style={{ fontSize: 10, color: "#555", lineHeight: 1.4 }}>
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
              background: "#5B8DB8",
              color: "#050508",
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
              href="/login"
              className="nav-link"
              style={{
                color: "#555",
                fontSize: 10,
                letterSpacing: "0.04em",
                textDecoration: "none",
                padding: "8px 10px",
                transition: "color 0.15s",
                marginLeft: 4,
                whiteSpace: "nowrap",
              }}
            >
              Sign in
            </Link>
            <Link
              href="/contact"
              className="nav-cta"
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textDecoration: "none",
                padding: "8px 20px",
                background: "#5B8DB8",
                color: "#050508",
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
          color: "#888",
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
            background: "rgba(5,5,8,0.98)",
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
                    color: isGroupActive(item) ? "#fff" : "#aaa",
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: "none",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  {item.label}
                </Link>
              ) : (
                <>
                  <div style={{
                    fontSize: 9,
                    letterSpacing: 2,
                    color: "#555",
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
                        color: isActive(child.href) ? "#fff" : "#aaa",
                        fontSize: 13,
                        textDecoration: "none",
                        borderBottom: "1px solid rgba(255,255,255,0.03)",
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
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "10px 0",
                    color: "#666",
                    fontSize: 12,
                    textDecoration: "none",
                  }}
                >
                  Existing member? Sign in
                </Link>
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
