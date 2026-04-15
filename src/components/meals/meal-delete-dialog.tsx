"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeleteMeal } from "@/hooks/use-meal-crud";

interface MealDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealId: number;
  mealLabel: string;
}

export function MealDeleteDialog({
  open,
  onOpenChange,
  mealId,
  mealLabel,
}: MealDeleteDialogProps) {
  const deleteMeal = useDeleteMeal();

  const handleDelete = () => {
    deleteMeal.mutate(mealId, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4">
        <DialogHeader>
          <DialogTitle>Öğünü Sil</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          <strong>{mealLabel}</strong> öğününü silmek istediğinize emin
          misiniz? Bu işlem geri alınamaz.
        </p>
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            İptal
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleDelete}
            disabled={deleteMeal.isPending}
          >
            {deleteMeal.isPending ? "Siliniyor..." : "Sil"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
