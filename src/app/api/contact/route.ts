import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/admin-helpers";
import { sendSesEmail } from "@/lib/ses";
import { prisma } from "@/lib/prisma";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // Rate limit: 3 submissions per 15 minutes
  const rl = await rateLimit(`contact-form:${ip}`, 3, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { name, email, company, role, tier, message, website } = body as {
      name: string;
      email: string;
      company?: string;
      role?: string;
      tier?: string;
      message?: string;
      website?: string;
    };

    // Honeypot — hidden field that only bots fill in
    if (website) {
      // Return success to avoid revealing detection
      console.log(`[contact] Bot detected (honeypot filled) from ${ip}`);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    if (!EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    // Enforce field length limits
    if (name.length > 200 || email.length > 320 || (company && company.length > 200) ||
        (role && role.length > 200) || (message && message.length > 5000)) {
      return NextResponse.json({ error: "Input too long" }, { status: 400 });
    }

    // Persist to DB
    await prisma.contactInquiry.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        company: company?.trim() || null,
        role: role?.trim() || null,
        tier: tier || "pro",
        message: message?.trim() || null,
      },
    });

    // Send admin notification email (best-effort, don't block on failure)
    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
    const fromEmail = process.env.SES_FROM_EMAIL || "noreply@airindex.io";

    if (adminEmail) {
      const safeName = escapeHtml(name);
      const safeEmail = escapeHtml(email);
      const safeCompany = company ? escapeHtml(company) : "";
      const safeRole = role ? escapeHtml(role) : "";
      const safeTier = escapeHtml(tier || "not specified");
      const safeMessage = message ? escapeHtml(message) : "";

      const html = `
        <div style="font-family: monospace; max-width: 600px;">
          <h2 style="color: #00d4ff;">New AirIndex Inquiry</h2>
          <table style="border-collapse: collapse; width: 100%;">
            <tr><td style="padding: 8px 12px; color: #999; border-bottom: 1px solid #222;">Name</td><td style="padding: 8px 12px; border-bottom: 1px solid #222;">${safeName}</td></tr>
            <tr><td style="padding: 8px 12px; color: #999; border-bottom: 1px solid #222;">Email</td><td style="padding: 8px 12px; border-bottom: 1px solid #222;"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
            ${safeCompany ? `<tr><td style="padding: 8px 12px; color: #999; border-bottom: 1px solid #222;">Company</td><td style="padding: 8px 12px; border-bottom: 1px solid #222;">${safeCompany}</td></tr>` : ""}
            ${safeRole ? `<tr><td style="padding: 8px 12px; color: #999; border-bottom: 1px solid #222;">Role</td><td style="padding: 8px 12px; border-bottom: 1px solid #222;">${safeRole}</td></tr>` : ""}
            <tr><td style="padding: 8px 12px; color: #999; border-bottom: 1px solid #222;">Tier</td><td style="padding: 8px 12px; border-bottom: 1px solid #222;">${safeTier}</td></tr>
            ${safeMessage ? `<tr><td style="padding: 8px 12px; color: #999; border-bottom: 1px solid #222;">Message</td><td style="padding: 8px 12px; border-bottom: 1px solid #222;">${safeMessage}</td></tr>` : ""}
          </table>
          <p style="color: #666; font-size: 11px; margin-top: 20px;">Sent from airindex.io/contact</p>
        </div>
      `;

      try {
        await sendSesEmail({
          to: adminEmail,
          from: fromEmail,
          subject: `AirIndex Inquiry: ${tier || "General"} — ${name} (${company || "Individual"})`,
          html,
        });
      } catch (emailErr) {
        console.error("[contact] Email notification failed (inquiry still saved):", emailErr);
      }
    } else {
      console.log("[contact] ADMIN_NOTIFY_EMAIL not configured — skipping email");
    }

    // Send tier-specific confirmation email to the user (best-effort)
    if (fromEmail) {
      const appUrl = process.env.APP_URL || "https://www.airindex.io";
      const firstName = name.trim().split(/\s+/)[0];

      const tierConfirm: Record<string, { subject: string; heading: string; body: string; cta: { label: string; href: string } }> = {
        pro: {
          subject: "You're on the Pro waitlist — AirIndex",
          heading: `${firstName}, you're on the list.`,
          body: "We'll notify you as soon as Pro launches. In the meantime, all platform features are available free during beta — market readiness scores, corridor tracking, regulatory filings, and more across 20+ US markets.",
          cta: { label: "Explore the Dashboard", href: `${appUrl}/dashboard` },
        },
        institutional: {
          subject: "We received your inquiry — AirIndex",
          heading: `Thanks, ${firstName}.`,
          body: "We've received your inquiry about AirIndex Institutional. Our team will reach out within 48 hours to learn more about your use case and walk you through what's available — monthly reports, API access, data exports, and priority support.",
          cta: { label: "View the Dashboard", href: `${appUrl}/dashboard` },
        },
        enterprise: {
          subject: "We received your inquiry — AirIndex",
          heading: `Thanks, ${firstName}.`,
          body: "We've received your inquiry about AirIndex Enterprise. Our team will reach out within 48 hours to discuss your requirements — unlimited API access, white-label data feeds, custom market coverage, and dedicated support.",
          cta: { label: "View the Dashboard", href: `${appUrl}/dashboard` },
        },
      };

      const confirm = tierConfirm[tier || "pro"] || tierConfirm.pro;

      try {
        await sendSesEmail({
          to: email,
          from: fromEmail,
          subject: confirm.subject,
          html: `
            <div style="background:#ffffff;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;padding:40px 32px;max-width:520px;margin:0 auto;">
              <div style="margin-bottom:32px;">
                <span style="font-family:'Courier New',monospace;font-weight:800;font-size:15px;color:#0a0a1a;letter-spacing:0.12em;">AIR</span><span style="font-family:'Courier New',monospace;font-weight:400;font-size:15px;color:#0077aa;letter-spacing:0.12em;">INDEX</span>
              </div>
              <p style="color:#333;font-size:18px;font-weight:700;line-height:1.4;margin:0 0 16px;">
                ${confirm.heading}
              </p>
              <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 24px;">
                ${confirm.body}
              </p>
              <a href="${confirm.cta.href}" style="display:inline-block;padding:12px 28px;background:#00d4ff;color:#050508;font-size:13px;font-weight:700;text-decoration:none;border-radius:6px;">
                ${confirm.cta.label}
              </a>
              <p style="color:#bbb;font-size:11px;margin-top:32px;line-height:1.6;">
                AirIndex — the independent readiness rating system for urban air mobility.
              </p>
            </div>
          `.trim(),
        });
      } catch (emailErr) {
        console.error("[contact] User confirmation email failed:", emailErr);
      }
    }

    console.log(`[contact] Inquiry from ${email} (${tier}) at ${new Date().toISOString()}`);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[contact] Error:", err);
    return NextResponse.json({ error: "Failed to send inquiry" }, { status: 500 });
  }
}
