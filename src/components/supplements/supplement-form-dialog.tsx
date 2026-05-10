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
  const t = useTranslations("supplements.form");
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
            {isEdit ? t("editTitle") : t("addTitle")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
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
