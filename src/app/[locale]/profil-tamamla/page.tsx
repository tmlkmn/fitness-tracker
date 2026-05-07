"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "@/lib/auth-client";
import { useUserProfile } from "@/hooks/use-user";
import { updateUserOnboarding } from "@/actions/user";
import { useRouter } from "@/i18n/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Dumbbell, Loader2, Ruler, Scale, Target, Heart, Sunrise, Briefcase,
  UtensilsCrossed, Home, Moon, Pill, User, ShieldAlert, ChevronRight,
  ChevronLeft, CheckCircle2, Utensils, Activity, Shield
} from "lucide-react";

// Persisted-as-TR allergen list. The display label uses the same string;
// switching locales does not retranslate stored allergens (DB compatibility).
const ALLERGEN_TAGS = [
  "Süt ürünleri", "Yumurta", "Fıstık", "Yer fıstığı",
  "Balık", "Kabuklu deniz ürünü", "Buğday (Gluten)",
  "Soya", "Susam", "Kereviz", "Hardal", "Bal",
];

const TOTAL_STEPS = 7;

type Gender = "male" | "female" | "prefer_not_to_say";
type ActivityLevel = "sedentary" | "light" | "moderate" | "very_active";

const GENDER_VALUES: Gender[] = ["female", "male", "prefer_not_to_say"];
const ACTIVITY_VALUES: ActivityLevel[] = ["sedentary", "light", "moderate", "very_active"];
const FLAG_KEYS = ["eatingDisorder", "pregnant", "diabetes", "thyroid"] as const;
const GOAL_VALUES = ["loss", "recomp", "maintain", "muscle_gain", "weight_gain"] as const;
const LEVEL_VALUES = ["beginner", "returning", "intermediate", "advanced"] as const;

