/**
 * UAM Market Pulse — Newsletter Sender
 *
 * Sends the weekly newsletter PDF to all users (or a test recipient).
 * Attaches the PDF and includes an HTML email body with a summary.
 *
 * Usage:
 *   npx tsx scripts/send-newsletter.ts --test=alan@airindex.io     # Test to one email
 *   npx tsx scripts/send-newsletter.ts --send                       # Send to all users (except admin)
 *
 * Requires: SES_ACCESS_KEY_ID, SES_SECRET_ACCESS_KEY, SES_REGION in .env
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createHmac, createHash } from "crypto";
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { buildUnsubscribeUrl } from "../src/lib/newsletter-token";

const prisma = new PrismaClient();

// ── Config ──────────────────────────────────────────────────────
const FROM = "AirIndex <hello@airindex.io>";
const SUBJECT = "UAM Market Pulse — Issue 1 | Week of March 10, 2026";
const PDF_PATH = "public/docs/UAM Market Pulse — Issue 1.pdf";
const PDF_FILENAME = "UAM_Market_Pulse_Issue1.pdf";
const ADMIN_EMAIL = "alan@airindex.io";
const SITE = "https://www.airindex.io";

// ── Args ────────────────────────────────────────────────────────
const testArg = process.argv.find((a) => a.startsWith("--test="));
const testEmail = testArg?.split("=")[1];
const sendAll = process.argv.includes("--send");

if (!testEmail && !sendAll) {
  console.log("Usage:");
  console.log("  npx tsx scripts/send-newsletter.ts --test=alan@airindex.io");
  console.log("  npx tsx scripts/send-newsletter.ts --send");
  process.exit(0);
}

// ── SES helpers ─────────────────────────────────────────────────
function sha256(data: string) {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

function hmacSha256(key: Buffer | string, data: string) {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function signRequest(body: string, region: string, accessKeyId: string, secretAccessKey: string) {
  const host = `email.${region}.amazonaws.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/ses/aws4_request`;
  const canonicalHeaders = `content-type:application/x-www-form-urlencoded\nhost:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-date";
  const payloadHash = sha256(body);
  const canonicalRequest = ["POST", "/", "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, sha256(canonicalRequest)].join("\n");
  const signingKey = hmacSha256(hmacSha256(hmacSha256(hmacSha256(`AWS4${secretAccessKey}`, dateStamp), region), "ses"), "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");
  return {
    host,
    amzDate,
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

function buildRawEmail(to: string, pdfBase64: string, unsubscribeUrl: string): string {
  const boundary = `----=_Part_${Date.now()}`;
  const mixedBoundary = `----=_Mixed_${Date.now()}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;padding:0;">
    <!-- Header -->
    <div style="background:#0a0a12;padding:32px 24px;text-align:center;">
      <h1 style="color:#ffffff;font-size:24px;margin:0 0 4px 0;font-weight:700;">UAM MARKET PULSE</h1>
      <p style="color:#888;font-size:13px;margin:0;">by AirIndex &middot; Issue 1 &middot; Week of March 10, 2026</p>
    </div>

    <!-- Body -->
    <div style="padding:32px 24px;">
      <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">
        Welcome to <strong>UAM Market Pulse</strong> &mdash; a weekly intelligence briefing tracking the cities, regulations, and operators shaping commercial eVTOL in the United States.
      </p>

      <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">
        This week&rsquo;s highlights:
      </p>

      <ul style="color:#333;font-size:15px;line-height:1.8;padding-left:20px;margin:0 0 24px 0;">
        <li><strong>Miami hits 100/100</strong> &mdash; the third U.S. city to achieve a perfect UAM readiness score</li>
        <li><strong>4 high-confidence signals</strong> detected across Miami, Dallas, and New York</li>
        <li><strong>32 regulatory signals</strong> classified from 1,340 ingested filings</li>
        <li><strong>Full leaderboard</strong> &mdash; all 21 markets ranked and tiered</li>
      </ul>

      <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
        The full briefing is attached as a PDF. You can also explore live data at <a href="${SITE}" style="color:#00c2ff;text-decoration:none;">${SITE}</a>.
      </p>

      <!-- CTA -->
      <div style="text-align:center;margin:32px 0;">
        <a href="${SITE}" style="display:inline-block;background:#00c2ff;color:#000;font-weight:700;font-size:14px;padding:12px 32px;text-decoration:none;border-radius:4px;">VIEW LIVE DASHBOARD</a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f8f8f8;padding:24px;border-top:1px solid #eee;">
      <p style="color:#888;font-size:12px;line-height:1.6;margin:0 0 8px 0;text-align:center;">
        AirIndex by Vertical Data Group, LLC<br>
        <a href="${SITE}" style="color:#00c2ff;text-decoration:none;">airindex.io</a> &middot;
        <a href="https://twitter.com/AirIndexHQ" style="color:#00c2ff;text-decoration:none;">@AirIndexHQ</a>
      </p>
      <p style="color:#aaa;font-size:11px;line-height:1.5;margin:0;text-align:center;">
        You&rsquo;re receiving this because you signed up at airindex.io.<br>
        <a href="${unsubscribeUrl}" style="color:#888;text-decoration:underline;">Unsubscribe</a> from future newsletters.
      </p>
    </div>
  </div>
</body>
</html>`;

  const lines = [
    `From: ${FROM}`,
    `To: ${to}`,
    `Subject: ${SUBJECT}`,
    `MIME-Version: 1.0`,
    `List-Unsubscribe: <${unsubscribeUrl}>, <mailto:hello@airindex.io?subject=unsubscribe>`,
    `List-Unsubscribe-Post: List-Unsubscribe=One-Click`,
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    "",
    `--${mixedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    "",
    html,
    "",
    `--${boundary}--`,
    "",
    `--${mixedBoundary}`,
    `Content-Type: application/pdf; name="${PDF_FILENAME}"`,
    `Content-Disposition: attachment; filename="${PDF_FILENAME}"`,
    `Content-Transfer-Encoding: base64`,
    "",
    pdfBase64,
    "",
    `--${mixedBoundary}--`,
  ];

  return lines.join("\r\n");
}

async function sendRawEmail(rawMessage: string): Promise<void> {
  const region = process.env.SES_REGION || "us-east-1";
  const accessKeyId = process.env.SES_ACCESS_KEY_ID;
  const secretAccessKey = process.env.SES_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("SES_ACCESS_KEY_ID and SES_SECRET_ACCESS_KEY must be set in .env");
  }

  const encodedMessage = Buffer.from(rawMessage).toString("base64");
  const payload = new URLSearchParams({
    Action: "SendRawEmail",
    "RawMessage.Data": encodedMessage,
    Version: "2010-12-01",
  });

  const body = payload.toString();
  const { host, amzDate, authorization } = signRequest(body, region, accessKeyId, secretAccessKey);

  const res = await fetch(`https://${host}/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Amz-Date": amzDate,
      Authorization: authorization,
      Host: host,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SES error ${res.status}: ${text}`);
  }
}

// ── Main ────────────────────────────────────────────────────────
async function main() {
  // Load PDF
  console.log(`Loading PDF: ${PDF_PATH}`);
  const pdfBuffer = readFileSync(PDF_PATH);
  const pdfBase64 = pdfBuffer.toString("base64");
  console.log(`  PDF size: ${(pdfBuffer.length / 1024).toFixed(1)} KB\n`);

  if (testEmail) {
    // Test mode: send to one email
    console.log(`SENDING TEST to: ${testEmail}`);
    const unsubUrl = buildUnsubscribeUrl(testEmail);
    const raw = buildRawEmail(testEmail, pdfBase64, unsubUrl);
    await sendRawEmail(raw);
    console.log(`  Sent successfully.\n`);
  } else if (sendAll) {
    // Send to all users except admin and opted-out
    const users = await prisma.user.findMany({
      where: { email: { not: ADMIN_EMAIL }, newsletterOptOut: false },
      select: { email: true, name: true },
      orderBy: { createdAt: "asc" },
    });

    console.log(`SENDING TO ${users.length} RECIPIENTS:\n`);
    for (const u of users) {
      console.log(`  ${u.email}...`);
      try {
        const unsubUrl = buildUnsubscribeUrl(u.email);
        const raw = buildRawEmail(u.email, pdfBase64, unsubUrl);
        await sendRawEmail(raw);
        console.log(`    Sent.`);
      } catch (err) {
        console.error(`    FAILED: ${err}`);
      }
      // Small delay between sends to avoid SES throttling
      await new Promise((r) => setTimeout(r, 500));
    }
    console.log(`\nDone. ${users.length} emails sent.`);
  }
}

main()
  .catch((err) => {
    console.error("Newsletter send failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
