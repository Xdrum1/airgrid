import type { Metadata } from "next";
import Link from "next/link";
import TrackPageView from "@/components/TrackPageView";

export const metadata: Metadata = {
  title: "Privacy Policy — AirIndex",
  description:
    "Privacy Policy for AirIndex.io, operated by Vertical Data Group, LLC. Effective March 6, 2026.",
};

const S = {
  h2: {
    fontFamily: "var(--font-syne), sans-serif",
    fontWeight: 700 as const,
    fontSize: 20,
    color: "#fff",
    marginTop: 48,
    marginBottom: 16,
  },
  h3: {
    fontFamily: "var(--font-syne), sans-serif",
    fontWeight: 600 as const,
    fontSize: 15,
    color: "#ddd",
    marginTop: 28,
    marginBottom: 10,
  },
  p: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    lineHeight: 1.8,
    marginBottom: 14,
  },
  ul: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    lineHeight: 1.8,
    paddingLeft: 20,
    marginBottom: 14,
  },
  link: {
    color: "#00d4ff",
    textDecoration: "none" as const,
  },
  strong: {
    color: "#ccc",
  },
  code: {
    color: "#00d4ff",
    fontSize: 12,
  },
  callout: {
    background: "rgba(0,212,255,0.04)",
    border: "1px solid rgba(0,212,255,0.12)",
    borderRadius: 8,
    padding: "16px 20px",
    marginBottom: 24,
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    lineHeight: 1.8,
  },
  tableWrap: {
    overflowX: "auto" as const,
    marginBottom: 20,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: 12,
    lineHeight: 1.7,
  },
  th: {
    textAlign: "left" as const,
    padding: "10px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    color: "#aaa",
    fontWeight: 600 as const,
    fontSize: 11,
    letterSpacing: "0.04em",
  },
  td: {
    padding: "10px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.7)",
    verticalAlign: "top" as const,
  },
};

