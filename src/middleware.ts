import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/gate", "/api/gate"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow the gate page, gate API, and static assets through
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Check for access cookie
  const hasAccess = request.cookies.get("airindex-access")?.value === "granted";
  if (hasAccess) {
    return NextResponse.next();
  }

  // Redirect to gate
  const gateUrl = new URL("/gate", request.url);
  return NextResponse.redirect(gateUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
