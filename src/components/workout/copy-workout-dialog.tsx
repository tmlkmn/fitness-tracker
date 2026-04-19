"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Copy, Timer } from "lucide-react";
import { usePreviousWeekExercises } from "@/hooks/use-exercise-history";
import { bulkCreateExercises } from "@/actions/exercise-crud";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

interface CopyWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dailyPlanId: number;
}

export function CopyWorkoutDialog({
  open,
  onOpenChange,
  dailyPlanId,
}: CopyWorkoutDialogProps) {
  const { data: exercises, isLoading } = usePreviousWeekExercises(
    dailyPlanId,
    open,
  );
  const queryClient = useQueryClient();
  const [copying, setCopying] = useState(false);

  const handleCopy = async () => {
    if (!exercises?.length) return;
    setCopying(true);
    try {
      await bulkCreateExercises(dailyPlanId, exercises);
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      onOpenChange(false);
    } finally {
      setCopying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Geçen Haftadan Kopyala</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-[55vh] overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Yükleniyor...
            </p>
          ) : !exercises?.length ? (
            <div className="text-center py-6 space-y-2">
              <Dumbbell className="h-8 w-8 mx-auto text-muted-foreground opacity-20" />
              <p className="text-sm text-muted-foreground">
                Geçen haftanın aynı gününde egzersiz bulunamadı
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {exercises.length} egzersiz kopyalanacak:
              </p>
              {exercises.map((ex, i) => (
                <div
                  key={i}
                  className="rounded-lg border p-2.5 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{ex.name}</p>
                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                      {ex.sectionLabel}
                    </Badge>
                  </div>
                  <div className="flex gap-1.5 text-xs text-muted-foreground">
                    {ex.sets && ex.reps && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1">
                        {ex.sets}x{ex.reps}
                      </Badge>
                    )}
                    {ex.durationMinutes && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1">
                        {ex.durationMinutes} dk
                      </Badge>
                    )}
                    {ex.restSeconds && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1">
                        <Timer className="h-2.5 w-2.5 mr-0.5" />
                        {ex.restSeconds}sn
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              <Button
                className="w-full gap-1.5"
                onClick={handleCopy}
                disabled={copying}
              >
                <Copy className="h-3.5 w-3.5" />
                {copying ? "Kopyalanıyor..." : "Kopyala"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
