"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCheck } from "lucide-react";
import { useTranslations } from "next-intl";

interface BulkCompleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
  itemCount: number;
  itemLabel: string;
}

export function BulkCompleteDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  itemCount,
  itemLabel,
}: BulkCompleteDialogProps) {
  const t = useTranslations("bulkComplete");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCheck className="h-5 w-5 text-primary" />
            {t("title")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t.rich("body", {
              count: itemCount,
              label: itemLabel,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
              disabled={isPending}
            >
              {isPending ? t("processing") : t("confirm")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
