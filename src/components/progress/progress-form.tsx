"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAddProgress } from "@/hooks/use-progress";
import { toast } from "sonner";

export function ProgressForm() {
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [notes, setNotes] = useState("");
  const addProgress = useAddProgress();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const today = new Date().toISOString().split("T")[0];
    await addProgress.mutateAsync({
      userId: 1,
      logDate: today,
      weight: weight || undefined,
      waistCm: waist || undefined,
      notes: notes || undefined,
    });
    setWeight("");
    setWaist("");
    setNotes("");
    toast.success("İlerleme kaydedildi! 💪");
  };

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base">Yeni Ölçüm Ekle</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="weight" className="text-xs">
                Kilo (kg)
              </Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                placeholder="96.0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="waist" className="text-xs">
                Bel (cm)
              </Label>
              <Input
                id="waist"
                type="number"
                step="0.5"
                placeholder="90.0"
                value={waist}
                onChange={(e) => setWaist(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs">
              Notlar
            </Label>
            <Input
              id="notes"
              placeholder="Bugün nasıl hissettim..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
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
