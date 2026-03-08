// This file configures the initialization of Sentry on the client.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://93da872138307499b0f064fcf1fee6f8@o4510991839920128.ingest.us.sentry.io/4510991841361920",
  enabled: process.env.NODE_ENV === "production",

  tracesSampleRate: 0.1,
  enableLogs: true,

  // Filter noisy browser errors
  ignoreErrors: [
    "ResizeObserver loop",
    "Network request failed",
    "Load failed",
    "AbortError",
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
