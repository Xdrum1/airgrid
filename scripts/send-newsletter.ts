/**
 * UAM Market Pulse — Newsletter Sender
 *
 * Sends the full newsletter as inline HTML with PDF attached as bonus.
 * Reads the generated HTML from public/docs/ and wraps it in an email-safe template.
 *
 * Usage:
 *   npx tsx scripts/send-newsletter.ts --issue=2 --week="March 20, 2026" --test=alan@airindex.io
 *   npx tsx scripts/send-newsletter.ts --issue=2 --week="March 20, 2026" --send
 *
 * Requires: SES_ACCESS_KEY_ID, SES_SECRET_ACCESS_KEY, SES_REGION in .env
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createHmac, createHash } from "crypto";
import { readFileSync, existsSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { buildUnsubscribeUrl, buildTrackingPixelUrl, buildClickTrackUrl } from "../src/lib/newsletter-token";

const prisma = new PrismaClient();

// ── Args ────────────────────────────────────────────────────────
const issueNum = parseInt(
  process.argv.find((a) => a.startsWith("--issue="))?.split("=")[1] ?? "0",
  10
);
const weekLabel =
  process.argv.find((a) => a.startsWith("--week="))?.split("=")[1] ?? "";
const testArg = process.argv.find((a) => a.startsWith("--test="));
const testEmail = testArg?.split("=")[1];
const sendAll = process.argv.includes("--send");

if (!issueNum || !weekLabel || (!testEmail && !sendAll)) {
  console.log("Usage:");
  console.log('  npx tsx scripts/send-newsletter.ts --issue=2 --week="March 20, 2026" --test=alan@airindex.io');
  console.log('  npx tsx scripts/send-newsletter.ts --issue=2 --week="March 20, 2026" --send');
  process.exit(0);
}

// ── Config (derived from args) ──────────────────────────────────
const FROM = "AirIndex <hello@airindex.io>";
const SUBJECT = `UAM Market Pulse — Issue ${issueNum} | Week of ${weekLabel}`;
const PDF_PATH = `public/docs/UAM_Market_Pulse_Issue${issueNum}.pdf`;
const PDF_FILENAME = `UAM_Market_Pulse_Issue${issueNum}.pdf`;
const ADMIN_EMAIL = "alan@airindex.io";
const SITE = "https://www.airindex.io";

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

function buildRawEmail(to: string, pdfBase64: string, newsletterHtml: string, unsubscribeUrl: string): string {
  const boundary = `----=_Part_${Date.now()}`;
  const mixedBoundary = `----=_Mixed_${Date.now()}`;

  // Extract the inner content from the generated newsletter HTML (between <body> tags)
  const bodyMatch = newsletterHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  let innerContent = bodyMatch ? bodyMatch[1] : newsletterHtml;

  // Wrap links with click tracking (href="https://..." → tracked redirect)
  const dashboardClickUrl = buildClickTrackUrl(to, issueNum, `${SITE}/dashboard`);
  const siteClickUrl = buildClickTrackUrl(to, issueNum, SITE);
  const twitterClickUrl = buildClickTrackUrl(to, issueNum, "https://twitter.com/AirIndexHQ");

  // Track links inside the newsletter content (airindex.io links only)
  innerContent = innerContent.replace(
    /href="(https?:\/\/(?:www\.)?airindex\.io[^"]*)"/g,
    (_match, url) => `href="${buildClickTrackUrl(to, issueNum, url)}"`
  );

  // Tracking pixel
  const pixelUrl = buildTrackingPixelUrl(to, issueNum);

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Inter',Arial,Helvetica,sans-serif;">
  <div style="max-width:680px;margin:0 auto;background:#ffffff;padding:0;">

    <!-- Newsletter Content (inline) -->
    ${innerContent}

    <!-- CTA -->
    <div style="text-align:center;padding:24px 24px 32px;">
      <a href="${dashboardClickUrl}" style="display:inline-block;background:#00c2ff;color:#000;font-weight:700;font-size:14px;padding:12px 32px;text-decoration:none;border-radius:4px;">VIEW LIVE DASHBOARD</a>
      <p style="color:#888;font-size:12px;margin:12px 0 0;">PDF version attached for offline reading</p>
    </div>

    <!-- Footer -->
    <div style="background:#f8f8f8;padding:24px;border-top:1px solid #eee;">
      <p style="color:#888;font-size:12px;line-height:1.6;margin:0 0 8px 0;text-align:center;">
        AirIndex by Vertical Data Group, LLC<br>
        <a href="${siteClickUrl}" style="color:#00c2ff;text-decoration:none;">airindex.io</a> &middot;
        <a href="${twitterClickUrl}" style="color:#00c2ff;text-decoration:none;">@AirIndexHQ</a>
      </p>
      <p style="color:#aaa;font-size:11px;line-height:1.5;margin:0;text-align:center;">
        You&rsquo;re receiving this because you signed up at airindex.io.<br>
        <a href="${unsubscribeUrl}" style="color:#888;text-decoration:underline;">Unsubscribe</a> from future newsletters.
      </p>
    </div>

    <!-- Tracking pixel -->
    <img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" />
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
  // Validate newsletter HTML exists
  const HTML_PATH = `public/docs/UAM_Market_Pulse_Issue${issueNum}.html`;
  if (!existsSync(HTML_PATH)) {
    console.error(`Newsletter HTML not found: ${HTML_PATH}`);
    console.error(`Generate it first: npx tsx scripts/generate-newsletter.ts --issue=${issueNum} --week="${weekLabel}"`);
    process.exit(1);
  }

  // Validate PDF exists
  if (!existsSync(PDF_PATH)) {
    console.error(`PDF not found: ${PDF_PATH}`);
    console.error(`Generate it first: open ${HTML_PATH} in browser → Cmd+P → Save as PDF`);
    process.exit(1);
  }

  console.log(`\n  UAM Market Pulse — Issue ${issueNum}`);
  console.log(`  Week of ${weekLabel}`);
  console.log(`  Subject: ${SUBJECT}\n`);

  // Load newsletter HTML (rendered inline in email body)
  console.log(`Loading HTML: ${HTML_PATH}`);
  const newsletterHtml = readFileSync(HTML_PATH, "utf-8");
  console.log(`  HTML size: ${(Buffer.byteLength(newsletterHtml) / 1024).toFixed(1)} KB`);

  // Load PDF (attached as bonus)
  console.log(`Loading PDF: ${PDF_PATH}`);
  const pdfBuffer = readFileSync(PDF_PATH);
  const pdfBase64 = pdfBuffer.toString("base64");
  console.log(`  PDF size: ${(pdfBuffer.length / 1024).toFixed(1)} KB\n`);

  if (testEmail) {
    // Test mode: send to one email
    console.log(`SENDING TEST to: ${testEmail}`);
    const unsubUrl = buildUnsubscribeUrl(testEmail);
    const raw = buildRawEmail(testEmail, pdfBase64, newsletterHtml, unsubUrl);
    await sendRawEmail(raw);
    console.log(`  Sent successfully.\n`);
  } else if (sendAll) {
    // Send to all users except admin and opted-out
    const users = await prisma.user.findMany({
      where: { email: { not: ADMIN_EMAIL }, newsletterOptOut: false },
      select: { email: true, firstName: true },
      orderBy: { createdAt: "asc" },
    });

    console.log(`SENDING TO ${users.length} RECIPIENTS:\n`);
    for (const u of users) {
      console.log(`  ${u.email}...`);
      try {
        const unsubUrl = buildUnsubscribeUrl(u.email);
        const raw = buildRawEmail(u.email, pdfBase64, newsletterHtml, unsubUrl);
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
