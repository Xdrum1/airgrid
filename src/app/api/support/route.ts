import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/rate-limit";
import { sendSesEmail } from "@/lib/ses";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Rate limit: 5 per 30 min per user
  const rl = await rateLimit(`support:${session.user.id}`, 5, 30 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests. Please wait before submitting again." }, { status: 429 });
  }

  let body: { category?: string; subject?: string; message?: string; website?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Honeypot
  if (body.website) {
    return NextResponse.json({ ok: true });
  }

  const category = body.category?.trim() || "general";
  const subject = body.subject?.trim() || "";
  const message = body.message?.trim() || "";

  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  if (subject.length > 200 || message.length > 5000 || category.length > 50) {
    return NextResponse.json({ error: "Input too long" }, { status: 400 });
  }

  const userEmail = session.user.email;
  const userTier = (session.user as { tier?: string }).tier ?? "free";
  const supportEmail = process.env.SUPPORT_EMAIL || process.env.ADMIN_NOTIFY_EMAIL;
  const fromEmail = process.env.SES_FROM_EMAIL || "noreply@airindex.io";

  if (!supportEmail) {
    console.error("[support] No SUPPORT_EMAIL or ADMIN_NOTIFY_EMAIL configured");
    return NextResponse.json({ error: "Support is temporarily unavailable" }, { status: 500 });
  }

  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br/>");
  const safeCategory = escapeHtml(category);
  const timestamp = new Date().toISOString();

  const categoryLabels: Record<string, string> = {
    billing: "Billing & Payments",
    technical: "Technical Issue",
    account: "Account & Access",
    data: "Data & Scoring",
    feature: "Feature Request",
    general: "General",
  };

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;padding:20px;">
      <h2 style="color:#5B8DB8;margin:0 0 16px;font-size:16px;">Support Request</h2>
      <table style="border-collapse:collapse;width:100%;">
        <tr><td style="padding:8px 12px;color:#999;border-bottom:1px solid #eee;width:120px;">From</td><td style="padding:8px 12px;border-bottom:1px solid #eee;"><a href="mailto:${escapeHtml(userEmail)}">${escapeHtml(userEmail)}</a></td></tr>
        <tr><td style="padding:8px 12px;color:#999;border-bottom:1px solid #eee;">Plan</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(userTier)}</td></tr>
        <tr><td style="padding:8px 12px;color:#999;border-bottom:1px solid #eee;">Category</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${categoryLabels[category] || safeCategory}</td></tr>
        ${subject ? `<tr><td style="padding:8px 12px;color:#999;border-bottom:1px solid #eee;">Subject</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${safeSubject}</td></tr>` : ""}
        <tr><td style="padding:8px 12px;color:#999;vertical-align:top;">Message</td><td style="padding:8px 12px;">${safeMessage}</td></tr>
      </table>
      <p style="color:#999;font-size:11px;margin-top:20px;">Submitted ${timestamp} · User ID: ${session.user.id}</p>
    </div>
  `.trim();

  try {
    await sendSesEmail({
      to: supportEmail,
      from: fromEmail,
      subject: `[Support] ${categoryLabels[category] || category}${subject ? `: ${subject}` : ""} — ${userEmail}`,
      html,
      headers: {
        "Reply-To": userEmail,
      },
    });
  } catch (err) {
    console.error("[support] Failed to send support email:", err);
    return NextResponse.json({ error: "Failed to send. Please try again or email support@airindex.io directly." }, { status: 500 });
  }

  // Send confirmation to user
  try {
    const appUrl = process.env.APP_URL || "https://www.airindex.io";
    await sendSesEmail({
      to: userEmail,
      from: `AirIndex Support <${fromEmail}>`,
      subject: "We received your support request — AirIndex",
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:32px 20px;color:#333;">
          <img src="${appUrl}/images/logo/airindex-wordmark.svg" alt="AirIndex" style="height:28px;margin-bottom:32px;" />
          <h2 style="font-size:18px;margin:0 0 16px;color:#111;">We got your message</h2>
          <p style="font-size:14px;line-height:1.6;margin:0 0 16px;">
            Thanks for reaching out. We'll get back to you within 24 hours.
          </p>
          <div style="background:#f5f5f5;border-radius:6px;padding:16px;margin:0 0 24px;">
            <p style="font-size:12px;color:#666;margin:0 0 4px;"><strong>Category:</strong> ${categoryLabels[category] || category}</p>
            ${subject ? `<p style="font-size:12px;color:#666;margin:0 0 4px;"><strong>Subject:</strong> ${safeSubject}</p>` : ""}
            <p style="font-size:12px;color:#666;margin:0;">${safeMessage.slice(0, 200)}${message.length > 200 ? "..." : ""}</p>
          </div>
          <p style="font-size:12px;line-height:1.6;margin:0;color:#888;">
            You can also reply to this email if you need to add anything.
          </p>
        </div>
      `.trim(),
      headers: {
        "Reply-To": supportEmail,
      },
    });
  } catch {
    // Non-critical — don't fail the request
  }

  return NextResponse.json({ ok: true });
}
