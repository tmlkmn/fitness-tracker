"use client";

import { useEffect, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Clock } from "lucide-react";
import { useReminders, useCreateReminder, useDeleteReminder, useToggleReminder, useCreateFromTemplate } from "@/hooks/use-reminders";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/hooks/use-notification-preferences";
import { REMINDER_TEMPLATES, getReminderTemplateText } from "@/lib/reminder-templates";
import { ReminderItem } from "./reminder-item";
import { AddReminderDialog } from "./add-reminder-dialog";
import { useTranslations, useLocale } from "next-intl";
import type { Locale } from "@/lib/locale";

export function ReminderSettingsCard() {
  const t = useTranslations("settings.remindersCard");
  const locale = useLocale() as Locale;
  const { data: allReminders, isLoading: remindersLoading } = useReminders();
  const { data: prefs } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();
  const createMutation = useCreateReminder();
  const deleteMutation = useDeleteReminder();
  const toggleMutation = useToggleReminder();
  const templateMutation = useCreateFromTemplate();
  const [pendingToggles, setPendingToggles] = useState<Record<string, boolean>>({});

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
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-10 rounded-full shrink-0" />
            </div>
          ))}
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
        title: t("defaultMealTitle"),
        body: t("defaultMealBody"),
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
        title: t("defaultWorkoutTitle"),
        body: t("defaultWorkoutBody"),
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
    setPendingToggles((prev) => ({ ...prev, [key]: enabled }));
    const existing = templateReminders.find((r) => r.templateKey === key);
    try {
      if (enabled) {
        await templateMutation.mutateAsync(key);
      } else if (existing) {
        await deleteMutation.mutateAsync(existing.id);
      }
    } finally {
      setPendingToggles((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
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
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">{t("mealRemindersLabel")}</Label>
            <Switch
              checked={mealReminder?.isEnabled ?? false}
              onCheckedChange={handleMealToggle}
            />
          </div>
          {mealReminder?.isEnabled && (
            <div className="flex items-center gap-2 pl-1">
              <span className="text-xs text-muted-foreground">{t("minutesBeforeLabel")}</span>
              <Select
                value={String(mealReminder.minutesBefore ?? 10)}
                onValueChange={handleMealMinutesChange}
              >
                <SelectTrigger className="h-8 w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">{t("minute5")}</SelectItem>
                  <SelectItem value="10">{t("minute10")}</SelectItem>
                  <SelectItem value="15">{t("minute15")}</SelectItem>
                  <SelectItem value="30">{t("minute30")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">{t("workoutReminderLabel")}</Label>
            <Switch
              checked={workoutReminder?.isEnabled ?? false}
              onCheckedChange={handleWorkoutToggle}
            />
          </div>
          {workoutReminder?.isEnabled && (
            <div className="space-y-2 pl-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("workoutTimeLabel")}</span>
                <Input
                  type="time"
                  value={workoutTime}
                  onChange={(e) => handleWorkoutTimeChange(e.target.value)}
                  className="h-8 w-28"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("minutesBeforeLabel")}</span>
                <Select
                  value={String(workoutReminder.minutesBefore ?? 15)}
                  onValueChange={handleWorkoutMinutesChange}
                >
                  <SelectTrigger className="h-8 w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">{t("minute5")}</SelectItem>
                    <SelectItem value="10">{t("minute10")}</SelectItem>
                    <SelectItem value="15">{t("minute15")}</SelectItem>
                    <SelectItem value="30">{t("minute30")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-3">
          <Label className="text-sm font-medium">{t("templatesLabel")}</Label>
          {REMINDER_TEMPLATES.map((tpl) => {
            const isPending = tpl.key in pendingToggles;
            const isActive = isPending ? pendingToggles[tpl.key] : activeTemplateKeys.includes(tpl.key);
            const existingReminder = templateReminders.find(
              (r) => r.templateKey === tpl.key
            );
            const text = getReminderTemplateText(tpl.key, locale);
            return (
              <div key={tpl.key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm">{text.title}</span>
                    <p className="text-xs text-muted-foreground truncate">
                      {text.body}
                    </p>
                  </div>
                  <Switch
                    checked={isActive}
                    onCheckedChange={(v) => handleTemplateToggle(tpl.key, v)}
                    disabled={isPending}
                  />
                </div>
                {isActive && existingReminder && (
                  <div className="flex items-center gap-1.5 pl-1 text-xs text-muted-foreground">
                    {existingReminder.recurrence === "interval" ? (
                      <>
                        <span className="font-mono">
                          {existingReminder.intervalStart ?? tpl.defaultIntervalStart ?? "08:00"}-{existingReminder.intervalEnd ?? tpl.defaultIntervalEnd ?? "22:00"}
                        </span>
                        <span>{t("intervalSeparator")}</span>
                        <span>
                          {(() => {
                            const min = existingReminder.intervalMinutes ?? tpl.defaultIntervalMinutes ?? 60;
                            return min >= 60
                              ? t("intervalHourly", { hours: min / 60 })
                              : t("intervalMinutely", { minutes: min });
                          })()}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-mono">
                          {existingReminder.time ?? tpl.defaultTime}
                        </span>
                        <span>{t("intervalSeparator")}</span>
                        <span>
                          {existingReminder.recurrence === "daily"
                            ? t("recurrenceDaily")
                            : t("recurrenceWeekdays")}
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

        <div className="space-y-3">
          <Label className="text-sm font-medium">{t("customRemindersLabel")}</Label>
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
              {t("noCustomReminders")}
            </p>
          )}
          <AddReminderDialog />
        </div>
      </CardContent>
    </Card>
  );
}
