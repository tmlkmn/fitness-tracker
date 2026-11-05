import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { BackgroundSyncPlugin, NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope & typeof globalThis;

// Filter out auth-related paths from runtime caching.
// `defaultCache` entries use `matcher` (Serwist 9), not the legacy `urlPattern`.
const filteredCache = defaultCache.filter((entry) => {
  const m = entry.matcher;
  if (m instanceof RegExp) return !m.toString().includes("/api/auth");
  if (typeof m === "string") return !m.includes("/api/auth");
  return true;
});

// Background Sync queue for offline toggle replays. When the SW catches a
// failed POST to /api/sync/*, it stashes the request in IndexedDB and retries
// on the browser's `sync` event (Chrome) or, on iOS Safari, when the page
// re-runs the in-page drainer. State-based idempotency makes replay safe.
const syncQueuePlugin = new BackgroundSyncPlugin("fitmusc-outbox", {
  maxRetentionTime: 24 * 60, // 24 hours, in minutes
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Exclude auth API and login page from cache.
    // Serwist 9 expects a Strategy instance for `handler`, not a string literal.
    {
      matcher: /\/api\/auth\/.*/,
      handler: new NetworkOnly(),
    },
    {
      matcher: /\/giris/,
      handler: new NetworkOnly(),
    },
    {
      matcher: /\/api\/sync\/.*/,
      method: "POST",
      handler: new NetworkOnly({ plugins: [syncQueuePlugin] }),
    },
    ...filteredCache,
  ],
});

// Push notification handler
self.addEventListener("push", (event: PushEvent) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? "FitMusc";
  const options: NotificationOptions = {
    body: data.body ?? "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url ?? "/" },
    tag: data.tag ?? "fitmusc-notification",
    renotify: true,
    vibrate: [100, 50, 100],
    timestamp: Date.now(),
    actions: data.url
      ? [{ action: "open", title: "Aç" }]
      : [],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handler
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});

serwist.addEventListeners();
