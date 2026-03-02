import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/admin-helpers";
import { sendSesEmail } from "@/lib/ses";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // Rate limit: 3 submissions per 15 minutes
  const rl = await rateLimit(`contact-form:${ip}`, 3, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { name, email, company, role, tier, message } = body as {
      name: string;
      email: string;
      company?: string;
      role?: string;
      tier?: string;
      message?: string;
    };

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
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
      const html = `
        <div style="font-family: monospace; max-width: 600px;">
          <h2 style="color: #00d4ff;">New AirIndex Inquiry</h2>
          <table style="border-collapse: collapse; width: 100%;">
            <tr><td style="padding: 8px 12px; color: #999; border-bottom: 1px solid #222;">Name</td><td style="padding: 8px 12px; border-bottom: 1px solid #222;">${name}</td></tr>
            <tr><td style="padding: 8px 12px; color: #999; border-bottom: 1px solid #222;">Email</td><td style="padding: 8px 12px; border-bottom: 1px solid #222;"><a href="mailto:${email}">${email}</a></td></tr>
            ${company ? `<tr><td style="padding: 8px 12px; color: #999; border-bottom: 1px solid #222;">Company</td><td style="padding: 8px 12px; border-bottom: 1px solid #222;">${company}</td></tr>` : ""}
            ${role ? `<tr><td style="padding: 8px 12px; color: #999; border-bottom: 1px solid #222;">Role</td><td style="padding: 8px 12px; border-bottom: 1px solid #222;">${role}</td></tr>` : ""}
            <tr><td style="padding: 8px 12px; color: #999; border-bottom: 1px solid #222;">Tier</td><td style="padding: 8px 12px; border-bottom: 1px solid #222;">${tier || "not specified"}</td></tr>
            ${message ? `<tr><td style="padding: 8px 12px; color: #999; border-bottom: 1px solid #222;">Message</td><td style="padding: 8px 12px; border-bottom: 1px solid #222;">${message}</td></tr>` : ""}
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

    console.log(`[contact] Inquiry from ${email} (${tier}) at ${new Date().toISOString()}`);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[contact] Error:", err);
    return NextResponse.json({ error: "Failed to send inquiry" }, { status: 500 });
  }
}
