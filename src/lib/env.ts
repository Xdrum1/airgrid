// Environment variable validation — imported early to surface misconfig on startup

const required = ["AUTH_SECRET", "DATABASE_URL"] as const;
const optional = ["SES_ACCESS_KEY_ID", "SES_SECRET_ACCESS_KEY", "ADMIN_NOTIFY_EMAIL"] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`[env] Missing required environment variable: ${key}`);
  }
}

for (const key of optional) {
  if (!process.env[key]) {
    console.warn(`[env] Optional environment variable not set: ${key}`);
  }
}
