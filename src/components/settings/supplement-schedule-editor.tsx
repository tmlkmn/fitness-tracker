"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { updateSupplementSchedule } from "@/actions/user";
import { useUserProfile } from "@/hooks/use-user";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2 } from "lucide-react";

type SupplementItem = { period: string; supplements: string };

const SUPPLEMENT_PERIOD_OPTIONS = [
  { value: "Sabah", label: "Sabah (uyanınca)" },
  { value: "Kahvaltı ile", label: "Kahvaltı ile" },
  { value: "Öğle", label: "Öğle" },
  { value: "Antrenman öncesi", label: "Antrenman öncesi" },
  { value: "Antrenman sonrası", label: "Antrenman sonrası" },
  { value: "Akşam yemeği ile", label: "Akşam yemeği ile" },
  { value: "Yatmadan önce", label: "Yatmadan önce" },
];

interface Props {
  profile: ReturnType<typeof useUserProfile>["data"];
}

export function SupplementScheduleEditor({ profile }: Props) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<SupplementItem[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.supplementSchedule && Array.isArray(profile.supplementSchedule)) {
      setItems(profile.supplementSchedule as SupplementItem[]);
    }
  }, [profile?.supplementSchedule]);

  const handleSave = async () => {
    const filtered = items.filter((i) => i.period.trim() && i.supplements.trim());
    setSaving(true);
    try {
      await updateSupplementSchedule(filtered);
      await queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="space-y-2">
        {items.length > 0 ? (
          items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.period}:</span>
              <span className="font-medium">{item.supplements}</span>
            </div>
          ))
        ) : (
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">
              Henüz supplement takvimi eklenmemiş.
            </p>
            <div className="opacity-40 space-y-1">
              {[
                { period: "Sabah", supplements: "Omega-3, Vitamin D" },
                { period: "Antrenman öncesi", supplements: "Kreatin, Kafein" },
                { period: "Yatmadan önce", supplements: "Magnezyum, ZMA" },
              ].map((item, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span>{item.period}:</span>
                  <span>{item.supplements}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-primary hover:underline mt-2"
        >
          {items.length > 0 ? "Düzenle" : "Ekle"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const usedPeriods = items
          .map((it, idx) => (idx !== i ? it.period : null))
          .filter(Boolean);
        return (
          <div key={i} className="flex items-center gap-2">
            <Select
              value={
                SUPPLEMENT_PERIOD_OPTIONS.some((o) => o.value === item.period)
                  ? item.period
                  : ""
              }
              onValueChange={(val) => {
                const copy = [...items];
                copy[i] = { ...copy[i], period: val };
                setItems(copy);
              }}
            >
              <SelectTrigger className="h-8 w-40 text-xs shrink-0">
                <SelectValue placeholder="Zaman seçin" />
              </SelectTrigger>
              <SelectContent>
                {SUPPLEMENT_PERIOD_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    disabled={usedPeriods.includes(opt.value)}
                    className="text-xs"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              value={item.supplements}
              onChange={(e) => {
                const copy = [...items];
                copy[i] = { ...copy[i], supplements: e.target.value };
                setItems(copy);
              }}
              placeholder="ör. Omega-3, Kreatin"
              className="flex h-8 flex-1 rounded-md border border-input bg-background px-2 text-xs"
            />
            <button
              onClick={() => setItems(items.filter((_, j) => j !== i))}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
      <button
        onClick={() => setItems([...items, { period: "", supplements: "" }])}
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
            if (profile?.supplementSchedule && Array.isArray(profile.supplementSchedule)) {
              setItems(profile.supplementSchedule as SupplementItem[]);
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
