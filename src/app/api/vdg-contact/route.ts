import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/admin-helpers";
import { sendSesEmail } from "@/lib/ses";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ALLOWED_ORIGINS = [
  "https://verticaldatagroup.com",
  "https://www.verticaldatagroup.com",
];

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);
  const ip = getClientIp(request);

  // Rate limit: 3 submissions per 15 minutes
  const rl = await rateLimit(`vdg-contact:${ip}`, 3, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429, headers });
  }

  try {
    const body = await request.json();
    const { name, email, type, message, website } = body as {
      name: string;
      email: string;
      type: string;
      message: string;
      website?: string;
    };

    // Honeypot — hidden field that only bots fill in
    if (website) {
      console.log(`[vdg-contact] Bot detected (honeypot) from ${ip}`);
      return NextResponse.json({ ok: true }, { status: 200, headers });
    }

    if (!name?.trim() || !email?.trim() || !type?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400, headers });
    }

    if (!EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400, headers });
    }

    if (name.length > 200 || email.length > 320 || type.length > 50 || message.length > 5000) {
      return NextResponse.json({ error: "Input too long" }, { status: 400, headers });
    }

    const fromEmail = process.env.SES_FROM_EMAIL || "noreply@airindex.io";
    const adminEmail = "alan@airindex.io";

    const typeLabels: Record<string, string> = {
      general: "General Inquiry",
      partnership: "Data Partnership & API",
      federal: "Federal & Grant Inquiry",
      press: "Press",
    };

    const safeName = escapeHtml(name.trim());
    const safeEmail = escapeHtml(email.trim());
    const safeType = escapeHtml(typeLabels[type] || type);
    const safeMessage = escapeHtml(message.trim()).replace(/\n/g, "<br>");

    const html = `
      <div style="font-family: monospace; max-width: 600px;">
        <h2 style="color: #00c8f0;">VDG Contact Form</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td style="padding: 8px 12px; color: #999; border-bottom: 1px solid #222;">Name</td><td style="padding: 8px 12px; border-bottom: 1px solid #222;">${safeName}</td></tr>
          <tr><td style="padding: 8px 12px; color: #999; border-bottom: 1px solid #222;">Email</td><td style="padding: 8px 12px; border-bottom: 1px solid #222;"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
          <tr><td style="padding: 8px 12px; color: #999; border-bottom: 1px solid #222;">Type</td><td style="padding: 8px 12px; border-bottom: 1px solid #222;">${safeType}</td></tr>
          <tr><td style="padding: 8px 12px; color: #999; border-bottom: 1px solid #222;">Message</td><td style="padding: 8px 12px; border-bottom: 1px solid #222;">${safeMessage}</td></tr>
        </table>
        <p style="color: #666; font-size: 11px; margin-top: 20px;">Sent from verticaldatagroup.com</p>
      </div>
    `;

    await sendSesEmail({
      to: adminEmail,
      from: fromEmail,
      subject: `VDG Inquiry: ${safeType} — ${name.trim()}`,
      html,
    });

    console.log(`[vdg-contact] Inquiry from ${email} (${type}) at ${new Date().toISOString()}`);

    return NextResponse.json({ ok: true }, { status: 200, headers });
  } catch (err) {
    console.error("[vdg-contact] Error:", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500, headers });
  }
}
