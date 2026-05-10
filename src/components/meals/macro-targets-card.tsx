"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, Save, Target } from "lucide-react";
import { toast } from "sonner";
import { useUserProfile, useDefaultMacroTargets } from "@/hooks/use-user";
import { updateMacroTargets } from "@/actions/user";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

export function MacroTargetsCard() {
  const t = useTranslations("meals.macroTargets");
  const { data: profile } = useUserProfile();
  const qc = useQueryClient();
  const computeDefaults = useDefaultMacroTargets();
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setCalories(profile.targetCalories?.toString() ?? "");
    setProtein(profile.targetProteinG ?? "");
    setCarbs(profile.targetCarbsG ?? "");
    setFat(profile.targetFatG ?? "");
  }, [profile]);

  const handleAuto = async () => {
    try {
      const defaults = await computeDefaults.mutateAsync();
      if (!defaults) {
        const missing: string[] = [];
        if (!profile?.height) missing.push(t("fieldHeight"));
        if (!profile?.weight || parseFloat(profile.weight) <= 0) missing.push(t("fieldWeight"));
        if (!profile?.age) missing.push(t("fieldAge"));
        const missingText = missing.length
          ? t("missingPrefix", { fields: missing.join(", ") })
          : "";
        toast.error(`${missingText}${t("missingSuffix")}`);
        return;
      }
      setCalories(String(defaults.calories));
      setProtein(String(defaults.protein));
      setCarbs(String(defaults.carbs));
      setFat(String(defaults.fat));
    } catch {
      toast.error(t("computeFailed"));
    }
  };

  const handleSave = async () => {
    const calorieVal = calories ? parseInt(calories) : null;
    if (calorieVal !== null && calorieVal < 1200) {
      toast.error(t("minCalories"));
      return;
    }
    setSaving(true);
    try {
      await updateMacroTargets({
        targetCalories: calories ? parseInt(calories) : null,
        targetProteinG: protein || null,
        targetCarbsG: carbs || null,
        targetFatG: fat || null,
      });
      qc.invalidateQueries({ queryKey: ["user-profile"] });
      qc.invalidateQueries({ queryKey: ["macro.resolved"] });
      toast.success(t("saved"));
    } catch {
      toast.error(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-3">
        <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="targetCalories" className="text-xs text-muted-foreground">
              {t("calories")}
            </Label>
            <Input
              id="targetCalories"
              type="number"
              min="0"
              placeholder="2400"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="targetProtein" className="text-xs text-muted-foreground">
              {t("protein")}
            </Label>
            <Input
              id="targetProtein"
              type="number"
              min="0"
              step="0.1"
              placeholder="150"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="targetCarbs" className="text-xs text-muted-foreground">
              {t("carbs")}
            </Label>
            <Input
              id="targetCarbs"
              type="number"
              min="0"
              step="0.1"
              placeholder="280"
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="targetFat" className="text-xs text-muted-foreground">
              {t("fat")}
            </Label>
            <Input
              id="targetFat"
              type="number"
              min="0"
              step="0.1"
              placeholder="80"
              value={fat}
              onChange={(e) => setFat(e.target.value)}
              className="h-9"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={handleAuto}
          >
            <Calculator className="h-3.5 w-3.5" />
            {t("auto")}
          </Button>
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
        </div>
      </CardContent>
    </Card>
  );
}
