import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-helpers";
import { renderPdf } from "@/lib/pdf-generator";

export const runtime = "nodejs";
export const maxDuration = 90; // PDFs can take a while

/**
 * Admin-only PDF rendering endpoint.
 *
 * Usage:
 *   GET /api/admin/render-pdf?route=/reports/briefing/miami&filename=miami-briefing.pdf
 *
 * Forwards the admin's session cookie so session-gated routes render correctly.
 */
export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const route = searchParams.get("route");
  const filenameParam = searchParams.get("filename");
  const format = (searchParams.get("format") as "Letter" | "A4" | undefined) ?? "Letter";

  if (!route) {
    return NextResponse.json(
      { error: "route query param required, e.g. ?route=/reports/briefing/miami" },
      { status: 400 },
    );
  }

  // Only allow same-origin paths — never let an admin print a third-party URL
  if (!route.startsWith("/")) {
    return NextResponse.json({ error: "route must be a path starting with /" }, { status: 400 });
  }

  // Filename sanitation — strip anything that could break Content-Disposition
  const safeFilename = (filenameParam || `airindex-${route.replace(/[^a-z0-9]+/gi, "-")}.pdf`)
    .replace(/[^a-z0-9._-]+/gi, "-")
    .slice(0, 200);

  const cookies = request.headers.get("cookie") || undefined;

  try {
    const pdf = await renderPdf({ url: route, cookies, format });

    // Convert Uint8Array to Buffer for NextResponse
    const buffer = Buffer.from(pdf);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFilename}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[render-pdf] failed:", err);
    const msg = err instanceof Error ? err.message : "PDF render failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
