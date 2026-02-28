import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL;

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  ],
};
