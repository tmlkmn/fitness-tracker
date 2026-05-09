"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FlaskConical,
  Mail,
  Bell,
  Smartphone,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { sendTestNotification } from "@/actions/test-notifications";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useQueryClient } from "@tanstack/react-query";

type Channel = "all" | "email" | "push" | "inapp";

interface Result {
  channel: Channel;
  ok: boolean;
  message: string;
  time: string;
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

export default function TestPage() {
  const [loading, setLoading] = useState<Channel | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [pushStatus, setPushStatus] = useState<"checking" | "active" | "no-sw" | "no-perm" | "no-sub">("checking");
  const [resubscribing, setResubscribing] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    checkPushStatus();
  }, []);

  async function checkPushStatus() {
    setPushStatus("checking");
    if (!("serviceWorker" in navigator)) { setPushStatus("no-sw"); return; }
    if (typeof Notification === "undefined" || Notification.permission !== "granted") { setPushStatus("no-perm"); return; }
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) { setPushStatus("no-sw"); return; }
      const sub = await reg.pushManager.getSubscription();
      setPushStatus(sub ? "active" : "no-sub");
    } catch {
      setPushStatus("no-sw");
    }
  }

  async function resubscribe() {
    setResubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setPushStatus("no-perm"); return; }

      // Ensure SW is registered first
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        try {
          reg = await navigator.serviceWorker.register("/sw.js");
        } catch {
          // Full SW failed (dev mode) — try push-only fallback
          reg = await navigator.serviceWorker.register("/sw-push.js");
        }
        // Wait for it to activate
        await new Promise<void>((resolve, reject) => {
          const sw = reg!.installing || reg!.waiting || reg!.active;
          if (reg!.active) { resolve(); return; }
          if (!sw) { reject(new Error("SW kurulumu başarısız")); return; }
          sw.addEventListener("statechange", () => {
            if (sw.state === "activated") resolve();
          });
          setTimeout(() => reject(new Error("SW aktivasyon zaman aşımı")), 10000);
        });
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
      const json = subscription.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      setPushStatus("active");
      addResult("push", true, "Push aboneliği yeniden oluşturuldu");
    } catch (err) {
      addResult("push", false, err instanceof Error ? err.message : "Push aboneliği başarısız");
    } finally {
      setResubscribing(false);
    }
  }

  function addResult(channel: Channel, ok: boolean, message: string) {
    setResults((prev) => [
      { channel, ok, message, time: new Date().toLocaleTimeString("tr-TR") },
      ...prev,
    ]);
  }

  const handleTest = async (channel: Channel) => {
    setLoading(channel);
    try {
      const res = await sendTestNotification(channel);
      addResult(channel, res.ok, res.message);
      // Invalidate notification queries so bell updates immediately
      if (channel === "inapp" || channel === "all") {
        qc.invalidateQueries({ queryKey: ["unread-count"] });
        qc.invalidateQueries({ queryKey: ["notifications"] });
      }
    } catch (err) {
      addResult(channel, false, err instanceof Error ? err.message : "Bilinmeyen hata");
    } finally {
      setLoading(null);
    }
  };

  const channels: Array<{
    key: Channel;
    label: string;
    description: string;
    icon: typeof Mail;
    variant: "default" | "outline" | "secondary";
  }> = [
    {
      key: "inapp",
      label: "Uygulama Bildirimi",
      description: "Bildirim menüsüne (zil ikonu) test bildirimi ekler",
      icon: Bell,
      variant: "outline",
    },
    {
      key: "email",
      label: "E-posta Bildirimi",
      description: "Hesabınıza kayıtlı e-postaya test maili gönderir",
      icon: Mail,
      variant: "outline",
    },
    {
      key: "push",
      label: "Push Bildirimi",
      description: "Tarayıcı push bildirimi gönderir",
      icon: Smartphone,
      variant: "outline",
    },
    {
      key: "all",
      label: "Tüm Kanallar",
      description: "Tercihlerinize göre tüm aktif kanallardan gönderir",
      icon: Send,
      variant: "default",
    },
  ];

  const pushStatusLabels = {
    checking: { text: "Kontrol ediliyor...", color: "text-muted-foreground" },
    active: { text: "Aktif", color: "text-primary" },
    "no-sw": { text: "Service Worker bulunamadı", color: "text-destructive" },
    "no-perm": { text: "İzin verilmemiş", color: "text-destructive" },
    "no-sub": { text: "Abonelik yok", color: "text-destructive" },
  };

  return (
    <div className="animate-fade-in">
      <Header
        title="Bildirim Testi"
        subtitle="E-posta, push ve uygulama bildirimleri"
        icon={FlaskConical}
        rightSlot={<NotificationBell />}
      />
      <div className="p-4 space-y-4">
        {/* Push status diagnostic */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Push Durumu
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Durum:</span>
              <span className={`text-sm font-medium ${pushStatusLabels[pushStatus].color}`}>
                {pushStatusLabels[pushStatus].text}
              </span>
            </div>
            {(pushStatus === "no-sub" || pushStatus === "no-perm" || pushStatus === "no-sw") && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={resubscribe}
                disabled={resubscribing}
              >
                {resubscribing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Push Aboneliğini Yenile
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Test buttons */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Test Gönder</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            {channels.map((ch) => {
              const Icon = ch.icon;
              const isLoading = loading === ch.key;
              return (
                <Button
                  key={ch.key}
                  variant={ch.variant}
                  className="w-full justify-start gap-3 h-auto py-3"
                  disabled={loading !== null}
                  onClick={() => handleTest(ch.key)}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  ) : (
                    <Icon className="h-4 w-4 shrink-0" />
                  )}
                  <div className="text-left">
                    <div className="text-sm font-medium">{ch.label}</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      {ch.description}
                    </div>
                  </div>
                </Button>
              );
            })}
          </CardContent>
        </Card>

        {/* Results */}
        {results.length > 0 && (
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">Sonuçlar</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-2">
              {results.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 p-2 rounded-lg text-sm ${
                    r.ok ? "bg-primary/5" : "bg-destructive/5"
                  }`}
                >
                  {r.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p>{r.message}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {r.time}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
