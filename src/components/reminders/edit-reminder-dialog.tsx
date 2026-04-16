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

const DAYS = [
  { value: 1, label: "Pzt" },
  { value: 2, label: "Sal" },
  { value: 3, label: "Çar" },
  { value: 4, label: "Per" },
  { value: 5, label: "Cum" },
  { value: 6, label: "Cmt" },
  { value: 0, label: "Paz" },
];

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
          <DialogTitle>Hatırlatıcı Düzenle</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Başlık</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ör. Su iç, İlaç al..."
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Mesaj (isteğe bağlı)</Label>
            <Input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Bildirim içeriği..."
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Tekrar</Label>
            <Select value={recurrence} onValueChange={setRecurrence}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Her gün</SelectItem>
                <SelectItem value="weekdays">Hafta içi</SelectItem>
                <SelectItem value="weekends">Hafta sonu</SelectItem>
                <SelectItem value="interval">Belirli aralıklarla</SelectItem>
                <SelectItem value="once">Tek seferlik</SelectItem>
                <SelectItem value="custom">Özel günler</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recurrence === "interval" ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm">Kaç dakikada bir</Label>
                <Select value={intervalMinutes} onValueChange={setIntervalMinutes}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 dakika</SelectItem>
                    <SelectItem value="60">1 saat</SelectItem>
                    <SelectItem value="90">1.5 saat</SelectItem>
                    <SelectItem value="120">2 saat</SelectItem>
                    <SelectItem value="180">3 saat</SelectItem>
                    <SelectItem value="240">4 saat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">Başlangıç</Label>
                  <Input
                    type="time"
                    value={intervalStart}
                    onChange={(e) => setIntervalStart(e.target.value)}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">Bitiş</Label>
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
              <Label className="text-sm">Saat</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          )}

          {recurrence === "custom" && (
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => (
                <Button
                  key={d.value}
                  variant={daysOfWeek.includes(d.value) ? "default" : "outline"}
                  size="sm"
                  className="h-8 w-10 text-xs"
                  onClick={() => toggleDay(d.value)}
                >
                  {d.label}
                </Button>
              ))}
            </div>
          )}

          {recurrence === "once" && (
            <div className="space-y-2">
              <Label className="text-sm">Tarih</Label>
              <Input
                type="date"
                value={onceDate}
                onChange={(e) => setOnceDate(e.target.value)}
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label className="text-sm">E-posta bildirimi gönder</Label>
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
            Kaydet
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
