import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { sendSesEmail } from "@/lib/ses";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * Find the latest Pulse HTML file in public/docs/ for the welcome email.
 */
function getLatestPulseHtml(): { html: string; issue: number } | null {
  try {
    const docsDir = join(process.cwd(), "public/docs");
    const files = readdirSync(docsDir)
      .filter((f) => f.startsWith("UAM_Market_Pulse_Issue") && f.endsWith(".html"))
      .sort()
      .reverse();

    if (files.length === 0) return null;

    const latest = files[0];
    const issueMatch = latest.match(/Issue(\d+)/);
    const issue = issueMatch ? parseInt(issueMatch[1]) : 0;
    const html = readFileSync(join(docsDir, latest), "utf-8");

    return { html, issue };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimit(`pulse-sub:${ip}`, 5, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { name, organization, email, source, website } = body as {
      name?: string;
      organization?: string;
      email?: string;
      source?: string;
      website?: string; // honeypot
    };

    // Honeypot check
    if (website) {
      return NextResponse.json({ success: true }); // Silent success for bots
    }

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if this is a new subscriber vs returning
    const existing = await prisma.pulseSubscriber.findUnique({
      where: { email: cleanEmail },
    });
    const isNew = !existing || existing.unsubscribedAt !== null;

    // Upsert — if they already subscribed, update their info
    await prisma.pulseSubscriber.upsert({
      where: { email: cleanEmail },
      create: {
        name: name.trim(),
        organization: (organization ?? "").trim(),
        email: cleanEmail,
        source: source ?? "homepage",
      },
      update: {
        name: name.trim(),
        organization: (organization ?? "").trim(),
        unsubscribedAt: null, // Re-subscribe if they had unsubscribed
      },
    });

    // Send the latest Pulse as a welcome email for new subscribers
    if (isNew) {
      const pulse = getLatestPulseHtml();
      if (pulse) {
        sendSesEmail({
          to: cleanEmail,
          from: "AirIndex <hello@airindex.io>",
          subject: `Welcome to Market Pulse — Here\u2019s Issue ${pulse.issue}`,
          html: pulse.html,
        }).catch((err) => {
          console.error(`[pulse-subscribe] Welcome email failed for ${cleanEmail}:`, err);
        }); // Fire and forget — don't block the subscribe response
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[pulse-subscribe] Error:", err);
    return NextResponse.json({ error: "Subscription failed" }, { status: 500 });
  }
}
