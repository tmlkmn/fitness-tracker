"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Loader2,
  Clock,
  Home,
  Building2,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import type { AIWeeklyPlan, AIWeeklyDay } from "@/actions/ai-weekly";
import { useState, useEffect, useRef } from "react";

// ─── Template tags for quick suggestions ────────────────────────────────────

const SUGGESTION_TAGS = [
  "Ağırlıkları artır",
  "Yeni hareketler ekle",
  "Kardiyo / kondisyon",
  "Karın kası hareketleri",
  "Esneklik / mobilite",
  "Dinlenme sürelerini kısalt",
  "Daha fazla set / tekrar",
  "Drop set / süperset",
  "Hafif hafta (deload)",
  "Sadece 3 gün antrenman",
];

const EQUIPMENT_OPTIONS = [
  "Dumbbell",
  "Barbell",
  "Direnç bandı",
  "Pull-up bar",
  "Kettlebell",
  "TRX",
  "Yoga matı",
  "Bench",
  "Hiçbiri (vücut ağırlığı)",
];

const INGREDIENT_TAGS = [
  "Tavuk", "Kırmızı et", "Balık", "Yumurta", "Ton balığı",
  "Pirinç", "Makarna", "Ekmek", "Yulaf", "Bulgur", "Kinoa",
  "Brokoli", "Ispanak", "Domates", "Salatalık", "Biber",
  "Süt", "Yoğurt", "Peynir", "Lor",
  "Kuruyemiş", "Zeytin", "Zeytinyağı", "Bal", "Avokado",
];

// ─── Stepped loading progress ───────────────────────────────────────────────

const LOADING_STEPS = [
  { label: "Profil ve geçmiş veriler analiz ediliyor", delay: 0 },
  { label: "Antrenman programı oluşturuluyor", delay: 15000 },
  { label: "Beslenme planı hazırlanıyor", delay: 45000 },
  { label: "Program optimize ediliyor", delay: 90000 },
];

function SteppedProgress({ loading }: { loading: boolean }) {
  const [activeStep, setActiveStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!loading) {
      setActiveStep(0);
      setElapsed(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const ms = Date.now() - start;
      setElapsed(ms);
      // Advance step based on elapsed time
      for (let i = LOADING_STEPS.length - 1; i >= 0; i--) {
        if (ms >= LOADING_STEPS[i].delay) {
          setActiveStep(i);
          break;
        }
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loading]);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}dk ${sec}sn` : `${sec}sn`;
  };

  return (
    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
      <div className="space-y-2.5">
        {LOADING_STEPS.map((step, i) => {
          const isDone = i < activeStep;
          const isActive = i === activeStep;
          const isPending = i > activeStep;

          return (
            <div key={i} className="flex items-center gap-2.5">
              {isDone ? (
                <Check className="h-4 w-4 text-primary shrink-0" />
              ) : isActive ? (
                <Loader2 className="h-4 w-4 text-primary shrink-0 animate-spin" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-muted shrink-0" />
              )}
              <span
                className={`text-xs ${
                  isDone
                    ? "text-primary"
                    : isActive
                      ? "text-foreground font-medium"
                      : isPending
                        ? "text-muted-foreground"
                        : ""
                }`}
              >
                {step.label}
                {isActive && "..."}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-1000 ease-linear"
          style={{
            width: `${Math.min(95, (elapsed / 150000) * 100)}%`,
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Bu işlem 1-3 dakika sürebilir
        </p>
        <p className="text-[10px] text-muted-foreground font-mono">
          {formatTime(elapsed)}
        </p>
      </div>
    </div>
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────

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

// ─── Day Summary (collapsible) ──────────────────────────────────────────────

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

// ─── Main Modal ─────────────────────────────────────────────────────────────

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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [location, setLocation] = useState<"gym" | "home">("gym");
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [ingredientMode, setIngredientMode] = useState<"all" | "specific">("all");
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const toggleEquipment = (eq: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(eq) ? prev.filter((e) => e !== eq) : [...prev, eq],
    );
  };

  const toggleIngredient = (ing: string) => {
    setSelectedIngredients((prev) =>
      prev.includes(ing) ? prev.filter((i) => i !== ing) : [...prev, ing],
    );
  };

  const handleGenerate = () => {
    const parts: string[] = [];
    // Location + equipment
    if (location === "home") {
      parts.push(`Antrenman yeri: Ev. Mevcut ekipman: ${selectedEquipment.length > 0 ? selectedEquipment.join(", ") : "Vücut ağırlığı"}`);
    } else {
      parts.push("Antrenman yeri: Salon (tüm ekipman mevcut)");
    }
    // Ingredients
    if (ingredientMode === "specific" && selectedIngredients.length > 0) {
      parts.push(`Evde mevcut malzemeler: ${selectedIngredients.join(", ")}. Sadece bu malzemelerle yapılabilecek yemekler öner`);
    }
    // Tags
    parts.push(...selectedTags);
    // Free text
    const note = userNote.trim();
    if (note) parts.push(note);
    onGenerate(parts.length > 0 ? parts.join(". ") : undefined);
  };

  const handleNewSuggestion = () => {
    handleGenerate();
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
              {/* Location selection */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Antrenman yeri:
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLocation("gym")}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium border transition-colors ${
                      location === "gym"
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    Salon
                  </button>
                  <button
                    onClick={() => setLocation("home")}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium border transition-colors ${
                      location === "home"
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Home className="h-3.5 w-3.5" />
                    Ev
                  </button>
                </div>
              </div>

              {/* Equipment selection (home only) */}
              {location === "home" && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Mevcut ekipman:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {EQUIPMENT_OPTIONS.map((eq) => {
                      const isSelected = selectedEquipment.includes(eq);
                      return (
                        <button
                          key={eq}
                          onClick={() => toggleEquipment(eq)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                            isSelected
                              ? "bg-primary/15 border-primary/40 text-primary"
                              : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {eq}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Ingredient selection */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Evdeki malzemeler:
                </p>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setIngredientMode("all")}
                    className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      ingredientMode === "all"
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Her şey var
                  </button>
                  <button
                    onClick={() => setIngredientMode("specific")}
                    className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      ingredientMode === "specific"
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Malzeme belirt
                  </button>
                </div>
                {ingredientMode === "specific" && (
                  <div className="flex flex-wrap gap-1.5">
                    {INGREDIENT_TAGS.map((ing) => {
                      const isSelected = selectedIngredients.includes(ing);
                      return (
                        <button
                          key={ing}
                          onClick={() => toggleIngredient(ing)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                            isSelected
                              ? "bg-primary/15 border-primary/40 text-primary"
                              : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {ing}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Template tags */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Bu hafta için isteklerini seç:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTION_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                          isSelected
                            ? "bg-primary/15 border-primary/40 text-primary"
                            : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Free text note */}
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Ekstra bir isteğin varsa yaz:
                </p>
              </div>
              <textarea
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                rows={2}
                placeholder="Örn: Omzum ağrıyor, sadece alt vücut çalışayım..."
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

          {/* Loading state — stepped progress */}
          {loading && <SteppedProgress loading={loading} />}

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
