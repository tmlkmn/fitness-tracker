"use client";

import { useEffect } from "react";
import { PUSH_SW_URL, PUSH_SW_SCOPE } from "@/lib/push-subscribe";

async function registerSW() {
  if (!("serviceWorker" in navigator)) return;

  // Primary worker: offline precache + runtime caching. Absent in dev mode.
  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch {
    // Serwist worker unavailable (e.g. dev mode eval error) — non-fatal.
  }

  // Dedicated push worker at its own scope. Registered eagerly so it is
  // already `active` by the time the user enables push — its install does no
  // precaching, so it never hangs the way the primary worker can on iOS.
  try {
    await navigator.serviceWorker.register(PUSH_SW_URL, {
      scope: PUSH_SW_SCOPE,
    });
  } catch {
    // Push worker registration failed — push will be unavailable.
  }
}

export function SwRegister() {
  useEffect(() => {
    registerSW();
  }, []);

  return null;
}
