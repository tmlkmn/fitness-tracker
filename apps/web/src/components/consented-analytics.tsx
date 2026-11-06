"use client";

import { useSyncExternalStore } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Written by CookieConsent (src/components/cookie-consent.tsx).
const CONSENT_KEY = "fitmusc_cookie_consent";
const DISMISS_EVENT = "fitmusc:cookie-consent-dismissed";

function readAnalyticsAllowed(): boolean {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? JSON.parse(raw)?.analytics === true : false;
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(DISMISS_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(DISMISS_EVENT, onChange);
  };
}

/**
 * Vercel Analytics + Speed Insights, loaded only after the visitor accepted
 * analytics in the cookie banner — as the cookie policy promises. They were
 * previously mounted for everyone regardless of the choice.
 */
export function ConsentedAnalytics() {
  const allowed = useSyncExternalStore(subscribe, readAnalyticsAllowed, () => false);
  if (!allowed) return null;
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
