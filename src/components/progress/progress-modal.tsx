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
import { Separator } from "@/components/ui/separator";
import { RangeIndicator } from "@/components/progress/range-indicator";
import { useAddProgress, useUpdateProgress } from "@/hooks/use-progress";
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

interface ProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Record<string, unknown> & { id: number; logDate: string };
}

export function ProgressModal({ open, onOpenChange, initialData }: ProgressModalProps) {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [logDate, setLogDate] = useState(() => formatDateStr(new Date()));
  const addProgress = useAddProgress();
  const updateProgress = useUpdateProgress();
  const isEdit = !!initialData;

  useEffect(() => {
    if (initialData) {
      const mapped: Record<string, string> = {};
      for (const [key, value] of Object.entries(initialData)) {
        if (key === "id" || key === "userId" || key === "createdAt") continue;
        if (key === "logDate") {
          setLogDate(String(value));
          continue;
        }
        if (value != null && value !== "") {
          mapped[key] = String(value);
        }
      }
      setFields(mapped);
    } else {
      setFields({});
      setLogDate(formatDateStr(new Date()));
    }
  }, [initialData]);

  const get = (key: string) => fields[key] ?? "";
  const set = (key: string, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const isPending = addProgress.isPending || updateProgress.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: Record<string, string | undefined> = { logDate };
    for (const [key, value] of Object.entries(fields)) {
      if (value) data[key] = value;
    }

    if (isEdit) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateProgress.mutateAsync({ id: initialData.id, data: data as any });
      toast.success("Ölçüm güncellendi");
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await addProgress.mutateAsync(data as any);
      toast.success("Ölçüm kaydedildi");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg max-h-[85vh] overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? "Ölçümü Düzenle" : "Yeni Ölçüm Ekle"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Tarih */}
          <div className="space-y-1">
            <Label htmlFor="logDate" className="text-xs">Tarih</Label>
            <Input
              id="logDate"
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
            />
          </div>

          {/* Ana Bilgiler */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Ana Bilgiler</h3>
            <div className="grid grid-cols-2 gap-3">
              <NumericField
                id="m-weight"
                label="Kilo"
                unit="kg"
                value={get("weight")}
                onChange={(v) => set("weight", v)}
                placeholder="92.0"
              />
              <NumericField
                id="m-fluidPercent"
                label="Sıvı Oranı"
                unit="%"
                value={get("fluidPercent")}
                onChange={(v) => set("fluidPercent", v)}
                placeholder="58.0"
              >
                <RangeIndicator value={get("fluidPercent")} type="fluid" />
              </NumericField>
              <NumericField
                id="m-fluidKg"
                label="Sıvı"
                unit="kg"
                value={get("fluidKg")}
                onChange={(v) => set("fluidKg", v)}
                placeholder="50.0"
              />
              <NumericField
                id="m-fatPercent"
                label="Yağ Oranı"
                unit="%"
                value={get("fatPercent")}
                onChange={(v) => set("fatPercent", v)}
                placeholder="20.0"
              >
                <RangeIndicator value={get("fatPercent")} type="fat" />
              </NumericField>
              <NumericField
                id="m-fatKg"
                label="Yağ"
                unit="kg"
                value={get("fatKg")}
                onChange={(v) => set("fatKg", v)}
                placeholder="18.0"
              />
              <NumericField
                id="m-bmi"
                label="BMI"
                value={get("bmi")}
                onChange={(v) => set("bmi", v)}
                placeholder="24.0"
              >
                <RangeIndicator value={get("bmi")} type="bmi" />
              </NumericField>
            </div>
            <div className="mt-3 space-y-1">
              <Label htmlFor="m-notes" className="text-xs">Notlar</Label>
              <Input
                id="m-notes"
                placeholder="Bugün nasıl hissettim..."
                value={get("notes")}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {/* Vücut Bölgeleri */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Vücut Bölgeleri</h3>
            <div className="space-y-4">
              {BODY_PARTS.map((part) => (
                <div key={part.key}>
                  <p className="text-xs font-semibold mb-2">{part.label}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <NumericField
                      id={`m-${part.key}FatPercent`}
                      label="Yağ"
                      unit="%"
                      value={get(`${part.key}FatPercent`)}
                      onChange={(v) => set(`${part.key}FatPercent`, v)}
                    />
                    <NumericField
                      id={`m-${part.key}FatKg`}
                      label="Yağ"
                      unit="kg"
                      value={get(`${part.key}FatKg`)}
                      onChange={(v) => set(`${part.key}FatKg`, v)}
                    />
                    <NumericField
                      id={`m-${part.key}MusclePercent`}
                      label="Kas"
                      unit="%"
                      value={get(`${part.key}MusclePercent`)}
                      onChange={(v) => set(`${part.key}MusclePercent`, v)}
                    />
                    <NumericField
                      id={`m-${part.key}MuscleKg`}
                      label="Kas"
                      unit="kg"
                      value={get(`${part.key}MuscleKg`)}
                      onChange={(v) => set(`${part.key}MuscleKg`, v)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Ölçüler */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Ölçüler</h3>
            <div className="grid grid-cols-2 gap-3">
              <NumericField
                id="m-waistCm"
                label="Bel"
                unit="cm"
                step="0.5"
                value={get("waistCm")}
                onChange={(v) => set("waistCm", v)}
                placeholder="88.0"
              />
              <NumericField
                id="m-rightArmCm"
                label="Sağ Kol"
                unit="cm"
                step="0.5"
                value={get("rightArmCm")}
                onChange={(v) => set("rightArmCm", v)}
              />
              <NumericField
                id="m-leftArmCm"
                label="Sol Kol"
                unit="cm"
                step="0.5"
                value={get("leftArmCm")}
                onChange={(v) => set("leftArmCm", v)}
              />
              <NumericField
                id="m-rightLegCm"
                label="Sağ Bacak"
                unit="cm"
                step="0.5"
                value={get("rightLegCm")}
                onChange={(v) => set("rightLegCm", v)}
              />
              <NumericField
                id="m-leftLegCm"
                label="Sol Bacak"
                unit="cm"
                step="0.5"
                value={get("leftLegCm")}
                onChange={(v) => set("leftLegCm", v)}
              />
            </div>
          </div>

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Kaydet"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
