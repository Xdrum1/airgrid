import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTrackingToken } from "@/lib/newsletter-token";

// 1x1 transparent PNG
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("e");
  const issue = parseInt(req.nextUrl.searchParams.get("i") ?? "0", 10);
  const token = req.nextUrl.searchParams.get("t");
  const series = req.nextUrl.searchParams.get("s") ?? "newsletter";

  if (email && issue && token && verifyTrackingToken(email, issue, token)) {
    try {
      await prisma.newsletterEvent.create({
        data: {
          series,
          email,
          issue,
          event: "open",
          userAgent: req.headers.get("user-agent") ?? undefined,
          ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
        },
      });
    } catch {
      // Don't fail the pixel response on DB errors
    }
  }

  return new Response(PIXEL, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}
