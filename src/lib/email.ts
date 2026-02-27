import { sendSesEmail } from "@/lib/ses";
import { generateUnsubscribeToken } from "@/lib/unsubscribe-token";

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
  const appUrl = process.env.AUTH_URL || "https://airindex.io";

  // Generate unsubscribe link
  const token = generateUnsubscribeToken(subscriptionId, to);
  const unsubscribeUrl = `${appUrl}/api/unsubscribe?id=${subscriptionId}&token=${token}`;

  const sourceLink = sourceUrl
    ? `<p style="margin:16px 0 0;"><a href="${sourceUrl}" style="color:#0077aa;font-size:13px;text-decoration:none;">View source &rarr;</a></p>`
    : "";

  const html = `
    <div style="background:#ffffff;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;padding:40px 32px;max-width:520px;margin:0 auto;">
      <div style="margin-bottom:32px;">
        <img src="https://www.airindex.io/images/logo/airindex-wordmark-light.png" alt="AirIndex" width="160" height="35" style="display:block;" />
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
