"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { updateDailyRoutine, updateWeekendRoutine } from "@/actions/user";
import { useUserProfile } from "@/hooks/use-user";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROUTINE_EVENTS, normalizeEvent } from "@/lib/routine-constants";
import { AlertTriangle, Loader2, Plus, Trash2 } from "lucide-react";

type RoutineItem = { time: string; event: string };

interface Props {
  profile: ReturnType<typeof useUserProfile>["data"];
}

export function DailyRoutineEditor({ profile }: Props) {
  const queryClient = useQueryClient();
  const [weekdayItems, setWeekdayItems] = useState<RoutineItem[]>([]);
  const [weekendItems, setWeekendItems] = useState<RoutineItem[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"weekday" | "weekend">("weekday");

  useEffect(() => {
    if (profile?.dailyRoutine && Array.isArray(profile.dailyRoutine)) {
      setWeekdayItems(
        (profile.dailyRoutine as RoutineItem[]).map((r) => ({
          ...r,
          event: normalizeEvent(r.event),
        })),
      );
    }
    if (profile?.weekendRoutine && Array.isArray(profile.weekendRoutine)) {
      setWeekendItems(
        (profile.weekendRoutine as RoutineItem[]).map((r) => ({
          ...r,
          event: normalizeEvent(r.event),
        })),
      );
    }
  }, [profile?.dailyRoutine, profile?.weekendRoutine]);

  const handleSave = async () => {
    const filteredWeekday = weekdayItems
      .filter((i) => i.time.trim() && i.event.trim())
      .sort((a, b) => a.time.localeCompare(b.time));
    const filteredWeekend = weekendItems
      .filter((i) => i.time.trim() && i.event.trim())
      .sort((a, b) => a.time.localeCompare(b.time));
    setSaving(true);
    try {
      await updateDailyRoutine(filteredWeekday);
      await updateWeekendRoutine(filteredWeekend);
      setWeekdayItems(filteredWeekday);
      setWeekendItems(filteredWeekend);
      await queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const items = activeTab === "weekday" ? weekdayItems : weekendItems;
  const setItems = activeTab === "weekday" ? setWeekdayItems : setWeekendItems;

  const startEditing = () => {
    setWeekdayItems((prev) => [...prev].sort((a, b) => a.time.localeCompare(b.time)));
    setWeekendItems((prev) => [...prev].sort((a, b) => a.time.localeCompare(b.time)));
    setEditing(true);
  };

  const tabButton = (tab: "weekday" | "weekend", label: string) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
        activeTab === tab
          ? "bg-primary/15 border-primary/40 text-primary"
          : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );

  if (!editing) {
    const hasWeekend = weekendItems.length > 0;
    return (
      <div className="space-y-2">
        {weekdayItems.length > 0 ? (
          <>
            {hasWeekend && (
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Hafta İçi
              </p>
            )}
            {weekdayItems.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground font-mono">{item.time}</span>
                <span>{item.event}</span>
              </div>
            ))}
          </>
        ) : (
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">Henüz günlük akış eklenmemiş.</p>
            <div className="opacity-40 space-y-1">
              {[
                { time: "07:00", event: "Uyanış" },
                { time: "08:00", event: "Kahvaltı" },
                { time: "12:30", event: "Öğle Yemeği" },
                { time: "17:00", event: "Antrenman" },
                { time: "19:00", event: "Akşam Yemeği" },
                { time: "23:00", event: "Uyku" },
              ].map((item, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="font-mono">{item.time}</span>
                  <span>{item.event}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {hasWeekend && (
          <>
            <div className="border-t border-border/50 my-2" />
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Hafta Sonu
            </p>
            {weekendItems.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground font-mono">{item.time}</span>
                <span>{item.event}</span>
              </div>
            ))}
          </>
        )}
        {weekdayItems.length > 0 && !hasWeekend && (
          <>
            <div className="border-t border-border/50 my-2" />
            <button
              onClick={startEditing}
              className="flex items-center gap-2 text-xs text-yellow-500 hover:underline"
            >
              <AlertTriangle className="h-3 w-3" />
              Hafta sonu programı eklenmemiş
            </button>
          </>
        )}
        <button
          onClick={startEditing}
          className="text-xs text-primary hover:underline mt-2"
        >
          {weekdayItems.length > 0 ? "Düzenle" : "Ekle"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {tabButton("weekday", "Hafta İçi")}
        {tabButton("weekend", "Hafta Sonu")}
      </div>

      {items.map((item, i) => (
        <div key={`${activeTab}-${i}`} className="flex items-center gap-2">
          <input
            type="time"
            value={item.time}
            onChange={(e) => {
              const copy = [...items];
              copy[i] = { ...copy[i], time: e.target.value };
              setItems(copy);
            }}
            className="flex h-8 w-24 rounded-md border border-input bg-background px-2 text-xs font-mono"
          />
          <Select
            value={item.event}
            onValueChange={(val) => {
              const copy = [...items];
              copy[i] = { ...copy[i], event: val };
              setItems(copy);
            }}
          >
            <SelectTrigger className="h-8 flex-1 text-xs">
              <SelectValue placeholder="Etkinlik seç" />
            </SelectTrigger>
            <SelectContent>
              {ROUTINE_EVENTS.map((ev) => {
                const usedByOther = items.some(
                  (it, j) => j !== i && it.event === ev.value,
                );
                return (
                  <SelectItem key={ev.value} value={ev.value} disabled={usedByOther}>
                    {ev.label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <button
            onClick={() => setItems(items.filter((_, j) => j !== i))}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        onClick={() => setItems([...items, { time: "", event: "" }])}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <Plus className="h-3 w-3" /> Satır Ekle
      </button>
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Kaydet"}
        </button>
        <button
          onClick={() => {
            if (profile?.dailyRoutine && Array.isArray(profile.dailyRoutine)) {
              setWeekdayItems(profile.dailyRoutine as RoutineItem[]);
            }
            if (profile?.weekendRoutine && Array.isArray(profile.weekendRoutine)) {
              setWeekendItems(profile.weekendRoutine as RoutineItem[]);
            }
            setEditing(false);
          }}
          className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-input text-xs font-medium hover:bg-accent"
        >
          İptal
        </button>
      </div>
    </div>
  );
}
