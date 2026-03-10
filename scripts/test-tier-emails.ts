/**
 * Send test copies of tier-specific confirmation emails
 * Usage: npx tsx scripts/test-tier-emails.ts
 */
import { sendSesEmail } from "../src/lib/ses";

const to = process.env.ADMIN_NOTIFY_EMAIL || "alan@airindex.io";
const from = process.env.SES_FROM_EMAIL || "AirIndex <auth@airindex.io>";
const appUrl = process.env.APP_URL || "https://www.airindex.io";

const tiers = [
  {
    tier: "pro",
    subject: "[TEST] You're on the Pro waitlist — AirIndex",
    heading: "Alan, you're on the list.",
    body: "We'll notify you as soon as Pro launches. In the meantime, all platform features are available free during beta — market readiness scores, corridor tracking, regulatory filings, and more across 20 US markets.",
    cta: { label: "Explore the Dashboard", href: `${appUrl}/dashboard` },
  },
  {
    tier: "institutional",
    subject: "[TEST] We received your inquiry — AirIndex",
    heading: "Thanks, Alan.",
    body: "We've received your inquiry about AirIndex Institutional. Our team will reach out within 48 hours to learn more about your use case and walk you through what's available — monthly reports, API access, data exports, and multi-seat team access.",
    cta: { label: "View the Dashboard", href: `${appUrl}/dashboard` },
  },
  {
    tier: "enterprise",
    subject: "[TEST] We received your inquiry — AirIndex",
    heading: "Thanks, Alan.",
    body: "We've received your inquiry about AirIndex Enterprise. Our team will reach out within 48 hours to discuss your requirements — unlimited API access, white-label data feeds, custom market coverage, and dedicated support.",
    cta: { label: "View the Dashboard", href: `${appUrl}/dashboard` },
  },
];

async function main() {
  for (const t of tiers) {
    console.log(`[test] Sending ${t.tier} confirmation email...`);
    await sendSesEmail({
      to,
      from,
      subject: t.subject,
      html: `
        <div style="background:#ffffff;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;padding:40px 32px;max-width:520px;margin:0 auto;">
          <div style="margin-bottom:32px;">
            <img src="https://www.airindex.io/images/logo/airindex-wordmark-light.png" alt="AirIndex" width="160" height="35" style="display:block;" />
          </div>
          <p style="color:#333;font-size:18px;font-weight:700;line-height:1.4;margin:0 0 16px;">
            ${t.heading}
          </p>
          <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 24px;">
            ${t.body}
          </p>
          <a href="${t.cta.href}" style="display:inline-block;padding:12px 28px;background:#00d4ff;color:#050508;font-size:13px;font-weight:700;text-decoration:none;border-radius:6px;">
            ${t.cta.label}
          </a>
          <p style="color:#bbb;font-size:11px;margin-top:32px;line-height:1.6;">
            AirIndex — the intelligence layer for urban air mobility.
          </p>
        </div>
      `.trim(),
    });
    console.log(`[test] ${t.tier} sent to ${to}`);
  }
  console.log("\n[test] Done — check inbox for all 3 tier emails.");
}

main().catch((err) => {
  console.error("[test] Failed:", err);
  process.exit(1);
});
