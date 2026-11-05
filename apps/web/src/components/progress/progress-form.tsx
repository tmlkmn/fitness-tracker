"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { RangeIndicator } from "@/components/progress/range-indicator";
import { useAddProgress } from "@/hooks/use-progress";
import { formatDateStr } from "@/lib/utils";
import { toast } from "sonner";

function NumericField({
  id,
  label,
  value,
  onChange,
  step = "0.1",
  placeholder,
  unit,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
  placeholder?: string;
  unit?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
        {unit && (
          <span className="text-muted-foreground ml-1">({unit})</span>
        )}
      </Label>
      <Input
        id={id}
        type="number"
        step={step}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {children}
    </div>
  );
}

const BODY_PARTS = ["leftArm", "rightArm", "torso", "leftLeg", "rightLeg"] as const;

export function ProgressForm() {
  const t = useTranslations("progress.form");
  const [fields, setFields] = useState<Record<string, string>>({});
  const addProgress = useAddProgress();

  const get = (key: string) => fields[key] ?? "";
  const set = (key: string, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const today = formatDateStr(new Date());
    const data: Record<string, string | undefined> = { logDate: today };
    for (const [key, value] of Object.entries(fields)) {
      if (value) data[key] = value;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await addProgress.mutateAsync(data as any);
    setFields({});
    toast.success(t("saved"));
  };

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Tabs defaultValue="ana">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="ana" className="text-xs">
                {t("tabMain")}
              </TabsTrigger>
              <TabsTrigger value="bolge" className="text-xs">
                {t("tabBody")}
              </TabsTrigger>
              <TabsTrigger value="olcu" className="text-xs">
                {t("tabMeasurements")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ana" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <NumericField
                  id="weight"
                  label={t("weight")}
                  unit="kg"
                  value={get("weight")}
                  onChange={(v) => set("weight", v)}
                  placeholder="92.0"
                />
                <NumericField
                  id="fluidPercent"
                  label={t("fluidPercent")}
                  unit="%"
                  value={get("fluidPercent")}
                  onChange={(v) => set("fluidPercent", v)}
                  placeholder="58.0"
                >
                  <RangeIndicator value={get("fluidPercent")} type="fluid" />
                </NumericField>
                <NumericField
                  id="fluidKg"
                  label={t("fluid")}
                  unit="kg"
                  value={get("fluidKg")}
                  onChange={(v) => set("fluidKg", v)}
                  placeholder="50.0"
                />
                <NumericField
                  id="fatPercent"
                  label={t("fatPercent")}
                  unit="%"
                  value={get("fatPercent")}
                  onChange={(v) => set("fatPercent", v)}
                  placeholder="20.0"
                >
                  <RangeIndicator value={get("fatPercent")} type="fat" />
                </NumericField>
                <NumericField
                  id="fatKg"
                  label={t("fat")}
                  unit="kg"
                  value={get("fatKg")}
                  onChange={(v) => set("fatKg", v)}
                  placeholder="18.0"
                />
                <NumericField
                  id="bmi"
                  label={t("bmi")}
                  value={get("bmi")}
                  onChange={(v) => set("bmi", v)}
                  placeholder="24.0"
                >
                  <RangeIndicator value={get("bmi")} type="bmi" />
                </NumericField>
              </div>
              <div className="space-y-1">
                <Label htmlFor="notes" className="text-xs">
                  {t("notes")}
                </Label>
                <Input
                  id="notes"
                  placeholder={t("notesPlaceholder")}
                  value={get("notes")}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </div>
            </TabsContent>

            <TabsContent value="bolge" className="space-y-3 mt-3">
              {BODY_PARTS.map((part, idx) => (
                <div key={part}>
                  <p className="text-xs font-semibold mb-2">{t(part)}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <NumericField
                      id={`${part}FatPercent`}
                      label={t("fat")}
                      unit="%"
                      value={get(`${part}FatPercent`)}
                      onChange={(v) => set(`${part}FatPercent`, v)}
                    />
                    <NumericField
                      id={`${part}FatKg`}
                      label={t("fat")}
                      unit="kg"
                      value={get(`${part}FatKg`)}
                      onChange={(v) => set(`${part}FatKg`, v)}
                    />
                    <NumericField
                      id={`${part}MusclePercent`}
                      label={t("muscle")}
                      unit="%"
                      value={get(`${part}MusclePercent`)}
                      onChange={(v) => set(`${part}MusclePercent`, v)}
                    />
                    <NumericField
                      id={`${part}MuscleKg`}
                      label={t("muscle")}
                      unit="kg"
                      value={get(`${part}MuscleKg`)}
                      onChange={(v) => set(`${part}MuscleKg`, v)}
                    />
                  </div>
                  {idx < BODY_PARTS.length - 1 && (
                    <Separator className="mt-3" />
                  )}
                </div>
              ))}
            </TabsContent>

            <TabsContent value="olcu" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <NumericField
                  id="waistCm"
                  label={t("waist")}
                  unit="cm"
                  step="0.5"
                  value={get("waistCm")}
                  onChange={(v) => set("waistCm", v)}
                  placeholder="88.0"
                />
                <NumericField
                  id="rightArmCm"
                  label={t("rightArm")}
                  unit="cm"
                  step="0.5"
                  value={get("rightArmCm")}
                  onChange={(v) => set("rightArmCm", v)}
                />
                <NumericField
                  id="leftArmCm"
                  label={t("leftArm")}
                  unit="cm"
                  step="0.5"
                  value={get("leftArmCm")}
                  onChange={(v) => set("leftArmCm", v)}
                />
                <NumericField
                  id="rightLegCm"
                  label={t("rightLeg")}
                  unit="cm"
                  step="0.5"
                  value={get("rightLegCm")}
                  onChange={(v) => set("rightLegCm", v)}
                />
                <NumericField
                  id="leftLegCm"
                  label={t("leftLeg")}
                  unit="cm"
                  step="0.5"
                  value={get("leftLegCm")}
                  onChange={(v) => set("leftLegCm", v)}
                />
              </div>
            </TabsContent>
          </Tabs>

          <Button
            type="submit"
            disabled={addProgress.isPending}
            className="w-full"
          >
            {addProgress.isPending ? t("saving") : t("save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
