import { sendSesEmail } from "@/lib/ses";
import { generateUnsubscribeToken } from "@/lib/unsubscribe-token";

// -------------------------------------------------------
// City outreach email (one-time send to city officials)
// -------------------------------------------------------

interface CityOutreachParams {
  to: string;
  recipientName?: string;
  cityName: string;
  state: string;
  score: number;
  tier: string;
  tierColor: string;
  achievedCount: number;
  topGaps: { label: string; weight: number }[];
  peerCityNames: string[];
  calendarUrl: string;
}

export async function sendCityOutreachEmail({
  to,
  recipientName,
  cityName,
  state,
  score,
  tier,
  tierColor,
  achievedCount,
  topGaps,
  peerCityNames,
  calendarUrl,
}: CityOutreachParams): Promise<boolean> {
  if (!process.env.SES_ACCESS_KEY_ID) {
    console.log(
      `[email] AWS credentials not configured — skipping outreach email to ${to} for ${cityName}`
    );
    return false;
  }

  const from = process.env.ALERT_FROM_EMAIL || "AirIndex <alerts@airindex.io>";
  const appUrl = process.env.APP_URL || "https://www.airindex.io";
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const greeting = recipientName ? `Dear ${recipientName},` : `To whom it may concern,`;

  const gapLines = topGaps
    .map((g) => `${g.label} (${g.weight} pts)`)
    .join(", ");

  const peerLine =
    peerCityNames.length > 0
      ? `Other ${tier}-tier markets include ${peerCityNames.slice(0, 3).join(", ")}.`
      : "";

  const html = `
    <div style="background:#ffffff;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;padding:40px 32px;max-width:560px;margin:0 auto;">
      <div style="margin-bottom:32px;">
        <span style="font-family:'Courier New',monospace;font-weight:800;font-size:15px;color:#0a0a1a;letter-spacing:0.12em;">AIR</span><span style="font-family:'Courier New',monospace;font-weight:400;font-size:15px;color:#0077aa;letter-spacing:0.12em;">INDEX</span>
      </div>

      <div style="background:${tierColor};color:#ffffff;display:inline-block;padding:8px 20px;border-radius:6px;margin-bottom:20px;">
        <span style="font-family:'Courier New',monospace;font-size:18px;font-weight:700;">${score}/100</span>
        <span style="font-size:13px;font-weight:600;margin-left:8px;">${tier}</span>
      </div>

      <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 16px;">${greeting}</p>

      <p style="color:#1a1a1a;font-size:15px;line-height:1.7;margin:0 0 16px;">
        ${cityName}, ${state} scores <strong>${score}/100</strong> on the AirIndex UAM Readiness Index, placing it in the <strong>${tier}</strong> tier.
      </p>

      <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 12px;">
        <strong>${achievedCount} of 7</strong> readiness factors met.
      </p>

      ${topGaps.length > 0 ? `
      <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 12px;">
        Key areas for improvement: <strong>${gapLines}</strong>
      </p>` : ""}

      ${peerLine ? `
      <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 24px;">
        ${peerLine}
      </p>` : ""}

      <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 24px;">
        We've prepared a detailed Readiness Gap Report for ${cityName} with specific recommendations for improving your score. We'd welcome 20 minutes to walk through the findings.
      </p>

      <div style="text-align:center;margin:28px 0;">
        <a href="${calendarUrl}" style="display:inline-block;background:#0077aa;color:#ffffff;padding:14px 32px;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none;">Schedule a 20-Minute Conversation</a>
      </div>

      <hr style="border:none;border-top:1px solid #eee;margin:28px 0 16px;" />

      <p style="color:#999;font-size:11px;line-height:1.6;margin:0;">
        AirIndex tracks UAM readiness across 20 US markets. Data as of ${today}.
        <br/>
        <a href="${appUrl}" style="color:#999;text-decoration:underline;">airindex.io</a>
      </p>
    </div>
  `.trim();

  try {
    await sendSesEmail({
      to,
      from,
      subject: `AirIndex rated ${cityName} — here's what we found`,
      html,
    });
    console.log(`[email] Outreach sent to ${to} for ${cityName}`);
    return true;
  } catch (err) {
    console.error("[email] Failed to send outreach:", err);
    return false;
  }
}

// -------------------------------------------------------
// Per-event alert email
// -------------------------------------------------------

interface AlertEmailParams {
  to: string;
  subscriptionId: string;
  cityName: string;
  changeType: string;
  summary: string;
  sourceUrl?: string;
}

