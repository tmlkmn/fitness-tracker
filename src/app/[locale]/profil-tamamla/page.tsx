"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useUserProfile } from "@/hooks/use-user";
import { updateUserOnboarding } from "@/actions/user";
import { useRouter } from "next/navigation";
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

// ── constants ────────────────────────────────────────────────────────────────

const ALLERGEN_TAGS = [
  "Süt ürünleri", "Yumurta", "Fıstık", "Yer fıstığı",
  "Balık", "Kabuklu deniz ürünü", "Buğday (Gluten)",
  "Soya", "Susam", "Kereviz", "Hardal", "Bal",
];

const TOTAL_STEPS = 7;

type Gender = "male" | "female" | "prefer_not_to_say";
type ActivityLevel = "sedentary" | "light" | "moderate" | "very_active";

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "female", label: "Kadın" },
  { value: "male", label: "Erkek" },
  { value: "prefer_not_to_say", label: "Belirtmek istemiyorum" },
];

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; hint: string }[] = [
  { value: "sedentary", label: "Çoğunlukla otururum", hint: "Masa başı, az hareket" },
  { value: "light", label: "Hafif aktif", hint: "Ofis + günlük yürüyüş, hafif ev işleri" },
  { value: "moderate", label: "Ayakta çalışırım", hint: "Öğretmen, garson, perakende" },
  { value: "very_active", label: "Çok aktif", hint: "İnşaat, kurye, fiziksel iş" },
];

const STEP_META = [
  { title: "Hizmet Tipi", desc: "Sana nasıl yardımcı olalım?" },
  { title: "Fiziksel Bilgiler", desc: "Sağlıklı hedefler için temel ölçümlerin" },
  { title: "Sağlık Profili", desc: "Cinsiyet ve aktivite seviyeni belirt" },
  { title: "Sağlık Notları", desc: "Alerjiler, sağlık durumun ve ilaçların" },
  { title: "Hedefler", desc: "Programın sana göre şekillensin" },
  { title: "Günlük Rutin", desc: "İsteğe bağlı — öğün saatlerini ayarlayalım" },
  { title: "Hazırsın!", desc: "Profilini tamamlamak için son bir adım" },
];

// ── input style helper ────────────────────────────────────────────────────────

const inputCls = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
const timeCls  = "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

// ── radio card ────────────────────────────────────────────────────────────────

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

