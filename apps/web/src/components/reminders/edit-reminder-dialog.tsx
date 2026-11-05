"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateReminder } from "@/hooks/use-reminders";
import { useTranslations } from "next-intl";

const DAY_VALUES = [1, 2, 3, 4, 5, 6, 0] as const;

interface EditReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminder: {
    id: number;
    title: string;
    body?: string | null;
    time?: string | null;
    recurrence: string;
    intervalMinutes?: number | null;
    intervalStart?: string | null;
    intervalEnd?: string | null;
    daysOfWeek?: number[] | null;
    onceDate?: string | null;
    skipEmail?: boolean | null;
  };
}

export function EditReminderDialog({ open, onOpenChange, reminder }: EditReminderDialogProps) {
  const t = useTranslations("settings.reminderDialog");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [time, setTime] = useState("09:00");
  const [recurrence, setRecurrence] = useState("daily");
  const [intervalMinutes, setIntervalMinutes] = useState("120");
  const [intervalStart, setIntervalStart] = useState("08:00");
  const [intervalEnd, setIntervalEnd] = useState("22:00");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [onceDate, setOnceDate] = useState("");
  const [skipEmail, setSkipEmail] = useState(true);
  const updateMutation = useUpdateReminder();

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle(reminder.title);
      setBody(reminder.body ?? "");
      setTime(reminder.time ?? "09:00");
      setRecurrence(reminder.recurrence);
      setIntervalMinutes(String(reminder.intervalMinutes ?? 120));
      setIntervalStart(reminder.intervalStart ?? "08:00");
      setIntervalEnd(reminder.intervalEnd ?? "22:00");
      setDaysOfWeek(reminder.daysOfWeek ?? []);
      setOnceDate(reminder.onceDate ?? "");
      setSkipEmail(reminder.skipEmail ?? true);
    }
  }, [open, reminder]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await updateMutation.mutateAsync({
      id: reminder.id,
      data: {
        title: title.trim(),
        body: body.trim() || undefined,
        time: recurrence === "interval" ? undefined : time,
        recurrence,
        intervalMinutes: recurrence === "interval" ? parseInt(intervalMinutes) : undefined,
        intervalStart: recurrence === "interval" ? intervalStart : undefined,
        intervalEnd: recurrence === "interval" ? intervalEnd : undefined,
        daysOfWeek: recurrence === "custom" ? daysOfWeek : undefined,
        onceDate: recurrence === "once" ? onceDate : undefined,
        skipEmail,
      },
    });
    onOpenChange(false);
  };

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("editTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">{t("titleLabel")}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">{t("bodyLabel")}</Label>
            <Input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("bodyPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">{t("recurrenceLabel")}</Label>
            <Select value={recurrence} onValueChange={setRecurrence}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t("recurrenceDaily")}</SelectItem>
                <SelectItem value="weekdays">{t("recurrenceWeekdays")}</SelectItem>
                <SelectItem value="weekends">{t("recurrenceWeekends")}</SelectItem>
                <SelectItem value="interval">{t("recurrenceInterval")}</SelectItem>
                <SelectItem value="once">{t("recurrenceOnce")}</SelectItem>
                <SelectItem value="custom">{t("recurrenceCustom")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recurrence === "interval" ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm">{t("intervalLabel")}</Label>
                <Select value={intervalMinutes} onValueChange={setIntervalMinutes}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">{t("interval30")}</SelectItem>
                    <SelectItem value="60">{t("interval60")}</SelectItem>
                    <SelectItem value="90">{t("interval90")}</SelectItem>
                    <SelectItem value="120">{t("interval120")}</SelectItem>
                    <SelectItem value="180">{t("interval180")}</SelectItem>
                    <SelectItem value="240">{t("interval240")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("rangeStart")}</Label>
                  <Input
                    type="time"
                    value={intervalStart}
                    onChange={(e) => setIntervalStart(e.target.value)}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("rangeEnd")}</Label>
                  <Input
                    type="time"
                    value={intervalEnd}
                    onChange={(e) => setIntervalEnd(e.target.value)}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-sm">{t("timeLabel")}</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          )}

          {recurrence === "custom" && (
            <div className="flex flex-wrap gap-2">
              {DAY_VALUES.map((d) => (
                <Button
                  key={d}
                  variant={daysOfWeek.includes(d) ? "default" : "outline"}
                  size="sm"
                  className="h-8 w-10 text-xs"
                  onClick={() => toggleDay(d)}
                >
                  {t(`days.${d}` as `days.${0 | 1 | 2 | 3 | 4 | 5 | 6}`)}
                </Button>
              ))}
            </div>
          )}

          {recurrence === "once" && (
            <div className="space-y-2">
              <Label className="text-sm">{t("onceDateLabel")}</Label>
              <Input
                type="date"
                value={onceDate}
                onChange={(e) => setOnceDate(e.target.value)}
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label className="text-sm">{t("emailToggle")}</Label>
            <Switch
              checked={!skipEmail}
              onCheckedChange={(v) => setSkipEmail(!v)}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!title.trim() || updateMutation.isPending}
          >
            {updateMutation.isPending ? t("saving") : t("save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
