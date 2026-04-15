"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { subscribeToPush } from "@/lib/push-subscribe";

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
      await subscribeToPush();
      if (typeof Notification !== "undefined") {
        setPermission(Notification.permission);
      }
    } finally {
      setLoading(false);
    }
  };

  // Already granted — parent hides this, but also return null as safety
  if (typeof Notification === "undefined") {
    return (
      <p className="text-xs text-muted-foreground">
        Tarayıcınız push bildirimlerini desteklemiyor.
      </p>
    );
  }

  if (permission === "granted") {
    return null;
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
