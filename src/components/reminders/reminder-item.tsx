"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { useToggleReminder, useDeleteReminder } from "@/hooks/use-reminders";
import { EditReminderDialog } from "./edit-reminder-dialog";

interface ReminderItemProps {
  id: number;
  title: string;
  body?: string | null;
  time?: string | null;
  minutesBefore?: number | null;
  recurrence: string;
  intervalMinutes?: number | null;
  intervalStart?: string | null;
  intervalEnd?: string | null;
  daysOfWeek?: number[] | null;
  onceDate?: string | null;
  skipEmail?: boolean | null;
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
  body,
  time,
  minutesBefore,
  recurrence,
  intervalMinutes,
  intervalStart,
  intervalEnd,
  daysOfWeek,
  onceDate,
  skipEmail,
  isEnabled,
  type,
}: ReminderItemProps) {
  const [editOpen, setEditOpen] = useState(false);
  const toggleMutation = useToggleReminder();
  const deleteMutation = useDeleteReminder();

  return (
    <>
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
        <div className="flex items-center gap-1.5 shrink-0">
          {type === "custom" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-primary"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
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

      {type === "custom" && (
        <EditReminderDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          reminder={{
            id,
            title,
            body,
            time,
            recurrence,
            intervalMinutes,
            intervalStart,
            intervalEnd,
            daysOfWeek,
            onceDate,
            skipEmail,
          }}
        />
      )}
    </>
  );
}
