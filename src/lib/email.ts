interface AlertEmailParams {
  to: string;
  cityName: string;
  changeType: string;
  summary: string;
  sourceUrl?: string;
}

export async function sendAlertEmail({
  to,
  cityName,
  changeType,
  summary,
  sourceUrl,
}: AlertEmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(
      `[email] RESEND_API_KEY not configured — skipping alert email to ${to} for ${cityName}`
    );
    return false;
  }

  const sourceLink = sourceUrl
    ? `<p style="margin:16px 0 0"><a href="${sourceUrl}" style="color:#00d4ff;font-size:12px;">View source →</a></p>`
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
      <p style="color:#333;font-size:10px;margin-top:24px;">You're receiving this because you subscribed to AirIndex alerts.</p>
    </div>
  `.trim();

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "AirIndex <alerts@updates.airgrid.io>",
        to,
        subject: `[AirIndex] ${changeType.replace("_", " ")} — ${cityName}`,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[email] Resend API error ${res.status}: ${body}`);
      return false;
    }

    console.log(`[email] Alert sent to ${to} for ${cityName}`);
    return true;
  } catch (err) {
    console.error("[email] Failed to send:", err);
    return false;
  }
}
