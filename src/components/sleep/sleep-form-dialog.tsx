"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Moon } from "lucide-react";
import { useUpsertSleep } from "@/hooks/use-sleep";

interface SleepFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  initial?: {
    bedtime: string;
    wakeTime: string;
    quality: number | null;
    notes: string | null;
  };
}

function computeDuration(bedtime: string, wakeTime: string): number | null {
  if (!bedtime || !wakeTime) return null;
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = wakeTime.split(":").map(Number);
  let bedMin = bh * 60 + bm;
  const wakeMin = wh * 60 + wm;
  if (bedMin >= wakeMin) bedMin -= 24 * 60;
  return wakeMin - bedMin;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} dk`;
  if (m === 0) return `${h} saat`;
  return `${h} saat ${m} dk`;
}

export function SleepFormDialog({
  open,
  onOpenChange,
  date,
  initial,
}: SleepFormDialogProps) {
  const [bedtime, setBedtime] = useState(initial?.bedtime ?? "23:00");
  const [wakeTime, setWakeTime] = useState(initial?.wakeTime ?? "07:00");
  const [quality, setQuality] = useState<number>(initial?.quality ?? 3);
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const upsert = useUpsertSleep();

  useEffect(() => {
    if (open) {
      setBedtime(initial?.bedtime ?? "23:00");
      setWakeTime(initial?.wakeTime ?? "07:00");
      setQuality(initial?.quality ?? 3);
      setNotes(initial?.notes ?? "");
    }
  }, [open, initial]);

  const duration = useMemo(
    () => computeDuration(bedtime, wakeTime),
    [bedtime, wakeTime],
  );

  const handleSave = () => {
    if (!bedtime || !wakeTime) return;
    upsert.mutate(
      { logDate: date, bedtime, wakeTime, quality, notes: notes || null },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm w-[calc(100vw-2rem)] p-4 gap-3">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 mr-6">
            <Moon className="h-4 w-4 text-indigo-400" />
            {initial ? "Uyku Kaydını Düzenle" : "Uyku Kaydı Ekle"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Bedtime / Wake time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Yatış Saati
              </Label>
              <Input
                type="time"
                value={bedtime}
                onChange={(e) => setBedtime(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Kalkış Saati
              </Label>
              <Input
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          {/* Duration feedback */}
          {duration !== null && duration > 0 && (
            <div className="text-center py-1.5 rounded-md bg-muted/50">
              <span className="text-sm font-medium">
                {formatDuration(duration)}
              </span>
              <span className="text-xs text-muted-foreground ml-1">uyku</span>
            </div>
          )}

          {/* Quality selector */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Uyku Kalitesi
            </Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setQuality(v)}
                  className="p-1 transition-colors"
                >
                  <Moon
                    className={`h-6 w-6 ${
                      v <= quality
                        ? "text-indigo-400 fill-indigo-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs text-muted-foreground ml-2">
                {quality}/5
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Notlar (opsiyonel)
            </Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Rüya, uyanma sayısı vb."
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              maxLength={200}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            İptal
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={!bedtime || !wakeTime || upsert.isPending}
          >
            {upsert.isPending ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