const inputCls = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
const timeCls  = "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function RadioCard({ checked, onClick, label, hint, children }: {
  checked: boolean; onClick: () => void; label?: string; hint?: string; children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      className={`w-full text-left rounded-lg border p-3 transition-colors ${
        checked ? "border-primary bg-primary/10" : "border-border hover:bg-accent/40"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center ${
          checked ? "border-primary" : "border-muted-foreground/40"
        }`}>
          {checked && <span className="h-2 w-2 rounded-full bg-primary" />}
        </span>
        <div className="flex-1 min-w-0">
          {label && <p className="text-sm font-medium">{label}</p>}
          {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
          {children}
        </div>
      </div>
    </button>
  );
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export default function ProfilTamamlaPage() {
  const t = useTranslations("profileComplete");
  const { data: session, isPending: sessionPending } = useSession();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = session?.user;

  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // Step 1
  const [serviceType, setServiceType] = useState("full");

  // Step 2
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [age, setAge] = useState("");

  // Step 3
  const [gender, setGender] = useState<Gender>("prefer_not_to_say");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("light");
  const [hasEatingDisorderHistory, setHasEatingDisorderHistory] = useState(false);
  const [isPregnantOrBreastfeeding, setIsPregnantOrBreastfeeding] = useState(false);
  const [hasDiabetes, setHasDiabetes] = useState(false);
  const [hasThyroidCondition, setHasThyroidCondition] = useState(false);

  // Step 4
  const [allergenMode, setAllergenMode] = useState<"none" | "has">("none");
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [otherAllergens, setOtherAllergens] = useState("");
  const [healthNotes, setHealthNotes] = useState("");
  const [currentMedications, setCurrentMedications] = useState("");

  // Step 5
  const [fitnessGoal, setFitnessGoal] = useState("");
  const [fitnessLevel, setFitnessLevel] = useState("");
  const [sportHistory, setSportHistory] = useState("");

  // Step 6
  const [wakeTime, setWakeTime] = useState("");
  const [breakfastTime, setBreakfastTime] = useState("");
  const [workStartTime, setWorkStartTime] = useState("");
  const [lunchTime, setLunchTime] = useState("");
  const [workEndTime, setWorkEndTime] = useState("");
  const [dinnerTime, setDinnerTime] = useState("");
  const [workoutTime, setWorkoutTime] = useState("");
  const [sleepTime, setSleepTime] = useState("");
  const [hasWeekendRoutine, setHasWeekendRoutine] = useState(false);
  const [weWakeTime, setWeWakeTime] = useState("");
  const [weBreakfastTime, setWeBreakfastTime] = useState("");
  const [weLunchTime, setWeLunchTime] = useState("");
  const [weDinnerTime, setWeDinnerTime] = useState("");
  const [weWorkoutTime, setWeWorkoutTime] = useState("");
  const [weSleepTime, setWeSleepTime] = useState("");

  useEffect(() => {
    if (!sessionPending && !user) router.push("/giris");
  }, [sessionPending, user, router]);

  useEffect(() => {
    if (profile && !prefilled) {
      if (profile.height) setHeight(String(profile.height));
      if (profile.weight) setWeight(profile.weight);
      if (profile.targetWeight) setTargetWeight(profile.targetWeight);
      if (profile.age) setAge(String(profile.age));
      if (profile.serviceType) setServiceType(profile.serviceType);
      if (profile.fitnessGoal) setFitnessGoal(profile.fitnessGoal);
      if (profile.fitnessLevel) setFitnessLevel(profile.fitnessLevel);
      if (profile.sportHistory) setSportHistory(profile.sportHistory);
      if (profile.currentMedications) setCurrentMedications(profile.currentMedications);
      if (profile.healthNotes) setHealthNotes(profile.healthNotes);
      if (profile.gender === "male" || profile.gender === "female" || profile.gender === "prefer_not_to_say") {
        setGender(profile.gender);
      }
      if (profile.dailyActivityLevel === "sedentary" || profile.dailyActivityLevel === "light" ||
          profile.dailyActivityLevel === "moderate" || profile.dailyActivityLevel === "very_active") {
        setActivityLevel(profile.dailyActivityLevel);
      }
      setHasEatingDisorderHistory(Boolean(profile.hasEatingDisorderHistory));
      setIsPregnantOrBreastfeeding(Boolean(profile.isPregnantOrBreastfeeding));
      setHasDiabetes(Boolean(profile.hasDiabetes));
      setHasThyroidCondition(Boolean(profile.hasThyroidCondition));
      if (profile.foodAllergens) {
        try {
          const allergens = JSON.parse(profile.foodAllergens);
          if (Array.isArray(allergens) && allergens.length > 0) {
            if (allergens.length === 1 && allergens[0] === "Yok") {
              setAllergenMode("none");
            } else {
              setAllergenMode("has");
              setSelectedAllergens(allergens.filter((a: string) => ALLERGEN_TAGS.includes(a)));
              const custom = allergens.filter((a: string) => !ALLERGEN_TAGS.includes(a));
              if (custom.length > 0) setOtherAllergens(custom.join(", "));
            }
          }
        } catch { /* ignore */ }
      }
      if (profile.dailyRoutine && Array.isArray(profile.dailyRoutine)) {
        const routine = profile.dailyRoutine as { time: string; event: string }[];
        const eventMap: Record<string, (v: string) => void> = {
          "Uyanış": setWakeTime, "Kahvaltı": setBreakfastTime,
          "İşe Gidiş": setWorkStartTime, "İşe gidiş": setWorkStartTime,
          "Öğle Yemeği": setLunchTime, "Öğle yemeği": setLunchTime,
          "İşten Çıkış": setWorkEndTime, "İşten çıkış": setWorkEndTime,
          "Akşam Yemeği": setDinnerTime, "Akşam yemeği": setDinnerTime,
          "Antrenman": setWorkoutTime, "Uyku": setSleepTime,
        };
        for (const item of routine) eventMap[item.event]?.(item.time);
      }
      if (profile.weekendRoutine && Array.isArray(profile.weekendRoutine)) {
        const routine = profile.weekendRoutine as { time: string; event: string }[];
        if (routine.length > 0) {
          setHasWeekendRoutine(true);
          const map: Record<string, (v: string) => void> = {
            "Uyanış": setWeWakeTime, "Kahvaltı": setWeBreakfastTime,
            "Öğle Yemeği": setWeLunchTime, "Öğle yemeği": setWeLunchTime,
            "Akşam Yemeği": setWeDinnerTime, "Akşam yemeği": setWeDinnerTime,
            "Antrenman": setWeWorkoutTime, "Uyku": setWeSleepTime,
          };
          for (const item of routine) map[item.event]?.(item.time);
        }
      }
      setPrefilled(true);
    }
  }, [profile, prefilled]);

  const validateStep = (): string => {
    if (step === 2) {
      const h = parseInt(height, 10);
      if (!h || h < 100 || h > 250) return t("errors.heightRange");
      const w = parseFloat(weight);
      if (!w || w < 30 || w > 300) return t("errors.weightRange");
      const tw = parseFloat(targetWeight);
      if (!tw || tw < 30 || tw > 300) return t("errors.targetWeightRange");
      if (!age || !parseInt(age, 10)) return t("errors.ageRequired");
    }
    if (step === 4) {
      if (!healthNotes.trim()) return "Sağlık notları alanı zorunludur. Sağlık sorununuz yoksa 'Yok' yazın.";
      if (!currentMedications.trim()) return t("errors.medicationsRequired");
    }
    if (step === 5) {
      if (!fitnessGoal) return t("errors.goalRequired");
      if (serviceType === "full") {
        if (!fitnessLevel) return t("errors.fitnessLevelRequired");
        if (!sportHistory.trim()) return t("errors.sportHistoryRequired");
      }
    }
    return "";
  };

  const goNext = () => {
    setError("");
    const err = validateStep();
    if (err) { setError(err); return; }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const goBack = () => { setError(""); setStep((s) => Math.max(s - 1, 1)); };

  const handleSubmit = async () => {
    setSaving(true);
    setError("");
    try {
      const routineEntries: { time: string; event: string }[] = [];
      if (wakeTime) routineEntries.push({ time: wakeTime, event: "Uyanış" });
      if (breakfastTime) routineEntries.push({ time: breakfastTime, event: "Kahvaltı" });
      if (workStartTime) routineEntries.push({ time: workStartTime, event: "İşe Gidiş" });
      if (lunchTime) routineEntries.push({ time: lunchTime, event: "Öğle Yemeği" });
      if (workEndTime) routineEntries.push({ time: workEndTime, event: "İşten Çıkış" });
      if (dinnerTime) routineEntries.push({ time: dinnerTime, event: "Akşam Yemeği" });
      if (workoutTime) routineEntries.push({ time: workoutTime, event: "Antrenman" });
      if (sleepTime) routineEntries.push({ time: sleepTime, event: "Uyku" });

      const weekendEntries: { time: string; event: string }[] = [];
      if (hasWeekendRoutine) {
        if (weWakeTime) weekendEntries.push({ time: weWakeTime, event: "Uyanış" });
        if (weBreakfastTime) weekendEntries.push({ time: weBreakfastTime, event: "Kahvaltı" });
        if (weLunchTime) weekendEntries.push({ time: weLunchTime, event: "Öğle Yemeği" });
        if (weDinnerTime) weekendEntries.push({ time: weDinnerTime, event: "Akşam Yemeği" });
        if (weWorkoutTime) weekendEntries.push({ time: weWorkoutTime, event: "Antrenman" });
        if (weSleepTime) weekendEntries.push({ time: weSleepTime, event: "Uyku" });
      }

      let foodAllergens: string;
      if (allergenMode === "none") {
        foodAllergens = JSON.stringify(["Yok"]);
      } else {
        const extras = otherAllergens.split(",").map((s) => s.trim()).filter(Boolean);
        const all = [...selectedAllergens, ...extras];
        foodAllergens = all.length > 0 ? JSON.stringify(all) : JSON.stringify(["Yok"]);
      }

      await updateUserOnboarding({
        height: parseInt(height, 10),
        weight,
        targetWeight,
        age: age ? parseInt(age, 10) : undefined,
        serviceType,
        gender,
        dailyActivityLevel: activityLevel,
        hasEatingDisorderHistory,
        isPregnantOrBreastfeeding,
        hasDiabetes,
        hasThyroidCondition,
        healthNotes: healthNotes.trim() || undefined,
        foodAllergens,
        currentMedications: currentMedications.trim() || undefined,
        fitnessGoal: fitnessGoal || undefined,
        fitnessLevel: fitnessLevel || undefined,
        sportHistory: sportHistory.trim() || undefined,
        dailyRoutine: routineEntries.length > 0 ? routineEntries : undefined,
        weekendRoutine: weekendEntries.length > 0 ? weekendEntries : undefined,
      });

      await queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      router.push("/?setup=done");
      router.refresh();
    } catch {
      setError(t("errors.generic"));
    } finally {
      setSaving(false);
    }
  };

  if (sessionPending || profileLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4">
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-14 w-14 rounded-2xl mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const stepKey = String(step) as "1" | "2" | "3" | "4" | "5" | "6" | "7";
  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100;
  const isOptionalStep = step === 6;

  return (
    <div className="min-h-dvh flex flex-col bg-background">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 pt-4 pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
              <Dumbbell className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold">{t("headerTitle")}</span>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">{step}/{TOTAL_STEPS}</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 max-w-lg mx-auto w-full">

        <div className="space-y-1">
          <h1 className="text-xl font-bold">{t(`steps.${stepKey}.title`)}</h1>
          <p className="text-sm text-muted-foreground">{t(`steps.${stepKey}.desc`)}</p>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setServiceType("full")}
              className={`w-full p-4 rounded-xl border text-left transition-all ${
                serviceType === "full"
                  ? "ring-2 ring-primary border-primary bg-primary/5"
                  : "border-border hover:bg-accent/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <Dumbbell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{t("service.fullTitle")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("service.fullDesc")}</p>
                </div>
                {serviceType === "full" && <CheckCircle2 className="h-5 w-5 text-primary ml-auto" />}
              </div>
            </button>
            <button
              type="button"
              onClick={() => setServiceType("nutrition")}
              className={`w-full p-4 rounded-xl border text-left transition-all ${
                serviceType === "nutrition"
                  ? "ring-2 ring-primary border-primary bg-primary/5"
                  : "border-border hover:bg-accent/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <Utensils className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{t("service.nutritionTitle")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("service.nutritionDesc")}</p>
                </div>
                {serviceType === "nutrition" && <CheckCircle2 className="h-5 w-5 text-primary ml-auto" />}
              </div>
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="height" className="text-sm font-medium flex items-center gap-2">
                <Ruler className="h-4 w-4 text-muted-foreground" />
                {t("physical.height")} <span className="text-destructive text-xs">*</span>
              </label>
              <input id="height" type="number" value={height} onChange={(e) => setHeight(e.target.value)}
                min={100} max={250} className={inputCls} placeholder="175" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="age" className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                {t("physical.age")} <span className="text-destructive text-xs">*</span>
              </label>
              <input id="age" type="number" value={age} onChange={(e) => setAge(e.target.value)}
                min={10} max={100} className={inputCls} placeholder="28" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="weight" className="text-sm font-medium flex items-center gap-2">
                <Scale className="h-4 w-4 text-muted-foreground" />
                {t("physical.currentWeight")} <span className="text-destructive text-xs">*</span>
              </label>
              <input id="weight" type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)}
                min={30} max={300} className={inputCls} placeholder="80" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="targetWeight" className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                {t("physical.targetWeight")} <span className="text-destructive text-xs">*</span>
              </label>
              <input id="targetWeight" type="number" step="0.1" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)}
                min={30} max={300} className={inputCls} placeholder="75" />
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-5">
            <FieldGroup title={t("health.biologicalGender")}>
              {GENDER_VALUES.map((value) => (
                <RadioCard key={value} checked={gender === value} onClick={() => setGender(value)} label={t(`gender.${value}`)} />
              ))}
            </FieldGroup>

            <FieldGroup title={t("health.dailyActivity")}>
              {ACTIVITY_VALUES.map((value) => (
                <RadioCard
                  key={value}
                  checked={activityLevel === value}
                  onClick={() => setActivityLevel(value)}
                  label={t(`activity.${value}.label`)}
                  hint={t(`activity.${value}.hint`)}
                />
              ))}
            </FieldGroup>

            <FieldGroup title={t("health.healthConditions")}>
              {[
                { key: "eatingDisorder" as const, state: hasEatingDisorderHistory, set: setHasEatingDisorderHistory },
                { key: "pregnant" as const, state: isPregnantOrBreastfeeding, set: setIsPregnantOrBreastfeeding },
                { key: "diabetes" as const, state: hasDiabetes, set: setHasDiabetes },
                { key: "thyroid" as const, state: hasThyroidCondition, set: setHasThyroidCondition },
              ].map((flag) => (
                <label key={flag.key} className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-accent/40 transition-colors">
                  <Checkbox checked={flag.state} onCheckedChange={() => flag.set(!flag.state)} className="mt-0.5" />
                  <span className="text-xs leading-relaxed flex-1">{t(`health.flags.${flag.key}`)}</span>
                </label>
              ))}
            </FieldGroup>
          </div>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                {t("allergens.label")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["none", "has"] as const).map((mode) => (
                  <button key={mode} type="button" onClick={() => setAllergenMode(mode)}
                    className={`p-2.5 rounded-lg border text-xs font-medium text-center transition-all ${
                      allergenMode === mode ? "ring-2 ring-primary border-primary bg-primary/5" : "border-input hover:bg-accent"
                    }`}
                  >
                    {mode === "none" ? t("allergens.modeNone") : t("allergens.modeHas")}
                  </button>
                ))}
              </div>
              {allergenMode === "has" && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {ALLERGEN_TAGS.map((tag) => {
                      const sel = selectedAllergens.includes(tag);
                      return (
                        <button key={tag} type="button"
                          onClick={() => setSelectedAllergens((prev) => sel ? prev.filter((t) => t !== tag) : [...prev, tag])}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                            sel ? "bg-destructive/15 border-destructive/40 text-destructive" : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                  <input type="text" value={otherAllergens} onChange={(e) => setOtherAllergens(e.target.value)}
                    placeholder={t("allergens.otherPlaceholder")}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="healthNotes" className="text-sm font-medium flex items-center gap-2">
                <Heart className="h-4 w-4 text-muted-foreground" />
                {t("healthNotes.label")} <span className="text-destructive text-xs">*</span>
              </label>
              <textarea id="healthNotes" value={healthNotes} onChange={(e) => setHealthNotes(e.target.value)}
                rows={3} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                placeholder={t("healthNotes.placeholder")} />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="medications" className="text-sm font-medium flex items-center gap-2">
                <Pill className="h-4 w-4 text-muted-foreground" />
                {t("medications.label")} <span className="text-destructive text-xs">*</span>
              </label>
              <textarea id="medications" value={currentMedications} onChange={(e) => setCurrentMedications(e.target.value)}
                rows={2} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                placeholder={t("medications.placeholderRequired")} />
            </div>
          </div>
        )}

        {/* Step 5 */}
        {step === 5 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("goals.yourGoal")} <span className="text-destructive normal-case font-normal tracking-normal">*</span>
              </p>
              <div className="space-y-2">
                {GOAL_VALUES.map((value) => (
                  <button key={value} type="button" onClick={() => setFitnessGoal(fitnessGoal === value ? "" : value)}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                      fitnessGoal === value ? "ring-2 ring-primary border-primary bg-primary/5" : "border-border hover:bg-accent/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{t(`goals.options.${value}.label`)}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{t(`goals.options.${value}.desc`)}</p>
                      </div>
                      {fitnessGoal === value && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {serviceType === "full" && (
              <>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("goals.experienceLevel")} <span className="text-destructive normal-case font-normal tracking-normal">*</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {LEVEL_VALUES.map((value) => (
                      <button key={value} type="button" onClick={() => setFitnessLevel(fitnessLevel === value ? "" : value)}
                        className={`p-2.5 rounded-lg border text-xs font-medium text-center transition-all ${
                          fitnessLevel === value ? "ring-2 ring-primary border-primary bg-primary/5" : "border-border hover:bg-accent/40"
                        }`}
                      >
                        {t(`goals.levels.${value}`)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="sportHistory" className="text-sm font-medium flex items-center gap-2">
                    <Dumbbell className="h-4 w-4 text-muted-foreground" />
                    {t("goals.sportHistoryLabel")} <span className="text-destructive text-xs">*</span>
                  </label>
                  <textarea id="sportHistory" value={sportHistory} onChange={(e) => setSportHistory(e.target.value)}
                    rows={2} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                    placeholder={t("goals.sportHistoryPlaceholder")} />
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 6 */}
        {step === 6 && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/40 border border-border p-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("routine.intro")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "wakeTime",     labelKey: "wakeTime",      icon: Sunrise,        val: wakeTime,      set: setWakeTime },
                { id: "breakfastTime",labelKey: "breakfastTime", icon: UtensilsCrossed,val: breakfastTime, set: setBreakfastTime },
                { id: "workStartTime",labelKey: "workStartTime", icon: Briefcase,      val: workStartTime, set: setWorkStartTime },
                { id: "lunchTime",    labelKey: "lunchTime",     icon: UtensilsCrossed,val: lunchTime,     set: setLunchTime },
                { id: "workEndTime",  labelKey: "workEndTime",   icon: Home,           val: workEndTime,   set: setWorkEndTime },
                { id: "dinnerTime",   labelKey: "dinnerTime",    icon: UtensilsCrossed,val: dinnerTime,    set: setDinnerTime },
                ...(serviceType === "full" ? [{ id: "workoutTime", labelKey: "workoutTime", icon: Dumbbell, val: workoutTime, set: setWorkoutTime }] : []),
                { id: "sleepTime",    labelKey: "sleepTime",     icon: Moon,           val: sleepTime,     set: setSleepTime },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.id} className="space-y-1.5">
                    <label htmlFor={item.id} className="text-xs font-medium flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {t(`routine.${item.labelKey}` as never)}
                    </label>
                    <input id={item.id} type="time" value={item.val} onChange={(e) => item.set(e.target.value)} className={timeCls} />
                  </div>
                );
              })}
            </div>

            <button type="button" onClick={() => setHasWeekendRoutine(!hasWeekendRoutine)}
              className={`w-full p-2.5 rounded-lg border text-xs font-medium text-center transition-all ${
                hasWeekendRoutine ? "ring-2 ring-primary border-primary bg-primary/5" : "border-input hover:bg-accent"
              }`}
            >
              {hasWeekendRoutine ? t("routine.weekendToggleAdded") : t("routine.weekendToggleAdd")}
            </button>

            {hasWeekendRoutine && (
              <div className="space-y-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("routine.weekendHeader")}</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "weWakeTime",     labelKey: "wake",      icon: Sunrise,        val: weWakeTime,      set: setWeWakeTime },
                    { id: "weBreakfastTime",labelKey: "breakfast", icon: UtensilsCrossed,val: weBreakfastTime, set: setWeBreakfastTime },
                    { id: "weLunchTime",    labelKey: "lunch",     icon: UtensilsCrossed,val: weLunchTime,     set: setWeLunchTime },
                    { id: "weDinnerTime",   labelKey: "dinner",    icon: UtensilsCrossed,val: weDinnerTime,    set: setWeDinnerTime },
                    ...(serviceType === "full" ? [{ id: "weWorkoutTime", labelKey: "workout", icon: Dumbbell, val: weWorkoutTime, set: setWeWorkoutTime }] : []),
                    { id: "weSleepTime",    labelKey: "sleep",     icon: Moon,           val: weSleepTime,     set: setWeSleepTime },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.id} className="space-y-1.5">
                        <label htmlFor={item.id} className="text-xs font-medium flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          {t(`routine.we.${item.labelKey}` as never)}
                        </label>
                        <input id={item.id} type="time" value={item.val} onChange={(e) => item.set(e.target.value)} className={timeCls} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 7 */}
        {step === 7 && (
          <div className="space-y-4">
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-3">
              <h2 className="text-sm font-semibold text-primary">{t("summary.title")}</h2>
              <div className="space-y-2 text-sm">
                {[
                  { label: t("summary.service"), value: serviceType === "full" ? t("summary.serviceFull") : t("summary.serviceNutrition") },
                  { label: t("summary.heightWeight"), value: `${height} cm / ${weight} kg` },
                  { label: t("summary.targetWeight"), value: `${targetWeight} kg` },
                  { label: t("summary.age"), value: `${age}` },
                  { label: t("summary.goal"), value: fitnessGoal ? t(`goals.options.${fitnessGoal as typeof GOAL_VALUES[number]}.label`) : "—" },
                  { label: t("summary.gender"), value: t(gender === "prefer_not_to_say" ? "gender.unspecified" : `gender.${gender}`) },
                  { label: t("summary.activity"), value: t(`activity.${activityLevel}.short`) },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-baseline gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">{row.label}</span>
                    <span className="text-xs font-medium text-right">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("summary.footer")}
              </p>
            </div>

            {error && <p className="text-sm text-destructive text-center">{error}</p>}

            <Button
              type="button"
              size="lg"
              className="w-full gap-2"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {t("letsBegin")}
                </>
              )}
            </Button>
          </div>
        )}

        {step !== 7 && error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}
      </div>

      {/* Footer nav */}
      {step !== 7 && (
        <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center gap-2">
            {step > 1 ? (
              <Button variant="outline" size="sm" onClick={goBack} className="gap-1.5">
                <ChevronLeft className="h-4 w-4" />
                {t("back")}
              </Button>
            ) : (
              <div />
            )}
            <div className="flex-1" />
            {isOptionalStep && (
              <Button variant="ghost" size="sm" onClick={() => { setError(""); setStep((s) => s + 1); }} className="text-muted-foreground">
                {t("skip")}
              </Button>
            )}
            <Button size="sm" onClick={goNext} className="gap-1.5">
              {t("next")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
