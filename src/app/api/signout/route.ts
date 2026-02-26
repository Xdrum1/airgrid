import { NextResponse, NextRequest } from "next/server";

function clearCookies(res: NextResponse) {

  // Clear all authjs cookies — covers both HTTP and HTTPS prefixed variants.
  // Must explicitly set path/secure/sameSite to match how NextAuth sets them,
  // otherwise the browser won't recognise the deletion.
  const baseCookies = [
    "authjs.session-token",
    "authjs.csrf-token",
    "authjs.callback-url",
  ];
  const secureCookies = [
    "__Secure-authjs.session-token",
    "__Secure-authjs.csrf-token",
    "__Secure-authjs.callback-url",
  ];
  const hostCookies = [
    "__Host-authjs.csrf-token",
  ];

  for (const name of baseCookies) {
    res.cookies.set(name, "", {
      expires: new Date(0),
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
  }

  for (const name of secureCookies) {
    res.cookies.set(name, "", {
      expires: new Date(0),
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });
  }

  for (const name of hostCookies) {
    res.cookies.set(name, "", {
      expires: new Date(0),
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });
  }

  return res;
}

// GET — browser navigates here directly, cookies are cleared via redirect
export async function GET(req: NextRequest) {
  const url = new URL("/", req.url);
  const res = NextResponse.redirect(url);
  clearCookies(res);
  return res;
}

// POST — kept for backwards compat
export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearCookies(res);
  return res;
}