export default function PrivacyPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050508",
        color: "#fff",
        fontFamily: "var(--font-space-mono), monospace",
      }}
    >
      <TrackPageView page="privacy" />

      {/* Nav */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <Link
          href="/"
          style={{
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: "0.05em",
            color: "#fff",
            textDecoration: "none",
            fontFamily: "var(--font-syne), sans-serif",
          }}
        >
          AIRINDEX
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 24, fontSize: 14, color: "rgba(255,255,255,0.6)" }}>
          <Link href="/about" style={{ color: "inherit", textDecoration: "none" }}>About</Link>
          <Link href="/methodology" style={{ color: "inherit", textDecoration: "none" }}>Methodology</Link>
          <Link href="/dashboard" style={{ color: "inherit", textDecoration: "none" }}>Dashboard</Link>
        </div>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
        <p style={{ fontSize: 10, letterSpacing: "0.2em", color: "#00d4ff", textTransform: "uppercase" as const, marginBottom: 16 }}>
          Legal
        </p>

        <h1
          style={{
            fontFamily: "var(--font-syne), sans-serif",
            fontWeight: 700,
            fontSize: 28,
            color: "#fff",
            marginBottom: 8,
          }}
        >
          Privacy Policy
        </h1>

        <p style={{ color: "#888", fontSize: 12, marginBottom: 12 }}>
          Effective Date: March 6, 2026 &middot; Last Updated: March 6, 2026
        </p>
        <p style={{ color: "#666", fontSize: 11, marginBottom: 40 }}>
          Vertical Data Group, LLC &middot; airindex.io
        </p>

        {/* Privacy First callout */}
        <div style={S.callout}>
          <strong style={{ color: "#00d4ff", display: "block", marginBottom: 8 }}>Privacy First — What This Means for You</strong>
          AirIndex is built on a privacy-respecting technology stack. We do not use Google Analytics,
          Facebook Pixel, or invasive tracking cookies. We use Plausible Analytics — a cookieless,
          GDPR-compliant analytics tool that does not track you across websites or build personal profiles.
          We do not sell your data. We do not share it with advertisers. This policy tells you exactly what
          we do collect and why.
        </div>

        <p style={S.p}>
          This Privacy Policy describes how Vertical Data Group, LLC (&ldquo;Company,&rdquo; &ldquo;we,&rdquo;
          &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects, uses, stores, discloses, and protects information about
          you when you access or use the AirIndex platform, website, and related services (collectively, the
          &ldquo;Service&rdquo;) at airindex.io.
        </p>
        <p style={S.p}>
          By using the Service, you agree to the practices described in this Privacy Policy. If you do not agree,
          please do not use the Service.
        </p>

        {/* Section 1 */}
        <h2 style={S.h2}>1. Information We Collect</h2>
        <p style={S.p}>
          We collect information in three ways: information you provide directly, information collected automatically
          when you use the Service, and information received from third-party services that power the platform.
        </p>

        <h3 style={S.h3}>1.1 Information You Provide Directly</h3>
        <ul style={S.ul}>
          <li><strong style={S.strong}>Account information</strong> — name and email address when you create an account</li>
          <li><strong style={S.strong}>Payment information</strong> — billing name, billing address, and last 4 digits of your payment card. Your full card number is entered directly into Stripe&apos;s secure form and is never transmitted to or stored on our servers</li>
          <li><strong style={S.strong}>Alert and subscription preferences</strong> — the markets and corridors you choose to monitor, and how you want to be notified</li>
          <li><strong style={S.strong}>Communications</strong> — any messages you send to <a href="mailto:legal@airindex.io" style={S.link}>legal@airindex.io</a></li>
        </ul>

        <h3 style={S.h3}>1.2 Information Collected Automatically</h3>
        <ul style={S.ul}>
          <li><strong style={S.strong}>Usage data</strong> — pages visited, features used, dashboard interactions, session timing, and navigation patterns. Collected via Plausible Analytics (see Section 5)</li>
          <li><strong style={S.strong}>Technical data</strong> — browser type, operating system, screen resolution, country-level location (derived from IP address, not stored), referring URL. Collected via Plausible Analytics in aggregated, non-personal form</li>
          <li><strong style={S.strong}>API usage data</strong> — API key identifiers, endpoint requests, and rate limit consumption for Institutional and Enterprise subscribers</li>
          <li><strong style={S.strong}>Watchlist data</strong> — the markets you save to your watchlist are stored in your browser&apos;s localStorage on your own device. This data is not transmitted to our servers unless you are logged in and sync is enabled</li>
        </ul>

        <h3 style={S.h3}>1.3 Information from Third-Party Services</h3>
        <p style={S.p}>
          The platform uses the following third-party services that may process technical data as part of
          delivering the Service. See Section 5 for full details:
        </p>
        <ul style={S.ul}>
          <li><strong style={S.strong}>Mapbox</strong> — stores an anonymous random device UUID in your browser&apos;s localStorage to support map telemetry. This UUID is not linked to your account or identity</li>
          <li><strong style={S.strong}>Google Fonts</strong> — font files are loaded from Google&apos;s servers, which logs the request (your IP address and browser type) as part of standard server operation</li>
          <li><strong style={S.strong}>Sentry</strong> — error tracking service that captures crash reports and exceptions. May include browser type, OS, page URL, and error context at the time of a crash</li>
          <li><strong style={S.strong}>Stripe</strong> — processes payment card data directly when you subscribe to a paid plan</li>
        </ul>
        <p style={S.p}>
          We do not collect: government ID numbers, social security numbers, health data, biometric data,
          racial or ethnic origin, religious beliefs, or precise geolocation.
        </p>

        {/* Section 2 */}
        <h2 style={S.h2}>2. How We Use Your Information</h2>
        <p style={S.p}>We use the information we collect solely for the following purposes:</p>
        <ul style={S.ul}>
          <li><strong style={S.strong}>Provide and operate the Service</strong> — delivering readiness scores, corridor data, regulatory filings, operator tracking, alerts, and all features associated with your subscription tier</li>
          <li><strong style={S.strong}>Process transactions</strong> — subscription payments, renewals, upgrades, and cancellations via Stripe</li>
          <li><strong style={S.strong}>Send service communications</strong> — account confirmations, payment receipts, magic link sign-ins, score change alerts you have opted into, and the monthly market report for eligible subscribers</li>
          <li><strong style={S.strong}>Send marketing communications</strong> — only with your explicit consent; unsubscribe at any time via the link in any marketing email or by emailing <a href="mailto:legal@airindex.io" style={S.link}>legal@airindex.io</a></li>
          <li><strong style={S.strong}>Improve the platform</strong> — using aggregated, anonymized Plausible Analytics data to understand which features are used most and where the experience can be improved</li>
          <li><strong style={S.strong}>Security and fraud prevention</strong> — monitoring for unauthorized access or abuse</li>
          <li><strong style={S.strong}>Legal compliance</strong> — responding to lawful requests from courts or regulators</li>
        </ul>
        <p style={S.p}>
          We do not sell your personal information. We do not share your information with advertisers. We do not
          use your personal information to train AI or machine learning models without your separate explicit consent.
        </p>

        {/* Section 3 */}
        <h2 style={S.h2}>3. Cookies, Local Storage, and Tracking Technologies</h2>

        <h3 style={S.h3}>No Tracking Cookies</h3>
        <p style={S.p}>
          AirIndex does not set any tracking cookies. The site sets zero cookies. We use Plausible Analytics,
          which is specifically designed to operate without cookies and without collecting personal data.
        </p>

        <h3 style={S.h3}>3.1 Cookies</h3>
        <p style={S.p}>
          We do not set first-party cookies. Stripe may set cookies during the checkout flow on their hosted
          payment pages, governed by Stripe&apos;s own privacy policy.
        </p>

        <h3 style={S.h3}>3.2 Browser Local Storage</h3>
        <p style={S.p}>
          We use your browser&apos;s localStorage (a standard web technology that stores data on your device,
          not on our servers) for the following purposes:
        </p>

        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Key</th>
                <th style={S.th}>Purpose</th>
                <th style={S.th}>Can You Clear It?</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={S.td}><code style={S.code}>airindex-watchlist</code></td>
                <td style={S.td}>Saves the markets you&apos;ve added to your watchlist so your selections persist between sessions</td>
                <td style={S.td}>Yes — clear via your browser&apos;s &ldquo;Clear site data&rdquo; setting. Watchlist will reset.</td>
              </tr>
              <tr>
                <td style={S.td}><code style={S.code}>mapbox.eventData.uuid</code></td>
                <td style={S.td}>Anonymous random device identifier used by Mapbox for map tile telemetry. Not linked to your account or identity</td>
                <td style={S.td}>Yes — clear via browser storage settings. A new anonymous UUID will be generated on next map load.</td>
              </tr>
              <tr>
                <td style={S.td}><code style={S.code}>mapbox.eventData.uuidTimestamp</code></td>
                <td style={S.td}>Records when the Mapbox UUID was created</td>
                <td style={S.td}>Yes — cleared alongside the Mapbox UUID</td>
              </tr>
              <tr>
                <td style={S.td}><code style={S.code}>plausible_ignore</code></td>
                <td style={S.td}>Opt-out flag: if set to &apos;true&apos;, Plausible Analytics will not count your page views. Useful for site administrators</td>
                <td style={S.td}>Yes — delete this key to re-enable analytics counting of your visits</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 4 */}
        <h2 style={S.h2}>4. Data Sharing and Disclosure</h2>
        <p style={S.p}>
          We do not sell, rent, or trade your personal information to anyone, for any reason, ever.
        </p>
        <p style={S.p}>We may share limited information in the following circumstances:</p>
        <ul style={S.ul}>
          <li><strong style={S.strong}>Service providers</strong> — with the third-party platforms listed in Section 5, solely to deliver the Service</li>
          <li><strong style={S.strong}>Legal requirements</strong> — when required by law, court order, subpoena, or other legal process</li>
          <li><strong style={S.strong}>Safety</strong> — to protect the rights, safety, or property of our users, the Company, or the public</li>
          <li><strong style={S.strong}>Business transfers</strong> — in connection with a merger, acquisition, or sale of company assets. You will be notified via email before your data is transferred or becomes subject to a different privacy policy</li>
        </ul>

        {/* Section 5 */}
        <h2 style={S.h2}>5. Third-Party Services</h2>
        <p style={S.p}>The Service relies on the following third-party platforms:</p>

        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Service</th>
                <th style={S.th}>Purpose</th>
                <th style={S.th}>Data Shared</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={S.td}><strong style={S.strong}>Plausible Analytics</strong></td>
                <td style={S.td}>Privacy-focused website analytics</td>
                <td style={S.td}>Aggregated page views, referrers, country (no IP stored, no cookies)</td>
              </tr>
              <tr>
                <td style={S.td}><strong style={S.strong}>Mapbox</strong></td>
                <td style={S.td}>Interactive map rendering</td>
                <td style={S.td}>Anonymous UUID for telemetry; map tile requests</td>
              </tr>
              <tr>
                <td style={S.td}><strong style={S.strong}>Google Fonts</strong></td>
                <td style={S.td}>Typography</td>
                <td style={S.td}>Standard HTTP request (IP, browser type)</td>
              </tr>
              <tr>
                <td style={S.td}><strong style={S.strong}>Stripe</strong></td>
                <td style={S.td}>Payment processing</td>
                <td style={S.td}>Billing name, address, card (entered directly into Stripe)</td>
              </tr>
              <tr>
                <td style={S.td}><strong style={S.strong}>Amazon SES</strong></td>
                <td style={S.td}>Transactional email</td>
                <td style={S.td}>Email address, message content</td>
              </tr>
              <tr>
                <td style={S.td}><strong style={S.strong}>Amazon RDS</strong></td>
                <td style={S.td}>Database hosting</td>
                <td style={S.td}>Account data, subscriptions (encrypted at rest)</td>
              </tr>
              <tr>
                <td style={S.td}><strong style={S.strong}>Sentry</strong></td>
                <td style={S.td}>Error tracking</td>
                <td style={S.td}>Browser, OS, page URL, error context at time of crash</td>
              </tr>
              <tr>
                <td style={S.td}><strong style={S.strong}>Upstash</strong></td>
                <td style={S.td}>Rate limiting</td>
                <td style={S.td}>Hashed IP or API key identifier, request counts</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={S.p}>
          Each service processes data under its own privacy policy. We select services that align with our
          privacy-first approach and minimize unnecessary data collection.
        </p>

        {/* Section 6 */}
        <h2 style={S.h2}>6. Data Retention</h2>

        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Data Type</th>
                <th style={S.th}>Retention Period</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={S.td}>Account information (email, name)</td>
                <td style={S.td}>Duration of account + 30 days after deletion request</td>
              </tr>
              <tr>
                <td style={S.td}>Billing and payment records</td>
                <td style={S.td}>7 years (US tax and accounting requirements)</td>
              </tr>
              <tr>
                <td style={S.td}>Plausible Analytics data</td>
                <td style={S.td}>Retained indefinitely in aggregated, non-personal form</td>
              </tr>
              <tr>
                <td style={S.td}>Server logs (IP addresses, access logs)</td>
                <td style={S.td}>90 days</td>
              </tr>
              <tr>
                <td style={S.td}>Sentry error reports</td>
                <td style={S.td}>90 days</td>
              </tr>
              <tr>
                <td style={S.td}>Email correspondence</td>
                <td style={S.td}>3 years from last communication</td>
              </tr>
              <tr>
                <td style={S.td}>Alert subscription preferences</td>
                <td style={S.td}>Duration of subscription; deleted within 30 days of cancellation</td>
              </tr>
              <tr>
                <td style={S.td}>Inactive free accounts</td>
                <td style={S.td}>Deleted after 24 months of inactivity with 30 days&apos; email notice</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 7 */}
        <h2 style={S.h2}>7. Data Security</h2>
        <p style={S.p}>
          We implement technical and organizational measures appropriate to the sensitivity and volume of data we handle:
        </p>
        <ul style={S.ul}>
          <li>All data in transit is encrypted using HTTPS/TLS</li>
          <li>Payment card data is handled entirely by Stripe and never transmitted to or stored on our servers</li>
          <li>Access to personal data within the Company is limited to what is necessary to operate the Service</li>
          <li>We use passwordless authentication via secure magic links — no passwords are created or stored</li>
          <li>We use a privacy-first analytics tool (Plausible) that was specifically designed to avoid collecting personal data</li>
        </ul>
        <p style={S.p}>
          No system is perfectly secure. In the event of a data breach materially affecting your rights,
          we will notify you as required by applicable law.
        </p>

        {/* Section 8 */}
        <h2 style={S.h2}>8. Your Rights and Choices</h2>
        <p style={S.p}>We honor the following rights for all users regardless of location:</p>

        <h3 style={S.h3}>Access</h3>
        <p style={S.p}>
          Request a copy of the personal information we hold about you by emailing{" "}
          <a href="mailto:legal@airindex.io" style={S.link}>legal@airindex.io</a> with the subject
          &ldquo;Data Access Request.&rdquo;
        </p>

        <h3 style={S.h3}>Correction</h3>
        <p style={S.p}>
          Update your account information at any time through your account settings or by contacting us.
        </p>

        <h3 style={S.h3}>Deletion</h3>
        <p style={S.p}>
          Request deletion of your account and personal data. We honor deletion requests within 30 days,
          subject to legal retention requirements (e.g., billing records). Email{" "}
          <a href="mailto:legal@airindex.io" style={S.link}>legal@airindex.io</a> with &ldquo;Data Deletion
          Request&rdquo; in the subject.
        </p>

        <h3 style={S.h3}>Opt-Out of Marketing</h3>
        <p style={S.p}>
          Click the unsubscribe link in any marketing email, or email{" "}
          <a href="mailto:legal@airindex.io" style={S.link}>legal@airindex.io</a>. You will continue to receive
          transactional service emails (receipts, score alerts you subscribed to) until you cancel your account.
        </p>

        <h3 style={S.h3}>Plausible Analytics Opt-Out</h3>
        <p style={S.p}>
          To exclude your visits from Plausible Analytics, set the key <code style={S.code}>plausible_ignore</code> to
          &ldquo;true&rdquo; in your browser&apos;s localStorage for airindex.io.
        </p>

        <h3 style={S.h3}>Mapbox UUID Reset</h3>
        <p style={S.p}>
          Delete the <code style={S.code}>mapbox.eventData.uuid</code> and{" "}
          <code style={S.code}>mapbox.eventData.uuidTimestamp</code> keys from localStorage to reset your
          anonymous Mapbox identifier. A new random UUID will be generated on your next visit.
        </p>

        <h3 style={S.h3}>California Residents (CCPA/CPRA)</h3>
        <p style={S.p}>
          You have the right to: (1) know what personal information we collect and how it is used; (2) request
          deletion; (3) opt out of sale (we do not sell data); and (4) non-discrimination for exercising rights.
          To exercise these rights, email <a href="mailto:legal@airindex.io" style={S.link}>legal@airindex.io</a>.
          We will respond within 45 days.
        </p>

        <h3 style={S.h3}>EEA / UK Residents (GDPR / UK GDPR)</h3>
        <p style={S.p}>
          You have rights to access, correct, erase, restrict, and port your data, and to object to processing.
          Our legal bases for processing are: contract performance (account and subscription), legitimate interests
          (security, analytics), and consent (marketing). You may lodge a complaint with your local supervisory
          authority. Contact: <a href="mailto:legal@airindex.io" style={S.link}>legal@airindex.io</a>.
        </p>

        {/* Section 9 */}
        <h2 style={S.h2}>9. Children&apos;s Privacy</h2>
        <p style={S.p}>
          The Service is not directed to individuals under 18. We do not knowingly collect personal information
          from minors. If you believe a minor has provided us data, contact{" "}
          <a href="mailto:legal@airindex.io" style={S.link}>legal@airindex.io</a> and we will promptly delete it.
        </p>

        {/* Section 10 */}
        <h2 style={S.h2}>10. International Data Transfers</h2>
        <p style={S.p}>
          Vertical Data Group, LLC is based in the United States. If you access the Service from outside the US,
          your information may be transferred to and processed in the United States. Plausible Analytics is hosted
          in the EU (Germany) and does not transfer analytics data to the US. Stripe and Mapbox operate globally.
          By using the Service, you consent to transfer of your personal information to the US consistent with this policy.
        </p>

        {/* Section 11 */}
        <h2 style={S.h2}>11. Changes to This Privacy Policy</h2>
        <p style={S.p}>
          We will update this Privacy Policy when our practices change. For material changes, we will: (1) update
          the Last Updated date, (2) email registered account holders at least 30 days before changes take effect,
          and (3) post a notice on the Service. Continued use after the effective date constitutes acceptance.
        </p>

        {/* Section 12 */}
        <h2 style={S.h2}>12. Contact</h2>
        <p style={S.p}>
          Questions, requests, or concerns about this Privacy Policy:
        </p>

        <div style={S.tableWrap}>
          <table style={S.table}>
            <tbody>
              <tr>
                <td style={{ ...S.td, color: "#aaa", width: 160 }}>Email</td>
                <td style={S.td}><a href="mailto:legal@airindex.io" style={S.link}>legal@airindex.io</a></td>
              </tr>
              <tr>
                <td style={{ ...S.td, color: "#aaa" }}>Subject lines</td>
                <td style={S.td}>&ldquo;Privacy Policy Inquiry&rdquo; / &ldquo;Data Access Request&rdquo; / &ldquo;Data Deletion Request&rdquo;</td>
              </tr>
              <tr>
                <td style={{ ...S.td, color: "#aaa" }}>Mail</td>
                <td style={S.td}>Vertical Data Group, LLC &middot; PO Box 31172 &middot; Myrtle Beach, SC 29588</td>
              </tr>
              <tr>
                <td style={{ ...S.td, color: "#aaa" }}>Company</td>
                <td style={S.td}>Vertical Data Group, LLC</td>
              </tr>
              <tr>
                <td style={{ ...S.td, color: "#aaa" }}>Website</td>
                <td style={S.td}><a href="https://airindex.io" style={S.link}>airindex.io</a></td>
              </tr>
              <tr>
                <td style={{ ...S.td, color: "#aaa" }}>Response time</td>
                <td style={S.td}>5 business days (45 days for formal CCPA/GDPR requests)</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.1)",
            marginTop: 64,
            paddingTop: 24,
            fontSize: 9,
            color: "rgba(255,255,255,0.4)",
            letterSpacing: 1,
          }}
        >
          <p>
            &copy; 2026 AIRINDEX &middot;{" "}
            <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>HOME</Link> &middot;{" "}
            <Link href="/about" style={{ color: "inherit", textDecoration: "none" }}>ABOUT</Link> &middot;{" "}
            <Link href="/dashboard" style={{ color: "inherit", textDecoration: "none" }}>DASHBOARD</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
