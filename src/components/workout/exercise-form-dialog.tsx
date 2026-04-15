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
import { useCreateExercise, useUpdateExercise } from "@/hooks/use-exercise-crud";

const SECTIONS = [
  { value: "warmup", label: "Isınma" },
  { value: "main", label: "Ana Antrenman" },
  { value: "cooldown", label: "Soğuma" },
  { value: "sauna", label: "Sauna" },
  { value: "swimming", label: "Yüzme" },
];

interface ExerciseData {
  id?: number;
  section: string;
  sectionLabel: string;
  name: string;
  sets?: number | null;
  reps?: string | null;
  restSeconds?: number | null;
  durationMinutes?: number | null;
  notes?: string | null;
}

interface ExerciseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dailyPlanId: number;
  exercise?: ExerciseData;
}

export function ExerciseFormDialog({
  open,
  onOpenChange,
  dailyPlanId,
  exercise,
}: ExerciseFormDialogProps) {
  const isEdit = !!exercise?.id;
  const createExercise = useCreateExercise();
  const updateExercise = useUpdateExercise();

  const [section, setSection] = useState(exercise?.section ?? "main");
  const [name, setName] = useState(exercise?.name ?? "");
  const [sets, setSets] = useState(exercise?.sets?.toString() ?? "");
  const [reps, setReps] = useState(exercise?.reps ?? "");
  const [restSeconds, setRestSeconds] = useState(exercise?.restSeconds?.toString() ?? "");
  const [durationMinutes, setDurationMinutes] = useState(exercise?.durationMinutes?.toString() ?? "");
  const [notes, setNotes] = useState(exercise?.notes ?? "");

  const isPending = createExercise.isPending || updateExercise.isPending;

  const sectionLabel =
    SECTIONS.find((s) => s.value === section)?.label ?? "Ana Antrenman";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const data = {
      section,
      sectionLabel,
      name: name.trim(),
      sets: sets ? parseInt(sets) : null,
      reps: reps.trim() || null,
      restSeconds: restSeconds ? parseInt(restSeconds) : null,
      durationMinutes: durationMinutes ? parseInt(durationMinutes) : null,
      notes: notes.trim() || null,
    };

    const onSuccess = () => onOpenChange(false);

    if (isEdit && exercise?.id) {
      updateExercise.mutate(
        { exerciseId: exercise.id, data },
        { onSuccess },
      );
    } else {
      createExercise.mutate({ dailyPlanId, data }, { onSuccess });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Egzersizi Düzenle" : "Yeni Egzersiz Ekle"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="section" className="text-xs">
              Bölüm
            </Label>
            <Select value={section} onValueChange={setSection}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SECTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs">
              Egzersiz Adı *
            </Label>
            <Input
              id="name"
              placeholder="Bench Press"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sets" className="text-xs">
                Set
              </Label>
              <Input
                id="sets"
                type="number"
                min="0"
                placeholder="4"
                value={sets}
                onChange={(e) => setSets(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reps" className="text-xs">
                Tekrar
              </Label>
              <Input
                id="reps"
                placeholder="10-12"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="restSeconds" className="text-xs">
                Dinlenme (sn)
              </Label>
              <Input
                id="restSeconds"
                type="number"
                min="0"
                placeholder="90"
                value={restSeconds}
                onChange={(e) => setRestSeconds(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="durationMinutes" className="text-xs">
                Süre (dk)
              </Label>
              <Input
                id="durationMinutes"
                type="number"
                min="0"
                placeholder="5"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs">
              Notlar
            </Label>
            <Input
              id="notes"
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
