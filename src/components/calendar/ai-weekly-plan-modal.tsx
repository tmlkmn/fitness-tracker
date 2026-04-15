"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  RefreshCw,
  Check,
  AlertCircle,
  AlertTriangle,
  Dumbbell,
  Moon,
  Waves,
  UtensilsCrossed,
  MessageSquare,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import type { AIWeeklyPlan, AIWeeklyDay } from "@/actions/ai-weekly";
import { useState } from "react";

interface AiWeeklyPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestedPlan: AIWeeklyPlan | null;
  loading: boolean;
  applying: boolean;
  error: string | null;
  onGenerate: (userNote?: string) => void;
  onApply: () => void;
  hasExistingPlan: boolean;
}

const planTypeIcons = {
  workout: Dumbbell,
  swimming: Waves,
  rest: Moon,
};

const planTypeLabels: Record<string, string> = {
  workout: "Antrenman",
  swimming: "Yüzme",
  rest: "Dinlenme",
};

function DaySummary({ day }: { day: AIWeeklyDay }) {
  const Icon =
    planTypeIcons[day.planType as keyof typeof planTypeIcons] ?? Dumbbell;
  const totalCalories = day.meals.reduce(
    (sum, m) => sum + (m.calories ?? 0),
    0,
  );

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 text-left hover:bg-muted transition-colors">
          <Icon className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium flex-1 min-w-0 truncate">{day.dayName}</span>
          <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
            <Badge
              variant="outline"
              className="text-[10px]"
            >
              {planTypeLabels[day.planType] ?? day.planType}
            </Badge>
            {day.meals.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                <UtensilsCrossed className="h-2.5 w-2.5 mr-0.5" />
                {day.meals.length}
              </Badge>
            )}
            {day.exercises.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                <Dumbbell className="h-2.5 w-2.5 mr-0.5" />
                {day.exercises.length}
              </Badge>
            )}
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-2.5 pt-2 pb-1 space-y-2">
          {day.workoutTitle && (
            <p className="text-xs font-medium text-primary">
              {day.workoutTitle}
            </p>
          )}
          {day.meals.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Öğünler ({totalCalories} kcal)
              </p>
              {day.meals.map((m, i) => (
                <p key={i} className="text-xs text-muted-foreground break-words">
                  {m.mealTime} — {m.mealLabel}: {m.content}
                  {m.calories ? ` (${m.calories} kcal)` : ""}
                </p>
              ))}
            </div>
          )}
          {day.exercises.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Egzersizler
              </p>
              {day.exercises.map((ex, i) => (
                <p key={i} className="text-xs text-muted-foreground break-words">
                  {ex.name}
                  {ex.sets && ex.reps ? ` ${ex.sets}x${ex.reps}` : ""}
                  {ex.durationMinutes ? ` ${ex.durationMinutes}dk` : ""}
                </p>
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AiWeeklyPlanModal({
  open,
  onOpenChange,
  suggestedPlan,
  loading,
  applying,
  error,
  onGenerate,
  onApply,
  hasExistingPlan,
}: AiWeeklyPlanModalProps) {
  const [userNote, setUserNote] = useState("");

  const handleGenerate = () => {
    onGenerate(userNote.trim() || undefined);
  };

  const handleNewSuggestion = () => {
    onGenerate(userNote.trim() || undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4 max-h-[85vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI ile Haftalık Plan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {hasExistingPlan && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-500">
                Bu işlem mevcut haftalık programınızı tamamen değiştirecektir.
                Önceki öğün ve egzersiz verileri silinecektir.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Phase 1: User input */}
          {!loading && !suggestedPlan && (
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Bu hafta için özel bir durumun veya isteğin var mı?
                </p>
              </div>
              <textarea
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                rows={3}
                placeholder="Örn: Bu hafta ağırlıkları artırmak istiyorum, sadece 3 gün antrenman yapabilirim, omzum ağrıyor..."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Öneri Al
              </Button>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
              <p className="text-xs text-primary mb-2 font-medium">
                AI haftalık plan oluşturuyor...
              </p>
              {[...Array(7)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}

          {/* Phase 2: Plan result */}
          {!loading && suggestedPlan && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold flex-1">
                  {suggestedPlan.weekTitle}
                </p>
                <Badge variant="outline" className="text-[10px]">
                  {suggestedPlan.phase}
                </Badge>
              </div>
              {suggestedPlan.notes && (
                <p className="text-xs text-muted-foreground">
                  {suggestedPlan.notes}
                </p>
              )}
              <div className="space-y-1.5">
                {suggestedPlan.days.map((day, i) => (
                  <DaySummary key={i} day={day} />
                ))}
              </div>
            </div>
          )}

          {/* Phase 2 buttons */}
          {!loading && suggestedPlan && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleNewSuggestion}
                disabled={loading || applying}
                className="flex-1"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Yeni Öneri
              </Button>
              <Button
                onClick={onApply}
                disabled={loading || applying}
                className="flex-1"
              >
                {applying ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Onayla
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
