"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, Loader2, AlertCircle } from "lucide-react";
import { getExerciseFormTips } from "@/actions/ai";

interface ExerciseFormTipsProps {
  name: string;
  notes?: string | null;
}

// Cache tips per exercise name to avoid repeated API calls
const tipsCache = new Map<string, string>();

export function ExerciseFormTips({ name, notes }: ExerciseFormTipsProps) {
  const [open, setOpen] = useState(false);
  const [tips, setTips] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchTips = async () => {
    // Check cache
    const cached = tipsCache.get(name);
    if (cached) {
      setTips(cached);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await getExerciseFormTips(name, notes ?? null);
      setTips(result.tips);
      tipsCache.set(name, result.tips);
    } catch (err) {
      const message =
        err instanceof Error && err.message === "RATE_LIMITED"
          ? "Çok fazla istek gönderdiniz. Lütfen biraz bekleyin."
          : "AI özelliği şu anda kullanılamıyor.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (value: boolean) => {
    setOpen(value);
    if (value && !tips && !loading) {
      fetchTips();
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 text-muted-foreground hover:text-primary"
        onClick={() => handleOpen(true)}
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="text-sm">
              Form İpuçları: {name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {loading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            {tips && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm whitespace-pre-line leading-relaxed">
                  {tips}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
