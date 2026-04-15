"use client";

import { useEffect } from "react";

async function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch {
    // Full SW failed (e.g. dev mode eval error) — try push-only fallback
    try {
      await navigator.serviceWorker.register("/sw-push.js");
    } catch {
      // Neither SW available
    }
  }
}

export function SwRegister() {
  useEffect(() => {
    registerSW();
  }, []);

  return null;
}
