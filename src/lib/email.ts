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
    ? `<p style="margin:16px 0 0"><a href="${sourceUrl}" style="color:#00d4ff;font-size:12px;">View source &rarr;</a></p>`
    : "";

  const html = `
    <div style="background:#050508;color:#fff;font-family:'Courier New',monospace;padding:32px;max-width:520px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px;">
        <span style="font-weight:800;font-size:16px;letter-spacing:-0.5px;">AIRINDEX</span>
        <span style="color:#555;font-size:9px;letter-spacing:2px;">ALERT</span>
      </div>
      <div style="border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:20px;background:rgba(255,255,255,0.02);">
        <div style="color:#00ff88;font-size:10px;letter-spacing:2px;margin-bottom:8px;">${changeType.toUpperCase().replace("_", " ")}</div>
        <div style="font-size:18px;font-weight:700;margin-bottom:12px;">${cityName}</div>
        <p style="color:#999;font-size:13px;line-height:1.6;margin:0;">${summary}</p>
        ${sourceLink}
      </div>
      <p style="color:#333;font-size:10px;margin-top:24px;">
        You're receiving this because you subscribed to AirIndex alerts.
        <a href="${unsubscribeUrl}" style="color:#555;text-decoration:underline;">Unsubscribe</a>
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
