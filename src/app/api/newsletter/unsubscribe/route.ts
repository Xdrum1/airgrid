import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { verifyUnsubscribeToken } from "@/lib/newsletter-token";
import { sendSesEmail } from "@/lib/ses";

const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || "alan@airindex.io";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimit(`unsub:${ip}`, 10, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  try {
    const { email, token } = await req.json();

    if (!email || !token) {
      return NextResponse.json({ error: "Missing email or token" }, { status: 400 });
    }

    if (!verifyUnsubscribeToken(email, token)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    await prisma.user.update({
      where: { email },
      data: { newsletterOptOut: true },
    });

    // Notify admin
    const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    sendSesEmail({
      to: ADMIN_EMAIL,
      from: "AirIndex <hello@airindex.io>",
      subject: `Newsletter Unsubscribe: ${email}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;padding:24px;">
          <p style="color:#333;font-size:14px;margin:0 0 12px;"><strong>${email}</strong> unsubscribed from UAM Market Pulse on ${date}.</p>
          <p style="color:#888;font-size:12px;margin:0;">They will no longer receive weekly newsletters. Their AirIndex account remains active.</p>
        </div>
      `,
    }).catch(() => {}); // Fire and forget — don't block the user's unsubscribe

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unsubscribe failed" }, { status: 500 });
  }
}
