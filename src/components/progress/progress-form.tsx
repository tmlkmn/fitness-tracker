"use client";

import { useState } from "react";
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

const BODY_PARTS = [
  { key: "leftArm", label: "Sol Kol" },
  { key: "rightArm", label: "Sağ Kol" },
  { key: "torso", label: "Gövde" },
  { key: "leftLeg", label: "Sol Bacak" },
  { key: "rightLeg", label: "Sağ Bacak" },
] as const;

export function ProgressForm() {
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
    toast.success("İlerleme kaydedildi");
  };

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base">Yeni Ölçüm Ekle</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Tabs defaultValue="ana">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="ana" className="text-xs">
                Ana Bilgiler
              </TabsTrigger>
              <TabsTrigger value="bolge" className="text-xs">
                Vücut
              </TabsTrigger>
              <TabsTrigger value="olcu" className="text-xs">
                Ölçüler
              </TabsTrigger>
            </TabsList>

            {/* Ana Bilgiler */}
            <TabsContent value="ana" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <NumericField
                  id="weight"
                  label="Kilo"
                  unit="kg"
                  value={get("weight")}
                  onChange={(v) => set("weight", v)}
                  placeholder="92.0"
                />
                <NumericField
                  id="fluidPercent"
                  label="Sıvı Oranı"
                  unit="%"
                  value={get("fluidPercent")}
                  onChange={(v) => set("fluidPercent", v)}
                  placeholder="58.0"
                >
                  <RangeIndicator value={get("fluidPercent")} type="fluid" />
                </NumericField>
                <NumericField
                  id="fluidKg"
                  label="Sıvı"
                  unit="kg"
                  value={get("fluidKg")}
                  onChange={(v) => set("fluidKg", v)}
                  placeholder="50.0"
                />
                <NumericField
                  id="fatPercent"
                  label="Yağ Oranı"
                  unit="%"
                  value={get("fatPercent")}
                  onChange={(v) => set("fatPercent", v)}
                  placeholder="20.0"
                >
                  <RangeIndicator value={get("fatPercent")} type="fat" />
                </NumericField>
                <NumericField
                  id="fatKg"
                  label="Yağ"
                  unit="kg"
                  value={get("fatKg")}
                  onChange={(v) => set("fatKg", v)}
                  placeholder="18.0"
                />
                <NumericField
                  id="bmi"
                  label="BMI"
                  value={get("bmi")}
                  onChange={(v) => set("bmi", v)}
                  placeholder="24.0"
                >
                  <RangeIndicator value={get("bmi")} type="bmi" />
                </NumericField>
              </div>
              <div className="space-y-1">
                <Label htmlFor="notes" className="text-xs">
                  Notlar
                </Label>
                <Input
                  id="notes"
                  placeholder="Bugün nasıl hissettim..."
                  value={get("notes")}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </div>
            </TabsContent>

            {/* Vücut Bölgeleri */}
            <TabsContent value="bolge" className="space-y-3 mt-3">
              {BODY_PARTS.map((part, idx) => (
                <div key={part.key}>
                  <p className="text-xs font-semibold mb-2">{part.label}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <NumericField
                      id={`${part.key}FatPercent`}
                      label="Yağ"
                      unit="%"
                      value={get(`${part.key}FatPercent`)}
                      onChange={(v) => set(`${part.key}FatPercent`, v)}
                    />
                    <NumericField
                      id={`${part.key}FatKg`}
                      label="Yağ"
                      unit="kg"
                      value={get(`${part.key}FatKg`)}
                      onChange={(v) => set(`${part.key}FatKg`, v)}
                    />
                    <NumericField
                      id={`${part.key}MusclePercent`}
                      label="Kas"
                      unit="%"
                      value={get(`${part.key}MusclePercent`)}
                      onChange={(v) => set(`${part.key}MusclePercent`, v)}
                    />
                    <NumericField
                      id={`${part.key}MuscleKg`}
                      label="Kas"
                      unit="kg"
                      value={get(`${part.key}MuscleKg`)}
                      onChange={(v) => set(`${part.key}MuscleKg`, v)}
                    />
                  </div>
                  {idx < BODY_PARTS.length - 1 && (
                    <Separator className="mt-3" />
                  )}
                </div>
              ))}
            </TabsContent>

            {/* Ölçüler */}
            <TabsContent value="olcu" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <NumericField
                  id="waistCm"
                  label="Bel"
                  unit="cm"
                  step="0.5"
                  value={get("waistCm")}
                  onChange={(v) => set("waistCm", v)}
                  placeholder="88.0"
                />
                <NumericField
                  id="rightArmCm"
                  label="Sağ Kol"
                  unit="cm"
                  step="0.5"
                  value={get("rightArmCm")}
                  onChange={(v) => set("rightArmCm", v)}
                />
                <NumericField
                  id="leftArmCm"
                  label="Sol Kol"
                  unit="cm"
                  step="0.5"
                  value={get("leftArmCm")}
                  onChange={(v) => set("leftArmCm", v)}
                />
                <NumericField
                  id="rightLegCm"
                  label="Sağ Bacak"
                  unit="cm"
                  step="0.5"
                  value={get("rightLegCm")}
                  onChange={(v) => set("rightLegCm", v)}
                />
                <NumericField
                  id="leftLegCm"
                  label="Sol Bacak"
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
            {addProgress.isPending ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
