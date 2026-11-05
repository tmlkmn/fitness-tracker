"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeleteMeal } from "@/hooks/use-meal-crud";
import { useLocale, useTranslations } from "next-intl";
import { getLocalizedMealLabel, isMealLabel } from "@/lib/meal-labels";
import type { Locale } from "@/lib/locale";

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
  const t = useTranslations("meals.delete");
  const locale = useLocale() as Locale;

  const displayLabel = isMealLabel(mealLabel)
    ? getLocalizedMealLabel(mealLabel, locale)
    : mealLabel;

  const handleDelete = () => {
    deleteMeal.mutate(mealId, {
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
          {t("confirmationPrefix")}<strong>{displayLabel}</strong>{t("confirmationSuffix")}
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
            disabled={deleteMeal.isPending}
          >
            {deleteMeal.isPending ? t("deleting") : t("delete")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
