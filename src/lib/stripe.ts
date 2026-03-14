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

export function getPriceId(tier: "alert" | "pro" | "institutional", interval: "monthly" | "annual" | "founding"): string {
  if (tier === "alert" && interval === "founding") {
    const id = process.env.STRIPE_ALERT_FOUNDING_PRICE_ID;
    if (!id) throw new Error("STRIPE_ALERT_FOUNDING_PRICE_ID is not set");
    return id;
  }
  const prefixMap = { alert: "STRIPE_ALERT", pro: "STRIPE_PRO", institutional: "STRIPE_INSTITUTIONAL" };
  const prefix = prefixMap[tier];
  const suffix = interval === "annual" ? "ANNUAL" : "MONTHLY";
  const id = process.env[`${prefix}_${suffix}_PRICE_ID`];
  if (!id) throw new Error(`${prefix}_${suffix}_PRICE_ID is not set`);
  return id;
}

/** Backwards-compatible alias */
export function getProPriceId(interval: "monthly" | "annual"): string {
  return getPriceId("pro", interval);
}

export function tierFromPriceId(priceId: string): string {
  const alertMonthly = process.env.STRIPE_ALERT_MONTHLY_PRICE_ID;
  const alertAnnual = process.env.STRIPE_ALERT_ANNUAL_PRICE_ID;
  const alertFounding = process.env.STRIPE_ALERT_FOUNDING_PRICE_ID;
  if (priceId === alertMonthly || priceId === alertAnnual || priceId === alertFounding) return "alert";
  const proMonthly = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  const proAnnual = process.env.STRIPE_PRO_ANNUAL_PRICE_ID;
  if (priceId === proMonthly || priceId === proAnnual) return "pro";
  const instMonthly = process.env.STRIPE_INSTITUTIONAL_MONTHLY_PRICE_ID;
  const instAnnual = process.env.STRIPE_INSTITUTIONAL_ANNUAL_PRICE_ID;
  if (priceId === instMonthly || priceId === instAnnual) return "institutional";
  return "pro";
}
