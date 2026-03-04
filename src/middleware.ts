import { NextRequest, NextResponse } from "next/server";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const CSRF_PROTECTED_PREFIXES = ["/api/subscribe", "/api/watchlist", "/api/signout", "/api/v1/keys", "/api/contact"];

function isCsrfProtected(pathname: string): boolean {
  return CSRF_PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

/** OWASP Origin/Referer validation — rejects cross-origin mutation requests. */
function csrfCheck(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const sourceHost = origin
    ? new URL(origin).host
    : referer
      ? new URL(referer).host
      : null;

  // Both headers missing → same-origin browser or non-browser client; auth still gates
  if (!sourceHost) return null;

  if (sourceHost !== request.nextUrl.host) {
    return NextResponse.json({ error: "Forbidden — cross-origin request" }, { status: 403 });
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CSRF protection on user-facing mutation endpoints
  if (MUTATING_METHODS.has(request.method) && isCsrfProtected(pathname)) {
    const blocked = csrfCheck(request);
    if (blocked) return blocked;
  }

  // Admin routes: /admin/review always loads (shows email+PIN form).
  // Admin API routes are protected by signed PIN cookie (admin-helpers.ts).
  // No middleware gate — avoids magic link dependency.

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/subscribe/:path*",
    "/api/watchlist/:path*",
    "/api/signout/:path*",
    "/api/v1/keys/:path*",
    "/api/contact",
  ],
};
