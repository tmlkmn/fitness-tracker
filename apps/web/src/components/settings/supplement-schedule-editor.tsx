"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateSupplementSchedule } from "@/actions/user";
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
import { Loader2, Pill, Plus, Save, Sparkles, Trash2 } from "lucide-react";

type SupplementItem = { period: string; supplements: string };

const SUPPLEMENT_PERIODS = [
  "Sabah",
  "Kahvaltı ile",
  "Öğle",
  "Antrenman öncesi",
  "Antrenman sonrası",
  "Akşam yemeği ile",
  "Yatmadan önce",
] as const;

type Period = (typeof SUPPLEMENT_PERIODS)[number];

const PERIOD_ICONS: Record<Period, string> = {
  "Sabah": "🌅",
  "Kahvaltı ile": "🍳",
  "Öğle": "☀️",
  "Antrenman öncesi": "⚡",
  "Antrenman sonrası": "💪",
  "Akşam yemeği ile": "🍽️",
  "Yatmadan önce": "🌙",
};

const TEMPLATE: SupplementItem[] = [
  { period: "Sabah", supplements: "Omega-3, Vitamin D" },
  { period: "Antrenman öncesi", supplements: "Kreatin, Kafein" },
  { period: "Yatmadan önce", supplements: "Magnezyum, ZMA" },
];

function isPeriod(v: string): v is Period {
  return (SUPPLEMENT_PERIODS as readonly string[]).includes(v);
}

interface Props {
  profile: ReturnType<typeof useUserProfile>["data"];
}

export function SupplementScheduleEditor({ profile }: Props) {
  const queryClient = useQueryClient();
  const t = useTranslations("settings.supplementSchedule");
  const [items, setItems] = useState<SupplementItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (Array.isArray(profile?.supplementSchedule)) {
      setItems(profile.supplementSchedule as SupplementItem[]);
    }
  }, [profile?.supplementSchedule]);

  const handleSave = async () => {
    const filtered = items.filter((i) => i.period.trim() && i.supplements.trim());
    setSaving(true);
    try {
      await updateSupplementSchedule(filtered);
      setItems(filtered);
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
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground leading-relaxed">{t("hint")}</p>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-8 px-4 text-center">
          <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center">
            <Pill className="h-5 w-5 text-primary" />
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
          {items.map((item, i) => {
            const usedPeriods = items
              .map((it, idx) => (idx !== i ? it.period : null))
              .filter(Boolean) as string[];
            return (
              <div
                key={i}
                className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Select
                    value={isPeriod(item.period) ? item.period : ""}
                    onValueChange={(val) => {
                      const copy = [...items];
                      copy[i] = { ...copy[i], period: val };
                      setItems(copy);
                    }}
                  >
                    <SelectTrigger className="h-10 flex-1 text-sm">
                      <SelectValue placeholder={t("selectTime")} />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPLEMENT_PERIODS.map((period) => (
                        <SelectItem
                          key={period}
                          value={period}
                          disabled={usedPeriods.includes(period)}
                        >
                          <span className="flex items-center gap-2">
                            <span aria-hidden>{PERIOD_ICONS[period]}</span>
                            {t(`periods.${period}`)}
                          </span>
                        </SelectItem>
                      ))}
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
                <input
                  value={item.supplements}
                  onChange={(e) => {
                    const copy = [...items];
                    copy[i] = { ...copy[i], supplements: e.target.value };
                    setItems(copy);
                  }}
                  placeholder={t("supplementsPlaceholder")}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => setItems([...items, { period: "", supplements: "" }])}
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
