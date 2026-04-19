"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useExerciseSearch } from "@/hooks/use-exercise-library";
import { getExerciseDefaults } from "@/data/exercise-defaults";
import { Dumbbell } from "lucide-react";

interface ExerciseLibraryPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (data: {
    name: string;
    sets: string;
    reps: string;
    restSeconds: string;
    durationMinutes: string;
  }) => void;
}

export function ExerciseLibraryPicker({
  open,
  onOpenChange,
  onSelect,
}: ExerciseLibraryPickerProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const { data: results, isLoading } = useExerciseSearch(debouncedQuery);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleSelect = (exercise: NonNullable<typeof results>[number]) => {
    const defaults = getExerciseDefaults(exercise.name, exercise.equipment);
    onSelect({
      name: exercise.name,
      sets: defaults.sets.toString(),
      reps: defaults.reps,
      restSeconds: defaults.restSeconds.toString(),
      durationMinutes: defaults.durationMinutes?.toString() ?? "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Egzersiz Kütüphanesi</DialogTitle>
        </DialogHeader>

        <Input
          placeholder="Egzersiz ara... (ör. bench press)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />

        <div className="space-y-1 max-h-[55vh] overflow-y-auto">
          {isLoading && debouncedQuery.length >= 2 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aranıyor...
            </p>
          ) : debouncedQuery.length < 2 ? (
            <div className="text-center py-6 space-y-2">
              <Dumbbell className="h-8 w-8 mx-auto text-muted-foreground opacity-20" />
              <p className="text-sm text-muted-foreground">
                En az 2 karakter yazın
              </p>
            </div>
          ) : results?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Sonuç bulunamadı
            </p>
          ) : (
            results?.map((ex) => (
              <button
                key={ex.id}
                className="w-full text-left rounded-lg border p-2.5 hover:bg-muted/50 transition-colors space-y-1"
                onClick={() => handleSelect(ex)}
              >
                <p className="text-sm font-medium capitalize">{ex.name}</p>
                <div className="flex gap-1 flex-wrap">
                  {ex.primaryMuscles.map((m) => (
                    <Badge
                      key={m}
                      variant="secondary"
                      className="text-[10px] h-4 px-1"
                    >
                      {m}
                    </Badge>
                  ))}
                  {ex.equipment && (
                    <Badge
                      variant="outline"
                      className="text-[10px] h-4 px-1"
                    >
                      {ex.equipment}
                    </Badge>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
