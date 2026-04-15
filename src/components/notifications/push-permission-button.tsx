"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Check, Loader2 } from "lucide-react";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

export function PushPermissionButton() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    }
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        // Ensure SW is registered
        let registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
          try {
            registration = await navigator.serviceWorker.register("/sw.js");
          } catch {
            // Full SW failed (dev mode) — try push-only fallback
            registration = await navigator.serviceWorker.register("/sw-push.js");
          }
          await new Promise<void>((resolve) => {
            if (registration!.active) { resolve(); return; }
            const sw = registration!.installing || registration!.waiting;
            if (!sw) { resolve(); return; }
            sw.addEventListener("statechange", () => {
              if (sw.state === "activated") resolve();
            });
            setTimeout(resolve, 5000);
          });
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
          ),
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
      }
    } catch (err) {
      console.error("Push subscription failed:", err);
    } finally {
      setLoading(false);
    }
  };

  if (typeof Notification === "undefined") {
    return (
      <p className="text-xs text-muted-foreground">
        Tarayıcınız push bildirimlerini desteklemiyor.
      </p>
    );
  }

  if (permission === "granted") {
    return (
      <div className="flex items-center gap-2 text-xs text-primary">
        <Check className="h-3.5 w-3.5" />
        Push bildirimleri aktif
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <BellOff className="h-3.5 w-3.5" />
        Push bildirimleri tarayıcınız tarafından engellendi
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleEnable}
      disabled={loading}
      className="w-full"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <Bell className="h-4 w-4 mr-2" />
      )}
      Push Bildirimlerini Etkinleştir
    </Button>
  );
}
