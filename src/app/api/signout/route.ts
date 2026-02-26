import { NextResponse } from "next/server";

const ALL_COOKIES = [
  "authjs.session-token",
  "authjs.csrf-token",
  "authjs.callback-url",
  "__Secure-authjs.session-token",
  "__Secure-authjs.csrf-token",
  "__Secure-authjs.callback-url",
  "__Host-authjs.csrf-token",
];

export async function GET() {
  // Redirect to the real origin, not Amplify's internal Lambda URL
  const origin = process.env.AUTH_URL || "https://www.airindex.io";
  const res = NextResponse.redirect(origin);

  for (const name of ALL_COOKIES) {
    // Delete with both secure and non-secure variants to cover all environments
    res.headers.append(
      "Set-Cookie",
      `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`
    );
    res.headers.append(
      "Set-Cookie",
      `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax`
    );
  }

  return res;
}
