import Link from "next/link";

const legalLinkStyle: React.CSSProperties = {
  color: "#555",
  fontSize: 10,
  letterSpacing: 1,
  textDecoration: "none",
  whiteSpace: "nowrap",
};

const socialLinkStyle: React.CSSProperties = {
  color: "#555",
  fontSize: 10,
  letterSpacing: 1,
  textDecoration: "none",
  whiteSpace: "nowrap",
  transition: "color 0.15s",
};

export default function SiteFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
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
          <img
            src="/images/logo/airindex-wordmark.svg"
            alt="AirIndex"
            style={{ height: 16, opacity: 0.5 }}
          />
          <span style={{ color: "#333", fontSize: 10 }}>|</span>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <span style={{ color: "#444", fontSize: 9, letterSpacing: 1, whiteSpace: "nowrap" }}>
              &copy; {new Date().getFullYear()} Vertical Data Group, LLC
            </span>
            <Link href="/terms" style={legalLinkStyle}>Terms</Link>
            <Link href="/privacy" style={legalLinkStyle}>Privacy</Link>
          </div>
        </div>

        {/* Right — Social */}
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
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
          <a
            href="mailto:info@airindex.io"
            style={socialLinkStyle}
          >
            info@airindex.io
          </a>
        </div>
      </div>
    </footer>
  );
}
