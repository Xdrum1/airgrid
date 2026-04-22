/**
 * Send Leonardo outreach email to Robert Brzozowski
 * with tracking pixel + tracked briefing link.
 *
 * Usage:
 *   npx tsx scripts/send-leonardo-outreach.ts
 *   npx tsx scripts/send-leonardo-outreach.ts --dry-run
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env.development.local" });

// Force production URLs for tracking links
process.env.APP_URL = "https://www.airindex.io";

import { sendSesEmail } from "../src/lib/ses";
import { buildTrackingPixelUrl, buildClickTrackUrl } from "../src/lib/newsletter-token";

const ROBERT = {
  email: "robert.brzozowski@leonardocompany.us",
  name: "Robert",
};

// --solo sends to alan@ for preview
const soloMode = process.argv.includes("--solo");
const RECIPIENT = soloMode
  ? { email: "alan@airindex.io", name: "Robert" }
  : ROBERT;

const BRIEFING_URL = "https://www.airindex.io/docs/leonardo-facility-snapshot.html";
const SERIES = "outreach";
const ISSUE = 1; // Leonardo outreach #1

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const trackedBriefingUrl = buildClickTrackUrl(
    RECIPIENT.email,
    ISSUE,
    BRIEFING_URL,
    SERIES,
  );
  const pixelUrl = buildTrackingPixelUrl(RECIPIENT.email, ISSUE, SERIES);

  const html = `
<div style="background:#ffffff;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;padding:40px 32px;max-width:600px;margin:0 auto;">
  <p style="font-size:15px;line-height:1.7;color:#333;margin:0 0 16px;">Robert,</p>

  <p style="font-size:15px;line-height:1.7;color:#333;margin:0 0 16px;">
    I appreciate you following along with the AirIndex updates. I've noticed you've been
    consistently reading the market pieces.
  </p>

  <p style="font-size:15px;line-height:1.7;color:#333;margin:0 0 16px;">
    Given your role on the operations/R&amp;D side at Leonardo, I pulled together a quick
    snapshot looking at a few U.S. markets and how existing heliport infrastructure actually
    lines up at the facility level &mdash; where things are viable vs where constraints start
    to show up.
  </p>

  <p style="font-size:15px;line-height:1.7;color:#333;margin:0 0 16px;">
    <a href="${trackedBriefingUrl}" style="color:#5B8DB8;font-weight:600;text-decoration:none;">
      View the Facility-Level Viability Snapshot &rarr;
    </a>
  </p>

  <p style="font-size:15px;line-height:1.7;color:#333;margin:0 0 16px;">
    The second page is really where things get interesting. It's what starts to show up
    when you move from market-level readiness to actual facility-level conditions.
  </p>

  <p style="font-size:15px;line-height:1.7;color:#333;margin:0 0 24px;">
    No expectations, just thought it might be useful from a practical standpoint.
  </p>

  <div style="padding-top:20px;border-top:1px solid #eee;">
    <p style="font-size:14px;line-height:1.6;color:#333;margin:0;">
      <strong>Alan Holmes</strong><br>
      Founder &amp; CEO, Vertical Data Group<br>
      <a href="https://www.airindex.io" style="color:#5B8DB8;text-decoration:none;">airindex.io</a>
      &nbsp;|&nbsp;
      <a href="https://www.verticaldatagroup.com" style="color:#5B8DB8;text-decoration:none;">verticaldatagroup.com</a><br>
      <span style="color:#888;font-size:13px;">(202) 949-2709</span>
    </p>
    <p style="font-size:11px;color:#aaa;margin:10px 0 0;">
      SAM.gov Registered &middot; UEI: RB63W8RYCHY3 &middot; CAGE: 1AUW7
    </p>
  </div>

  <img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" />
</div>
`;

  const subject = "Facility-level infrastructure snapshot — U.S. rotorcraft → AAM transition";

  if (dryRun) {
    console.log("=== DRY RUN ===");
    console.log(`To: ${RECIPIENT.email}`);
    console.log(`Subject: ${subject}`);
    console.log(`Tracked link: ${trackedBriefingUrl}`);
    console.log(`Pixel: ${pixelUrl}`);
    console.log("\nHTML preview length:", html.length, "bytes");
    console.log("\n--- HTML ---");
    console.log(html);
    return;
  }

  await sendSesEmail({
    to: RECIPIENT.email,
    subject,
    html,
    from: "Alan Holmes <alan@airindex.io>",
  });

  console.log(`Sent to ${RECIPIENT.email}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
