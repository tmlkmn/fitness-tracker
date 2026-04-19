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

const TIMING_OPTIONS = [
  { value: "sabah", label: "Sabah" },
  { value: "kahvalti", label: "Kahvaltı ile" },
  { value: "ogle", label: "Öğle" },
  { value: "antrenman-once", label: "Antrenman Öncesi" },
  { value: "antrenman-sonra", label: "Antrenman Sonrası" },
  { value: "aksam", label: "Akşam" },
  { value: "yatmadan-once", label: "Yatmadan Önce" },
];

interface SupplementData {
  id?: number;
  name: string;
  dosage: string;
  timing: string;
  notes?: string | null;
}

interface SupplementFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weeklyPlanId: number;
  supplement?: SupplementData;
}

export function SupplementFormDialog({
  open,
  onOpenChange,
  weeklyPlanId,
  supplement,
}: SupplementFormDialogProps) {
  const isEdit = !!supplement?.id;
  const create = useCreateSupplement();
  const update = useUpdateSupplement();

  const [name, setName] = useState(supplement?.name ?? "");
  const [dosage, setDosage] = useState(supplement?.dosage ?? "");
  const [timing, setTiming] = useState(supplement?.timing ?? "sabah");
  const [notes, setNotes] = useState(supplement?.notes ?? "");

  const isPending = create.isPending || update.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dosage.trim()) return;

    const data = {
      name: name.trim(),
      dosage: dosage.trim(),
      timing,
      notes: notes.trim() || null,
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
      <DialogContent className="max-w-sm mx-4">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Supplement Düzenle" : "Yeni Supplement Ekle"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="supName" className="text-xs">
              İsim *
            </Label>
            <Input
              id="supName"
              placeholder="Kreatin"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="supDosage" className="text-xs">
              Doz *
            </Label>
            <Input
              id="supDosage"
              placeholder="5g"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="supTiming" className="text-xs">
              Zamanlama
            </Label>
            <Select value={timing} onValueChange={setTiming}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMING_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="supNotes" className="text-xs">
              Notlar
            </Label>
            <Input
              id="supNotes"
              placeholder="Opsiyonel notlar..."
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
              İptal
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Ekle"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
