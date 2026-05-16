"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, CheckCircle2, Loader2 } from "lucide-react";
import { subscribeToPush } from "@/lib/push-subscribe";
import { useTranslations } from "next-intl";

export function PushPermissionButton() {
  const t = useTranslations("notifications.push");
  const [permission, setPermission] = useState<NotificationPermission | "loading">("loading");
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setPermission("denied");
      return;
    }

    setPermission(Notification.permission);

    // Check if an actual push subscription exists in the service worker
    if (Notification.permission === "granted") {
      navigator.serviceWorker
        .getRegistration()
        .then(async (reg) => {
          if (reg) {
            const sub = await reg.pushManager.getSubscription();
            setHasSubscription(!!sub);
            // Auto re-subscribe if permission granted but no subscription
            // (e.g., after PWA reinstall)
            if (!sub) {
              const result = await subscribeToPush();
              setHasSubscription(result.ok);
            }
          } else {
            setHasSubscription(false);
            // No service worker registered — register and subscribe
            const result = await subscribeToPush();
            setHasSubscription(result.ok);
          }
        })
        .catch(() => setHasSubscription(false));
    }
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const result = await subscribeToPush();
      setHasSubscription(result.ok);
      if (typeof Notification !== "undefined") {
        setPermission(Notification.permission);
      }
    } finally {
      setLoading(false);
    }
  };

  // Still loading — show nothing to avoid flash
  if (permission === "loading") return null;

  if (typeof window !== "undefined" && typeof Notification === "undefined") {
    return (
      <p className="text-xs text-muted-foreground">{t("unsupported")}</p>
    );
  }

  if (permission === "granted" && hasSubscription) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
        {t("active")}
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <BellOff className="h-3.5 w-3.5" />
        {t("blocked")}
      </div>
    );
  }

  // Permission not yet granted OR granted but subscription failed
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
      {t("enable")}
    </Button>
  );
}
