/**
 * POST /api/admin/share
 *
 * Mint a signed share token for a report. Returns the share URL the
 * admin can hand to a client. Validate the request body matches one of
 * the supported report shapes.
 *
 * Body:
 *   {
 *     "type": "risk-assessment" | "site-shortlist" | "ahj-briefing",
 *     "params": { ...type-specific },
 *     "ttlDays"?: number,    // default 30, max 180
 *     "clientName"?: string  // surfaces on the report cover
 *   }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-helpers";
import { createShareToken, shareUrl, type ShareTokenType } from "@/lib/share-token";

const VALID_TYPES: ShareTokenType[] = ["risk-assessment", "site-shortlist", "ahj-briefing"];

function validateParams(type: ShareTokenType, params: Record<string, string>): string | null {
  if (type === "risk-assessment") {
    const siteId = params.siteId;
    if (!siteId || typeof siteId !== "string" || siteId.length > 20) {
      return "risk-assessment requires params.siteId (string)";
    }
  }
  if (type === "site-shortlist") {
    const ids = params.ids;
    if (!ids || typeof ids !== "string" || ids.length > 200) {
      return "site-shortlist requires params.ids (comma-separated string)";
    }
    const idList = ids.split(",").map((s) => s.trim()).filter(Boolean);
    if (idList.length === 0 || idList.length > 10) {
      return "site-shortlist requires 1-10 site IDs";
    }
  }
  if (type === "ahj-briefing") {
    const jurisdiction = params.jurisdiction;
    if (!jurisdiction || typeof jurisdiction !== "string" || jurisdiction.length > 50) {
      return "ahj-briefing requires params.jurisdiction (string)";
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  let body: {
    type?: ShareTokenType;
    params?: Record<string, string>;
    ttlDays?: number;
    clientName?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, params = {}, ttlDays, clientName } = body;

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `type must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  const paramErr = validateParams(type, params);
  if (paramErr) {
    return NextResponse.json({ error: paramErr }, { status: 400 });
  }

  const ttl = Math.min(Math.max(ttlDays ?? 30, 1), 180);
  const ttlMs = ttl * 24 * 60 * 60 * 1000;

  const trimmedClientName = clientName?.trim().slice(0, 100);

  const token = createShareToken({
    type,
    params,
    ttlMs,
    clientName: trimmedClientName,
  });

  const path = shareUrl(token);
  const appUrl = process.env.APP_URL || "https://www.airindex.io";
  const fullUrl = `${appUrl}${path}`;

  return NextResponse.json({
    token,
    path,
    url: fullUrl,
    type,
    params,
    expiresInDays: ttl,
    clientName: trimmedClientName ?? null,
  });
}
