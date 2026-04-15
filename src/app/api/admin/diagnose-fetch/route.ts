/**
 * Production fetch diagnostic endpoint.
 *
 * Hits Congress.gov and Regulations.gov from the production runtime with
 * a known-good request and returns the raw HTTP status, headers, and
 * body snippet so we can see exactly what prod sees. Local returns real
 * data; prod returns 0. This tells us which.
 *
 * Auth: requires CRON_SECRET. Delete after debugging.
 */
import { NextRequest, NextResponse } from "next/server";
import { authorizeCron } from "@/lib/admin-helpers";

export async function GET(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;

  const congressKey = process.env.CONGRESS_API_KEY;
  const regsKey = process.env.REGULATIONS_GOV_API_KEY;

  const results: Record<string, unknown> = {
    congressKeySet: !!congressKey,
    congressKeyLength: congressKey?.length ?? 0,
    regsKeySet: !!regsKey,
    regsKeyLength: regsKey?.length ?? 0,
  };

  // ---- Congress.gov: single known bill (117-S-516) ----
  try {
    const url = `https://api.congress.gov/v3/bill/117/s/516?api_key=${congressKey}&format=json`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const body = await res.text();
    results.congress = {
      status: res.status,
      contentType: res.headers.get("content-type"),
      bodyLength: body.length,
      bodyHead: body.slice(0, 400),
      billPresent: body.includes('"bill"'),
    };
  } catch (err) {
    results.congress = { error: (err as Error)?.message ?? String(err) };
  }

  // ---- Regulations.gov: single search ----
  try {
    const params = new URLSearchParams({
      "filter[searchTerm]": "eVTOL",
      "filter[agencyId]": "FAA",
      "page[size]": "5",
      "api_key": regsKey ?? "",
    });
    const url = `https://api.regulations.gov/v4/documents?${params}`;
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.api+json" },
    });
    const body = await res.text();
    results.regulations = {
      status: res.status,
      contentType: res.headers.get("content-type"),
      bodyLength: body.length,
      bodyHead: body.slice(0, 400),
    };
  } catch (err) {
    results.regulations = { error: (err as Error)?.message ?? String(err) };
  }

  return NextResponse.json(results);
}
