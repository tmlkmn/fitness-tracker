// Dedicated push service worker — registered at the /push-sw/ scope by
// src/lib/push-subscribe.ts. Deliberately featherweight: its install event
// does NO precaching and NO network I/O, so it activates within milliseconds
// even on a cold iOS PWA launch (the precaching Serwist worker can hang there
// for 30s+, which is why push gets its own worker).

// Take over immediately on install/update so pushManager.subscribe() always
// has an `active` worker and shipped fixes apply without a stale generation.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "FitMusc";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/" },
    tag: data.tag || "fitmusc-notification",
    renotify: true,
    vibrate: [100, 50, 100],
    timestamp: Date.now(),
    actions: data.url ? [{ action: "open", title: "Aç" }] : [],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data ? event.notification.data.url : "/";
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
