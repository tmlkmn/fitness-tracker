"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { RotateCcw, Save, Target } from "lucide-react";
import { toast } from "sonner";
import { useUserProfile, useResolvedMacroTargets } from "@/hooks/use-user";
import { updateMacroStrategy } from "@/actions/user";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

// Fat is stored as a fraction (0.25) but edited as a percentage (25).
function fractionToPct(v: string | null | undefined): string {
  if (v == null || v === "") return "";
  const n = parseFloat(v);
  return Number.isFinite(n) ? String(Math.round(n * 100)) : "";
}

/**
 * Strategy-nudge card (Round 3 dynamic-target model). Instead of freezing four
 * raw macros, the user tunes a STRATEGY — calorie delta, protein g/kg lean, fat
 * % — and the engine computes live macros at their current weight. Leaving a
 * field blank falls back to the goal default. The live preview shows the
 * resolved target so the effect is immediate.
 */
export function MacroTargetsCard() {
  const t = useTranslations("meals.macroTargets");
  const tm = useTranslations("meals.aiMacro");
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const { data: resolved } = useResolvedMacroTargets();
  const qc = useQueryClient();
  const [delta, setDelta] = useState("");
  const [proteinPerKg, setProteinPerKg] = useState("");
  const [fatPct, setFatPct] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDelta(profile.targetCalorieDelta != null ? String(profile.targetCalorieDelta) : "");
    setProteinPerKg(profile.targetProteinPerKg ?? "");
    setFatPct(fractionToPct(profile.targetFatPct));
  }, [profile]);

  const persist = async (payload: {
    calorieDelta: number | null;
    proteinPerKg: number | null;
    fatPct: number | null;
  }) => {
    setSaving(true);
    try {
      await updateMacroStrategy(payload);
      qc.invalidateQueries({ queryKey: ["user-profile"] });
      qc.invalidateQueries({ queryKey: ["macro.resolved"] });
      toast.success(t("saved"));
    } catch {
      toast.error(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    const d = delta.trim() === "" ? null : parseInt(delta, 10);
    const p = proteinPerKg.trim() === "" ? null : parseFloat(proteinPerKg);
    const fPctNum = fatPct.trim() === "" ? null : parseFloat(fatPct);
    persist({
      calorieDelta: d != null && Number.isFinite(d) ? d : null,
      proteinPerKg: p != null && Number.isFinite(p) ? p : null,
      fatPct: fPctNum != null && Number.isFinite(fPctNum) ? Math.round(fPctNum) / 100 : null,
    });
  };

  const handleReset = () => {
    setDelta("");
    setProteinPerKg("");
    setFatPct("");
    persist({ calorieDelta: null, proteinPerKg: null, fatPct: null });
  };

  if (profileLoading) {
    return (
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-3">
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-3">
        <p className="text-xs text-muted-foreground">{t("strategySubtitle")}</p>

        {resolved && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5 text-center">
              {t("currentTarget")}
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {(
                [
                  { label: tm("calorie"), value: resolved.calories },
                  { label: tm("protein"), value: resolved.protein },
                  { label: tm("carbs"), value: resolved.carbs },
                  { label: tm("fat"), value: resolved.fat },
                ] as const
              ).map(({ label, value }) => (
                <div key={label} className="space-y-0.5">
                  <div className="text-[10px] text-muted-foreground">{label}</div>
                  <div className="text-sm font-semibold tabular-nums">{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="calorieDelta" className="text-xs text-muted-foreground">
            {t("calorieDelta")}
          </Label>
          <Input
            id="calorieDelta"
            type="number"
            placeholder="+300"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="proteinPerKg" className="text-xs text-muted-foreground">
              {t("proteinPerKg")}
            </Label>
            <Input
              id="proteinPerKg"
              type="number"
              step="0.1"
              placeholder="2.0"
              value={proteinPerKg}
              onChange={(e) => setProteinPerKg(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fatPct" className="text-xs text-muted-foreground">
              {t("fatPct")}
            </Label>
            <Input
              id="fatPct"
              type="number"
              placeholder="25"
              value={fatPct}
              onChange={(e) => setFatPct(e.target.value)}
              className="h-9"
            />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">{t("hint")}</p>

        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? t("saving") : t("save")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={handleReset}
            disabled={saving}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t("reset")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
