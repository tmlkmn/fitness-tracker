"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { MeasurementNudge } from "@/components/ai/measurement-nudge";
import { useState, useEffect, useRef, useMemo } from "react";
import { useAiQuota, getQuota } from "@/hooks/use-ai-quota";
import {
  useSavedSuggestions,
  useSavedSuggestionDetail,
  useDeleteSavedSuggestion,
  type GenerationStep,
} from "@/hooks/use-weekly-ai";
import { useDeloadRecommendation } from "@/hooks/use-deload-recommendation";
import { loadWorkoutPrefs, saveWorkoutPrefs } from "@/lib/workout-prefs";
import { AiGeneratingOverlay, type GeneratingStep } from "@/components/ai/ai-generating-overlay";
import { useTranslations, useLocale } from "next-intl";
import type { Locale } from "@/lib/locale";
import { formatDate, parseDateOnly } from "@/lib/date-format";
import { isMealLabel, getLocalizedMealLabel } from "@/lib/meal-labels";
import { buildAiUserNote } from "@/lib/ai-user-note";
import { AiNoteTextarea } from "@/components/ai/ai-note-textarea";
import { defaultUiDayModesForLevel } from "@/lib/day-modes-default";

function SteppedProgress({
  loading,
  step,
  generateMode,
}: {
  loading: boolean;
  step: GenerationStep | null;
  generateMode?: "both" | "nutrition" | "workout";
}) {
  const t = useTranslations("calendar.aiWeekly");
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const allSteps: { label: string; step: GenerationStep }[] = [
    { label: t("stepProfile"), step: "profile" },
    { label: t("stepNutrition"), step: "nutrition" },
    { label: t("stepWorkout"), step: "workout" },
    { label: t("stepMerging"), step: "merging" },
  ];

  const visibleSteps = allSteps.filter((s) => {
    if (s.step === "nutrition" && generateMode === "workout") return false;
    if (s.step === "workout" && generateMode === "nutrition") return false;
    return true;
  });

  const currentIndex = step ? visibleSteps.findIndex((s) => s.step === step) : 0;
  const progressPct = visibleSteps.length > 1
    ? Math.min(95, (currentIndex / (visibleSteps.length - 1)) * 100)
    : currentIndex >= 0 ? 50 : 0;

  // Screen wake lock
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
      if (document.visibilityState === "visible" && loading) acquireLock();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [loading]);

  // Elapsed timer
  useEffect(() => {
    if (!loading) {
      setElapsed(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const start = Date.now();
    intervalRef.current = setInterval(() => {
      setElapsed(Date.now() - start);
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loading]);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0
      ? t("elapsedMin", { minutes: m, seconds: sec })
      : t("elapsedSec", { seconds: sec });
  };

  return (
    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
      <div className="space-y-2.5">
        {visibleSteps.map((s, i) => {
          const isDone = i < currentIndex;
          const isActive = i === currentIndex;
          const isPending = i > currentIndex;

          return (
            <div key={s.step} className="flex items-center gap-2.5">
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
                {s.label}
                {isActive && "..."}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar based on real step */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {t("stepDuration")}
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
  step: GenerationStep | null;
  onGenerate: (
    userNote?: string,
    generateMode?: "both" | "nutrition" | "workout",
    dayModes?: Record<number, "workout" | "swimming" | "rest">,
    pastDows?: number[],
    highAccuracyMode?: boolean,
    deloadWeek?: boolean,
  ) => void;
  onApply: () => void;
  onApplySaved: (plan: AIWeeklyPlan) => void;
  onReset: () => void;
  hasExistingPlan: boolean;
  serviceType?: string;
  /** User's fitness level — drives the default workout/rest split shown in the picker. */
  fitnessLevel?: string | null;
  /** Monday of the week being generated (YYYY-MM-DD). */
  weekStartStr?: string;
  /** Today's date (YYYY-MM-DD). */
  todayStr?: string;
}

const planTypeIcons = {
  workout: Dumbbell,
  swimming: Waves,
  rest: Moon,
};

// ─── Day Summary (collapsible) ──────────────────────────────────────────────

function DaySummary({ day }: { day: AIWeeklyDay }) {
  const t = useTranslations("calendar.aiWeekly");
  const locale = useLocale() as Locale;
  const planTypeLabels: Record<string, string> = {
    workout: t("planTypeWorkout"),
    swimming: t("planTypeSwimming"),
    rest: t("planTypeRest"),
  };
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
                  {t("mealsHeading")}
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
                        <span className="text-xs font-medium">
                          {isMealLabel(m.mealLabel) ? getLocalizedMealLabel(m.mealLabel, locale) : m.mealLabel}
                        </span>
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
                  {t("exercisesHeading")}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {t("moveCount", { count: day.exercises.length })}
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

function useFormatTimeAgo() {
  const t = useTranslations("calendar.aiWeekly");
  return (date: Date): string => {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (s < 60) return t("agoNow");
    const m = Math.floor(s / 60);
    if (m < 60) return t("agoMin", { count: m });
    const h = Math.floor(m / 60);
    if (h < 24) return t("agoHour", { count: h });
    const d = Math.floor(h / 24);
    return t("agoDay", { count: d });
  };
}

function formatWeekLabel(mondayStr: string, locale: Locale): string {
  return formatDate(parseDateOnly(mondayStr), locale, { day: "numeric", month: "long" });
}

// ─── Main Modal ─────────────────────────────────────────────────────────────

export function AiWeeklyPlanModal({
  open,
  onOpenChange,
  suggestedPlan,
  loading,
  applying,
  error,
  step,
  onGenerate,
  onApply,
  onApplySaved,
  onReset,
  hasExistingPlan,
  serviceType,
  fitnessLevel,
  weekStartStr,
  todayStr,
}: AiWeeklyPlanModalProps) {
  const t = useTranslations("calendar.aiWeekly");
  const tIngredients = useTranslations("meals.aiSuggestion");
  const locale = useLocale() as Locale;
  const formatTimeAgo = useFormatTimeAgo();
  const SUGGESTION_TAGS = t.raw("tags") as string[];
  const EQUIPMENT_OPTIONS = t.raw("equipment") as string[];
  const INGREDIENT_TAGS = tIngredients.raw("ingredients") as string[];
  const WORKOUT_DAYS = (t.raw("days") as { label: string; full: string }[]).map(
    (d, i) => ({ value: i, label: d.label, full: d.full }),
  );
  const [userNote, setUserNote] = useState("");
  // Per-day plan type: workout / swimming / rest. The default split derives
  // from the user's fitness level (beginner=3 / intermediate=4 / advanced=5
  // workout days) and is shared with the backend via day-modes-default.ts —
  // single source of truth. We track whether the user has interacted with the
  // picker so we can skip sending dayModes when they haven't (letting the
  // backend re-derive the same default, plus future-proof against changes).
  const defaultDayModes = useMemo(
    () => defaultUiDayModesForLevel(fitnessLevel),
    [fitnessLevel],
  );
  const [dayModes, setDayModes] = useState<Record<number, "workout" | "swimming" | "rest">>(
    () => defaultUiDayModesForLevel(fitnessLevel),
  );
  const [userTouchedDayModes, setUserTouchedDayModes] = useState(false);

  // If the fitness level changes (or arrives async after mount) and the user
  // hasn't touched the picker yet, refresh to the new default.
  useEffect(() => {
    if (userTouchedDayModes) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDayModes(defaultDayModes);
  }, [defaultDayModes, userTouchedDayModes]);

  // Past-day detection: when generating for the CURRENT week, days before
  // today are already gone — disable them in the picker so the user can't
  // request content the AI would waste tokens on. For future weeks, no day
  // is past.
  const pastDows = useMemo(() => {
    if (!weekStartStr || !todayStr) return new Set<number>();
    if (todayStr < weekStartStr) return new Set<number>();  // future week
    const start = new Date(weekStartStr + "T00:00:00");
    const today = new Date(todayStr + "T00:00:00");
    const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 7) return new Set<number>();  // past week (button is hidden, but defensive)
    const past = new Set<number>();
    for (let i = 0; i < diffDays; i++) past.add(i);  // dows strictly before today
    return past;
  }, [weekStartStr, todayStr]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [location, setLocation] = useState<"gym" | "home">(() => loadWorkoutPrefs().location);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(() => loadWorkoutPrefs().equipment);
  const [ingredientMode, setIngredientMode] = useState<"all" | "specific">("all");
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [generateMode, setGenerateMode] = useState<"both" | "nutrition" | "workout">("both");
  const [highAccuracyMode, setHighAccuracyMode] = useState(false);
  const [deloadOverride, setDeloadOverride] = useState<boolean | null>(null);

  const { data: quotaData } = useAiQuota();
  const weeklyQuota = getQuota(quotaData, "weekly");

  // Saved suggestions state
  const [showSaved, setShowSaved] = useState(false);
  const [savedPlanToPreview, setSavedPlanToPreview] = useState<AIWeeklyPlan | null>(null);
  const [selectedSavedId, setSelectedSavedId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const { data: savedList } = useSavedSuggestions(open);
  const { data: savedDetail, isLoading: loadingSavedDetail } = useSavedSuggestionDetail(selectedSavedId);
  const deleteSaved = useDeleteSavedSuggestion();

  const deloadEnabled =
    open
    && !showSaved
    && !savedPlanToPreview
    && !suggestedPlan
    && !loading
    && generateMode !== "nutrition"
    && serviceType !== "nutrition";
  const { data: deloadRec } = useDeloadRecommendation(weekStartStr, deloadEnabled);
  const deloadWeek = deloadOverride ?? deloadRec?.recommended ?? false;
  const setDeloadWeek = (v: boolean) => setDeloadOverride(v);

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDeloadOverride(null);
    }
  }, [open]);

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // Cycle a day through workout → swimming → rest → workout. For users on
  // nutrition-only plans, swimming is skipped (cycle is workout ↔ rest only).
  // Past days are not changeable — they're locked to "rest" by the UI.
  const cycleDayMode = (dow: number) => {
    if (pastDows.has(dow)) return;
    setUserTouchedDayModes(true);
    setDayModes((prev) => {
      const current = prev[dow];
      const allowSwimming = serviceType !== "nutrition";
      let next: "workout" | "swimming" | "rest";
      if (current === "workout") next = allowSwimming ? "swimming" : "rest";
      else if (current === "swimming") next = "rest";
      else next = "workout";
      return { ...prev, [dow]: next };
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
    saveWorkoutPrefs({ location, equipment: selectedEquipment });
    const hasWorkoutOrSwim = Object.values(dayModes).some((m) => m === "workout" || m === "swimming");
    const locationPart = hasWorkoutOrSwim
      ? location === "home"
        ? t("homeInstruction", {
            equipment:
              selectedEquipment.length > 0
                ? selectedEquipment.join(", ")
                : t("bodyweight"),
          })
        : t("gymInstruction")
      : null;
    const ingredientsPart =
      ingredientMode === "specific" && selectedIngredients.length > 0
        ? tIngredients("ingredientNote", { list: selectedIngredients.join(", ") })
        : null;
    // Force past days to "rest" so the backend never receives a workout/
    // swimming intent for a day that's already gone.
    const effectiveDayModes = { ...dayModes };
    for (const dow of pastDows) {
      effectiveDayModes[dow] = "rest";
    }
    // If the user never touched the day picker, omit dayModes entirely so the
    // backend can apply its fitness-level-aware default (single source of
    // truth in day-modes-default.ts). pastDows is sent separately and handled
    // by the service regardless of dayModes presence.
    const dayModesToSend = userTouchedDayModes ? effectiveDayModes : undefined;
    onGenerate(
      buildAiUserNote([locationPart, ingredientsPart, ...selectedTags, userNote]),
      generateMode,
      dayModesToSend,
      Array.from(pastDows),
      generateMode === "both" ? highAccuracyMode : false,
      generateMode !== "nutrition" && serviceType !== "nutrition" ? deloadWeek : false,
    );
    // Quota invalidation happens in the mutation's onSettled callback after
    // usage_log is written — invalidating here would refresh stale quota.
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && (loading || applying)) return;
    onOpenChange(open);
  };

  const overlayTitle =
    generateMode === "nutrition"
      ? t("overlayTitleNutrition")
      : generateMode === "workout"
        ? t("overlayTitleWorkout")
        : t("overlayTitleBoth");

  const overlaySteps: GeneratingStep[] = (() => {
    const profileStatus =
      step === null || step === "profile" ? "active" : "completed";
    const healthStatus =
      step === null || step === "profile" ? "pending" : "completed";
    const nutritionStatus =
      step === "nutrition" || step === "workout"
        ? "active"
        : step === "merging"
          ? "completed"
          : "pending";
    const workoutStatus =
      step === "workout"
        ? "active"
        : step === "merging"
          ? "completed"
          : "pending";

    if (generateMode === "nutrition") {
      return [
        { label: t("overlayProfile"), status: profileStatus },
        { label: t("overlayHealth"), status: healthStatus },
        { label: t("overlayNutritionLoading"), status: nutritionStatus },
      ];
    }
    if (generateMode === "workout") {
      return [
        { label: t("overlayProfile"), status: profileStatus },
        { label: t("overlayHealth"), status: healthStatus },
        { label: t("overlayWorkoutLoading"), status: workoutStatus },
      ];
    }
    return [
      { label: t("overlayProfile"), status: profileStatus },
      { label: t("overlayHealth"), status: healthStatus },
      { label: t("overlayNutrition"), status: nutritionStatus },
      { label: t("overlayWorkout"), status: workoutStatus },
    ];
  })();

  return (
    <>
      <AiGeneratingOverlay
        open={loading}
        title={overlayTitle}
        steps={overlaySteps}
      />
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[95svh] h-[95svh] overflow-y-auto overflow-x-hidden"
          onInteractOutside={(e) => { if (loading || applying) e.preventDefault(); }}
          onEscapeKeyDown={(e) => { if (loading || applying) e.preventDefault(); }}
        >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("title")}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {hasExistingPlan && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-500">{t("willReplace")}</p>
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
              <MeasurementNudge />
              {/* Generate mode selection (full program only) */}
              {serviceType === "full" && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {t("modeLabel")}
                  </p>
                  <div className="flex gap-1.5">
                    {([
                      { value: "both" as const, label: t("modeBoth") },
                      { value: "nutrition" as const, label: t("modeNutrition") },
                      { value: "workout" as const, label: t("modeWorkout") },
                    ]).map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => {
                          setGenerateMode(value);
                          if (value !== "both") setHighAccuracyMode(false);
                          if (value === "nutrition") setDeloadWeek(false);
                        }}
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
                  {generateMode === "both" && (
                    <label className="mt-2 flex items-start gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-primary cursor-pointer"
                        checked={highAccuracyMode}
                        onChange={(e) => setHighAccuracyMode(e.target.checked)}
                      />
                      <span className="flex flex-col">
                        <span className="text-[11px] font-medium text-foreground">
                          {t("highAccuracyModeLabel")}
                        </span>
                        <span className="text-[10px] text-muted-foreground leading-tight">
                          {t("highAccuracyModeHelp")}
                        </span>
                      </span>
                    </label>
                  )}
                  {generateMode !== "nutrition" && (
                    <div className={`mt-2 rounded-md border px-2 py-1.5 ${deloadRec?.recommended && deloadRec.severity === "hard" ? "border-amber-500/40 bg-amber-500/10" : deloadRec?.recommended && deloadRec.severity === "soft" ? "border-blue-500/40 bg-blue-500/10" : "border-transparent bg-muted/40"}`}>
                      <label className="flex items-start gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 accent-primary cursor-pointer"
                          checked={deloadWeek}
                          onChange={(e) => setDeloadWeek(e.target.checked)}
                        />
                        <span className="flex flex-col gap-0.5">
                          <span className="text-[11px] font-medium text-foreground flex items-center gap-1">
                            {deloadRec?.recommended && deloadRec.severity === "hard" && (
                              <span aria-hidden>⚡</span>
                            )}
                            {deloadRec?.recommended && deloadRec.severity === "soft" && (
                              <span aria-hidden>💤</span>
                            )}
                            {deloadRec?.recommended && deloadRec.severity === "hard"
                              ? t("deloadRecommendedHardTitle")
                              : deloadRec?.recommended && deloadRec.severity === "soft"
                                ? t("deloadRecommendedSoftTitle")
                                : t("deloadToggleLabel")}
                          </span>
                          <span className="text-[10px] text-muted-foreground leading-tight">
                            {t("deloadToggleHelp")}
                          </span>
                          {deloadRec?.recommended && deloadRec.reasons.length > 0 && (
                            <span className="text-[10px] text-muted-foreground/80 leading-tight">
                              {deloadRec.reasons.includes("cadence") && (
                                <span>{t("deloadReasonCadence", { weeks: deloadRec.consecutiveTrainingWeeks })}. </span>
                              )}
                              {deloadRec.reasons.includes("sleep_quality") && (
                                <span>{t("deloadReasonSleepQuality")}. </span>
                              )}
                              {deloadRec.reasons.includes("sleep_duration") && (
                                <span>{t("deloadReasonSleepDuration")}. </span>
                              )}
                              {deloadRec.reasons.includes("completion") && (
                                <span>{t("deloadReasonCompletion")}. </span>
                              )}
                            </span>
                          )}
                          {deloadRec?.reasons.includes("just_deloaded") && (
                            <span className="text-[10px] text-muted-foreground/80 leading-tight">
                              {t("deloadJustDeloadedNote")}
                            </span>
                          )}
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Day selection — hide for nutrition-only */}
              {generateMode !== "nutrition" && (
              <>
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  {t("dayTypeLabel")} <span className="text-muted-foreground/60">{t("dayTypeHint")}</span>:
                </p>
                <div className="grid grid-cols-7 gap-1.5">
                  {WORKOUT_DAYS.map(({ value, label }) => {
                    const mode = dayModes[value] ?? "rest";
                    const isPast = pastDows.has(value);
                    const styles = isPast
                      ? "bg-muted/30 border-transparent text-muted-foreground/40 line-through cursor-not-allowed"
                      : mode === "workout"
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : mode === "swimming"
                          ? "bg-blue-500/15 border-blue-500/40 text-blue-500"
                          : "bg-muted/50 border-transparent text-muted-foreground";
                    const Icon =
                      mode === "workout" ? Dumbbell : mode === "swimming" ? Waves : Moon;
                    const modeLabel =
                      mode === "workout"
                        ? t("planTypeWorkout")
                        : mode === "swimming"
                          ? t("planTypeSwimming")
                          : t("planTypeRest");
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => cycleDayMode(value)}
                        disabled={isPast}
                        aria-disabled={isPast}
                        className={`flex flex-col items-center justify-center py-2 gap-0.5 rounded-md text-[10px] font-medium border transition-colors ${isPast ? "" : "hover:opacity-80"} ${styles}`}
                        title={
                          isPast
                            ? t("dayTooltipPast", { label })
                            : t("dayTooltipActive", { label, mode: modeLabel })
                        }
                      >
                        <span>{label}</span>
                        <Icon className="h-3 w-3" />
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground/70 mt-1.5">
                  {t("dayCycleNote")}
                  {pastDows.size > 0 && (
                    <span className="block mt-0.5">{t("pastDaysNote")}</span>
                  )}
                </p>
              </div>

              {/* Location selection */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  {t("locationLabel")}
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
                    {t("locationGym")}
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
                    {t("locationHome")}
                  </button>
                </div>
              </div>

              {/* Equipment selection (home only) */}
              {location === "home" && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {t("equipmentLabel")}
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
                  {t("ingredientsLabel")}
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
                    {tIngredients("modeAll")}
                  </button>
                  <button
                    onClick={() => setIngredientMode("specific")}
                    className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      ingredientMode === "specific"
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {tIngredients("modeSpecific")}
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
                  {t("tagsLabel")}
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
                  {t("noteLabel")}
                </p>
              </div>
              <AiNoteTextarea
                value={userNote}
                onChange={setUserNote}
                placeholder={t("notePlaceholder")}
              />
              <Button
                onClick={handleGenerate}
                disabled={loading || (weeklyQuota?.remaining === 0)}
                className="w-full"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {weeklyQuota?.remaining === 0
                  ? t("limitReached")
                  : weeklyQuota
                    ? t("generateWithQuota", { remaining: weeklyQuota.remaining, limit: weeklyQuota.limit })
                    : t("generate")}
              </Button>
              {savedList && savedList.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaved(true)}
                  className="w-full gap-2"
                >
                  <History className="h-4 w-4" />
                  {t("savedSuggestions")}
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
                {t("back")}
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
                          ? t("weekLabel", { label: formatWeekLabel(weekDate, locale) })
                          : t("weekDateless")}
                      </p>
                      <div className="space-y-1.5">
                        {items.map((item, idx) => (
                          <div
                            key={item.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleSelectSaved(item.id)}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleSelectSaved(item.id); }}
                            className="w-full flex items-start gap-2 p-2.5 rounded-lg bg-muted/50 text-left hover:bg-muted transition-colors cursor-pointer"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs font-medium line-clamp-2">
                                  {t("savedItem", { n: idx + 1, title: item.title })}
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
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {t("emptySaved")}
                </p>
              )}
            </div>
          )}

          {/* Saved plan preview */}
          {!loading && !suggestedPlan && savedPlanToPreview && (
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <p className="text-sm font-semibold flex-1 min-w-0 wrap-break-word">
                  {savedPlanToPreview.weekTitle}
                </p>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {savedPlanToPreview.phase}
                </Badge>
              </div>
              {savedPlanToPreview.notes && (
                <p className="text-xs text-muted-foreground wrap-break-word whitespace-pre-wrap leading-relaxed">
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
                  {t("back")}
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
                  {t("approve")}
                </Button>
              </div>
            </div>
          )}

          {/* Loading state — stepped progress */}
          {loading && <SteppedProgress loading={loading} step={step} generateMode={generateMode} />}

          {/* Phase 2: Plan result */}
          {!loading && suggestedPlan && (
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <p className="text-sm font-semibold flex-1 min-w-0 wrap-break-word">
                  {suggestedPlan.weekTitle}
                </p>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {suggestedPlan.phase}
                </Badge>
              </div>
              {suggestedPlan.notes && (
                <p className="text-xs text-muted-foreground wrap-break-word whitespace-pre-wrap leading-relaxed">
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
                {t("newSuggestion")}
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
                {t("approve")}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>

      {/* Delete saved suggestion confirmation */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(o) => { if (!o) setDeleteConfirmId(null); }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("deleteConfirm")}
          </p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>
              {t("cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmDeleteSaved} disabled={deleteSaved.isPending}>
              {deleteSaved.isPending ? t("deleting") : t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
    </>
  );
}