export async function sendAlertEmail({
  to,
  subscriptionId,
  cityName,
  changeType,
  summary,
  sourceUrl,
}: AlertEmailParams): Promise<boolean> {
  if (!process.env.SES_ACCESS_KEY_ID) {
    console.log(
      `[email] AWS credentials not configured — skipping alert email to ${to} for ${cityName}`
    );
    return false;
  }

  const from = process.env.ALERT_FROM_EMAIL || "AirIndex <alerts@airindex.io>";
  const appUrl = process.env.APP_URL || "https://www.airindex.io";

  // Generate unsubscribe link
  const token = generateUnsubscribeToken(subscriptionId, to);
  const unsubscribeUrl = `${appUrl}/api/unsubscribe?id=${subscriptionId}&token=${token}`;

  const safeSourceUrl =
    sourceUrl && /^https?:\/\//i.test(sourceUrl) ? sourceUrl : null;
  const sourceLink = safeSourceUrl
    ? `<p style="margin:16px 0 0;"><a href="${safeSourceUrl}" style="color:#0077aa;font-size:13px;text-decoration:none;">View source &rarr;</a></p>`
    : "";

  const html = `
    <div style="background:#ffffff;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;padding:40px 32px;max-width:520px;margin:0 auto;">
      <div style="margin-bottom:32px;">
        <span style="font-family:'Courier New',monospace;font-weight:800;font-size:15px;color:#0a0a1a;letter-spacing:0.12em;">AIR</span><span style="font-family:'Courier New',monospace;font-weight:400;font-size:15px;color:#0077aa;letter-spacing:0.12em;">INDEX</span>
      </div>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:4px 12px;display:inline-block;margin-bottom:16px;">
        <span style="color:#15803d;font-size:11px;font-weight:700;letter-spacing:1px;">${changeType.toUpperCase().replace("_", " ")}</span>
      </div>
      <p style="color:#1a1a1a;font-size:18px;font-weight:700;margin:0 0 12px;">${cityName}</p>
      <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 8px;">${summary}</p>
      ${sourceLink}
      <hr style="border:none;border-top:1px solid #eee;margin:28px 0 16px;" />
      <p style="color:#999;font-size:11px;line-height:1.6;margin:0;">
        You're receiving this because you subscribed to AirIndex alerts.
        <a href="${unsubscribeUrl}" style="color:#999;text-decoration:underline;">Unsubscribe</a>
      </p>
    </div>
  `.trim();

  try {
    await sendSesEmail({
      to,
      from,
      subject: `[AirIndex] ${changeType.replace("_", " ")} — ${cityName}`,
      html,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    console.log(`[email] Alert sent to ${to} for ${cityName}`);
    return true;
  } catch (err) {
    console.error("[email] Failed to send:", err);
    return false;
  }
}

// -------------------------------------------------------
// Weekly digest email
// -------------------------------------------------------

interface DigestEmailParams {
  to: string;
  subscriptionId: string;
  entries: {
    entityName: string;
    changeType: string;
    summary: string;
    sourceUrl?: string;
  }[];
  weekStart: string; // e.g. "Feb 23"
  weekEnd: string; // e.g. "Mar 1"
}

export async function sendDigestEmail({
  to,
  subscriptionId,
  entries,
  weekStart,
  weekEnd,
}: DigestEmailParams): Promise<boolean> {
  if (!process.env.SES_ACCESS_KEY_ID) {
    console.log(
      `[email] AWS credentials not configured — skipping digest email to ${to}`
    );
    return false;
  }

  const from = process.env.ALERT_FROM_EMAIL || "AirIndex <alerts@airindex.io>";
  const appUrl = process.env.APP_URL || "https://www.airindex.io";

  const token = generateUnsubscribeToken(subscriptionId, to);
  const unsubscribeUrl = `${appUrl}/api/unsubscribe?id=${subscriptionId}&token=${token}`;

  const entryRows = entries
    .map((e) => {
      const safeSourceUrl =
        e.sourceUrl && /^https?:\/\//i.test(e.sourceUrl) ? e.sourceUrl : null;
      const sourceLink = safeSourceUrl
        ? ` <a href="${safeSourceUrl}" style="color:#0077aa;font-size:12px;text-decoration:none;">source &rarr;</a>`
        : "";
      return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;padding:2px 8px;display:inline-block;margin-bottom:6px;">
            <span style="color:#15803d;font-size:10px;font-weight:700;letter-spacing:1px;">${e.changeType.toUpperCase().replace("_", " ")}</span>
          </div>
          <p style="color:#1a1a1a;font-size:14px;font-weight:600;margin:0 0 4px;">${e.entityName}</p>
          <p style="color:#555;font-size:13px;line-height:1.6;margin:0;">${e.summary}${sourceLink}</p>
        </td>
      </tr>`;
    })
    .join("");

  const html = `
    <div style="background:#ffffff;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;padding:40px 32px;max-width:560px;margin:0 auto;">
      <div style="margin-bottom:32px;">
        <span style="font-family:'Courier New',monospace;font-weight:800;font-size:15px;color:#0a0a1a;letter-spacing:0.12em;">AIR</span><span style="font-family:'Courier New',monospace;font-weight:400;font-size:15px;color:#0077aa;letter-spacing:0.12em;">INDEX</span>
      </div>
      <p style="color:#1a1a1a;font-size:20px;font-weight:700;margin:0 0 8px;">Weekly Intelligence Digest</p>
      <p style="color:#888;font-size:14px;margin:0 0 24px;">${weekStart} – ${weekEnd}</p>
      <p style="color:#555;font-size:14px;margin:0 0 20px;">${entries.length} update${entries.length === 1 ? "" : "s"} across your subscribed markets</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        ${entryRows}
      </table>
      <div style="text-align:center;margin:32px 0;">
        <a href="${appUrl}" style="display:inline-block;background:#15803d;color:#ffffff;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none;">Open Dashboard</a>
      </div>
      <hr style="border:none;border-top:1px solid #eee;margin:28px 0 16px;" />
      <p style="color:#999;font-size:11px;line-height:1.6;margin:0;">
        You're receiving this weekly digest because you subscribed to AirIndex alerts.
        <a href="${unsubscribeUrl}" style="color:#999;text-decoration:underline;">Unsubscribe</a>
      </p>
    </div>
  `.trim();

  try {
    await sendSesEmail({
      to,
      from,
      subject: `[AirIndex] Weekly Digest — ${weekStart} – ${weekEnd}`,
      html,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    console.log(
      `[email] Digest sent to ${to} (${entries.length} entries)`
    );
    return true;
  } catch (err) {
    console.error("[email] Failed to send digest:", err);
    return false;
  }
}
