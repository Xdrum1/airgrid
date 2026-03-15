import type { Metadata } from "next";
import Link from "next/link";
import TrackPageView from "@/components/TrackPageView";

export const metadata: Metadata = {
  title: "Terms of Service — AirIndex",
  description:
    "Subscription Terms of Service for AirIndex.io, operated by Vertical Data Group, LLC. Effective March 6, 2026. Last updated March 15, 2026.",
};

const S = {
  h2: {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 700 as const,
    fontSize: 20,
    color: "#fff",
    marginTop: 48,
    marginBottom: 16,
  },
  p: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    lineHeight: 1.8,
    marginBottom: 14,
  },
  link: {
    color: "#00d4ff",
    textDecoration: "none" as const,
  },
  strong: {
    color: "#ccc",
  },
  caps: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    lineHeight: 1.8,
    marginBottom: 14,
    fontWeight: 600 as const,
  },
};

export default function TermsPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050508",
        color: "#fff",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <TrackPageView page="terms" />

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
            fontFamily: "'Inter', sans-serif",
            fontWeight: 700,
            fontSize: 28,
            color: "#fff",
            marginBottom: 8,
          }}
        >
          Subscription Terms of Service
        </h1>

        <p style={{ color: "#888", fontSize: 12, marginBottom: 12 }}>
          Effective Date: March 6, 2026 &middot; Last Updated: March 15, 2026
        </p>
        <p style={{ color: "#666", fontSize: 11, marginBottom: 40 }}>
          Vertical Data Group, LLC &middot; airindex.io
        </p>

        <p style={S.p}>
          These Subscription Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the AirIndex
          platform, website, API, and related services (collectively, the &ldquo;Service&rdquo;) provided by Vertical
          Data Group, LLC, a South Carolina limited liability company (&ldquo;Company,&rdquo; &ldquo;we,&rdquo;
          &ldquo;us,&rdquo; or &ldquo;our&rdquo;). By accessing or using the Service, you agree to be bound by these Terms.
        </p>

        {/* Section 1 */}
        <h2 style={S.h2}>1. The Service</h2>
        <p style={S.p}>
          AirIndex is a market intelligence platform that provides readiness ratings, rankings, regulatory data,
          corridor intelligence, operator tracking, and related information for Urban Air Mobility (UAM) markets
          in the United States. The Service is provided for informational purposes only. The Company makes no
          representation that any information provided through the Service constitutes investment advice, financial
          advice, legal advice, or a recommendation to buy or sell any security or make any investment decision.
        </p>

        {/* Section 2 */}
        <h2 style={S.h2}>2. Eligibility and Account Registration</h2>
        <p style={S.p}>
          You must be at least 18 years of age and capable of entering into a binding contract to use the Service.
          By creating an account, you represent that the information you provide is accurate and that you will
          maintain the accuracy of such information. You are responsible for maintaining the confidentiality of your
          account credentials and for all activity occurring under your account. The Service uses passwordless
          authentication via secure magic links; you are responsible for keeping your email account secure.
        </p>

        {/* Section 3 */}
        <h2 style={S.h2}>3. Subscription Tiers — Free</h2>
        <p style={S.p}>
          Free accounts provide access to the AirIndex dashboard map with city markers, current readiness scores
          for all tracked markets, city rankings, and basic market overview data. Free tier access is provided at
          no charge and may be modified or discontinued at the Company&apos;s discretion.
        </p>

        {/* Section 4 */}
        <h2 style={S.h2}>4. Subscription Tiers — Paid Plans</h2>
        <p style={S.p}>
          The following paid subscription tiers are offered subject to applicable pricing posted at{" "}
          <Link href="/pricing" style={S.link}>airindex.io/pricing</Link>:
        </p>
        <ul style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, lineHeight: 1.8, paddingLeft: 20, marginBottom: 14 }}>
          <li style={{ marginBottom: 8 }}>
            <strong style={S.strong}>Alert</strong> ($25/month or $249/year): includes score change notifications
            and watch list alerts for up to three monitored markets, and a monthly market summary.
          </li>
          <li style={{ marginBottom: 8 }}>
            <strong style={S.strong}>Pro</strong> ($149/month or $1,490/year): includes all Free features plus score
            history and trend lines, factor-level breakdowns with source citations, corridor intelligence, operator
            tracker, SEC filing summaries, email alerts on score changes, and monthly report PDF access.
          </li>
          <li style={{ marginBottom: 8 }}>
            <strong style={S.strong}>Institutional</strong> ($499/month or $4,990/year): includes all Pro features
            plus API access (JSON/CSV), data export, multi-seat team access, custom alerts, and priority support.
          </li>
          <li style={{ marginBottom: 8 }}>
            <strong style={S.strong}>Enterprise</strong>: custom pricing for white-label endpoints, webhooks,
            embedded widgets, and direct data feeds.
          </li>
        </ul>
        <p style={S.p}>
          Pricing is subject to change with 30 days&apos; notice to existing subscribers.
        </p>

        {/* Section 5 */}
        <h2 style={S.h2}>5. Payment and Billing</h2>
        <p style={S.p}>
          Paid subscriptions are billed in advance on a monthly or annual basis, as selected at purchase, via the
          payment method on file. All fees are in US Dollars and are non-refundable except as expressly provided
          herein or required by applicable law. The Company uses Stripe, Inc. to process payments; by providing
          payment information, you agree to Stripe&apos;s terms of service. Your subscription will automatically renew
          at the end of each billing period unless you cancel before the renewal date.
        </p>

        {/* Section 6 */}
        <h2 style={S.h2}>6. Cancellation and Refunds</h2>
        <p style={S.p}>
          You may cancel your subscription at any time through your account settings. Cancellation takes effect at
          the end of the current billing period. The Company does not provide refunds for partial subscription
          periods, except at the Company&apos;s sole discretion. If the Company terminates your account for
          convenience, you shall receive a prorated refund for the unused portion of your prepaid subscription.
        </p>

        {/* Section 7 */}
        <h2 style={S.h2}>7. Intellectual Property</h2>
        <p style={S.p}>
          The Service, including all content, data, software, ratings, scores, methodologies, APIs, user interfaces,
          and trademarks (collectively, &ldquo;Company Content&rdquo;), is owned by or licensed to the Company and
          is protected by US and international intellectual property laws. You are granted a limited, non-exclusive,
          non-transferable, revocable license to access and use the Service and Company Content solely as permitted
          by these Terms and your applicable subscription tier. You may not copy, reproduce, distribute, modify,
          reverse engineer, create derivative works from, or commercially exploit any Company Content without the
          Company&apos;s prior written consent.
        </p>

        {/* Section 8 */}
        <h2 style={S.h2}>8. API Usage</h2>
        <p style={S.p}>
          API access is available to Institutional and Enterprise subscribers. You may access the API solely to
          retrieve data for internal business purposes or to build applications as expressly authorized by the
          Company. You may not: resell API data to third parties; build a competing market intelligence product
          using API data; or scrape, cache, or redistribute API responses in bulk beyond the limits set forth in the
          applicable API documentation. Rate limits and usage restrictions are specified in the{" "}
          <Link href="/api/docs" style={S.link}>API documentation</Link>.
        </p>

        {/* Section 9 */}
        <h2 style={S.h2}>9. Prohibited Uses</h2>
        <p style={S.p}>You shall not:</p>
        <ul style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, lineHeight: 1.8, paddingLeft: 20, marginBottom: 14 }}>
          <li>Use the Service for any unlawful purpose</li>
          <li>Attempt to gain unauthorized access to the Service or its underlying systems</li>
          <li>Interfere with or disrupt the Service</li>
          <li>Use automated tools to scrape, crawl, or index Service content without authorization</li>
          <li>Impersonate any person or entity</li>
          <li>Use the Service to transmit malicious code</li>
          <li>Use the Service in a manner that violates these Terms</li>
        </ul>

        {/* Section 10 */}
        <h2 style={S.h2}>10. Disclaimer of Warranties</h2>
        <p style={S.caps}>
          THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTY OF ANY KIND. THE
          COMPANY EXPRESSLY DISCLAIMS ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING WARRANTIES
          OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, ACCURACY, COMPLETENESS, AND
          UNINTERRUPTED AVAILABILITY. AIRINDEX DATA IS FOR INFORMATIONAL PURPOSES ONLY AND DOES NOT CONSTITUTE
          INVESTMENT, FINANCIAL, OR LEGAL ADVICE.
        </p>

        {/* Section 11 */}
        <h2 style={S.h2}>11. Indemnification</h2>
        <p style={S.p}>
          You agree to indemnify, defend, and hold harmless Vertical Data Group, LLC and its members, managers,
          officers, employees, agents, successors, and assigns from and against any and all claims, liabilities,
          damages, losses, costs, and expenses, including reasonable attorneys&apos; fees and court costs, arising out
          of or in any way connected with: (a) your access to or use of the Service; (b) your violation of these
          Terms; (c) your violation of any applicable law or regulation; (d) your infringement of any third-party
          rights, including intellectual property rights; or (e) any decision, action, or inaction taken by you or
          any third party in reliance on data, scores, ratings, or other information obtained through the Service.
          The Company reserves the right to assume exclusive control of the defense of any matter subject to
          indemnification by you, in which case you agree to cooperate with the Company&apos;s defense of such claim.
          This indemnification obligation will survive the termination of these Terms and your use of the Service.
        </p>

        {/* Section 12 */}
        <h2 style={S.h2}>12. Limitation of Liability</h2>
        <p style={S.caps}>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE COMPANY BE LIABLE FOR ANY
          INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF REVENUE, PROFITS,
          DATA, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH THESE TERMS OR YOUR USE OF THE SERVICE. THE
          COMPANY&apos;S TOTAL LIABILITY SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID FOR THE SERVICE IN
          THE 12 MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED DOLLARS ($100.00).
        </p>

        {/* Section 13 */}
        <h2 style={S.h2}>13. DMCA and Copyright</h2>
        <p style={S.p}>
          The Company respects intellectual property rights. If you believe content on the Service infringes your
          copyright, please send a DMCA notice to{" "}
          <a href="mailto:legal@airindex.io" style={S.link}>legal@airindex.io</a> (Subject: &ldquo;DMCA
          Notice&rdquo;) with: identification of the copyrighted work; identification of the infringing material and
          its location; your contact information; a statement of good faith belief; and a statement of accuracy
          under penalty of perjury.
        </p>

        {/* Section 14 */}
        <h2 style={S.h2}>14. Privacy</h2>
        <p style={S.p}>
          Your use of the Service is also governed by the Company&apos;s Privacy Policy, available at{" "}
          <Link href="/privacy" style={S.link}>airindex.io/privacy</Link>, which is incorporated herein by reference.
        </p>

        {/* Section 15 */}
        <h2 style={S.h2}>15. Insurance</h2>
        <p style={S.p}>
          Vertical Data Group, LLC maintains commercial general liability and professional liability (errors and
          omissions) insurance coverage. Certificates of Insurance are available upon written request at{" "}
          <a href="mailto:legal@airindex.io" style={S.link}>legal@airindex.io</a>.
        </p>

        {/* Section 16 */}
        <h2 style={S.h2}>16. Governing Law and Dispute Resolution</h2>
        <p style={S.p}>
          These Terms are governed by the laws of the State of South Carolina. Any dispute arising out of or
          relating to these Terms or the Service shall be resolved by binding arbitration administered by the
          American Arbitration Association under its Consumer Arbitration Rules, with proceedings conducted remotely.
          Notwithstanding the foregoing, either party may seek injunctive or other equitable relief in any court of
          competent jurisdiction.
        </p>
        <p style={S.caps}>
          YOU WAIVE ANY RIGHT TO A JURY TRIAL AND TO PARTICIPATE IN A CLASS ACTION.
        </p>

        {/* Section 17 */}
        <h2 style={S.h2}>17. Modifications</h2>
        <p style={S.p}>
          The Company reserves the right to modify these Terms at any time. The Company will provide 30 days&apos;
          notice of material changes by email to your registered address or by posting notice on the Service. Your
          continued use of the Service after such notice constitutes acceptance of the modified Terms.
        </p>

        {/* Section 18 */}
        <h2 style={S.h2}>18. Termination</h2>
        <p style={S.p}>
          The Company may suspend or terminate your account and access to the Service at any time, with or without
          cause, upon 30 days&apos; notice (or immediately if you breach these Terms). Upon termination, all licenses
          granted to you shall immediately terminate.
        </p>

        {/* Section 19 */}
        <h2 style={S.h2}>19. General</h2>
        <p style={S.p}>
          These Terms constitute the entire agreement between you and the Company regarding the Service. If any
          provision is held unenforceable, the remaining provisions shall continue in full force and effect. The
          Company&apos;s failure to enforce any provision does not constitute a waiver of its rights.
        </p>
        <p style={S.p}>
          If you have questions about these Terms, please contact us at{" "}
          <a href="mailto:legal@airindex.io" style={S.link}>legal@airindex.io</a> or by mail at
          Vertical Data Group, LLC, PO Box 31172, Myrtle Beach, SC 29588.
        </p>

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
            <Link href="/privacy" style={{ color: "inherit", textDecoration: "none" }}>PRIVACY</Link> &middot;{" "}
            <Link href="/dashboard" style={{ color: "inherit", textDecoration: "none" }}>DASHBOARD</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
