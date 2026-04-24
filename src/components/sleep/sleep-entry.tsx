"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Moon, Plus, Pencil, Trash2 } from "lucide-react";
import { useSleepByDate, useDeleteSleep } from "@/hooks/use-sleep";
import { SleepFormDialog } from "./sleep-form-dialog";

interface SleepEntryProps {
  date: string;
  readOnly?: boolean;
  autoOpen?: boolean;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}dk`;
  if (m === 0) return `${h}sa`;
  return `${h}sa ${m}dk`;
}

export function SleepEntry({ date, readOnly, autoOpen }: SleepEntryProps) {
  const { data: log } = useSleepByDate(date);
  const deleteSleep = useDeleteSleep();
  const [dialogOpen, setDialogOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const autoOpenHandledRef = useRef(false);

  useEffect(() => {
    if (!autoOpen || autoOpenHandledRef.current || readOnly) return;
    autoOpenHandledRef.current = true;
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (!log) {
      setDialogOpen(true);
    }
  }, [autoOpen, log, readOnly]);

  const handleDelete = () => {
    if (!log) return;
    deleteSleep.mutate(log.id);
  };

  return (
    <>
      <Card ref={cardRef}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Moon className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-semibold">Uyku Takibi</h3>
          </div>

          {!log ? (
            // No record — show add button
            <div className="text-center py-3">
              {!readOnly ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Uyku Kaydı Ekle
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">Kayıt yok</p>
              )}
            </div>
          ) : (
            // Record exists — show summary
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium tabular-nums">
                    {log.bedtime} → {log.wakeTime}
                  </span>
                  {log.durationMinutes && (
                    <Badge variant="secondary" className="text-xs">
                      {formatDuration(log.durationMinutes)}
                    </Badge>
                  )}
                </div>
                {!readOnly && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setDialogOpen(true)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={handleDelete}
                      disabled={deleteSleep.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Quality */}
              {log.quality && (
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <Moon
                      key={v}
                      className={`h-3.5 w-3.5 ${
                        v <= log.quality!
                          ? "text-indigo-400 fill-indigo-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">
                    {log.quality}/5
                  </span>
                </div>
              )}

              {/* Notes */}
              {log.notes && (
                <p className="text-xs text-muted-foreground">{log.notes}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <SleepFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        date={date}
        initial={
          log
            ? {
                bedtime: log.bedtime,
                wakeTime: log.wakeTime,
                quality: log.quality,
                notes: log.notes,
              }
            : undefined
        }
      />
    </>
  );
}
