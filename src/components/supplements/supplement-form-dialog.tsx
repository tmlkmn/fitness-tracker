"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateSupplement, useUpdateSupplement } from "@/hooks/use-supplement-crud";
import { useTranslations } from "next-intl";
import {
  SUPPLEMENT_PRESETS,
  CUSTOM_PRESET_KEY,
  getPreset,
} from "@/lib/supplement-presets";

const TIMING_VALUES = [
  "sabah",
  "kahvalti",
  "ogle",
  "antrenman-once",
  "antrenman-sonra",
  "aksam",
  "yatmadan-once",
] as const;

type TimingValue = (typeof TIMING_VALUES)[number];

interface SupplementData {
  id?: number;
  name: string;
  dosage: string;
  timing: string;
  notes?: string | null;
  presetKey?: string | null;
  servingsPerDose?: string | null;
  caloriesPerServing?: number | null;
  proteinPerServing?: string | null;
  carbsPerServing?: string | null;
  fatPerServing?: string | null;
}

interface SupplementFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weeklyPlanId: number;
  supplement?: SupplementData;
}

function numStrToInput(v: number | string | null | undefined): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function parseOptionalNumber(v: string): number | null {
  const trimmed = v.trim();
  if (trimmed === "") return null;
  const n = parseFloat(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function SupplementFormDialog({
  open,
  onOpenChange,
  weeklyPlanId,
  supplement,
}: SupplementFormDialogProps) {
  const t = useTranslations("supplements.form");
  const tPresets = useTranslations("supplements.presets");
  const isEdit = !!supplement?.id;
  const create = useCreateSupplement();
  const update = useUpdateSupplement();

  const [presetKey, setPresetKey] = useState<string>(
    supplement?.presetKey ?? CUSTOM_PRESET_KEY,
  );
  const [name, setName] = useState(supplement?.name ?? "");
  const [dosage, setDosage] = useState(supplement?.dosage ?? "");
  const [timing, setTiming] = useState<string>(supplement?.timing ?? "sabah");
  const [notes, setNotes] = useState(supplement?.notes ?? "");
  const [servingsPerDose, setServingsPerDose] = useState(
    numStrToInput(supplement?.servingsPerDose ?? null),
  );
  const [caloriesPerServing, setCaloriesPerServing] = useState(
    numStrToInput(supplement?.caloriesPerServing ?? null),
  );
  const [proteinPerServing, setProteinPerServing] = useState(
    numStrToInput(supplement?.proteinPerServing ?? null),
  );
  const [carbsPerServing, setCarbsPerServing] = useState(
    numStrToInput(supplement?.carbsPerServing ?? null),
  );
  const [fatPerServing, setFatPerServing] = useState(
    numStrToInput(supplement?.fatPerServing ?? null),
  );

  const isPending = create.isPending || update.isPending;

  const handlePresetChange = (key: string) => {
    setPresetKey(key);
    const preset = getPreset(key);
    if (!preset) return;
    setName(tPresets(preset.key as never));
    setDosage(preset.defaultDosage);
    setTiming(preset.defaultTiming);
    setServingsPerDose(String(preset.defaultServingsPerDose));
    setCaloriesPerServing(String(preset.caloriesPerServing));
    setProteinPerServing(String(preset.proteinPerServing));
    setCarbsPerServing(String(preset.carbsPerServing));
    setFatPerServing(String(preset.fatPerServing));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dosage.trim()) return;

    const data = {
      name: name.trim(),
      dosage: dosage.trim(),
      timing,
      notes: notes.trim() || null,
      presetKey: presetKey === CUSTOM_PRESET_KEY ? null : presetKey,
      servingsPerDose: parseOptionalNumber(servingsPerDose),
      caloriesPerServing: parseOptionalNumber(caloriesPerServing),
      proteinPerServing: parseOptionalNumber(proteinPerServing),
      carbsPerServing: parseOptionalNumber(carbsPerServing),
      fatPerServing: parseOptionalNumber(fatPerServing),
    };

    const onSuccess = () => onOpenChange(false);

    if (isEdit && supplement?.id) {
      update.mutate({ supplementId: supplement.id, data }, { onSuccess });
    } else {
      create.mutate({ weeklyPlanId, data }, { onSuccess });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("editTitle") : t("addTitle")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="supPreset" className="text-xs">
              {t("presetLabel")}
            </Label>
            <Select value={presetKey} onValueChange={handlePresetChange}>
              <SelectTrigger id="supPreset">
                <SelectValue placeholder={t("presetPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CUSTOM_PRESET_KEY}>
                  {tPresets("custom")}
                </SelectItem>
                {SUPPLEMENT_PRESETS.map((p) => (
                  <SelectItem key={p.key} value={p.key}>
                    {tPresets(p.key as never)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="supName" className="text-xs">
              {t("nameLabel")}
            </Label>
            <Input
              id="supName"
              placeholder={t("namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="supDosage" className="text-xs">
              {t("dosageLabel")}
            </Label>
            <Input
              id="supDosage"
              placeholder={t("dosagePlaceholder")}
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="supTiming" className="text-xs">
              {t("timingLabel")}
            </Label>
            <Select value={timing} onValueChange={setTiming}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMING_VALUES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {t(`timings.${v}` as `timings.${TimingValue}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 rounded-md border border-border/60 p-2.5">
            <p className="text-xs font-medium">{t("macroSectionTitle")}</p>
            <p className="text-[10px] text-muted-foreground">
              {t("presetHint")}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="supServings" className="text-xs">
                {t("servingsPerDoseLabel")}
              </Label>
              <Input
                id="supServings"
                type="number"
                step="0.5"
                min="0"
                placeholder="1"
                value={servingsPerDose}
                onChange={(e) => setServingsPerDose(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                {t("servingsHint")}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="supKcal" className="text-xs">
                  {t("caloriesLabel")}
                </Label>
                <Input
                  id="supKcal"
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0"
                  value={caloriesPerServing}
                  onChange={(e) => setCaloriesPerServing(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="supProtein" className="text-xs">
                  {t("proteinLabel")}
                </Label>
                <Input
                  id="supProtein"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0"
                  value={proteinPerServing}
                  onChange={(e) => setProteinPerServing(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="supCarbs" className="text-xs">
                  {t("carbsLabel")}
                </Label>
                <Input
                  id="supCarbs"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0"
                  value={carbsPerServing}
                  onChange={(e) => setCarbsPerServing(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="supFat" className="text-xs">
                  {t("fatLabel")}
                </Label>
                <Input
                  id="supFat"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0"
                  value={fatPerServing}
                  onChange={(e) => setFatPerServing(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="supNotes" className="text-xs">
              {t("notesLabel")}
            </Label>
            <Input
              id="supNotes"
              placeholder={t("notesPlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? t("saving") : isEdit ? t("update") : t("add")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
