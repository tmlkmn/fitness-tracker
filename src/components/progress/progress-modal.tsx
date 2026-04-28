"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Switch } from "@/components/ui/switch";
import { RangeIndicator } from "@/components/progress/range-indicator";
import { useAddProgress, useUpdateProgress, useLatestProgress } from "@/hooks/use-progress";
import { useUserProfile } from "@/hooks/use-user";
import { formatDateStr } from "@/lib/utils";
import { toast } from "sonner";
import { Copy, Loader2 } from "lucide-react";

function NumericField({
  id,
  label,
  value,
  onChange,
  step = "0.1",
  placeholder,
  unit,
  children,
  suffix,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
  placeholder?: string;
  unit?: string;
  children?: React.ReactNode;
  suffix?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
        {unit && (
          <span className="text-muted-foreground ml-1">({unit})</span>
        )}
        {suffix && (
          <span className="text-muted-foreground ml-1 text-[10px]">{suffix}</span>
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
  const [quickMode, setQuickMode] = useState(false);
  const [manualBmi, setManualBmi] = useState(false);
  const addProgress = useAddProgress();
  const updateProgress = useUpdateProgress();
  const { data: latestLog, isLoading: latestLoading } = useLatestProgress();
  const { data: profile } = useUserProfile();
  const isEdit = !!initialData;

  useEffect(() => {
    if (initialData) {
      const mapped: Record<string, string> = {};
      for (const [key, value] of Object.entries(initialData)) {
        if (key === "id" || key === "userId" || key === "createdAt") continue;
        if (key === "logDate") {
          // eslint-disable-next-line react-hooks/set-state-in-effect
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
      setManualBmi(false);
    }
  }, [initialData]);

  const get = (key: string) => fields[key] ?? "";
  const set = useCallback((key: string, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value })), []);

  // (m) Auto-calculate BMI when weight changes
  useEffect(() => {
    if (manualBmi) return;
    const weight = parseFloat(fields.weight ?? "");
    const height = profile?.height ? parseFloat(String(profile.height)) : null;
    if (!weight || !height || height <= 0) return;
    const bmi = weight / ((height / 100) ** 2);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFields((prev) => ({ ...prev, bmi: bmi.toFixed(1) }));
  }, [fields.weight, profile?.height, manualBmi]);

  const handleBmiChange = (v: string) => {
    setManualBmi(true);
    set("bmi", v);
  };

  // (l) Copy previous measurement
  const handleCopyPrevious = () => {
    if (!latestLog) return;
    const mapped: Record<string, string> = {};
    for (const [key, value] of Object.entries(latestLog)) {
      if (key === "id" || key === "userId" || key === "createdAt" || key === "logDate") continue;
      if (value != null && value !== "") {
        mapped[key] = String(value);
      }
    }
    setFields(mapped);
    setManualBmi(true); // Don't auto-overwrite copied BMI
    toast.success("Önceki ölçüm değerleri kopyalandı");
  };

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
          <div className="flex items-center justify-between">
            <DialogTitle>{isEdit ? "Ölçümü Düzenle" : "Yeni Ölçüm Ekle"}</DialogTitle>
            {/* (n) Quick mode toggle */}
            <div className="flex items-center gap-2">
              <Label htmlFor="quick-mode" className="text-xs text-muted-foreground">
                Hızlı Giriş
              </Label>
              <Switch
                id="quick-mode"
                checked={quickMode}
                onCheckedChange={setQuickMode}
              />
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* (l) Copy previous button */}
          {!isEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              onClick={handleCopyPrevious}
              disabled={!latestLog || latestLoading}
            >
              {latestLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              Önceki Ölçümü Baz Al
            </Button>
          )}

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

          {/* Ana Bilgiler — (o) reordered: weight → bmi → fat → fluid */}
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
                id="m-bmi"
                label="BMI"
                value={get("bmi")}
                onChange={handleBmiChange}
                placeholder="24.0"
                suffix={!manualBmi && get("weight") ? "(otomatik)" : undefined}
              >
                <RangeIndicator value={get("bmi")} type="bmi" />
              </NumericField>
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
              {!quickMode && (
                <NumericField
                  id="m-fatKg"
                  label="Yağ"
                  unit="kg"
                  value={get("fatKg")}
                  onChange={(v) => set("fatKg", v)}
                  placeholder="18.0"
                />
              )}
              {!quickMode && (
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
              )}
              {!quickMode && (
                <NumericField
                  id="m-fluidKg"
                  label="Sıvı"
                  unit="kg"
                  value={get("fluidKg")}
                  onChange={(v) => set("fluidKg", v)}
                  placeholder="50.0"
                />
              )}
            </div>

            {/* Quick mode: waistCm inline */}
            {quickMode && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <NumericField
                  id="m-waistCm-q"
                  label="Bel"
                  unit="cm"
                  step="0.5"
                  value={get("waistCm")}
                  onChange={(v) => set("waistCm", v)}
                  placeholder="88.0"
                />
              </div>
            )}

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

          {/* Full mode sections */}
          {!quickMode && (
            <>
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
            </>
          )}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Kaydet"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
