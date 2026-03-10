/**
 * Send test copies of the signup welcome + admin notification emails
 * Usage: npx tsx scripts/test-signup-emails.ts
 */
import { sendSesEmail } from "../src/lib/ses";

const to = process.env.ADMIN_NOTIFY_EMAIL || "alan@airindex.io";
const from = process.env.SES_FROM_EMAIL || "AirIndex <auth@airindex.io>";
const appUrl = process.env.APP_URL || "https://www.airindex.io";
const testEmail = "jane.smith@example.com";

async function main() {
  // 1. Welcome email (what the new user receives)
  console.log("[test] Sending welcome email...");
  await sendSesEmail({
    to,
    from,
    subject: "[TEST] Welcome to AirIndex",
    html: `
      <div style="background:#ffffff;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;padding:40px 32px;max-width:520px;margin:0 auto;">
        <div style="margin-bottom:32px;">
          <img src="https://www.airindex.io/images/logo/airindex-wordmark-light.png" alt="AirIndex" width="160" height="35" style="display:block;" />
        </div>
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
          AirIndex — the intelligence layer for urban air mobility.
        </p>
      </div>
    `.trim(),
  });
  console.log("[test] Welcome email sent to", to);

  // 2. Admin notification (what you receive when someone signs up)
  console.log("[test] Sending admin signup notification...");
  await sendSesEmail({
    to,
    from,
    subject: `[TEST] [AirIndex] New signup: ${testEmail}`,
    html: `
      <div style="background:#ffffff;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;padding:40px 32px;max-width:520px;margin:0 auto;">
        <div style="margin-bottom:32px;">
          <span style="font-weight:800;font-size:20px;color:#1a1a1a;letter-spacing:-0.5px;">AIRINDEX</span>
          <span style="color:#999;font-size:11px;margin-left:8px;">ADMIN</span>
        </div>
        <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 8px;">New user signed up:</p>
        <p style="color:#7c3aed;font-size:16px;font-weight:700;margin:0 0 8px;">${testEmail}</p>
        <p style="color:#999;font-size:12px;margin:0;">${new Date().toUTCString()}</p>
      </div>
    `.trim(),
  });
  console.log("[test] Admin notification sent to", to);

  console.log("\n[test] Done — check inbox for both emails.");
}

main().catch((err) => {
  console.error("[test] Failed:", err);
  process.exit(1);
});
