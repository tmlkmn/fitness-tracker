import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope & typeof globalThis;

// Filter out auth-related paths from runtime caching
const filteredCache = defaultCache.filter(
  (entry) => !("urlPattern" in entry && entry.urlPattern?.toString().includes("/api/auth"))
);

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Exclude auth API and login page from cache
    {
      urlPattern: /\/api\/auth\/.*/,
      handler: "NetworkOnly" as const,
    },
    {
      urlPattern: /\/giris/,
      handler: "NetworkOnly" as const,
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
