// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://3ffd3e61a67543eed86a388acd8bc602@o4504214311993344.ingest.us.sentry.io/4511252798701568",
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // No IP addresses, cookies (session tokens) or request headers in error
  // reports: they would carry personal data and live session credentials to
  // Sentry. Errors still arrive with their stack and route.
  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
