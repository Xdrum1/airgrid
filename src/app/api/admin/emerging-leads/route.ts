import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getClientIp } from "@/lib/admin-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { getEmergingLeads, aggregateEmergingLeads } from "@/lib/emerging-leads";

/**
 * GET /api/admin/emerging-leads
 * Query params: ?domain=...&status=...
 *
 * Returns aggregated city/domain leads from the stealth emerging pipeline.
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const ip = getClientIp(request);
  const rl = await rateLimit(`admin-emerging-leads-get:${ip}`, 30, 5 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  try {
    const url = request.nextUrl;
    const domain = url.searchParams.get("domain") || undefined;
    const status = url.searchParams.get("status") || undefined;

    const leads = await getEmergingLeads({ domain, status });
    return NextResponse.json({ data: leads, count: leads.length });
  } catch (err) {
    console.error("[admin/emerging-leads] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch emerging leads" }, { status: 500 });
  }
}

/**
 * POST /api/admin/emerging-leads
 * Manually trigger lead aggregation across the stealth domains.
 */
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const rl = await rateLimit("admin-emerging-leads-agg", 5, 5 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  try {
    const result = await aggregateEmergingLeads(90);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[admin/emerging-leads] POST error:", err);
    return NextResponse.json({ error: "Aggregation failed" }, { status: 500 });
  }
}
