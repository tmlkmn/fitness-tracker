"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BellOff, BellRing, CalendarDays, CheckCircle2, Loader2, Moon } from "lucide-react";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/hooks/use-notification-preferences";
import { subscribeToPush } from "@/lib/push-subscribe";

function PushStatus() {
  const [status, setStatus] = useState<"loading" | "active" | "denied" | "unsupported" | null>("loading");

  useEffect(() => {
    if (typeof Notification === "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }

    if (Notification.permission === "granted") {
      navigator.serviceWorker
        .getRegistration()
        .then(async (reg) => {
          if (reg) {
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
              setStatus("active");
              return;
            }
          }
          // Permission granted but no subscription — auto re-subscribe
          const success = await subscribeToPush();
          setStatus(success ? "active" : null);
        })
        .catch(() => setStatus(null));
    } else {
      setStatus(null);
    }
  }, []);

  if (status === "loading" || status === null) return null;

  if (status === "unsupported") {
    return (
      <p className="text-xs text-muted-foreground">
        Tarayıcınız push bildirimlerini desteklemiyor.
      </p>
    );
  }

  if (status === "denied") {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <BellOff className="h-3.5 w-3.5" />
        Push bildirimleri tarayıcı ayarlarından engellendi. Tarayıcı ayarlarından izin verin.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
      Push bildirimleri aktif
    </div>
  );
}

export function NotificationPreferencesCard() {
  const { data: prefs, isLoading } = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreferences();
  const [pushLoading, setPushLoading] = useState(false);
  const [pushKey, setPushKey] = useState(0);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const toggle = (key: string, value: boolean) => {
    updateMutation.mutate({
      inAppEnabled: prefs?.inAppEnabled ?? false,
      emailEnabled: prefs?.emailEnabled ?? false,
      pushEnabled: prefs?.pushEnabled ?? false,
      [key]: value,
    });
  };

  const quietEnabled = Boolean(prefs?.quietHoursStart && prefs?.quietHoursEnd);

  const toggleQuiet = (enabled: boolean) => {
    updateMutation.mutate({
      quietHoursStart: enabled ? prefs?.quietHoursStart ?? "22:00" : null,
      quietHoursEnd: enabled ? prefs?.quietHoursEnd ?? "08:00" : null,
    });
  };

  const setQuietTime = (key: "quietHoursStart" | "quietHoursEnd", value: string) => {
    updateMutation.mutate({ [key]: value });
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      // Request permission and subscribe
      setPushLoading(true);
      try {
        const success = await subscribeToPush();
        if (success) {
          toggle("pushEnabled", true);
          setPushKey((k) => k + 1); // re-render PushStatus
        }
        // If permission denied or failed, don't toggle on
      } finally {
        setPushLoading(false);
      }
    } else {
      // Unsubscribe and toggle off
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            const endpoint = sub.endpoint;
            await sub.unsubscribe();
            await fetch("/api/push/unsubscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ endpoint }),
            });
          }
        }
      } catch {
        // Best effort unsubscribe
      }
      toggle("pushEnabled", false);
      setPushKey((k) => k + 1);
    }
  };

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BellRing className="h-4 w-4" />
          Bildirim Tercihleri
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Uygulama içi bildirimler</Label>
          <Switch
            checked={prefs?.inAppEnabled ?? false}
            onCheckedChange={(v) => toggle("inAppEnabled", v)}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-sm">E-posta bildirimleri</Label>
          <Switch
            checked={prefs?.emailEnabled ?? false}
            onCheckedChange={(v) => toggle("emailEnabled", v)}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-sm">Push bildirimleri</Label>
          {pushLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Switch
              checked={prefs?.pushEnabled ?? false}
              onCheckedChange={handlePushToggle}
            />
          )}
        </div>
        {(prefs?.pushEnabled ?? false) && <PushStatus key={pushKey} />}

        <div className="pt-3 border-t border-border/60 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm flex items-center gap-2">
              <Moon className="h-3.5 w-3.5" />
              Sessiz Saatler
            </Label>
            <Switch checked={quietEnabled} onCheckedChange={toggleQuiet} />
          </div>
          {quietEnabled && (
            <>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">Başlangıç</Label>
                  <Input
                    type="time"
                    value={prefs?.quietHoursStart ?? "22:00"}
                    onChange={(e) => setQuietTime("quietHoursStart", e.target.value)}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">Bitiş</Label>
                  <Input
                    type="time"
                    value={prefs?.quietHoursEnd ?? "08:00"}
                    onChange={(e) => setQuietTime("quietHoursEnd", e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Bu saatler arasında push ve e-posta bildirimleri gönderilmez. Uygulama içi bildirimler kaydedilmeye devam eder.
              </p>
            </>
          )}
        </div>

        <div className="pt-3 border-t border-border/60 space-y-2">
          <Label className="text-sm flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5" />
            Hafta Başlangıcı
          </Label>
          <Select
            value={prefs?.weekStartsOn ?? "monday"}
            onValueChange={(v) =>
              updateMutation.mutate({ weekStartsOn: v as "monday" | "sunday" })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monday">Pazartesi</SelectItem>
              <SelectItem value="sunday">Pazar</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
