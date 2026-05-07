"use client";

import { useState, useEffect } from "react";
import { Bell, X, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

const DISMISS_KEY = "notification_prompt_dismissed_v1";

export function NotificationPromptCard() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") return;
    setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Card className="border-primary/25 bg-gradient-to-r from-primary/8 to-primary/3">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
            <BellRing className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Bildirimleri Etkinleştirin</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Öğün saatleriniz yaklaşırken, antrenman planınız hazır olduğunda ve hatırlatıcılarınız tetiklendiğinde anında haberdar olun. Bildirimleri açarak programınıza sadık kalın.
            </p>
            <Button asChild size="sm" className="mt-3 h-8 gap-1.5 text-xs">
              <Link href="/ayarlar/bildirim">
                <Bell className="h-3.5 w-3.5" />
                Bildirimleri Aç
              </Link>
            </Button>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors mt-0.5"
            aria-label="Kapat"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
