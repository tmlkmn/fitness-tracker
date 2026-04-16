"use client";

import { useEffect } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Clock, Loader2 } from "lucide-react";
import { useReminders, useCreateReminder, useDeleteReminder, useToggleReminder, useCreateFromTemplate } from "@/hooks/use-reminders";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/hooks/use-notification-preferences";
import { REMINDER_TEMPLATES } from "@/lib/reminder-templates";
import { ReminderItem } from "./reminder-item";
import { AddReminderDialog } from "./add-reminder-dialog";

export function ReminderSettingsCard() {
  const { data: allReminders, isLoading: remindersLoading } = useReminders();
  const { data: prefs } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();
  const createMutation = useCreateReminder();
  const deleteMutation = useDeleteReminder();
  const toggleMutation = useToggleReminder();
  const templateMutation = useCreateFromTemplate();

  // Auto-detect timezone on mount
  useEffect(() => {
    if (prefs && !("timezone" in prefs && prefs.timezone)) {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      updatePrefs.mutate({
        inAppEnabled: prefs.inAppEnabled ?? true,
        emailEnabled: prefs.emailEnabled ?? true,
        pushEnabled: prefs.pushEnabled ?? true,
        timezone: tz,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs]);

  if (remindersLoading) {
    return (
      <Card>
        <CardContent className="p-4 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const mealReminder = allReminders?.find((r) => r.type === "meal");
  const workoutReminder = allReminders?.find((r) => r.type === "workout");
  const customReminders = allReminders?.filter((r) => r.type === "custom") ?? [];
  const templateReminders = customReminders.filter((r) => r.templateKey);
  const userCustomReminders = customReminders.filter((r) => !r.templateKey);
  const activeTemplateKeys = templateReminders
    .filter((r) => r.isEnabled)
    .map((r) => r.templateKey);

  const handleMealToggle = async (enabled: boolean) => {
    if (enabled && !mealReminder) {
      await createMutation.mutateAsync({
        type: "meal",
        title: "Öğün Hatırlatıcısı",
        body: "Öğün zamanı yaklaşıyor!",
        minutesBefore: 10,
        recurrence: "daily",
        skipEmail: true,
      });
    } else if (mealReminder) {
      await toggleMutation.mutateAsync({
        id: mealReminder.id,
        isEnabled: enabled,
      });
    }
  };

  const handleMealMinutesChange = async (value: string) => {
    if (!mealReminder) return;
    const { updateReminder } = await import("@/actions/reminders");
    await updateReminder(mealReminder.id, { minutesBefore: parseInt(value) });
    // Invalidate queries
    toggleMutation.mutate({ id: mealReminder.id, isEnabled: mealReminder.isEnabled });
  };

  const handleWorkoutToggle = async (enabled: boolean) => {
    if (enabled && !workoutReminder) {
      await createMutation.mutateAsync({
        type: "workout",
        title: "Antrenman Hatırlatıcısı",
        body: "Antrenman zamanı yaklaşıyor!",
        minutesBefore: 15,
        recurrence: "daily",
        skipEmail: true,
      });
    } else if (workoutReminder) {
      await toggleMutation.mutateAsync({
        id: workoutReminder.id,
        isEnabled: enabled,
      });
    }
  };

  const handleWorkoutMinutesChange = async (value: string) => {
    if (!workoutReminder) return;
    const { updateReminder } = await import("@/actions/reminders");
    await updateReminder(workoutReminder.id, {
      minutesBefore: parseInt(value),
    });
    toggleMutation.mutate({ id: workoutReminder.id, isEnabled: workoutReminder.isEnabled });
  };

  const handleWorkoutTimeChange = (time: string) => {
    updatePrefs.mutate({
      inAppEnabled: prefs?.inAppEnabled ?? true,
      emailEnabled: prefs?.emailEnabled ?? true,
      pushEnabled: prefs?.pushEnabled ?? true,
      defaultWorkoutTime: time,
    });
  };

  const handleTemplateToggle = async (key: string, enabled: boolean) => {
    const existing = templateReminders.find((r) => r.templateKey === key);
    if (enabled) {
      await templateMutation.mutateAsync(key);
    } else if (existing) {
      await deleteMutation.mutateAsync(existing.id);
    }
  };

  const workoutTime =
    prefs && "defaultWorkoutTime" in prefs
      ? (prefs.defaultWorkoutTime as string | null) ?? "19:00"
      : "19:00";

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Hatırlatıcılar
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-4">
        {/* Meal Reminders */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Öğün Hatırlatıcıları</Label>
            <Switch
              checked={mealReminder?.isEnabled ?? false}
              onCheckedChange={handleMealToggle}
            />
          </div>
          {mealReminder?.isEnabled && (
            <div className="flex items-center gap-2 pl-1">
              <span className="text-xs text-muted-foreground">Kaç dk önce:</span>
              <Select
                value={String(mealReminder.minutesBefore ?? 10)}
                onValueChange={handleMealMinutesChange}
              >
                <SelectTrigger className="h-8 w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 dk</SelectItem>
                  <SelectItem value="10">10 dk</SelectItem>
                  <SelectItem value="15">15 dk</SelectItem>
                  <SelectItem value="30">30 dk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <Separator />

        {/* Workout Reminders */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Antrenman Hatırlatıcısı</Label>
            <Switch
              checked={workoutReminder?.isEnabled ?? false}
              onCheckedChange={handleWorkoutToggle}
            />
          </div>
          {workoutReminder?.isEnabled && (
            <div className="space-y-2 pl-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Antrenman saati:</span>
                <Input
                  type="time"
                  value={workoutTime}
                  onChange={(e) => handleWorkoutTimeChange(e.target.value)}
                  className="h-8 w-28"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Kaç dk önce:</span>
                <Select
                  value={String(workoutReminder.minutesBefore ?? 15)}
                  onValueChange={handleWorkoutMinutesChange}
                >
                  <SelectTrigger className="h-8 w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 dk</SelectItem>
                    <SelectItem value="10">10 dk</SelectItem>
                    <SelectItem value="15">15 dk</SelectItem>
                    <SelectItem value="30">30 dk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Template Reminders */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Hazır Şablonlar</Label>
          {REMINDER_TEMPLATES.map((t) => {
            const isActive = activeTemplateKeys.includes(t.key);
            const existingReminder = templateReminders.find(
              (r) => r.templateKey === t.key
            );
            return (
              <div key={t.key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm">{t.title}</span>
                    <p className="text-xs text-muted-foreground truncate">
                      {t.body}
                    </p>
                  </div>
                  <Switch
                    checked={isActive}
                    onCheckedChange={(v) => handleTemplateToggle(t.key, v)}
                  />
                </div>
                {isActive && existingReminder && (
                  <div className="flex items-center gap-1.5 pl-1 text-xs text-muted-foreground">
                    {existingReminder.recurrence === "interval" ? (
                      <>
                        <span className="font-mono">
                          {existingReminder.intervalStart ?? t.defaultIntervalStart ?? "08:00"}-{existingReminder.intervalEnd ?? t.defaultIntervalEnd ?? "22:00"}
                        </span>
                        <span>·</span>
                        <span>
                          {(() => {
                            const min = existingReminder.intervalMinutes ?? t.defaultIntervalMinutes ?? 60;
                            return min >= 60 ? `${min / 60} saatte bir` : `${min} dk.da bir`;
                          })()}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-mono">
                          {existingReminder.time ?? t.defaultTime}
                        </span>
                        <span>·</span>
                        <span>
                          {existingReminder.recurrence === "daily"
                            ? "Her gün tekrarlanır"
                            : "Hafta içi tekrarlanır"}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Separator />

        {/* Custom Reminders */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Özel Hatırlatıcılar</Label>
          {userCustomReminders.length > 0 ? (
            userCustomReminders.map((r) => (
              <ReminderItem
                key={r.id}
                id={r.id}
                title={r.title}
                body={r.body}
                time={r.time}
                minutesBefore={r.minutesBefore}
                recurrence={r.recurrence}
                intervalMinutes={r.intervalMinutes}
                intervalStart={r.intervalStart}
                intervalEnd={r.intervalEnd}
                daysOfWeek={r.daysOfWeek as number[] | null}
                onceDate={r.onceDate}
                skipEmail={r.skipEmail}
                isEnabled={r.isEnabled}
                type={r.type}
              />
            ))
          ) : (
            <p className="text-xs text-muted-foreground">
              Henüz özel hatırlatıcı yok.
            </p>
          )}
          <AddReminderDialog />
        </div>
      </CardContent>
    </Card>
  );
}
