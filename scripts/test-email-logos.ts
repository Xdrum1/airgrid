/**
 * Send test copies of all email templates to verify logo rendering.
 * Usage: npx tsx scripts/test-email-logos.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { sendSesEmail } from "../src/lib/ses";

const to = process.env.ADMIN_NOTIFY_EMAIL || "alan@airindex.io";
const from = process.env.SES_FROM_EMAIL || "AirIndex <auth@airindex.io>";
const appUrl = process.env.APP_URL || "https://www.airindex.io";

const logo = `<span style="font-family:'Courier New',monospace;font-weight:800;font-size:15px;color:#0a0a1a;letter-spacing:0.12em;">AIR</span><span style="font-family:'Courier New',monospace;font-weight:400;font-size:15px;color:#0077aa;letter-spacing:0.12em;">INDEX</span>`;

const emails = [
  {
    subject: "[TEST] Magic Link Sign-In",
    html: `
      <div style="background:#ffffff;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;padding:40px 32px;max-width:520px;margin:0 auto;">
        <div style="margin-bottom:32px;">${logo}</div>
        <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 24px;">
          Click the button below to sign in to AirIndex:
        </p>
        <a href="${appUrl}/dashboard" style="display:inline-block;padding:14px 32px;background:#7c3aed;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;margin:0 0 24px;">
          Sign in to AirIndex
        </a>
        <p style="color:#999;font-size:12px;line-height:1.6;margin:0 0 0;">
          This link expires in 10 minutes. If you didn't request this, you can safely ignore this email.
        </p>
      </div>`,
  },
  {
    subject: "[TEST] Welcome to AirIndex",
    html: `
      <div style="background:#ffffff;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;padding:40px 32px;max-width:520px;margin:0 auto;">
        <div style="margin-bottom:32px;">${logo}</div>
        <p style="color:#333;font-size:16px;font-weight:600;line-height:1.6;margin:0 0 16px;">
          Welcome to AirIndex.
        </p>
        <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 8px;">
          You now have access to market readiness scores, regulatory filings, corridor tracking, and alert subscriptions across 20 US urban air mobility markets.
        </p>
        <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 24px;">
          Subscribe to alerts on any city page to get notified when filings, legislation, or FAA updates drop.
        </p>
        <a href="${appUrl}/dashboard" style="display:inline-block;padding:12px 28px;background:#00d4ff;color:#050508;font-size:13px;font-weight:700;text-decoration:none;border-radius:6px;">
          Open Dashboard
        </a>
        <p style="color:#bbb;font-size:11px;margin-top:32px;line-height:1.6;">
          AirIndex — the independent readiness rating system for urban air mobility.
        </p>
      </div>`,
  },
  {
    subject: "[TEST] Alert Notification",
    html: `
      <div style="background:#ffffff;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;padding:40px 32px;max-width:520px;margin:0 auto;">
        <div style="margin-bottom:32px;">${logo}</div>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:4px 12px;display:inline-block;margin-bottom:16px;">
          <span style="color:#15803d;font-size:11px;font-weight:700;letter-spacing:1px;">SCORE CHANGE</span>
        </div>
        <p style="color:#1a1a1a;font-size:18px;font-weight:700;margin:0 0 12px;">Los Angeles</p>
        <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 8px;">Score updated from 95 to 100. All seven readiness factors now confirmed.</p>
        <a href="${appUrl}/dashboard" style="display:inline-block;padding:12px 28px;background:#00d4ff;color:#050508;font-size:13px;font-weight:700;text-decoration:none;border-radius:6px;margin-top:16px;">
          View Details
        </a>
      </div>`,
  },
  {
    subject: "[TEST] Contact Confirmation (Pro)",
    html: `
      <div style="background:#ffffff;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;padding:40px 32px;max-width:520px;margin:0 auto;">
        <div style="margin-bottom:32px;">${logo}</div>
        <p style="color:#333;font-size:18px;font-weight:700;line-height:1.4;margin:0 0 16px;">
          Alan, you're on the list.
        </p>
        <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 24px;">
          We'll notify you as soon as Pro launches. In the meantime, all platform features are available free during beta.
        </p>
        <a href="${appUrl}/dashboard" style="display:inline-block;padding:12px 28px;background:#00d4ff;color:#050508;font-size:13px;font-weight:700;text-decoration:none;border-radius:6px;">
          Explore the Dashboard
        </a>
        <p style="color:#bbb;font-size:11px;margin-top:32px;line-height:1.6;">
          AirIndex — the independent readiness rating system for urban air mobility.
        </p>
      </div>`,
  },
];

async function main() {
  for (const email of emails) {
    try {
      await sendSesEmail({ to, from, subject: email.subject, html: email.html.trim() });
      console.log(`Sent: ${email.subject}`);
    } catch (err) {
      console.error(`Failed: ${email.subject}`, err);
    }
  }
}

main();
