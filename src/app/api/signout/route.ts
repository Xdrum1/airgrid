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

export async function POST() {
  const res = NextResponse.json({ success: true });

  for (const name of ALL_COOKIES) {
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
