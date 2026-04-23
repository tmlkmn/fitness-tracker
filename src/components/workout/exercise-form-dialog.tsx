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
import { ExerciseLibraryPicker } from "./exercise-library-picker";
import { NumericStepper } from "@/components/ui/numeric-stepper";
import { Search } from "lucide-react";
import { useDialogCloseGuard } from "@/hooks/use-dialog-close-guard";

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
  const [libraryOpen, setLibraryOpen] = useState(false);

  const isPending = createExercise.isPending || updateExercise.isPending;

  const isDirty =
    !isPending &&
    (name !== (exercise?.name ?? "") ||
      sets !== (exercise?.sets?.toString() ?? "") ||
      reps !== (exercise?.reps ?? "") ||
      restSeconds !== (exercise?.restSeconds?.toString() ?? "") ||
      durationMinutes !== (exercise?.durationMinutes?.toString() ?? "") ||
      notes !== (exercise?.notes ?? "") ||
      section !== (exercise?.section ?? "main"));

  const guardedOpenChange = useDialogCloseGuard(isDirty, onOpenChange);

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
    <Dialog open={open} onOpenChange={guardedOpenChange}>
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
            <div className="flex items-center gap-1">
              <Label htmlFor="name" className="text-xs">
                Egzersiz Adı *
              </Label>
              {!isEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  type="button"
                  onClick={() => setLibraryOpen(true)}
                  title="Kütüphaneden seç"
                >
                  <Search className="h-3 w-3" />
                </Button>
              )}
            </div>
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
              <NumericStepper
                id="sets"
                value={sets}
                onChange={setSets}
                min={1}
                max={20}
                step={1}
                placeholder="4"
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
              <div className="flex gap-1 flex-wrap">
                {["8-10", "10-12", "12-15", "15-20"].map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant={reps === preset ? "default" : "outline"}
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setReps(preset)}
                  >
                    {preset}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="restSeconds" className="text-xs">
                Dinlenme (sn)
              </Label>
              <NumericStepper
                id="restSeconds"
                value={restSeconds}
                onChange={setRestSeconds}
                min={0}
                max={300}
                step={15}
                placeholder="90"
              />
              <div className="flex gap-1">
                {[30, 60, 90, 120].map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant={restSeconds === String(preset) ? "default" : "outline"}
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setRestSeconds(String(preset))}
                  >
                    {preset}
                  </Button>
                ))}
              </div>
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

      {libraryOpen && (
        <ExerciseLibraryPicker
          open={libraryOpen}
          onOpenChange={setLibraryOpen}
          onSelect={(data) => {
            setName(data.name);
            setSets(data.sets);
            setReps(data.reps);
            setRestSeconds(data.restSeconds);
            setDurationMinutes(data.durationMinutes);
          }}
        />
      )}
    </Dialog>
  );
}
