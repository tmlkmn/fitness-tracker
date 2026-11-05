"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeleteExercise } from "@/hooks/use-exercise-crud";
import { useTranslations } from "next-intl";

interface ExerciseDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseId: number;
  exerciseName: string;
}

export function ExerciseDeleteDialog({
  open,
  onOpenChange,
  exerciseId,
  exerciseName,
}: ExerciseDeleteDialogProps) {
  const deleteExercise = useDeleteExercise();
  const t = useTranslations("exercises.delete");

  const handleDelete = () => {
    deleteExercise.mutate(exerciseId, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {t("confirmationPrefix")}<strong>{exerciseName}</strong>{t("confirmationSuffix")}
        </p>
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleDelete}
            disabled={deleteExercise.isPending}
          >
            {deleteExercise.isPending ? t("deleting") : t("delete")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
