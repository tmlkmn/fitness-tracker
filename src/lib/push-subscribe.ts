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
       * - `sw` — the dedicated push service worker did not reach the `active`
       *   state in time; closing/reopening the app and retrying usually
       *   succeeds
       * - `config` — NEXT_PUBLIC_VAPID_PUBLIC_KEY missing from the build
       * - `error` — service worker / pushManager / server call failed
       */
      reason: "unsupported" | "denied" | "dismissed" | "sw" | "config" | "error";
      message?: string;
    };

/**
 * A structured snapshot of a `subscribeToPush()` outcome. Push runs entirely
 * client-side, so every failure here would otherwise only land in the *device*
 * console. We POST this to `/api/push/diagnostic` so it shows up in Vercel logs
 * (grep `[push-diag]`). Best-effort: reporting never throws and never blocks.
 */
type PushDiagnostic = {
  /** Where in the flow this snapshot was taken. */
  stage: string;
  /** The failure reason, if any (omitted on success). */
  reason?: string;
  errorName?: string;
  errorMessage?: string;
  permission?: string;
  /** Running as an installed PWA (display-mode standalone / iOS standalone). */
  standalone?: boolean;
  /** Whether a service worker currently controls this page. */
  swController?: boolean;
  swScriptUrl?: string | null;
  swInstalling?: string | null;
  swWaiting?: string | null;
  swActive?: string | null;
  /** Milliseconds spent waiting for the worker to reach `active`. */
  activationWaitMs?: number;
  /** Length of NEXT_PUBLIC_VAPID_PUBLIC_KEY (a valid key is ~87–88 chars). */
  vapidKeyLen?: number;
  ua?: string;
};

async function reportPushDiagnostic(d: PushDiagnostic): Promise<void> {
  try {
    await fetch("/api/push/diagnostic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d),
      // Survive the toast appearing / the page being backgrounded mid-flush.
      keepalive: true,
    });
  } catch {
    // Diagnostics are strictly best-effort — losing one must not affect push.
  }
}

/** Environment facts that are useful on every diagnostic, failure or not. */
function envSnapshot(): Pick<
  PushDiagnostic,
  "ua" | "standalone" | "permission" | "swController"
> {
  const nav =
    typeof navigator === "undefined"
      ? undefined
      : (navigator as Navigator & { standalone?: boolean });
  const displayStandalone =
    globalThis.matchMedia?.("(display-mode: standalone)").matches === true;
  return {
    ua: nav?.userAgent ?? "",
    standalone: displayStandalone || nav?.standalone === true,
    permission:
      typeof Notification !== "undefined" ? Notification.permission : "n/a",
    swController: Boolean(
      nav && "serviceWorker" in nav && nav.serviceWorker.controller,
    ),
  };
}

/**
 * Resolves the effective notification permission, prompting only when it is
 * still `"default"`. Chrome's "quiet" permission UI hides the modal behind an
 * address-bar icon and leaves `requestPermission()` pending until the user
 * acts — so race a timeout. A timeout leaves permission `"default"`, which the
 * caller treats as `"dismissed"` (not `"denied"`).
 */
async function resolvePermission(): Promise<NotificationPermission> {
  if (Notification.permission !== "default") return Notification.permission;
  return Promise.race([
    Notification.requestPermission(),
    new Promise<NotificationPermission>((resolve) =>
      setTimeout(() => resolve("default"), 30_000),
    ),
  ]);
}

/** Service-worker registration state — the crux of the iOS "sw" failure. */
function regSnapshot(
  reg: ServiceWorkerRegistration | null,
): Pick<
  PushDiagnostic,
  "swScriptUrl" | "swInstalling" | "swWaiting" | "swActive"
> {
  return {
    swScriptUrl:
      reg?.active?.scriptURL ??
      reg?.waiting?.scriptURL ??
      reg?.installing?.scriptURL ??
      null,
    swInstalling: reg?.installing?.state ?? null,
    swWaiting: reg?.waiting?.state ?? null,
    swActive: reg?.active?.state ?? null,
  };
}

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
 * The push subscription is deliberately NOT tied to the primary Serwist worker
 * (`/sw.js`). That worker precaches the entire build inside its `install`
 * event, which on a cold iOS PWA launch hangs for 30s+ and never activates —
 * so `pushManager.subscribe()`, which requires an `active` worker, can never
 * run there.
 *
 * Instead push gets a featherweight, dedicated worker (`/sw-push.js`, no
 * precache) registered at its own scope. Its `install` event does no network
 * I/O, so it activates within milliseconds even on iOS. The scope is a sub-path
 * of `/`, which `/sw-push.js` is allowed to claim without a
 * `Service-Worker-Allowed` header. It controls no pages — push delivery and
 * `showNotification()` do not depend on the worker controlling a client.
 */
export const PUSH_SW_URL = "/sw-push.js";
export const PUSH_SW_SCOPE = "/push-sw/";

/**
 * True if `reg` is the dedicated push registration (not the Serwist one).
 * A plain boolean, not a type guard: "not the push registration" must not
 * narrow `reg` away from `ServiceWorkerRegistration` for callers that hold a
 * non-push registration (e.g. the legacy root cleanup).
 */
function isPushRegistration(reg: ServiceWorkerRegistration): boolean {
  try {
    return new URL(reg.scope).pathname === PUSH_SW_SCOPE;
  } catch {
    return false;
  }
}

