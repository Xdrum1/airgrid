import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUnsubscribeToken } from "@/lib/newsletter-token";

export async function POST(req: NextRequest) {
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

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unsubscribe failed" }, { status: 500 });
  }
}
