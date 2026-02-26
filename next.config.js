/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pass server-side env vars through to the SSR runtime.
  // Amplify WEB_COMPUTE sets env vars at build time but they are NOT
  // automatically available in the SSR Lambda. This inlines them into
  // the server bundle so they're accessible via process.env at runtime.
  env: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST,
    DATABASE_URL: process.env.DATABASE_URL,
    SES_ACCESS_KEY_ID: process.env.SES_ACCESS_KEY_ID,
    SES_SECRET_ACCESS_KEY: process.env.SES_SECRET_ACCESS_KEY,
    SES_REGION: process.env.SES_REGION,
    SES_FROM_EMAIL: process.env.SES_FROM_EMAIL,
    ADMIN_NOTIFY_EMAIL: process.env.ADMIN_NOTIFY_EMAIL,
    ALERT_FROM_EMAIL: process.env.ALERT_FROM_EMAIL,
    CRON_SECRET: process.env.CRON_SECRET,
  },
  async redirects() {
    return [
      {
        source: "/gate",
        destination: "/login",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
