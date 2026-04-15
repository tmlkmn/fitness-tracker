/**
 * Subscribe to push notifications programmatically.
 * Extracted from PushPermissionButton for reuse (e.g., after PWA install).
 */
export async function subscribeToPush(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

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

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return false;

    const padding = "=".repeat((4 - (vapidKey.length % 4)) % 4);
    const base64 = (vapidKey + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const keyArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      keyArray[i] = rawData.charCodeAt(i);
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyArray.buffer as ArrayBuffer,
    });

    const json = subscription.toJSON();
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: json.keys,
      }),
    });

    return true;
  } catch (err) {
    console.error("Push subscription failed:", err);
    return false;
  }
}
