"use client";

import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useToggleReminder, useDeleteReminder } from "@/hooks/use-reminders";

interface ReminderItemProps {
  id: number;
  title: string;
  time?: string | null;
  minutesBefore?: number | null;
  recurrence: string;
  intervalMinutes?: number | null;
  intervalStart?: string | null;
  intervalEnd?: string | null;
  isEnabled: boolean;
  type: string;
}

const recurrenceLabels: Record<string, string> = {
  daily: "Her gün tekrarlanır",
  weekdays: "Hafta içi tekrarlanır",
  weekends: "Hafta sonu tekrarlanır",
  once: "Tek seferlik",
  custom: "Özel günler",
  interval: "Her gün tekrarlanır",
};

export function ReminderItem({
  id,
  title,
  time,
  minutesBefore,
  recurrence,
  intervalMinutes,
  intervalStart,
  intervalEnd,
  isEnabled,
  type,
}: ReminderItemProps) {
  const toggleMutation = useToggleReminder();
  const deleteMutation = useDeleteReminder();

  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {type === "custom" && recurrence === "interval" && intervalMinutes && (
            <span className="font-mono">
              Her {intervalMinutes >= 60
                ? `${intervalMinutes / 60} sa`
                : `${intervalMinutes} dk`}
              {intervalStart && intervalEnd && ` · ${intervalStart}-${intervalEnd}`}
            </span>
          )}
          {type === "custom" && recurrence !== "interval" && time && (
            <span className="font-mono">{time}</span>
          )}
          {(type === "meal" || type === "workout") && minutesBefore && (
            <span>{minutesBefore} dk önce</span>
          )}
          <span>{recurrenceLabels[recurrence] ?? recurrence}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Switch
          checked={isEnabled}
          onCheckedChange={(v) => toggleMutation.mutate({ id, isEnabled: v })}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => deleteMutation.mutate(id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
