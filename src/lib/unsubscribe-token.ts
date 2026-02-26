import { createHmac } from "crypto";

/**
 * Generate an HMAC token for one-click unsubscribe links.
 * Uses AUTH_SECRET as the signing key so tokens can't be forged.
 */
export function generateUnsubscribeToken(subscriptionId: string, email: string): string {
  const secret = process.env.AUTH_SECRET || "fallback-secret";
  return createHmac("sha256", secret)
    .update(`${subscriptionId}:${email}`)
    .digest("hex")
    .slice(0, 32);
}

export function verifyUnsubscribeToken(
  token: string,
  subscriptionId: string,
  email: string
): boolean {
  const expected = generateUnsubscribeToken(subscriptionId, email);
  return token === expected;
}
