"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUpdateUserWeightTargets } from "@/hooks/use-user";
import { useLatestProgress } from "@/hooks/use-progress";
import { Pencil, Sparkles, Loader2, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";

interface WeightTargetEditorProps {
  currentWeight?: string | null;
  currentTarget?: string | null;
}

interface AiSuggestion {
  targetWeight: number;
  reasoning: string;
  timelineWeeks: number;
}

export function WeightTargetEditor({
  currentWeight,
  currentTarget,
}: WeightTargetEditorProps) {
  const t = useTranslations("progress.weightTarget");
  const [open, setOpen] = useState(false);
  const [startWeight, setStartWeight] = useState(currentWeight ?? "");
  const [targetWeight, setTargetWeight] = useState(currentTarget ?? "");
  const mutation = useUpdateUserWeightTargets();

  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);

  const { data: latestLog } = useLatestProgress();
  const hasProgress = !!latestLog?.weight;

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setStartWeight(currentWeight ?? "");
      setTargetWeight(currentTarget ?? "");
      setAiSuggestion(null);
    }
    setOpen(isOpen);
  };

  const handleSave = async () => {
    await mutation.mutateAsync({
      weight: startWeight || undefined,
      targetWeight: targetWeight || undefined,
    });
    toast.success(t("saved"));
    setOpen(false);
  };

  const handleAiSuggest = async () => {
    setAiLoading(true);
    setAiSuggestion(null);
    try {
      const res = await fetch("/api/ai/target-weight", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? t("error"));
        return;
      }
      setAiSuggestion(data);
    } catch {
      toast.error(t("unavailable"));
    } finally {
      setAiLoading(false);
    }
  };

  const handleAcceptSuggestion = () => {
    if (aiSuggestion) {
      setTargetWeight(String(aiSuggestion.targetWeight));
      setAiSuggestion(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Pencil className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="start-weight" className="text-xs">
              {t("startWeight")}
            </Label>
            <Input
              id="start-weight"
              type="number"
              step="0.1"
              value={startWeight}
              onChange={(e) => setStartWeight(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="target-weight" className="text-xs">
              {t("targetWeight")}
            </Label>
            <Input
              id="target-weight"
              type="number"
              step="0.1"
              value={targetWeight}
              onChange={(e) => setTargetWeight(e.target.value)}
            />
          </div>

          {hasProgress && !aiSuggestion && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAiSuggest}
              disabled={aiLoading}
              className="w-full gap-1.5 text-xs"
            >
              {aiLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {aiLoading ? t("calculating") : t("aiSuggest")}
            </Button>
          )}

          {aiSuggestion && (
            <div className="bg-muted rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold">{t("aiSuggestion")}</span>
                </div>
                <button
                  onClick={() => setAiSuggestion(null)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-primary">
                  {aiSuggestion.targetWeight} kg
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("weeks", { n: aiSuggestion.timelineWeeks })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {aiSuggestion.reasoning}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAcceptSuggestion}
                className="w-full gap-1.5 text-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t("accept")}
              </Button>
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={mutation.isPending}
            className="w-full"
          >
            {mutation.isPending ? t("saving") : t("save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
