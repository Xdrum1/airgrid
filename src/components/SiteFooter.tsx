import Link from "next/link";

const footerLinkStyle: React.CSSProperties = {
  color: "#888",
  fontSize: 10,
  letterSpacing: 1,
  textDecoration: "none",
};

export default function SiteFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "40px 20px",
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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src="/images/logo/airindex-wordmark.svg"
            alt="AirIndex"
            style={{ height: 18, opacity: 0.7 }}
          />
        </div>
        <div className="landing-footer-links" style={{ display: "flex", gap: 24 }}>
          <Link href="/about" style={footerLinkStyle}>ABOUT</Link>
          <Link href="/methodology" style={footerLinkStyle}>METHODOLOGY</Link>
          <Link href="/feed" style={footerLinkStyle}>INTEL</Link>
          <Link href="/api" style={footerLinkStyle}>API</Link>
          <Link href="/pricing" style={footerLinkStyle}>PRICING</Link>
          <Link href="/contact" style={footerLinkStyle}>CONTACT</Link>
          <a
            href="https://x.com/AirIndexHQ"
            target="_blank"
            rel="noopener noreferrer"
            style={footerLinkStyle}
          >
            X (TWITTER)
          </a>
          <a
            href="https://www.linkedin.com/company/AirIndexHQ"
            target="_blank"
            rel="noopener noreferrer"
            style={footerLinkStyle}
          >
            LINKEDIN
          </a>
          <Link href="/terms" style={footerLinkStyle}>TERMS</Link>
          <Link href="/privacy" style={footerLinkStyle}>PRIVACY</Link>
        </div>
        <div style={{ color: "#999", fontSize: 9, letterSpacing: 1 }}>
          &copy; {new Date().getFullYear()} AIRINDEX
        </div>
      </div>
    </footer>
  );
}