/**
 * Returns the push registration for components that only need to *check*
 * status — never registers anything. `null` if push has not been set up yet.
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  const reg = await navigator.serviceWorker.getRegistration(PUSH_SW_SCOPE);
  if (!reg || !isPushRegistration(reg)) return null;
  return reg.pushManager.getSubscription();
}

/** Tears down the push subscription locally and server-side. Best-effort. */
export async function unsubscribeFromPush(): Promise<void> {
  try {
    const sub = await getPushSubscription();
    if (!sub) return;
    const { endpoint } = sub;
    await sub.unsubscribe();
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    });
  } catch {
    // Best-effort — a stale row is harmless (web-push prunes it on 404/410).
  }
}

/**
 * Drops any legacy push subscription that lived on the Serwist root worker
 * (how push was registered before it moved to its own scope). Without this,
 * a user who subscribed under the old scheme would receive every notification
 * twice once they re-subscribe under the new scope. Best-effort, runs once.
 */
async function cleanupLegacyRootSubscription(): Promise<void> {
  try {
    const root = await navigator.serviceWorker.getRegistration("/");
    if (!root || isPushRegistration(root)) return;
    const sub = await root.pushManager.getSubscription();
    if (!sub) return;
    const { endpoint } = sub;
    await sub.unsubscribe();
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    });
  } catch {
    // Non-fatal — worst case the user briefly gets a duplicate notification.
  }
}

/**
 * Gets the dedicated push worker registered AND `active`, registering it if
 * needed. `pushManager.subscribe()` throws "Subscribing for push requires an
 * active service worker" if the worker is still installing/waiting.
 *
 * Returns the registration regardless of whether it activated, plus how long
 * we waited, so the caller can include both in a diagnostic on failure.
 */
async function getPushRegistration(): Promise<{
  registration: ServiceWorkerRegistration | null;
  waitMs: number;
}> {
  // getRegistration() falls back to the root Serwist worker for this URL when
  // the push worker is not registered yet — only reuse a genuine push reg.
  const existing = await navigator.serviceWorker.getRegistration(
    PUSH_SW_SCOPE,
  );

  let registration: ServiceWorkerRegistration;
  if (existing && isPushRegistration(existing)) {
    registration = existing;
  } else {
    try {
      registration = await navigator.serviceWorker.register(PUSH_SW_URL, {
        scope: PUSH_SW_SCOPE,
      });
    } catch {
      return { registration: null, waitMs: 0 };
    }
  }

  let waitMs = 0;
  if (!registration.active) {
    const start = Date.now();
    await waitForActivation(registration, 30_000);
    waitMs = Date.now() - start;
  }

  return { registration, waitMs };
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

  // Hoisted so the catch block can include the registration state in its
  // diagnostic even when the failure happened deep inside the try.
  let registration: ServiceWorkerRegistration | null = null;
  let activationWaitMs = 0;
  let vapidKeyLen = 0;

  try {
    const permission = await resolvePermission();
    if (permission !== "granted") {
      // "denied" = blocked for this site; "default" = prompt never answered
      // (Chrome quiet UI / dismissed). Distinct reasons drive distinct toasts.
      const reason = permission === "denied" ? "denied" : "dismissed";
      void reportPushDiagnostic({
        stage: "permission",
        reason,
        ...envSnapshot(),
      });
      return { ok: false, reason };
    }

    // NEXT_PUBLIC_* vars are inlined at build time. If the deploy build was
    // missing this var, push can never work — surface it as a config error
    // rather than a generic failure.
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      void reportPushDiagnostic({
        stage: "config",
        reason: "config",
        vapidKeyLen: 0,
        ...envSnapshot(),
      });
      return {
        ok: false,
        reason: "config",
        message: "NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set in this build.",
      };
    }
    vapidKeyLen = vapidKey.length;

    const got = await getPushRegistration();
    registration = got.registration;
    activationWaitMs = got.waitMs;

    if (!registration?.active) {
      void reportPushDiagnostic({
        stage: "sw-activation-timeout",
        reason: "sw",
        activationWaitMs,
        vapidKeyLen,
        ...envSnapshot(),
        ...regSnapshot(registration),
      });
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
      void reportPushDiagnostic({
        stage: "save",
        reason: "error",
        errorName: "HttpError",
        errorMessage: `HTTP ${res.status}`,
        activationWaitMs,
        vapidKeyLen,
        ...envSnapshot(),
        ...regSnapshot(registration),
      });
      return {
        ok: false,
        reason: "error",
        message: `Subscription could not be saved (HTTP ${res.status}).`,
      };
    }

    // Now that the push subscription lives on the dedicated worker, drop any
    // leftover subscription on the old root worker so pushes aren't doubled.
    void cleanupLegacyRootSubscription();

    void reportPushDiagnostic({
      stage: "success",
      activationWaitMs,
      vapidKeyLen,
      ...envSnapshot(),
      ...regSnapshot(registration),
    });
    return { ok: true };
  } catch (err) {
    console.error("Push subscription failed:", err);
    void reportPushDiagnostic({
      stage: "exception",
      reason: "error",
      errorName: err instanceof Error ? err.name : "Unknown",
      errorMessage: err instanceof Error ? err.message : String(err),
      activationWaitMs,
      vapidKeyLen,
      ...envSnapshot(),
      ...regSnapshot(registration),
    });
    return {
      ok: false,
      reason: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
