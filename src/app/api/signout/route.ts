import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const AUTH_COOKIES = [
  "authjs.session-token",
  "authjs.csrf-token",
  "authjs.callback-url",
  "__Secure-authjs.session-token",
  "__Secure-authjs.csrf-token",
  "__Secure-authjs.callback-url",
  "__Host-authjs.csrf-token",
];

export async function POST() {
  const cookieStore = await cookies();

  for (const name of AUTH_COOKIES) {
    cookieStore.delete(name);
  }

  return NextResponse.json({ success: true });
}
