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
       * - `sw` — the service worker did not reach the `active` state in time
       *   (common on a cold iOS PWA launch while it is still precaching);
       *   closing/reopening the app and retrying usually succeeds
       * - `config` — NEXT_PUBLIC_VAPID_PUBLIC_KEY missing from the build
       * - `error` — service worker / pushManager / server call failed
       */
      reason: "unsupported" | "denied" | "dismissed" | "sw" | "config" | "error";
      message?: string;
    };

/**
 * Resolves `true` once `registration` has a worker in the `active` slot, or
 * `false` if that has not happened within `timeoutMs`. Driven by `statechange`
 * events rather than `navigator.serviceWorker.ready`, which is known to hang
 * indefinitely inside iOS standalone PWAs.
 */
function waitForActivation(
  registration: ServiceWorkerRegistration,
  timeoutMs: number,
): Promise<boolean> {
  if (registration.active) return Promise.resolve(true);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const timer = setTimeout(
      () => finish(Boolean(registration.active)),
      timeoutMs,
    );

    const onStateChange = () => {
      if (registration.active) {
        clearTimeout(timer);
        finish(true);
      }
    };

    const track = (worker: ServiceWorker | null) => {
      worker?.addEventListener("statechange", onStateChange);
    };

    track(registration.installing);
    track(registration.waiting);
    registration.addEventListener("updatefound", () =>
      track(registration.installing),
    );
  });
}

/**
 * Ensures a service worker is registered AND has reached the `active` state.
 * `pushManager.subscribe()` throws "Subscribing for push requires an active
 * service worker" if the worker is still installing/waiting.
 *
 * On a cold iOS PWA launch the Serwist worker precaches the whole build during
 * its `install` event, which routinely takes longer than a short fixed
 * timeout — so we wait, event-driven, for activation to actually land.
 */
async function getActiveRegistration(): Promise<ServiceWorkerRegistration | null> {
  let registration = (await navigator.serviceWorker.getRegistration()) ?? null;

  if (!registration) {
    try {
      registration = await navigator.serviceWorker.register("/sw.js");
    } catch {
      // /sw.js unavailable (e.g. dev mode) — fall back to the push-only worker.
      try {
        registration = await navigator.serviceWorker.register("/sw-push.js");
      } catch {
        return null;
      }
    }
  }

  if (!registration.active) {
    await waitForActivation(registration, 30_000);
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
      return { ok: false, reason: "sw" };
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
