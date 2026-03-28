import { createHash } from "crypto";
import { UAParser } from "ua-parser-js";
import { prisma } from "@/lib/prisma";
import { sendSesEmail } from "@/lib/ses";
import { createLogger } from "@/lib/logger";

const logger = createLogger("login-events");

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Generate a fingerprint from user-agent + IP /24 subnet.
 * Same user on the same network with minor DHCP changes won't trigger alerts.
 */
export function generateFingerprint(userAgent: string, ip: string): string {
  const subnet = ip.includes(":")
    ? ip.split(":").slice(0, 4).join(":") // IPv6: /64
    : ip.split(".").slice(0, 3).join("."); // IPv4: /24
  const raw = `${userAgent}|${subnet}`;
  return createHash("sha256").update(raw).digest("hex");
}

/** Parse user-agent into structured device info. */
export function parseDevice(userAgent: string | null) {
  if (!userAgent) return { deviceType: "Unknown", browser: null, os: null };
  const parser = new UAParser(userAgent);
  const device = parser.getDevice();
  const browser = parser.getBrowser();
  const os = parser.getOS();

  // ua-parser-js leaves device.type undefined for desktops
  const deviceType = device.type
    ? device.type.charAt(0).toUpperCase() + device.type.slice(1)
    : "Desktop";

  const browserStr = browser.name
    ? `${browser.name}${browser.version ? " " + browser.version : ""}`
    : null;
  const osStr = os.name
    ? `${os.name}${os.version ? " " + os.version : ""}`
    : null;

  return { deviceType, browser: browserStr, os: osStr };
}

/**
 * Record a login event and send notification if the device is new.
 * Fire-and-forget — failures are logged but never block auth.
 */
export async function recordLoginEvent(params: {
  userId: string;
  email: string;
  ip: string;
  userAgent: string | null;
}): Promise<void> {
  const { userId, email, ip, userAgent } = params;

  try {
    const fingerprintHash = generateFingerprint(userAgent ?? "", ip);
    const { deviceType, browser, os } = parseDevice(userAgent);

    // Check if this fingerprint has been seen before for this user
    const [existingFingerprint, totalEvents] = await Promise.all([
      prisma.loginEvent.findFirst({
        where: { userId, fingerprintHash },
        select: { id: true },
      }),
      prisma.loginEvent.count({ where: { userId } }),
    ]);

    const isNewDevice = !existingFingerprint && totalEvents > 0;

    // Record the login event
    const event = await prisma.loginEvent.create({
      data: {
        userId,
        ip,
        userAgent,
        fingerprintHash,
        deviceType,
        browser,
        os,
        isNewDevice,
      },
    });

    // Send notification if new device (not the very first login)
    if (isNewDevice) {
      await sendNewDeviceNotification({
        to: email,
        ip,
        deviceType,
        browser,
        os,
        timestamp: event.createdAt,
      });

      await prisma.loginEvent.update({
        where: { id: event.id },
        data: { notifiedAt: new Date() },
      });

      logger.warn(`New device login for ${email} from ${ip} (${deviceType}, ${browser})`);
    } else {
      logger.info(`Login recorded for ${email} — ${totalEvents === 0 ? "first login" : "known device"}`);
    }
  } catch (err) {
    logger.error(`Failed to record login event for ${email}:`, err);
  }
}

async function sendNewDeviceNotification(params: {
  to: string;
  ip: string;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  timestamp: Date;
}): Promise<void> {
  const from = process.env.SES_FROM_EMAIL || "AirIndex <auth@airindex.io>";
  const { to, ip, deviceType, browser, os, timestamp } = params;
  const timeStr = timestamp.toUTCString();
  const deviceStr = [browser, os].filter(Boolean).join(" on ") || deviceType || "Unknown device";

  const html = `
    <div style="background:#ffffff;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;padding:40px 32px;max-width:520px;margin:0 auto;">
      <div style="margin-bottom:32px;">
        <span style="font-family:'Courier New',monospace;font-weight:800;font-size:15px;color:#0a0a1a;letter-spacing:0.12em;">AIR</span><span style="font-family:'Courier New',monospace;font-weight:400;font-size:15px;color:#0077aa;letter-spacing:0.12em;">INDEX</span>
      </div>
      <p style="color:#d94040;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 16px;">
        New Device Login Detected
      </p>
      <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 24px;">
        Your AirIndex account was accessed from a device we don't recognize.
      </p>
      <div style="background:#f8f9fa;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:0 0 24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#888;font-size:12px;padding:6px 0;vertical-align:top;width:100px;">Account</td>
            <td style="color:#0077aa;font-size:13px;padding:6px 0;">${escapeHtml(to)}</td>
          </tr>
          <tr>
            <td style="color:#888;font-size:12px;padding:6px 0;vertical-align:top;">Method</td>
            <td style="color:#333;font-size:13px;padding:6px 0;">Magic Link</td>
          </tr>
          <tr>
            <td style="color:#888;font-size:12px;padding:6px 0;vertical-align:top;">Device</td>
            <td style="color:#333;font-size:13px;padding:6px 0;">${escapeHtml(deviceStr)}</td>
          </tr>
          <tr>
            <td style="color:#888;font-size:12px;padding:6px 0;vertical-align:top;">IP Address</td>
            <td style="color:#333;font-size:13px;padding:6px 0;">${escapeHtml(ip)}</td>
          </tr>
          <tr>
            <td style="color:#888;font-size:12px;padding:6px 0;vertical-align:top;">Time</td>
            <td style="color:#333;font-size:13px;padding:6px 0;">${timeStr}</td>
          </tr>
        </table>
      </div>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
        <p style="color:#d94040;font-size:13px;font-weight:600;margin:0 0 8px;">If this wasn't you</p>
        <p style="color:#777;font-size:12px;line-height:1.6;margin:0;">
          Someone may have accessed your account. Contact us immediately at
          <a href="mailto:support@airindex.io" style="color:#0077aa;text-decoration:none;">support@airindex.io</a>
          and we'll secure your account.
        </p>
      </div>
      <p style="color:#999;font-size:11px;line-height:1.6;margin:0;">
        This is an automated security notification from AirIndex. You received this because a sign-in was detected from an unrecognized device.
      </p>
    </div>
  `.trim();

  await sendSesEmail({
    to,
    from,
    subject: "New device sign-in to your AirIndex account",
    html,
  });
}
