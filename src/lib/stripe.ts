import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

export function getPriceId(tier: "pro" | "institutional", interval: "monthly" | "annual"): string {
  const prefix = tier === "institutional" ? "STRIPE_INSTITUTIONAL" : "STRIPE_PRO";
  const id =
    interval === "annual"
      ? process.env[`${prefix}_ANNUAL_PRICE_ID`]
      : process.env[`${prefix}_MONTHLY_PRICE_ID`];
  if (!id) throw new Error(`${prefix}_${interval.toUpperCase()}_PRICE_ID is not set`);
  return id;
}

/** Backwards-compatible alias */
export function getProPriceId(interval: "monthly" | "annual"): string {
  return getPriceId("pro", interval);
}

export function tierFromPriceId(priceId: string): string {
  const proMonthly = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  const proAnnual = process.env.STRIPE_PRO_ANNUAL_PRICE_ID;
  if (priceId === proMonthly || priceId === proAnnual) return "pro";
  const instMonthly = process.env.STRIPE_INSTITUTIONAL_MONTHLY_PRICE_ID;
  const instAnnual = process.env.STRIPE_INSTITUTIONAL_ANNUAL_PRICE_ID;
  if (priceId === instMonthly || priceId === instAnnual) return "institutional";
  return "pro";
}
