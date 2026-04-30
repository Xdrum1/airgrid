import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyClickToken, verifyTrackingToken } from "@/lib/newsletter-token";

// Hosts allowed for redirects validated by the legacy non-URL-bound token format.
// Existing emails sent before the Apr 30 2026 click-token-binding fix carry
// (email, issue)-only tokens; they continue to work but only for redirects to
// airindex.io itself. After ~30 days (most-recent legacy email's clicks
// settled), this fallback can be removed entirely.
const LEGACY_REDIRECT_ALLOWED_HOSTS = new Set([
  "airindex.io",
  "www.airindex.io",
]);

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("e");
  const issue = parseInt(req.nextUrl.searchParams.get("i") ?? "0", 10);
  const token = req.nextUrl.searchParams.get("t");
  const url = req.nextUrl.searchParams.get("url");
  const series = req.nextUrl.searchParams.get("s") ?? "newsletter";

  // New (URL-bound) verifier first; falls back to legacy non-URL-bound only
  // when the destination is on an airindex.io host (closes the open-redirect
  // attack while keeping already-sent emails functional).
  let isValid = false;
  if (email && issue && token && url) {
    if (verifyClickToken(email, issue, url, token)) {
      isValid = true;
    } else if (verifyTrackingToken(email, issue, token)) {
      try {
        const parsed = new URL(url);
        isValid = LEGACY_REDIRECT_ALLOWED_HOSTS.has(parsed.host);
      } catch {
        isValid = false;
      }
    }
  }

  if (!isValid) {
    return NextResponse.redirect("https://www.airindex.io");
  }

  try {
    await prisma.newsletterEvent.create({
      data: {
        series,
        email: email!,
        issue,
        event: "click",
        url: url!,
        userAgent: req.headers.get("user-agent") ?? undefined,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
      },
    });
  } catch {
    // Don't fail the redirect on DB errors
  }

  // Redirect to destination
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
