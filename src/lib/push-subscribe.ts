/**
 * Subscribe to push notifications programmatically.
 * Extracted from PushPermissionButton for reuse (e.g., after PWA install).
 */

export type PushSubscribeResult =
  | { ok: true }
  | {
      ok: false;
      /**
       * - `unsupported` — Notification / Push API absent (no PWA / old browser)
       * - `denied` — notification permission is blocked for this site
       * - `dismissed` — the permission prompt was closed or hidden without an
       *   allow/deny decision. Chrome's "quiet" permission UI (auto-enabled
       *   for sites with a low accept rate or after repeated dismissals)
       *   hides the modal behind an address-bar icon; permission stays
       *   `"default"` and can still be granted from that icon.
       * - `config` — NEXT_PUBLIC_VAPID_PUBLIC_KEY missing from the build
       * - `error` — service worker / pushManager / server call failed
       */
      reason: "unsupported" | "denied" | "dismissed" | "config" | "error";
      message?: string;
    };

/**
 * Ensures a service worker is registered AND has reached the `active` state.
 * `pushManager.subscribe()` throws "Subscribing for push requires an active
 * service worker" if the worker is still installing/waiting — which happens
 * on a fresh PWA launch before the SW has finished activating.
 */
async function getActiveRegistration(): Promise<ServiceWorkerRegistration | null> {
  let registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    try {
      registration = await navigator.serviceWorker.register("/sw.js");
    } catch {
      registration = await navigator.serviceWorker.register("/sw-push.js");
    }
  }

  if (!registration.active) {
    // navigator.serviceWorker.ready resolves once an active worker controls
    // the page. Race a timeout so the UI never hangs indefinitely.
    const ready = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 15000)),
    ]);
    if (ready?.active) registration = ready;
  }

  return registration.active ? registration : null;
}

export async function subscribeToPush(): Promise<PushSubscribeResult> {
  if (
    typeof Notification === "undefined" ||
    typeof navigator === "undefined" ||
    !("serviceWorker" in navigator) ||
    typeof window === "undefined" ||
    !("PushManager" in window)
  ) {
    return { ok: false, reason: "unsupported" };
  }

  try {
    // Already permanently blocked — requestPermission() resolves to "denied"
    // silently (no prompt), so surface it directly without a pointless call.
    if (Notification.permission === "denied") {
      return { ok: false, reason: "denied" };
    }

    // Request permission unless it is already granted (in which case
    // requestPermission() is a no-op that resolves to "granted").
    // Chrome's "quiet" permission UI hides the modal behind an address-bar
    // icon and leaves the promise pending until the user acts on it — race a
    // timeout so the caller never hangs. A timeout means the prompt was never
    // answered, which is "dismissed" (permission still "default"), not "denied".
    let permission: NotificationPermission = Notification.permission;
    if (permission !== "granted") {
      permission = await Promise.race([
        Notification.requestPermission(),
        new Promise<NotificationPermission>((resolve) =>
          setTimeout(() => resolve("default"), 30_000),
        ),
      ]);
    }

    if (permission === "denied") {
      return { ok: false, reason: "denied" };
    }
    if (permission !== "granted") {
      return { ok: false, reason: "dismissed" };
    }

    // NEXT_PUBLIC_* vars are inlined at build time. If the deploy build was
    // missing this var, push can never work — surface it as a config error
    // rather than a generic failure.
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      return {
        ok: false,
        reason: "config",
        message: "NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set in this build.",
      };
    }

    const registration = await getActiveRegistration();
    if (!registration) {
      return {
        ok: false,
        reason: "error",
        message:
          "Service worker is not active yet. Reload the app and try again.",
      };
    }

    const padding = "=".repeat((4 - (vapidKey.length % 4)) % 4);
    const base64 = (vapidKey + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const keyArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      keyArray[i] = rawData.charCodeAt(i);
    }

    // Reuse an existing subscription if one is already present — re-subscribing
    // with the same key is fine, but this avoids an extra round trip.
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyArray,
      }));

    const json = subscription.toJSON();
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: json.keys,
      }),
    });
    if (!res.ok) {
      return {
        ok: false,
        reason: "error",
        message: `Subscription could not be saved (HTTP ${res.status}).`,
      };
    }

    return { ok: true };
  } catch (err) {
    console.error("Push subscription failed:", err);
    return {
      ok: false,
      reason: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
