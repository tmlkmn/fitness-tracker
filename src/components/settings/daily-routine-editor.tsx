"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateDailyRoutine, updateWeekendRoutine } from "@/actions/user";
import { useUserProfile } from "@/hooks/use-user";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTINE_EVENTS, normalizeEvent } from "@/lib/routine-constants";
import { Clock, Loader2, Plus, Save, Sparkles, Trash2 } from "lucide-react";

type RoutineItem = { time: string; event: string };

const EVENT_ICONS: Record<string, string> = {
  "Uyanış": "🌅",
  "Kahvaltı": "🍳",
  "İşe Gidiş": "🚗",
  "Öğle Yemeği": "🥗",
  "İşten Çıkış": "🏠",
  "Akşam Yemeği": "🍽️",
  "Antrenman": "🏋️",
  "Uyku": "😴",
};

const TEMPLATE: RoutineItem[] = [
  { time: "07:00", event: "Uyanış" },
  { time: "08:00", event: "Kahvaltı" },
  { time: "12:30", event: "Öğle Yemeği" },
  { time: "17:00", event: "Antrenman" },
  { time: "19:00", event: "Akşam Yemeği" },
  { time: "23:00", event: "Uyku" },
];

interface Props {
  profile: ReturnType<typeof useUserProfile>["data"];
}

export function DailyRoutineEditor({ profile }: Props) {
  const queryClient = useQueryClient();
  const t = useTranslations("settings.dailyRoutine");
  const [weekdayItems, setWeekdayItems] = useState<RoutineItem[]>([]);
  const [weekendItems, setWeekendItems] = useState<RoutineItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"weekday" | "weekend">("weekday");

  useEffect(() => {
    if (Array.isArray(profile?.dailyRoutine)) {
      setWeekdayItems(
        (profile.dailyRoutine as RoutineItem[]).map((r) => ({
          ...r,
          event: normalizeEvent(r.event),
        })),
      );
    }
    if (Array.isArray(profile?.weekendRoutine)) {
      setWeekendItems(
        (profile.weekendRoutine as RoutineItem[]).map((r) => ({
          ...r,
          event: normalizeEvent(r.event),
        })),
      );
    }
  }, [profile?.dailyRoutine, profile?.weekendRoutine]);

  const items = activeTab === "weekday" ? weekdayItems : weekendItems;
  const setItems = activeTab === "weekday" ? setWeekdayItems : setWeekendItems;

  const handleSave = async () => {
    const clean = (arr: RoutineItem[]) =>
      arr
        .filter((i) => i.time.trim() && i.event.trim())
        .sort((a, b) => a.time.localeCompare(b.time));
    const fw = clean(weekdayItems);
    const fwe = clean(weekendItems);
    setSaving(true);
    try {
      await updateDailyRoutine(fw);
      await updateWeekendRoutine(fwe);
      setWeekdayItems(fw);
      setWeekendItems(fwe);
      await queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      toast.success(t("saved"));
    } catch {
      toast.error(t("saveError"));
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-10 w-full rounded-lg" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    );
  }

  const tab = (key: "weekday" | "weekend", count: number) => (
    <button
      type="button"
      onClick={() => setActiveTab(key)}
      className={`h-9 rounded-md text-sm font-medium transition-colors ${
        activeTab === key
          ? "bg-background shadow-sm text-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {t(key)}
      {count > 0 && (
        <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">
          {count}
        </span>
      )}
    </button>
  );

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground leading-relaxed">{t("hint")}</p>

      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {tab("weekday", weekdayItems.length)}
        {tab("weekend", weekendItems.length)}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-8 px-4 text-center">
          <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setItems(TEMPLATE)}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t("useTemplate")}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div
              key={`${activeTab}-${i}`}
              className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/20 p-2"
            >
              <input
                type="time"
                value={item.time}
                onChange={(e) => {
                  const copy = [...items];
                  copy[i] = { ...copy[i], time: e.target.value };
                  setItems(copy);
                }}
                className="h-10 w-28 shrink-0 rounded-md border border-input bg-background px-2 text-sm font-mono tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Select
                value={item.event}
                onValueChange={(val) => {
                  const copy = [...items];
                  copy[i] = { ...copy[i], event: val };
                  setItems(copy);
                }}
              >
                <SelectTrigger className="h-10 flex-1 text-sm">
                  <SelectValue placeholder={t("selectEvent")} />
                </SelectTrigger>
                <SelectContent>
                  {ROUTINE_EVENTS.map((ev) => {
                    const usedByOther = items.some(
                      (it, j) => j !== i && it.event === ev.value,
                    );
                    return (
                      <SelectItem
                        key={ev.value}
                        value={ev.value}
                        disabled={usedByOther}
                      >
                        <span className="flex items-center gap-2">
                          <span aria-hidden>{EVENT_ICONS[ev.value]}</span>
                          {t(`events.${ev.value}`)}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={() => setItems(items.filter((_, j) => j !== i))}
                aria-label={t("cancel")}
                className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setItems([...items, { time: "", event: "" }])}
        className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-lg border border-dashed border-border text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
      >
        <Plus className="h-4 w-4" /> {t("addRow")}
      </button>

      <Button
        type="button"
        size="sm"
        className="w-full h-10 gap-1.5"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {t("save")}
      </Button>
    </div>
  );
}
