// Environment variable validation — imported early to surface misconfig on startup

const required = ["AUTH_SECRET", "DATABASE_URL"] as const;

const recommended = [
  "ADMIN_PIN",
  "CRON_SECRET",
  "APP_URL",
  "SES_FROM_EMAIL",
  "SES_ACCESS_KEY_ID",
  "SES_SECRET_ACCESS_KEY",
  "ADMIN_NOTIFY_EMAIL",
] as const;

const optional = [
  "ANTHROPIC_API_KEY",
  "LEGISCAN_API_KEY",
  "NEXT_PUBLIC_MAPBOX_TOKEN",
] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`[env] Missing required environment variable: ${key}`);
  }
}

for (const key of recommended) {
  if (!process.env[key]) {
    console.warn(`[env] WARNING: recommended variable not set: ${key}`);
  }
}

if (process.env.NODE_ENV !== "production") {
  for (const key of optional) {
    if (!process.env[key]) {
      console.info(`[env] Optional variable not set: ${key}`);
    }
  }
}
