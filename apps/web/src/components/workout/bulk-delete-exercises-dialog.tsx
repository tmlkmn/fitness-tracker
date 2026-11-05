"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useDeleteAllExercises } from "@/hooks/use-exercise-crud";
import { useTranslations } from "next-intl";

interface BulkDeleteExercisesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dailyPlanId: number;
  exerciseCount: number;
}

export function BulkDeleteExercisesDialog({
  open,
  onOpenChange,
  dailyPlanId,
  exerciseCount,
}: BulkDeleteExercisesDialogProps) {
  const deleteAll = useDeleteAllExercises();
  const t = useTranslations("exercises.bulkDelete");

  const handleDelete = () => {
    deleteAll.mutate(dailyPlanId, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {t("title")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t("warningPrefix")}<strong>{t("warningCountStrong", { count: exerciseCount })}</strong>{t("warningSuffix")}
          </p>
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-xs text-destructive">
              {t("extraWarning")}
            </p>
          </div>
          <div className="flex gap-2 pt-1">
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
              disabled={deleteAll.isPending}
            >
              {deleteAll.isPending ? t("deleting") : t("deleteAll")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
