import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await cookies();

  // Clear all authjs cookies — covers both HTTP and HTTPS prefixed variants
  const cookieNames = [
    "authjs.session-token",
    "authjs.csrf-token",
    "authjs.callback-url",
    "__Secure-authjs.session-token",
    "__Secure-authjs.csrf-token",
    "__Secure-authjs.callback-url",
    "__Host-authjs.csrf-token",
  ];

  for (const name of cookieNames) {
    cookieStore.delete(name);
  }

  return NextResponse.json({ ok: true });
}