// ── FieldGroup ────────────────────────────────────────────────────────────────

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function ProfilTamamlaPage() {
  const { data: session, isPending: sessionPending } = useSession();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = session?.user;

  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // ── form state ──────────────────────────────────────────────────────────────

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

  // Step 6 — daily routine (optional)
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

  // ── auth guard ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!sessionPending && !user) router.push("/giris");
  }, [sessionPending, user, router]);

  // ── prefill from existing profile ──────────────────────────────────────────

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

  // ── step validation ─────────────────────────────────────────────────────────

  const validateStep = (): string => {
    if (step === 2) {
      const h = parseInt(height, 10);
      if (!h || h < 100 || h > 250) return "Boy 100–250 cm arasında olmalıdır.";
      const w = parseFloat(weight);
      if (!w || w < 30 || w > 300) return "Kilo 30–300 kg arasında olmalıdır.";
      const tw = parseFloat(targetWeight);
      if (!tw || tw < 30 || tw > 300) return "Hedef kilo 30–300 kg arasında olmalıdır.";
      if (!age || !parseInt(age, 10)) return "Yaş alanı zorunludur.";
    }
    if (step === 4) {
      if (!healthNotes.trim()) return "Sağlık notları alanı zorunludur. Sağlık sorununuz yoksa 'Yok' yazın.";
      if (!currentMedications.trim()) return "İlaçlar / Supplementler alanı zorunludur. Yoksa 'Yok' yazın.";
    }
    if (step === 5) {
      if (!fitnessGoal) return "Lütfen bir hedef seç.";
      if (serviceType === "full") {
        if (!fitnessLevel) return "Deneyim seviyesi seçimi zorunludur.";
        if (!sportHistory.trim()) return "Spor geçmişi alanı zorunludur.";
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

  // ── final submit ────────────────────────────────────────────────────────────

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
      setError("Bir hata oluştu. Tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  };

  // ── loading ─────────────────────────────────────────────────────────────────

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

  const meta = STEP_META[step - 1];
  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100;
  const isOptionalStep = step === 6;

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-dvh flex flex-col bg-background">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 pt-4 pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
              <Dumbbell className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold">Profil Kurulumu</span>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">{step}/{TOTAL_STEPS}</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 max-w-lg mx-auto w-full">

        {/* Step title */}
        <div className="space-y-1">
          <h1 className="text-xl font-bold">{meta.title}</h1>
          <p className="text-sm text-muted-foreground">{meta.desc}</p>
        </div>

        {/* ── Step 1: Service Type ─────────────────────────────────────── */}
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
                  <p className="font-semibold text-sm">Tam Program</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Antrenman + Beslenme planı</p>
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
                  <p className="font-semibold text-sm">Sadece Beslenme</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Kişiye özel beslenme planı</p>
                </div>
                {serviceType === "nutrition" && <CheckCircle2 className="h-5 w-5 text-primary ml-auto" />}
              </div>
            </button>
          </div>
        )}

        {/* ── Step 2: Physical Stats ───────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="height" className="text-sm font-medium flex items-center gap-2">
                <Ruler className="h-4 w-4 text-muted-foreground" />
                Boy (cm) <span className="text-destructive text-xs">*</span>
              </label>
              <input id="height" type="number" value={height} onChange={(e) => setHeight(e.target.value)}
                min={100} max={250} className={inputCls} placeholder="175" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="age" className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Yaş <span className="text-destructive text-xs">*</span>
              </label>
              <input id="age" type="number" value={age} onChange={(e) => setAge(e.target.value)}
                min={10} max={100} className={inputCls} placeholder="28" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="weight" className="text-sm font-medium flex items-center gap-2">
                <Scale className="h-4 w-4 text-muted-foreground" />
                Mevcut Kilo (kg) <span className="text-destructive text-xs">*</span>
              </label>
              <input id="weight" type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)}
                min={30} max={300} className={inputCls} placeholder="80" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="targetWeight" className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Hedef Kilo (kg) <span className="text-destructive text-xs">*</span>
              </label>
              <input id="targetWeight" type="number" step="0.1" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)}
                min={30} max={300} className={inputCls} placeholder="75" />
            </div>
          </div>
        )}

        {/* ── Step 3: Health Profile ───────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-5">
            <FieldGroup title="Biyolojik cinsiyet">
              {GENDER_OPTIONS.map((opt) => (
                <RadioCard key={opt.value} checked={gender === opt.value} onClick={() => setGender(opt.value)} label={opt.label} />
              ))}
            </FieldGroup>

            <FieldGroup title="Günlük aktivite (antrenman dışı)">
              {ACTIVITY_OPTIONS.map((opt) => (
                <RadioCard key={opt.value} checked={activityLevel === opt.value} onClick={() => setActivityLevel(opt.value)} label={opt.label} hint={opt.hint} />
              ))}
            </FieldGroup>

            <FieldGroup title="Sağlık durumları">
              {[
                { key: "hasEatingDisorderHistory" as const, label: "Yeme bozukluğu öyküm var", state: hasEatingDisorderHistory, set: setHasEatingDisorderHistory },
                { key: "isPregnantOrBreastfeeding" as const, label: "Hamileyim veya emziriyorum", state: isPregnantOrBreastfeeding, set: setIsPregnantOrBreastfeeding },
                { key: "hasDiabetes" as const, label: "Diyabetim var (Tip 1 veya insülin kullanılan Tip 2)", state: hasDiabetes, set: setHasDiabetes },
                { key: "hasThyroidCondition" as const, label: "Tedavi altında olmayan tiroid problemim var", state: hasThyroidCondition, set: setHasThyroidCondition },
              ].map((flag) => (
                <label key={flag.key} className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-accent/40 transition-colors">
                  <Checkbox checked={flag.state} onCheckedChange={() => flag.set(!flag.state)} className="mt-0.5" />
                  <span className="text-xs leading-relaxed flex-1">{flag.label}</span>
                </label>
              ))}
            </FieldGroup>
          </div>
        )}

        {/* ── Step 4: Health Notes & Allergens ────────────────────────── */}
        {step === 4 && (
          <div className="space-y-4">
            {/* Allergens */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                Gıda Alerjilerin
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["none", "has"] as const).map((mode) => (
                  <button key={mode} type="button" onClick={() => setAllergenMode(mode)}
                    className={`p-2.5 rounded-lg border text-xs font-medium text-center transition-all ${
                      allergenMode === mode ? "ring-2 ring-primary border-primary bg-primary/5" : "border-input hover:bg-accent"
                    }`}
                  >
                    {mode === "none" ? "Alerjim yok" : "Var, belirtmek istiyorum"}
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
                    placeholder="Diğer alerjiler (virgülle ayır)..."
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              )}
            </div>

            {/* Health Notes */}
            <div className="space-y-1.5">
              <label htmlFor="healthNotes" className="text-sm font-medium flex items-center gap-2">
                <Heart className="h-4 w-4 text-muted-foreground" />
                Sağlık Notları <span className="text-destructive text-xs">*</span>
              </label>
              <textarea id="healthNotes" value={healthNotes} onChange={(e) => setHealthNotes(e.target.value)}
                rows={3} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                placeholder="Yaralanmalar, kronik hastalıklar, özel durumlar... Yoksa 'Yok' yazın." />
            </div>

            {/* Medications */}
            <div className="space-y-1.5">
              <label htmlFor="medications" className="text-sm font-medium flex items-center gap-2">
                <Pill className="h-4 w-4 text-muted-foreground" />
                İlaçlar / Supplementler <span className="text-destructive text-xs">*</span>
              </label>
              <textarea id="medications" value={currentMedications} onChange={(e) => setCurrentMedications(e.target.value)}
                rows={2} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                placeholder="Kullandığın ilaçlar veya supplementler. Yoksa 'Yok' yazın." />
            </div>
          </div>
        )}

        {/* ── Step 5: Goals ────────────────────────────────────────────── */}
        {step === 5 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Hedefin <span className="text-destructive normal-case font-normal tracking-normal">*</span>
              </p>
              <div className="space-y-2">
                {[
                  { value: "loss",        label: "Kilo Verme",             desc: "Yağ yakma + kalori açığı" },
                  { value: "recomp",      label: "Yağ Yakma + Kas Koruma", desc: "Vücut rekompozisyonu, idame kalori" },
                  { value: "maintain",    label: "Form Koruma",             desc: "Mevcut formu koruma" },
                  { value: "muscle_gain", label: "Kas Kazanımı",           desc: "Hipertrofi, hafif kalori fazlası" },
                  { value: "weight_gain", label: "Kilo Alma",               desc: "Genel kilo artışı, hızlı surplus" },
                ].map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setFitnessGoal(fitnessGoal === opt.value ? "" : opt.value)}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                      fitnessGoal === opt.value ? "ring-2 ring-primary border-primary bg-primary/5" : "border-border hover:bg-accent/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{opt.label}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</p>
                      </div>
                      {fitnessGoal === opt.value && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {serviceType === "full" && (
              <>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Deneyim Seviyesi <span className="text-destructive normal-case font-normal tracking-normal">*</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "beginner",     label: "Yeni Başlayan" },
                      { value: "returning",    label: "Ara Verip Dönen" },
                      { value: "intermediate", label: "Orta Düzey" },
                      { value: "advanced",     label: "İleri Düzey" },
                    ].map((opt) => (
                      <button key={opt.value} type="button" onClick={() => setFitnessLevel(fitnessLevel === opt.value ? "" : opt.value)}
                        className={`p-2.5 rounded-lg border text-xs font-medium text-center transition-all ${
                          fitnessLevel === opt.value ? "ring-2 ring-primary border-primary bg-primary/5" : "border-border hover:bg-accent/40"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="sportHistory" className="text-sm font-medium flex items-center gap-2">
                    <Dumbbell className="h-4 w-4 text-muted-foreground" />
                    Spor Geçmişi <span className="text-destructive text-xs">*</span>
                  </label>
                  <textarea id="sportHistory" value={sportHistory} onChange={(e) => setSportHistory(e.target.value)}
                    rows={2} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                    placeholder="Daha önce hangi sporları yaptın, ne kadar süre?" />
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Step 6: Daily Routine (optional) ────────────────────────── */}
        {step === 6 && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/40 border border-border p-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Bu bilgiler AI&apos;ın öğün saatlerini ve antrenman zamanlamasını optimize etmesine yardımcı olur. Dilersen bu adımı atlayabilirsin.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "wakeTime",     label: "Kalkış saatin",             icon: Sunrise,        val: wakeTime,      set: setWakeTime },
                { id: "breakfastTime",label: "Kahvaltı saatin",           icon: UtensilsCrossed,val: breakfastTime, set: setBreakfastTime },
                { id: "workStartTime",label: "İşe gidiş",                 icon: Briefcase,      val: workStartTime, set: setWorkStartTime },
                { id: "lunchTime",    label: "Öğle yemeği",               icon: UtensilsCrossed,val: lunchTime,     set: setLunchTime },
                { id: "workEndTime",  label: "İşten çıkış",               icon: Home,           val: workEndTime,   set: setWorkEndTime },
                { id: "dinnerTime",   label: "Akşam yemeği",              icon: UtensilsCrossed,val: dinnerTime,    set: setDinnerTime },
                ...(serviceType === "full" ? [{ id: "workoutTime", label: "Antrenman saatin", icon: Dumbbell, val: workoutTime, set: setWorkoutTime }] : []),
                { id: "sleepTime",    label: "Uyku saatin",               icon: Moon,           val: sleepTime,     set: setSleepTime },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.id} className="space-y-1.5">
                    <label htmlFor={item.id} className="text-xs font-medium flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {item.label}
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
              {hasWeekendRoutine ? "Hafta sonu programı eklendi ✓" : "Hafta sonu farklı mı? Ekle →"}
            </button>

            {hasWeekendRoutine && (
              <div className="space-y-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Hafta Sonu</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "weWakeTime",     label: "Kalkış",       icon: Sunrise,        val: weWakeTime,      set: setWeWakeTime },
                    { id: "weBreakfastTime",label: "Kahvaltı",     icon: UtensilsCrossed,val: weBreakfastTime, set: setWeBreakfastTime },
                    { id: "weLunchTime",    label: "Öğle yemeği",  icon: UtensilsCrossed,val: weLunchTime,     set: setWeLunchTime },
                    { id: "weDinnerTime",   label: "Akşam yemeği", icon: UtensilsCrossed,val: weDinnerTime,    set: setWeDinnerTime },
                    ...(serviceType === "full" ? [{ id: "weWorkoutTime", label: "Antrenman", icon: Dumbbell, val: weWorkoutTime, set: setWeWorkoutTime }] : []),
                    { id: "weSleepTime",    label: "Uyku",         icon: Moon,           val: weSleepTime,     set: setWeSleepTime },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.id} className="space-y-1.5">
                        <label htmlFor={item.id} className="text-xs font-medium flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          {item.label}
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

        {/* ── Step 7: Summary ─────────────────────────────────────────── */}
        {step === 7 && (
          <div className="space-y-4">
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-3">
              <h2 className="text-sm font-semibold text-primary">Profil Özeti</h2>
              <div className="space-y-2 text-sm">
                {[
                  { label: "Hizmet", value: serviceType === "full" ? "Tam Program (Antrenman + Beslenme)" : "Sadece Beslenme" },
                  { label: "Boy / Kilo", value: `${height} cm / ${weight} kg` },
                  { label: "Hedef Kilo", value: `${targetWeight} kg` },
                  { label: "Yaş", value: `${age}` },
                  { label: "Hedef", value: (({
                    loss: "Kilo Verme", recomp: "Yağ Yakma + Kas Koruma", maintain: "Form Koruma",
                    muscle_gain: "Kas Kazanımı", weight_gain: "Kilo Alma",
                  } as Record<string, string>)[fitnessGoal] ?? fitnessGoal ?? "—") },
                  { label: "Cinsiyet", value: { male: "Erkek", female: "Kadın", prefer_not_to_say: "Belirtilmedi" }[gender] },
                  { label: "Aktivite", value: { sedentary: "Masa başı", light: "Hafif aktif", moderate: "Ayakta çalışır", very_active: "Çok aktif" }[activityLevel] },
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
                Profilini kaydettikten sonra takvim sayfasından haftalık programını oluşturabilirsin. Tüm bilgiler daha sonra Ayarlar&apos;dan değiştirilebilir.
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
                  Hadi Başlayalım!
                </>
              )}
            </Button>
          </div>
        )}

        {/* Error */}
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
                Geri
              </Button>
            ) : (
              <div />
            )}
            <div className="flex-1" />
            {isOptionalStep && (
              <Button variant="ghost" size="sm" onClick={() => { setError(""); setStep((s) => s + 1); }} className="text-muted-foreground">
                Atla
              </Button>
            )}
            <Button size="sm" onClick={goNext} className="gap-1.5">
              İleri
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
