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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  Droplets,
  StretchHorizontal,
  PersonStanding,
  Pill,
  Moon,
  Footprints,
  Activity,
  Utensils,
  Dumbbell,
  Plus,
  type LucideIcon,
} from "lucide-react";

const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  Droplets,
  StretchHorizontal,
  PersonStanding,
  Pill,
  Moon,
  Footprints,
  Activity,
};
import { useReminders, useCreateReminder, useDeleteReminder, useToggleReminder, useCreateFromTemplate } from "@/hooks/use-reminders";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/hooks/use-notification-preferences";
import { REMINDER_TEMPLATES } from "@/lib/reminder-templates";
import { ReminderItem } from "./reminder-item";
import { AddReminderDialog } from "./add-reminder-dialog";
import { useTranslations } from "next-intl";

export function ReminderSettingsCard() {
  const t = useTranslations("settings.remindersCard");
  const tTpl = useTranslations("reminderTemplates");
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

  const activeTemplateCount = activeTemplateKeys.length;
  const activeScheduleCount =
    (mealReminder?.isEnabled ? 1 : 0) + (workoutReminder?.isEnabled ? 1 : 0);
  const customCount = userCustomReminders.length;
  const noneActive =
    activeTemplateCount === 0 && activeScheduleCount === 0 && customCount === 0;

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-3">
        {noneActive && (
          <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
            {t("onboardingHint")}
          </div>
        )}
        <Tabs defaultValue="templates" className="space-y-3">
          <TabsList className="grid grid-cols-3 w-full h-9">
            <TabsTrigger value="templates" className="text-xs gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>{t("tabTemplates")}</span>
              {activeTemplateCount > 0 && (
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {activeTemplateCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="schedule" className="text-xs gap-1.5">
              <Utensils className="h-3.5 w-3.5" />
              <span>{t("tabSchedule")}</span>
              {activeScheduleCount > 0 && (
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {activeScheduleCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="custom" className="text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span>{t("tabCustom")}</span>
              {customCount > 0 && (
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {customCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-0">
            <div className="grid grid-cols-2 gap-2">
              {REMINDER_TEMPLATES.map((tpl) => {
                const isPending = tpl.key in pendingToggles;
                const isActive = isPending
                  ? pendingToggles[tpl.key]
                  : activeTemplateKeys.includes(tpl.key);
                const existingReminder = templateReminders.find(
                  (r) => r.templateKey === tpl.key,
                );
                const text = { title: tTpl(`${tpl.key}.title`), body: tTpl(`${tpl.key}.body`) };
                const Icon = TEMPLATE_ICONS[tpl.icon] ?? Clock;
                let scheduleLabel = "";
                if (isActive && existingReminder) {
                  if (existingReminder.recurrence === "interval") {
                    const min =
                      existingReminder.intervalMinutes ??
                      tpl.defaultIntervalMinutes ??
                      60;
                    const start =
                      existingReminder.intervalStart ??
                      tpl.defaultIntervalStart ??
                      "08:00";
                    const end =
                      existingReminder.intervalEnd ??
                      tpl.defaultIntervalEnd ??
                      "22:00";
                    const freq =
                      min >= 60
                        ? t("intervalHourly", { hours: min / 60 })
                        : t("intervalMinutely", { minutes: min });
                    scheduleLabel = `${start}–${end} · ${freq}`;
                  } else {
                    const time = existingReminder.time ?? tpl.defaultTime ?? "";
                    const rec =
                      existingReminder.recurrence === "daily"
                        ? t("recurrenceDaily")
                        : t("recurrenceWeekdays");
                    scheduleLabel = `${time} · ${rec}`;
                  }
                }
                return (
                  <button
                    key={tpl.key}
                    type="button"
                    onClick={() => handleTemplateToggle(tpl.key, !isActive)}
                    disabled={isPending}
                    aria-pressed={isActive}
                    className={`flex flex-col items-start gap-1.5 rounded-lg border p-2.5 text-left transition-colors disabled:opacity-60 ${
                      isActive
                        ? "border-primary/40 bg-primary/10"
                        : "border-border bg-card hover:bg-accent"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div
                        className={`h-7 w-7 rounded-md flex items-center justify-center ${
                          isActive ? "bg-primary/20" : "bg-muted"
                        }`}
                      >
                        <Icon
                          className={`h-3.5 w-3.5 ${
                            isActive ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                      </div>
                      <Switch
                        checked={isActive}
                        onCheckedChange={(v) => handleTemplateToggle(tpl.key, v)}
                        disabled={isPending}
                        onClick={(e) => e.stopPropagation()}
                        className="scale-75"
                      />
                    </div>
                    <div className="min-w-0 w-full">
                      <p className="text-xs font-medium truncate">{text.title}</p>
                      {scheduleLabel ? (
                        <p className="text-[10px] text-muted-foreground tabular-nums truncate">
                          {scheduleLabel}
                        </p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground truncate">
                          {text.body}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="schedule" className="mt-0 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Utensils className="h-3.5 w-3.5 text-muted-foreground" />
                  {t("mealRemindersLabel")}
                </Label>
                <Switch
                  checked={mealReminder?.isEnabled ?? false}
                  onCheckedChange={handleMealToggle}
                />
              </div>
              {mealReminder?.isEnabled && (
                <div className="flex items-center gap-2 pl-5">
                  <span className="text-xs text-muted-foreground">
                    {t("minutesBeforeLabel")}
                  </span>
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Dumbbell className="h-3.5 w-3.5 text-muted-foreground" />
                  {t("workoutReminderLabel")}
                </Label>
                <Switch
                  checked={workoutReminder?.isEnabled ?? false}
                  onCheckedChange={handleWorkoutToggle}
                />
              </div>
              {workoutReminder?.isEnabled && (
                <div className="space-y-2 pl-5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {t("workoutTimeLabel")}
                    </span>
                    <Input
                      type="time"
                      value={workoutTime}
                      onChange={(e) => handleWorkoutTimeChange(e.target.value)}
                      className="h-8 w-28"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {t("minutesBeforeLabel")}
                    </span>
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
          </TabsContent>

          <TabsContent value="custom" className="mt-0 space-y-3">
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
              <p className="text-xs text-muted-foreground text-center py-3">
                {t("noCustomReminders")}
              </p>
            )}
            <AddReminderDialog />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
