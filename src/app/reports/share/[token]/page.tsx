/**
 * Tokenized client share route. Resolves a signed share token and
 * forwards (via 307 redirect) to the underlying report URL with the
 * token attached so the destination page can re-verify and bypass
 * admin auth for this single request.
 *
 * Each report page is responsible for re-verifying the token against
 * its own params before rendering.
 */
import { notFound, redirect } from "next/navigation";
import { verifyShareToken } from "@/lib/share-token";

export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const decoded = decodeURIComponent(token);
  const payload = verifyShareToken(decoded);
  if (!payload) notFound();

  const tokenQp = `token=${encodeURIComponent(decoded)}`;

  switch (payload.type) {
    case "risk-assessment": {
      const siteId = (payload.params.siteId || "").toUpperCase();
      if (!siteId) notFound();
      redirect(`/admin/reports/risk-assessment/${siteId}?${tokenQp}`);
    }
    case "site-shortlist": {
      const ids = payload.params.ids || "";
      if (!ids) notFound();
      redirect(`/admin/reports/site-shortlist?ids=${encodeURIComponent(ids)}&${tokenQp}`);
    }
    case "ahj-briefing": {
      const jurisdiction = payload.params.jurisdiction || "";
      if (!jurisdiction) notFound();
      redirect(`/reports/ahj/${encodeURIComponent(jurisdiction)}?${tokenQp}`);
    }
    default:
      notFound();
  }
}
