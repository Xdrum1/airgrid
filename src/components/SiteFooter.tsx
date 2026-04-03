import Link from "next/link";

const footerLinkStyle: React.CSSProperties = {
  color: "#888",
  fontSize: 10,
  letterSpacing: 1,
  textDecoration: "none",
  whiteSpace: "nowrap",
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
          <Link href="/terminology" style={footerLinkStyle}>TERMINOLOGY</Link>
          <Link href="/use-cases" style={footerLinkStyle}>USE CASES</Link>
          <Link href="/insights" style={footerLinkStyle}>INSIGHTS</Link>
          <Link href="/api" style={footerLinkStyle}>API</Link>
          <Link href="/pricing" style={footerLinkStyle}>PRICING</Link>
          <Link href="/updates" style={footerLinkStyle}>UPDATES</Link>
          <Link href="/reports/march-2026" style={footerLinkStyle}>REPORTS</Link>
          <Link href="/contact" style={footerLinkStyle}>CONTACT</Link>
          <a
            href="https://x.com/AirIndexHQ"
            target="_blank"
            rel="noopener noreferrer"
            style={footerLinkStyle}
          >
            X
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
        <div style={{ color: "#555", fontSize: 9, letterSpacing: 1 }}>
          &copy; {new Date().getFullYear()} AIRINDEX &middot;{" "}
          <a
            href="https://verticaldatagroup.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#555", textDecoration: "none" }}
          >
            A Vertical Data Group product
          </a>
        </div>
      </div>
    </footer>
  );
}
