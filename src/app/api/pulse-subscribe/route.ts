import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

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

    // Upsert — if they already subscribed, update their info
    await prisma.pulseSubscriber.upsert({
      where: { email: email.trim().toLowerCase() },
      create: {
        name: name.trim(),
        organization: (organization ?? "").trim(),
        email: email.trim().toLowerCase(),
        source: source ?? "homepage",
      },
      update: {
        name: name.trim(),
        organization: (organization ?? "").trim(),
        unsubscribedAt: null, // Re-subscribe if they had unsubscribed
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[pulse-subscribe] Error:", err);
    return NextResponse.json({ error: "Subscription failed" }, { status: 500 });
  }
}
