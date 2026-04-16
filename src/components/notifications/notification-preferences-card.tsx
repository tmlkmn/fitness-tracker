"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BellRing, Loader2 } from "lucide-react";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/hooks/use-notification-preferences";
import { PushPermissionButton } from "./push-permission-button";

export function NotificationPreferencesCard() {
  const { data: prefs, isLoading } = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreferences();

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
      inAppEnabled: prefs?.inAppEnabled ?? true,
      emailEnabled: prefs?.emailEnabled ?? true,
      pushEnabled: prefs?.pushEnabled ?? true,
      [key]: value,
    });
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
            checked={prefs?.inAppEnabled ?? true}
            onCheckedChange={(v) => toggle("inAppEnabled", v)}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-sm">E-posta bildirimleri</Label>
          <Switch
            checked={prefs?.emailEnabled ?? true}
            onCheckedChange={(v) => toggle("emailEnabled", v)}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-sm">Push bildirimleri</Label>
          <Switch
            checked={prefs?.pushEnabled ?? true}
            onCheckedChange={(v) => toggle("pushEnabled", v)}
          />
        </div>
        {(prefs?.pushEnabled ?? true) && <PushPermissionButton />}
      </CardContent>
    </Card>
  );
}
