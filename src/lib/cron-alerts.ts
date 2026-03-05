import { sendSesEmail } from "@/lib/ses";

/**
 * Send an admin alert email when a cron job fails.
 * Best-effort — never throws, just logs on failure.
 */
export async function alertCronFailure(
  cronName: string,
  error: unknown
): Promise<void> {
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
  const fromEmail = process.env.SES_FROM_EMAIL || "noreply@airindex.io";

  if (!adminEmail || !process.env.SES_ACCESS_KEY_ID) {
    console.error(
      `[cron-alert] Cannot send failure alert for ${cronName} — email not configured`
    );
    return;
  }

  const errorMessage =
    error instanceof Error
      ? `${error.message}\n\n${error.stack || ""}`
      : String(error);
  const timestamp = new Date().toISOString();

  const html = `
    <div style="font-family:monospace;max-width:600px;padding:20px;">
      <h2 style="color:#ff4444;margin:0 0 16px;">Cron Failure: ${cronName}</h2>
      <table style="border-collapse:collapse;width:100%;">
        <tr>
          <td style="padding:8px 12px;color:#999;border-bottom:1px solid #eee;">Time</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${timestamp}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;color:#999;border-bottom:1px solid #eee;">Job</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${cronName}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;color:#999;vertical-align:top;">Error</td>
          <td style="padding:8px 12px;"><pre style="white-space:pre-wrap;margin:0;font-size:12px;color:#cc0000;">${errorMessage}</pre></td>
        </tr>
      </table>
      <p style="color:#999;font-size:11px;margin-top:20px;">
        Sent from AirIndex cron monitoring
      </p>
    </div>
  `.trim();

  try {
    await sendSesEmail({
      to: adminEmail,
      from: fromEmail,
      subject: `[AirIndex] CRON FAILURE: ${cronName}`,
      html,
    });
    console.log(`[cron-alert] Failure alert sent for ${cronName}`);
  } catch (emailErr) {
    console.error(
      `[cron-alert] Failed to send alert email for ${cronName}:`,
      emailErr
    );
  }
}
