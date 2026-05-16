/**
 * Subscribe to push notifications programmatically.
 * Extracted from PushPermissionButton for reuse (e.g., after PWA install).
 */

export type PushSubscribeResult =
  | { ok: true }
  | {
      ok: false;
      /**
       * - `unsupported` — Notification API absent (no PWA / old browser)
       * - `denied` — user declined the permission prompt
       * - `config` — NEXT_PUBLIC_VAPID_PUBLIC_KEY missing from the build
       * - `error` — service worker / pushManager / server call failed
       */
      reason: "unsupported" | "denied" | "config" | "error";
      message?: string;
    };

export async function subscribeToPush(): Promise<PushSubscribeResult> {
  if (typeof Notification === "undefined") {
    return { ok: false, reason: "unsupported" };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { ok: false, reason: "denied" };
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

    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      try {
        registration = await navigator.serviceWorker.register("/sw.js");
      } catch {
        registration = await navigator.serviceWorker.register("/sw-push.js");
      }
      await new Promise<void>((resolve) => {
        if (registration!.active) {
          resolve();
          return;
        }
        const sw = registration!.installing || registration!.waiting;
        if (!sw) {
          resolve();
          return;
        }
        sw.addEventListener("statechange", () => {
          if (sw.state === "activated") resolve();
        });
        setTimeout(resolve, 5000);
      });
    }

    const padding = "=".repeat((4 - (vapidKey.length % 4)) % 4);
    const base64 = (vapidKey + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const keyArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      keyArray[i] = rawData.charCodeAt(i);
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyArray,
    });

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
