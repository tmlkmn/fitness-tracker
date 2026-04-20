"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  History,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import type { AIWeeklyPlan, AIWeeklyDay } from "@/actions/ai-weekly";
import { useState, useEffect, useRef, useMemo } from "react";
import { useAiQuota, useInvalidateAiQuota, getQuota } from "@/hooks/use-ai-quota";
import {
  useSavedSuggestions,
  useSavedSuggestionDetail,
  useDeleteSavedSuggestion,
} from "@/hooks/use-weekly-ai";

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

const WORKOUT_DAYS = [
  { value: 0, label: "Pzt", full: "Pazartesi" },
  { value: 1, label: "Sal", full: "Salı" },
  { value: 2, label: "Çar", full: "Çarşamba" },
  { value: 3, label: "Per", full: "Perşembe" },
  { value: 4, label: "Cum", full: "Cuma" },
  { value: 5, label: "Cmt", full: "Cumartesi" },
  { value: 6, label: "Paz", full: "Pazar" },
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
  { label: "Program oluşturuluyor", delay: 8000 },
  { label: "Program optimize ediliyor", delay: 40000 },
];

function SteppedProgress({ loading }: { loading: boolean }) {
  const [activeStep, setActiveStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Keep screen awake during generation (re-acquire on iOS visibility change)
  useEffect(() => {
    if (!loading) {
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
      return;
    }

    const acquireLock = () => {
      if ("wakeLock" in navigator && document.visibilityState === "visible") {
        navigator.wakeLock.request("screen").then((lock) => {
          wakeLockRef.current = lock;
        }).catch(() => {});
      }
    };

    acquireLock();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && loading) {
        acquireLock();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [loading]);

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
            width: `${Math.min(95, (elapsed / 90000) * 100)}%`,
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Bu işlem 1-2 dakika sürebilir
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
  onGenerate: (userNote?: string, generateMode?: "both" | "nutrition" | "workout") => void;
  onApply: () => void;
  onApplySaved: (plan: AIWeeklyPlan) => void;
  onReset: () => void;
  hasExistingPlan: boolean;
  serviceType?: string;
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

  // Group exercises by section
  const exerciseSections = day.exercises.reduce<
    Record<string, { label: string; items: typeof day.exercises }>
  >((acc, ex) => {
    const key = ex.section;
    if (!acc[key]) acc[key] = { label: ex.sectionLabel, items: [] };
    acc[key].items.push(ex);
    return acc;
  }, {});

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 text-left hover:bg-muted transition-colors">
          <Icon className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium truncate block">{day.dayName}</span>
            {day.workoutTitle && (
              <span className="text-[10px] text-muted-foreground truncate block">{day.workoutTitle}</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant="outline" className="text-[10px]">
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
        <div className="px-1 pt-2 pb-1 space-y-3">
          {/* Meals */}
          {day.meals.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <UtensilsCrossed className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Öğünler
                </span>
                <span className="text-[10px] text-muted-foreground">
                  ({totalCalories} kcal)
                </span>
              </div>
              <div className="space-y-0.5">
                {day.meals.map((m, i) => (
                  <div key={i} className="flex gap-2 py-1 border-b border-border/30 last:border-0">
                    <span className="text-[10px] text-muted-foreground font-mono w-10 shrink-0 pt-0.5">
                      {m.mealTime}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium">{m.mealLabel}</span>
                        {m.calories ? (
                          <span className="text-[10px] text-muted-foreground">{m.calories} kcal</span>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-muted-foreground break-words leading-relaxed">
                        {m.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exercises */}
          {day.exercises.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Dumbbell className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Egzersizler
                </span>
                <span className="text-[10px] text-muted-foreground">
                  ({day.exercises.length} hareket)
                </span>
              </div>
              <div className="space-y-2.5">
                {Object.entries(exerciseSections).map(([key, section]) => (
                  <div key={key}>
                    <p className="text-[10px] font-semibold text-primary/70 mb-1 pl-2 border-l-2 border-primary/30">
                      {section.label}
                    </p>
                    <div className="space-y-1 pl-2">
                      {section.items.map((ex, i) => (
                        <div key={i} className="py-1 border-b border-border/20 last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium flex-1 min-w-0 break-words">
                              {ex.name}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              {ex.sets && ex.reps ? (
                                <Badge variant="secondary" className="text-[10px]">
                                  {ex.sets}x{ex.reps}
                                </Badge>
                              ) : ex.durationMinutes ? (
                                <Badge variant="secondary" className="text-[10px]">
                                  {ex.durationMinutes}dk
                                </Badge>
                              ) : null}
                              {ex.restSeconds ? (
                                <Badge variant="outline" className="text-[10px]">
                                  {ex.restSeconds}sn
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                          {ex.notes && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 break-words leading-relaxed">
                              {ex.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatTimeAgo(date: Date): string {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "az önce";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} saat önce`;
  const d = Math.floor(h / 24);
  return `${d} gün önce`;
}

function formatWeekLabel(mondayStr: string): string {
  const d = new Date(mondayStr + "T00:00:00");
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
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
  onApplySaved,
  onReset,
  hasExistingPlan,
  serviceType,
}: AiWeeklyPlanModalProps) {
  const [userNote, setUserNote] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [location, setLocation] = useState<"gym" | "home">("gym");
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [ingredientMode, setIngredientMode] = useState<"all" | "specific">("all");
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [generateMode, setGenerateMode] = useState<"both" | "nutrition" | "workout">("both");

  const { data: quotaData } = useAiQuota();
  const invalidateQuota = useInvalidateAiQuota();
  const weeklyQuota = getQuota(quotaData, "weekly");

  // Saved suggestions state
  const [showSaved, setShowSaved] = useState(false);
  const [savedPlanToPreview, setSavedPlanToPreview] = useState<AIWeeklyPlan | null>(null);
  const [selectedSavedId, setSelectedSavedId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const { data: savedList } = useSavedSuggestions(open);
  const { data: savedDetail, isLoading: loadingSavedDetail } = useSavedSuggestionDetail(selectedSavedId);
  const deleteSaved = useDeleteSavedSuggestion();

  // Group suggestions by week for display
  const groupedSuggestions = useMemo(() => {
    if (!savedList) return [];
    const byWeek = new Map<string, typeof savedList>();
    for (const item of savedList) {
      const key = item.originalDate ?? "unknown";
      if (!byWeek.has(key)) byWeek.set(key, []);
      byWeek.get(key)!.push(item);
    }
    return Array.from(byWeek.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([weekDate, items]) => ({ weekDate, items }));
  }, [savedList]);

  // When saved detail loads, show preview
  useEffect(() => {
    if (savedDetail?.plan) {
      setSavedPlanToPreview(savedDetail.plan);
    }
  }, [savedDetail]);

  const handleSelectSaved = (id: number) => {
    setSelectedSavedId(id);
  };

  const handleDeleteSaved = (id: number) => {
    setDeleteConfirmId(id);
  };

  const confirmDeleteSaved = () => {
    if (deleteConfirmId === null) return;
    deleteSaved.mutate(deleteConfirmId, {
      onSuccess: () => {
        if (selectedSavedId === deleteConfirmId) {
          setSelectedSavedId(null);
          setSavedPlanToPreview(null);
        }
        setDeleteConfirmId(null);
      },
    });
  };

  const handleBackFromSaved = () => {
    setShowSaved(false);
    setSelectedSavedId(null);
    setSavedPlanToPreview(null);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) => {
      if (prev.includes(day)) {
        if (prev.length <= 1) return prev; // En az 1 gün seçili olmalı
        return prev.filter((d) => d !== day);
      }
      return [...prev, day].sort((a, b) => a - b);
    });
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
    // Workout days
    const dayNames = selectedDays.map(d => WORKOUT_DAYS.find(x => x.value === d)!.full);
    parts.push(`Antrenman günleri: ${dayNames.join(", ")}. Sadece bu günlerde antrenman olsun, diğer günler dinlenme veya sadece beslenme günü olsun`);
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
    onGenerate(parts.length > 0 ? parts.join(". ") : undefined, generateMode);
    invalidateQuota();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && (loading || applying)) return;
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-lg w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto overflow-x-hidden"
        onInteractOutside={(e) => { if (loading || applying) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (loading || applying) e.preventDefault(); }}
      >
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
          {!loading && !suggestedPlan && !showSaved && !savedPlanToPreview && (
            <div className="space-y-3">
              {/* Generate mode selection (full program only) */}
              {serviceType === "full" && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Oluşturulacak plan:
                  </p>
                  <div className="flex gap-1.5">
                    {([
                      { value: "both" as const, label: "Beslenme + Antrenman" },
                      { value: "nutrition" as const, label: "Sadece Beslenme" },
                      { value: "workout" as const, label: "Sadece Antrenman" },
                    ]).map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setGenerateMode(value)}
                        className={`flex-1 px-2 py-1.5 rounded-md text-[11px] font-medium border transition-colors ${
                          generateMode === value
                            ? "bg-primary/15 border-primary/40 text-primary"
                            : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Day selection — hide for nutrition-only */}
              {generateMode !== "nutrition" && (
              <>
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Antrenman günleri:
                </p>
                <div className="grid grid-cols-7 gap-1.5">
                  {WORKOUT_DAYS.map(({ value, label }) => {
                    const isSelected = selectedDays.includes(value);
                    return (
                      <button
                        key={value}
                        onClick={() => toggleDay(value)}
                        className={`flex items-center justify-center py-2 rounded-md text-xs font-medium border transition-colors ${
                          isSelected
                            ? "bg-primary/15 border-primary/40 text-primary"
                            : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

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
              </>
              )}

              {/* Ingredient selection — hide for workout-only */}
              {generateMode !== "workout" && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Beslenme Programı için Evdeki malzemeler:
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
              )}

              {/* Template tags — hide for nutrition-only */}
              {generateMode !== "nutrition" && (
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
              )}

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
                disabled={loading || (weeklyQuota?.remaining === 0)}
                className="w-full"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {weeklyQuota?.remaining === 0
                  ? "Günlük limit doldu"
                  : `Öneri Al${weeklyQuota ? ` (${weeklyQuota.remaining}/${weeklyQuota.limit})` : ""}`}
              </Button>
              {savedList && savedList.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaved(true)}
                  className="w-full gap-2"
                >
                  <History className="h-4 w-4" />
                  Kayıtlı Öneriler
                  <Badge variant="secondary" className="ml-auto text-[10px] px-1.5">
                    {savedList.length}
                  </Badge>
                </Button>
              )}
            </div>
          )}

          {/* Saved suggestions list */}
          {!loading && !suggestedPlan && showSaved && !savedPlanToPreview && (
            <div className="space-y-3">
              <button
                onClick={handleBackFromSaved}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Geri
              </button>
              {loadingSavedDetail && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {savedList && savedList.length > 0 ? (
                <div className="space-y-3">
                  {groupedSuggestions.map(({ weekDate, items }) => (
                    <div key={weekDate}>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                        {weekDate !== "unknown"
                          ? `${formatWeekLabel(weekDate)} haftası`
                          : "Tarihsiz"}
                      </p>
                      <div className="space-y-1.5">
                        {items.map((item, idx) => (
                          <button
                            key={item.id}
                            onClick={() => handleSelectSaved(item.id)}
                            className="w-full flex items-start gap-2 p-2.5 rounded-lg bg-muted/50 text-left hover:bg-muted transition-colors"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs font-medium line-clamp-2">
                                  Öneri {idx + 1} — {item.title}
                                </span>
                                <Badge variant="outline" className="text-[10px] shrink-0">
                                  {item.phase}
                                </Badge>
                              </div>
                              {item.userNote && (
                                <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                                  {item.userNote}
                                </p>
                              )}
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {formatTimeAgo(item.createdAt)}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSaved(item.id);
                              }}
                              className="p-1 rounded hover:bg-destructive/10 transition-colors shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                            </button>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Henüz kayıtlı öneri yok.
                </p>
              )}
            </div>
          )}

          {/* Saved plan preview */}
          {!loading && !suggestedPlan && savedPlanToPreview && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold flex-1">
                  {savedPlanToPreview.weekTitle}
                </p>
                <Badge variant="outline" className="text-[10px]">
                  {savedPlanToPreview.phase}
                </Badge>
              </div>
              {savedPlanToPreview.notes && (
                <p className="text-xs text-muted-foreground">
                  {savedPlanToPreview.notes}
                </p>
              )}
              <div className="space-y-1.5">
                {savedPlanToPreview.days.map((day, i) => (
                  <DaySummary key={i} day={day} />
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleBackFromSaved}
                  disabled={applying}
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Geri
                </Button>
                <Button
                  onClick={() => {
                    if (savedPlanToPreview) onApplySaved(savedPlanToPreview);
                  }}
                  disabled={applying}
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
                onClick={onReset}
                disabled={loading || applying}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
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

      {/* Delete saved suggestion confirmation */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(o) => { if (!o) setDeleteConfirmId(null); }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Öneriyi Sil</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Bu kayıtlı öneriyi silmek istediğinizden emin misiniz?
          </p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>
              İptal
            </Button>
            <Button variant="destructive" onClick={confirmDeleteSaved} disabled={deleteSaved.isPending}>
              {deleteSaved.isPending ? "Siliniyor..." : "Sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
