// Environment variable validation — imported early to surface misconfig on startup
import { createLogger } from "@/lib/logger";

const logger = createLogger("env");

const required = ["AUTH_SECRET", "DATABASE_URL"] as const;

const recommended = [
  "ADMIN_PIN",
  "CRON_SECRET",
  "APP_URL",
  "SES_FROM_EMAIL",
  "SES_ACCESS_KEY_ID",
  "SES_SECRET_ACCESS_KEY",
  "ADMIN_NOTIFY_EMAIL",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_PRO_MONTHLY_PRICE_ID",
  "STRIPE_PRO_ANNUAL_PRICE_ID",
  "STRIPE_INSTITUTIONAL_MONTHLY_PRICE_ID",
  "STRIPE_INSTITUTIONAL_ANNUAL_PRICE_ID",
] as const;

const optional = [
  "ANTHROPIC_API_KEY",
  "LEGISCAN_API_KEY",
  "NEXT_PUBLIC_MAPBOX_TOKEN",
  "NEXT_PUBLIC_SENTRY_DSN",
  "SENTRY_ORG",
  "SENTRY_PROJECT",
  "LOG_LEVEL",
  "PAYWALL_LAUNCH_DATE",
  "GRANDFATHERED_EXPIRY",
] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`[env] Missing required environment variable: ${key}`);
  }
}

for (const key of recommended) {
  if (!process.env[key]) {
    logger.warn(`WARNING: recommended variable not set: ${key}`);
  }
}

if (process.env.NODE_ENV !== "production") {
  for (const key of optional) {
    if (!process.env[key]) {
      logger.info(`Optional variable not set: ${key}`);
    }
  }
}
