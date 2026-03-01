import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL;

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const CSRF_PROTECTED_PREFIXES = ["/api/subscribe", "/api/watchlist", "/api/signout"];

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

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CSRF protection on user-facing mutation endpoints
  if (MUTATING_METHODS.has(request.method) && isCsrfProtected(pathname)) {
    const blocked = csrfCheck(request);
    if (blocked) return blocked;
  }

  // Admin routes: require auth token + admin email
  if (isAdminPath(pathname)) {
    // Exclude /api/auth/* (next-auth endpoints)
    if (pathname.startsWith("/api/auth")) {
      return NextResponse.next();
    }

    const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });

    if (!token) {
      if (isApiRoute(pathname)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (token.email !== ADMIN_EMAIL) {
      if (isApiRoute(pathname)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      // Return 404-style for non-admin users hitting admin pages
      return NextResponse.rewrite(new URL("/not-found", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/subscribe/:path*",
    "/api/watchlist/:path*",
    "/api/signout/:path*",
  ],
};
