import Link from "next/link";
import { auth } from "@/auth";

const linkStyle: React.CSSProperties = {
  color: "#888",
  fontSize: 11,
  letterSpacing: "0.06em",
  textDecoration: "none",
  padding: "8px 14px",
  transition: "all 0.15s",
};

const SOLUTIONS = [
  { label: "Infrastructure Developers", href: "/#infrastructure-developers" },
  { label: "Operators & OEMs", href: "/#operators" },
  { label: "Investors & Analysts", href: "/#investors" },
  { label: "City Planners & Policy", href: "/#city-planners" },
  { label: "Research & Academic", href: "/#research" },
  { label: "Press & Media", href: "/#press" },
];

export default async function SiteNav() {
  const session = await auth();
  const isAuthed = !!session?.user;

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(5,5,8,0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "0 20px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src="/images/logo/airindex-wordmark.svg"
            alt="AirIndex"
            style={{ height: 28 }}
          />
        </Link>
        <div className="landing-nav-buttons" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {/* Solutions dropdown */}
          <div className="nav-dropdown-wrapper nav-hide-mobile">
            <span
              style={{
                ...linkStyle,
                cursor: "default",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Solutions
              <span style={{ fontSize: 8, opacity: 0.5 }}>&#9662;</span>
            </span>
            <div className="nav-dropdown">
              {SOLUTIONS.map((item) => (
                <Link key={item.label} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <Link href="/methodology" className="nav-hide-mobile" style={linkStyle}>
            Data
          </Link>
          <Link href="/feed" className="nav-hide-mobile" style={linkStyle}>
            Intel
          </Link>
          <Link href="/api" className="nav-hide-mobile" style={linkStyle}>
            API
          </Link>
          <Link href="/pricing" className="nav-hide-mobile" style={linkStyle}>
            Pricing
          </Link>

          {isAuthed ? (
            <Link
              href="/dashboard"
              style={{
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "'Inter', sans-serif",
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
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: "'Inter', sans-serif",
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
      </div>
    </nav>
  );
}
