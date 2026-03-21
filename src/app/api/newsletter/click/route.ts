import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTrackingToken } from "@/lib/newsletter-token";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("e");
  const issue = parseInt(req.nextUrl.searchParams.get("i") ?? "0", 10);
  const token = req.nextUrl.searchParams.get("t");
  const url = req.nextUrl.searchParams.get("url");

  if (email && issue && token && url && verifyTrackingToken(email, issue, token)) {
    try {
      await prisma.newsletterEvent.create({
        data: {
          email,
          issue,
          event: "click",
          url,
          userAgent: req.headers.get("user-agent") ?? undefined,
          ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
        },
      });
    } catch {
      // Don't fail the redirect on DB errors
    }
  }

  // Redirect to destination (or fallback to homepage)
  const destination = url || "https://www.airindex.io";
  const fallback = "https://www.airindex.io";

  // Validate URL — HMAC token proves this URL was generated server-side,
  // but still block dangerous protocols (javascript:, data:, etc.)
  try {
    const parsed = new URL(destination);
    if (!["https:", "http:"].includes(parsed.protocol)) {
      return NextResponse.redirect(fallback);
    }
  } catch {
    return NextResponse.redirect(fallback);
  }

  return NextResponse.redirect(destination);
}
