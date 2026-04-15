"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import {
  useExerciseFormTips,
  useRegenerateExerciseFormTips,
} from "@/hooks/use-exercise-form-tips";

interface ExerciseFormTipsProps {
  name: string;
  notes?: string | null;
}

export function ExerciseFormTips({ name, notes }: ExerciseFormTipsProps) {
  const [open, setOpen] = useState(false);

  const {
    data,
    isLoading,
    error: queryError,
  } = useExerciseFormTips(name, notes ?? null, open);

  const regenerate = useRegenerateExerciseFormTips();

  const errorMessage = queryError
    ? queryError.message === "RATE_LIMITED"
      ? "Çok fazla istek gönderdiniz. Lütfen biraz bekleyin."
      : "AI özelliği şu anda kullanılamıyor."
    : regenerate.error
      ? regenerate.error.message === "RATE_LIMITED"
        ? "Çok fazla istek gönderdiniz. Lütfen biraz bekleyin."
        : "Yeniden oluşturulamadı."
      : null;

  const tips = regenerate.data?.tips ?? data?.tips ?? "";
  const loading = isLoading || regenerate.isPending;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 text-muted-foreground hover:text-primary"
        onClick={() => setOpen(true)}
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </Button>
      {open && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-sm mx-4">
            <DialogHeader>
              <DialogTitle className="text-sm flex items-center justify-between gap-2">
                <span className="truncate">Form İpuçları: {name}</span>
                {tips && !loading && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() =>
                      regenerate.mutate({
                        exerciseName: name,
                        exerciseNotes: notes ?? null,
                      })
                    }
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {loading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {errorMessage && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{errorMessage}</p>
                </div>
              )}
              {tips && !loading && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm whitespace-pre-line leading-relaxed">
                    {tips}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
