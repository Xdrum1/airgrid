/**
 * Send March 2026 Report Email
 *
 * Usage:
 *   npx tsx scripts/send-report.ts --to "rex@example.com" --name "Rex" --note "Personal note here..."
 *   npx tsx scripts/send-report.ts --dry-run --to "test@example.com" --name "Test"
 *
 * Sends an HTML email with the report highlights + PDF attachment via SES.
 * Requires SES_ACCESS_KEY_ID, SES_SECRET_ACCESS_KEY in .env.local
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createHmac, createHash } from "crypto";

// -------------------------------------------------------
// CLI args
// -------------------------------------------------------

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 && idx + 1 < process.argv.length
    ? process.argv[idx + 1]
    : undefined;
}

const toArg = getArg("to");
const recipientName = getArg("name") || "there";
const personalNote = getArg("note") || "";
const dryRun = process.argv.includes("--dry-run");

if (!toArg) {
  console.error("Usage: npx tsx scripts/send-report.ts --to EMAIL --name NAME --note \"Personal note...\"");
  console.error("  --dry-run   Print email HTML to stdout instead of sending");
  process.exit(1);
}

const to: string = toArg;

// -------------------------------------------------------
// Load env
// -------------------------------------------------------

const envPath = resolve(process.cwd(), ".env.local");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([A-Z_]+)=(.+)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
} catch {}

// -------------------------------------------------------
// Email HTML template
// -------------------------------------------------------

function buildEmailHtml(name: string, note: string): string {
  const noteBlock = note
    ? `<p style="color:#1a1a1a;font-size:14px;line-height:1.7;margin:0 0 24px;padding:16px 20px;background:#f8f9fa;border-left:3px solid #0077aa;border-radius:0 6px 6px 0;">${note}</p>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;">
<div style="background:#f4f4f7;padding:32px 16px;">
<div style="background:#ffffff;max-width:600px;margin:0 auto;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

  <!-- Header -->
  <div style="background:#0a0a12;padding:28px 32px;">
    <span style="font-family:'Courier New',monospace;font-weight:800;font-size:18px;color:#ffffff;letter-spacing:0.12em;">AIR</span><span style="font-family:'Courier New',monospace;font-weight:400;font-size:18px;color:#00d4ff;letter-spacing:0.12em;">INDEX</span>
    <span style="float:right;color:#777;font-family:'Courier New',monospace;font-size:11px;letter-spacing:1px;line-height:24px;">MARCH 2026 &bull; ISSUE 2</span>
  </div>

  <!-- Body -->
  <div style="padding:32px;">

    <!-- Personal note -->
    <p style="color:#1a1a1a;font-size:15px;margin:0 0 16px;">Hi ${name},</p>
    ${noteBlock}

    <!-- Intro -->
    <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 24px;">
      The March report is attached. Here are the highlights.
    </p>

    <!-- Key numbers -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td width="25%" style="text-align:center;padding:12px 4px;">
          <div style="font-family:'Courier New',monospace;font-size:24px;font-weight:700;color:#0077aa;">21</div>
          <div style="font-size:9px;color:#999;letter-spacing:1px;font-family:'Courier New',monospace;">MARKETS</div>
        </td>
        <td width="25%" style="text-align:center;padding:12px 4px;">
          <div style="font-family:'Courier New',monospace;font-size:24px;font-weight:700;color:#15803d;">1,797</div>
          <div style="font-size:9px;color:#999;letter-spacing:1px;font-family:'Courier New',monospace;">RECORDS</div>
        </td>
        <td width="25%" style="text-align:center;padding:12px 4px;">
          <div style="font-family:'Courier New',monospace;font-size:24px;font-weight:700;color:#b87a00;">5,647</div>
          <div style="font-size:9px;color:#999;letter-spacing:1px;font-family:'Courier New',monospace;">HELIPORTS</div>
        </td>
        <td width="25%" style="text-align:center;padding:12px 4px;">
          <div style="font-family:'Courier New',monospace;font-size:24px;font-weight:700;color:#7c3aed;">v1.3</div>
          <div style="font-size:9px;color:#999;letter-spacing:1px;font-family:'Courier New',monospace;">METHODOLOGY</div>
        </td>
      </tr>
    </table>

    <!-- Top 10 leaderboard -->
    <p style="font-family:'Courier New',monospace;font-size:10px;color:#999;letter-spacing:2px;margin:0 0 12px;">MARKET READINESS &mdash; TOP 10</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;border-collapse:collapse;margin-bottom:28px;">
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:8px 4px;color:#999;font-size:11px;">#</td>
        <td style="padding:8px 4px;font-weight:600;">Market</td>
        <td style="padding:8px 4px;text-align:right;font-weight:700;">Score</td>
        <td style="padding:8px 4px;text-align:right;color:#999;font-size:11px;">Chg</td>
      </tr>
      <tr style="border-bottom:1px solid #f5f5f5;">
        <td style="padding:6px 4px;color:#999;">1</td>
        <td style="padding:6px 4px;">Dallas, TX</td>
        <td style="padding:6px 4px;text-align:right;font-weight:700;color:#15803d;">95</td>
        <td style="padding:6px 4px;text-align:right;color:#b87a00;font-size:11px;">&darr;5</td>
      </tr>
      <tr style="border-bottom:1px solid #f5f5f5;">
        <td style="padding:6px 4px;color:#999;">1</td>
        <td style="padding:6px 4px;">Los Angeles, CA</td>
        <td style="padding:6px 4px;text-align:right;font-weight:700;color:#15803d;">95</td>
        <td style="padding:6px 4px;text-align:right;color:#b87a00;font-size:11px;">&darr;5</td>
      </tr>
      <tr style="border-bottom:1px solid #f5f5f5;">
        <td style="padding:6px 4px;color:#999;">3</td>
        <td style="padding:6px 4px;">Miami, FL</td>
        <td style="padding:6px 4px;text-align:right;font-weight:700;color:#15803d;">80</td>
        <td style="padding:6px 4px;text-align:right;color:#999;font-size:11px;">&mdash;</td>
      </tr>
      <tr style="border-bottom:1px solid #f5f5f5;">
        <td style="padding:6px 4px;color:#999;">3</td>
        <td style="padding:6px 4px;">Orlando, FL</td>
        <td style="padding:6px 4px;text-align:right;font-weight:700;color:#15803d;">80</td>
        <td style="padding:6px 4px;text-align:right;color:#b87a00;font-size:11px;">&darr;5</td>
      </tr>
      <tr style="border-bottom:1px solid #f5f5f5;background:#f0fdf4;">
        <td style="padding:6px 4px;color:#999;">5</td>
        <td style="padding:6px 4px;font-weight:600;">San Francisco, CA</td>
        <td style="padding:6px 4px;text-align:right;font-weight:700;color:#15803d;">75</td>
        <td style="padding:6px 4px;text-align:right;color:#15803d;font-weight:700;font-size:11px;">&uarr;35</td>
      </tr>
      <tr style="border-bottom:1px solid #f5f5f5;">
        <td style="padding:6px 4px;color:#999;">6</td>
        <td style="padding:6px 4px;">New York, NY</td>
        <td style="padding:6px 4px;text-align:right;font-weight:700;color:#0077aa;">55</td>
        <td style="padding:6px 4px;text-align:right;color:#cc2222;font-size:11px;">&darr;15</td>
      </tr>
      <tr style="border-bottom:1px solid #f5f5f5;">
        <td style="padding:6px 4px;color:#999;">7</td>
        <td style="padding:6px 4px;">Austin, TX</td>
        <td style="padding:6px 4px;text-align:right;font-weight:700;color:#0077aa;">50</td>
        <td style="padding:6px 4px;text-align:right;color:#15803d;font-size:11px;">&uarr;20</td>
      </tr>
      <tr style="border-bottom:1px solid #f5f5f5;">
        <td style="padding:6px 4px;color:#999;">7</td>
        <td style="padding:6px 4px;">Houston, TX</td>
        <td style="padding:6px 4px;text-align:right;font-weight:700;color:#0077aa;">50</td>
        <td style="padding:6px 4px;text-align:right;color:#15803d;font-size:11px;">&uarr;20</td>
      </tr>
      <tr style="border-bottom:1px solid #f5f5f5;">
        <td style="padding:6px 4px;color:#999;">7</td>
        <td style="padding:6px 4px;">Phoenix, AZ</td>
        <td style="padding:6px 4px;text-align:right;font-weight:700;color:#0077aa;">50</td>
        <td style="padding:6px 4px;text-align:right;color:#15803d;font-size:11px;">&uarr;15</td>
      </tr>
      <tr>
        <td style="padding:6px 4px;color:#999;">7</td>
        <td style="padding:6px 4px;">San Diego, CA</td>
        <td style="padding:6px 4px;text-align:right;font-weight:700;color:#0077aa;">50</td>
        <td style="padding:6px 4px;text-align:right;color:#15803d;font-size:11px;">&uarr;5</td>
      </tr>
    </table>

    <!-- Top stories -->
    <p style="font-family:'Courier New',monospace;font-size:10px;color:#999;letter-spacing:2px;margin:0 0 12px;">WHAT MOVED</p>

    <div style="border-left:3px solid #15803d;padding:8px 16px;margin-bottom:12px;background:#f9fafb;border-radius:0 6px 6px 0;">
      <p style="font-size:13px;font-weight:600;color:#1a1a1a;margin:0 0 4px;">San Francisco surges +35 to ADVANCED</p>
      <p style="font-size:12px;color:#666;margin:0;line-height:1.5;">Joby Electric Skies Tour demo flight across SF Bay confirms pilot program and operator presence.</p>
    </div>

    <div style="border-left:3px solid #0077aa;padding:8px 16px;margin-bottom:12px;background:#f9fafb;border-radius:0 6px 6px 0;">
      <p style="font-size:13px;font-weight:600;color:#1a1a1a;margin:0 0 4px;">Scoring methodology v1.3 shipped</p>
      <p style="font-size:12px;color:#666;margin:0;line-height:1.5;">State Legislation elevated to highest-weighted factor (20 pts). Weather Infrastructure replaces LAANC. No market scores 100.</p>
    </div>

    <div style="border-left:3px solid #b87a00;padding:8px 16px;margin-bottom:12px;background:#f9fafb;border-radius:0 6px 6px 0;">
      <p style="font-size:13px;font-weight:600;color:#1a1a1a;margin:0 0 4px;">Joby acquires Blade Air Mobility</p>
      <p style="font-size:12px;color:#666;margin:0;line-height:1.5;">NYC heliport network, LA terminals, Miami routes consolidated under Joby. Operator count: 5 &rarr; 4.</p>
    </div>

    <div style="border-left:3px solid #7c3aed;padding:8px 16px;margin-bottom:24px;background:#f9fafb;border-radius:0 6px 6px 0;">
      <p style="font-size:13px;font-weight:600;color:#1a1a1a;margin:0 0 4px;">5,647 FAA heliports ingested</p>
      <p style="font-size:12px;color:#666;margin:0;line-height:1.5;">NASR 5010 data mapped to all 21 metros. LA leads with 146 heliports. New infrastructure intelligence layer.</p>
    </div>

    <!-- CTA -->
    <p style="color:#555;font-size:13px;line-height:1.6;margin:0 0 8px;">
      Full report attached as PDF. Interactive dashboard at <a href="https://www.airindex.io/dashboard" style="color:#0077aa;text-decoration:none;">airindex.io/dashboard</a>.
    </p>
    <p style="color:#555;font-size:13px;line-height:1.6;margin:0;">
      Feedback welcome &mdash; reply directly to this email.
    </p>
  </div>

  <!-- Footer -->
  <div style="background:#f8f9fa;padding:20px 32px;border-top:1px solid #eee;">
    <p style="color:#999;font-size:11px;line-height:1.6;margin:0;">
      <span style="font-family:'Courier New',monospace;font-weight:700;letter-spacing:0.1em;">AIRINDEX</span> &mdash; UAM Market Readiness Intelligence<br>
      &copy; 2026 Vertical Data Group, LLC &bull; <a href="https://www.airindex.io" style="color:#999;">airindex.io</a> &bull; <a href="mailto:hello@airindex.io" style="color:#999;">hello@airindex.io</a>
    </p>
  </div>

</div>
</div>
</body>
</html>`.trim();
}

// -------------------------------------------------------
// MIME message builder with PDF attachment
// -------------------------------------------------------

function buildMimeMessage(params: {
  to: string;
  from: string;
  subject: string;
  html: string;
  pdfPath: string;
  pdfFilename: string;
}): string {
  const boundary = `----=_Mixed_${Date.now()}`;
  const altBoundary = `----=_Alt_${Date.now()}`;

  const pdfData = readFileSync(params.pdfPath);
  const pdfBase64 = pdfData.toString("base64");

  // Split base64 into 76-char lines for MIME compliance
  const pdfLines = pdfBase64.match(/.{1,76}/g)?.join("\r\n") || pdfBase64;

  const lines = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    ``,
    `--${altBoundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    params.html,
    ``,
    `--${altBoundary}--`,
    ``,
    `--${boundary}`,
    `Content-Type: application/pdf; name="${params.pdfFilename}"`,
    `Content-Disposition: attachment; filename="${params.pdfFilename}"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    pdfLines,
    ``,
    `--${boundary}--`,
  ];

  return lines.join("\r\n");
}

// -------------------------------------------------------
// SES signing (from ses.ts, adapted for standalone script)
// -------------------------------------------------------

function sha256(data: string) {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

function hmacSha256(key: Buffer | string, data: string) {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

async function sendRawEmail(rawMessage: string): Promise<void> {
  const region = process.env.SES_REGION || "us-east-1";
  const accessKeyId = process.env.SES_ACCESS_KEY_ID!;
  const secretAccessKey = process.env.SES_SECRET_ACCESS_KEY!;
  const host = `email.${region}.amazonaws.com`;

  const encodedMessage = Buffer.from(rawMessage).toString("base64");
  const body = new URLSearchParams({
    Action: "SendRawEmail",
    "RawMessage.Data": encodedMessage,
    Version: "2010-12-01",
  }).toString();

  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/ses/aws4_request`;

  const canonicalHeaders = `content-type:application/x-www-form-urlencoded\nhost:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-date";

  const canonicalRequest = [
    "POST", "/", "", canonicalHeaders, signedHeaders, sha256(body),
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256", amzDate, credentialScope, sha256(canonicalRequest),
  ].join("\n");

  const signingKey = hmacSha256(
    hmacSha256(
      hmacSha256(hmacSha256(`AWS4${secretAccessKey}`, dateStamp), region),
      "ses"
    ),
    "aws4_request"
  );
  const signature = createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

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

// -------------------------------------------------------
// Main
// -------------------------------------------------------

async function main() {
  const pdfPath = resolve(process.cwd(), "public/reports/AirIndex_Report_March2026.pdf");

  // Verify PDF exists
  try {
    readFileSync(pdfPath);
  } catch {
    console.error(`\n  PDF not found at: ${pdfPath}`);
    console.error(`  Save the report as PDF first: open march-2026.html in browser → Cmd+P → Save as PDF`);
    console.error(`  Save to: public/reports/AirIndex_Report_March2026.pdf\n`);
    process.exit(1);
  }

  const html = buildEmailHtml(recipientName, personalNote);
  const from = "AirIndex <hello@airindex.io>";
  const subject = "AirIndex March 2026 Market Intelligence Report";

  if (dryRun) {
    console.log("\n--- DRY RUN ---");
    console.log(`To: ${to}`);
    console.log(`From: ${from}`);
    console.log(`Subject: ${subject}`);
    console.log(`PDF: ${pdfPath}`);
    console.log(`\n--- HTML PREVIEW ---\n`);
    console.log(html);

    // Also write preview HTML
    const previewPath = resolve(process.cwd(), "public/reports/email-preview.html");
    const { writeFileSync } = await import("fs");
    writeFileSync(previewPath, html);
    console.log(`\nPreview saved to: ${previewPath}`);
    console.log(`Open in browser to preview the email.`);
    return;
  }

  // Verify SES credentials
  if (!process.env.SES_ACCESS_KEY_ID || !process.env.SES_SECRET_ACCESS_KEY) {
    console.error("\n  SES credentials not found. Set SES_ACCESS_KEY_ID and SES_SECRET_ACCESS_KEY in .env.local\n");
    process.exit(1);
  }

  console.log(`\nSending March 2026 report to ${to} (${recipientName})...`);

  const rawMessage = buildMimeMessage({
    to,
    from,
    subject,
    html,
    pdfPath,
    pdfFilename: "AirIndex_Report_March2026.pdf",
  });

  await sendRawEmail(rawMessage);
  console.log(`  ✓ Sent to ${to}`);
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
