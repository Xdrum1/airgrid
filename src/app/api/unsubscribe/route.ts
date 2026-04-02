import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token";

/**
 * Token-based unsubscribe — no login required.
 * Used by one-click unsubscribe links in alert emails.
 *
 * GET /api/unsubscribe?id=SUB_ID&token=HMAC_TOKEN
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");
  const token = searchParams.get("token");

  if (!id || !token) {
    return NextResponse.json(
      { error: "Missing id or token" },
      { status: 400 }
    );
  }

  try {
    const sub = await prisma.subscription.findUnique({
      where: { id },
      include: { user: { select: { email: true } } },
    });

    if (!sub) {
      // Already unsubscribed or invalid — show success anyway
      return new NextResponse(unsubscribedHtml(), {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (!verifyUnsubscribeToken(token, id, sub.user.email)) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 403 }
      );
    }

    await prisma.subscription.delete({ where: { id } });
    console.log(`[unsubscribe] Removed subscription ${id} for ${sub.user.email}`);

    return new NextResponse(unsubscribedHtml(), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    console.error("[API /unsubscribe] Error:", err);
    return NextResponse.json(
      { error: "Failed to unsubscribe" },
      { status: 500 }
    );
  }
}

function unsubscribedHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed — AirIndex</title></head>
<body style="margin:0;background:#050508;color:#fff;font-family:Arial,Helvetica,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="text-align:center;max-width:400px;padding:32px;">
    <div style="font-weight:800;font-size:20px;letter-spacing:-0.5px;margin-bottom:24px;">AIRINDEX</div>
    <p style="color:#00ff88;font-size:14px;font-weight:600;margin:0 0 12px;">You've been unsubscribed.</p>
    <p style="color:#888;font-size:13px;line-height:1.6;margin:0 0 24px;">You will no longer receive alert emails for this subscription.</p>
    <a href="/dashboard" style="color:#5B8DB8;font-size:12px;text-decoration:none;">Back to Dashboard</a>
  </div>
</body>
</html>`;
}
