"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Ruler, Save } from "lucide-react";
import { toast } from "sonner";
import { useUserProfile } from "@/hooks/use-user";
import { updateUnitPreferences } from "@/actions/user";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { WeightUnit, EnergyUnit } from "@/lib/units";

function SegmentedButton<T extends string>({
  value,
  current,
  onClick,
  children,
}: {
  value: T;
  current: T;
  onClick: (v: T) => void;
  children: React.ReactNode;
}) {
  const active = value === current;
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={cn(
        "flex-1 h-9 text-sm font-medium rounded-md transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function UnitPreferencesCard() {
  const { data: profile } = useUserProfile();
  const qc = useQueryClient();
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [energyUnit, setEnergyUnit] = useState<EnergyUnit>("kcal");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setWeightUnit((profile.weightUnit as WeightUnit) ?? "kg");
    setEnergyUnit((profile.energyUnit as EnergyUnit) ?? "kcal");
    setDirty(false);
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUnitPreferences({ weightUnit, energyUnit });
      toast.success("Birim tercihleri kaydedildi");
      qc.invalidateQueries({ queryKey: ["user-profile"] });
      setDirty(false);
    } catch {
      toast.error("Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Ruler className="h-4 w-4 text-muted-foreground" />
          Birim Tercihleri
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Ağırlık</Label>
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            <SegmentedButton<WeightUnit>
              value="kg"
              current={weightUnit}
              onClick={(v) => {
                setWeightUnit(v);
                setDirty(true);
              }}
            >
              Kilogram (kg)
            </SegmentedButton>
            <SegmentedButton<WeightUnit>
              value="lb"
              current={weightUnit}
              onClick={(v) => {
                setWeightUnit(v);
                setDirty(true);
              }}
            >
              Pound (lb)
            </SegmentedButton>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Enerji</Label>
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            <SegmentedButton<EnergyUnit>
              value="kcal"
              current={energyUnit}
              onClick={(v) => {
                setEnergyUnit(v);
                setDirty(true);
              }}
            >
              Kalori (kcal)
            </SegmentedButton>
            <SegmentedButton<EnergyUnit>
              value="kj"
              current={energyUnit}
              onClick={(v) => {
                setEnergyUnit(v);
                setDirty(true);
              }}
            >
              Kilojoule (kJ)
            </SegmentedButton>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || !dirty}
          size="sm"
          className="w-full gap-1.5"
        >
          <Save className="h-3.5 w-3.5" />
          Kaydet
        </Button>
      </CardContent>
    </Card>
  );
}
