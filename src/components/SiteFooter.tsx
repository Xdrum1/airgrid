import Link from "next/link";

export default function SiteFooter({ theme = "dark" }: { theme?: "dark" | "light" } = {}) {
  const isLight = theme === "light";

  const borderColor = isLight ? "rgba(10,37,64,0.08)" : "rgba(255,255,255,0.06)";
  const muted = isLight ? "#6b7280" : "#555";
  const divider = isLight ? "#cbd5e1" : "#333";
  const dim = isLight ? "#8792a2" : "#444";

  const legalLinkStyle: React.CSSProperties = {
    color: muted,
    fontSize: 10,
    letterSpacing: 1,
    textDecoration: "none",
    whiteSpace: "nowrap",
  };

  const socialLinkStyle: React.CSSProperties = {
    color: muted,
    fontSize: 10,
    letterSpacing: 1,
    textDecoration: "none",
    whiteSpace: "nowrap",
    transition: "color 0.15s",
  };

  return (
    <footer
      style={{
        borderTop: `1px solid ${borderColor}`,
        padding: "32px 20px",
        maxWidth: 1120,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        {/* Left — Logo + legal */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={isLight ? "/images/logo/airindex-wordmark-light.svg" : "/images/logo/airindex-wordmark.svg"}
            alt="AirIndex"
            style={{ height: 16, opacity: isLight ? 0.8 : 0.5 }}
          />
          <span style={{ color: divider, fontSize: 10 }}>|</span>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <span style={{ color: dim, fontSize: 9, letterSpacing: 1, whiteSpace: "nowrap" }}>
              &copy; {new Date().getFullYear()} Vertical Data Group, LLC
            </span>
            <Link href="/terms" style={legalLinkStyle}>Terms</Link>
            <Link href="/privacy" style={legalLinkStyle}>Privacy</Link>
          </div>
        </div>

        {/* Right — Social + Client Portal */}
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Link href="/login" style={legalLinkStyle}>Client Portal</Link>
          <span style={{ color: divider, fontSize: 10 }}>|</span>
          <a
            href="https://x.com/AirIndexHQ"
            target="_blank"
            rel="noopener noreferrer"
            style={socialLinkStyle}
          >
            X
          </a>
          <a
            href="https://www.linkedin.com/company/AirIndexHQ"
            target="_blank"
            rel="noopener noreferrer"
            style={socialLinkStyle}
          >
            LinkedIn
          </a>
        </div>
      </div>
    </footer>
  );
}
