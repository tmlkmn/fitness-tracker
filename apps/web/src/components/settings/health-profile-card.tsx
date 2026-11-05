"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, ShieldAlert, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  useUserProfile,
  useUpdateHealthProfile,
} from "@/hooks/use-user";
import { useFitnessLevelSuggestion } from "@/hooks/use-fitness-level-suggestion";
import { FitnessLevelNudge } from "@/components/settings/fitness-level-nudge";
import { updateUserProfile } from "@/actions/user";
import type { UpdateHealthProfileInput } from "@/actions/user";

type Gender = UpdateHealthProfileInput["gender"];
type Activity = UpdateHealthProfileInput["dailyActivityLevel"];
type FlagKey =
  | "hasEatingDisorderHistory"
  | "isPregnantOrBreastfeeding"
  | "hasDiabetes"
  | "hasThyroidCondition";

const GENDER_VALUES: Gender[] = ["female", "male", "prefer_not_to_say"];
const ACTIVITY_VALUES: Activity[] = ["sedentary", "light", "moderate", "very_active"];
const FLAG_KEYS: FlagKey[] = [
  "hasEatingDisorderHistory",
  "isPregnantOrBreastfeeding",
  "hasDiabetes",
  "hasThyroidCondition",
];

const FITNESS_LEVEL_VALUES = ["beginner", "returning", "intermediate", "advanced"] as const;
const FITNESS_GOAL_VALUES = ["loss", "recomp", "maintain", "muscle_gain", "weight_gain"] as const;

const ALLERGEN_TAGS = [
  "Süt ürünleri",
  "Yumurta",
  "Fıstık",
  "Yer fıstığı",
  "Balık",
  "Kabuklu deniz ürünü",
  "Buğday (Gluten)",
  "Soya",
  "Susam",
  "Kereviz",
  "Hardal",
  "Bal",
];

const ALLERGEN_KEYS: Record<string, string> = {
  "Süt ürünleri": "dairy",
  "Yumurta": "egg",
  "Fıstık": "peanut",
  "Yer fıstığı": "groundnut",
  "Balık": "fish",
  "Kabuklu deniz ürünü": "shellfish",
  "Buğday (Gluten)": "wheat",
  "Soya": "soy",
  "Susam": "sesame",
  "Kereviz": "celery",
  "Hardal": "mustard",
  "Bal": "honey",
};

interface InitialValues {
  gender: Gender;
  activity: Activity;
  flags: Record<FlagKey, boolean>;
  age: string;
  height: string;
  weight: string;
  targetWeight: string;
  healthNotes: string;
  fitnessLevel: string;
  fitnessGoal: string;
  sportHistory: string;
  currentMedications: string;
  serviceType: string;
  allergenMode: "none" | "has";
  selectedAllergens: string[];
  otherAllergens: string;
}

function isGender(v: string | null): v is Gender {
  return v === "male" || v === "female" || v === "prefer_not_to_say";
}

function isActivity(v: string | null): v is Activity {
  return v === "sedentary" || v === "light" || v === "moderate" || v === "very_active";
}

export function HealthProfileCard() {
  const { data: profile } = useUserProfile();
  const t = useTranslations("settings.healthProfile");

  if (!profile) {
    return (
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Parse stored allergens into the mode/selected/other tri-state.
  let allergenMode: "none" | "has" = "none";
  let selectedAllergens: string[] = [];
  let otherAllergens = "";
  if (profile.foodAllergens) {
    try {
      const parsed = JSON.parse(profile.foodAllergens);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (!(parsed.length === 1 && parsed[0] === "Yok")) {
          allergenMode = "has";
          selectedAllergens = parsed.filter((a: string) => ALLERGEN_TAGS.includes(a));
          otherAllergens = parsed
            .filter((a: string) => !ALLERGEN_TAGS.includes(a))
            .join(", ");
        }
      }
    } catch {
      allergenMode = "has";
      otherAllergens = profile.foodAllergens;
    }
  }

  const initial: InitialValues = {
    gender: isGender(profile.gender) ? profile.gender : "prefer_not_to_say",
    activity: isActivity(profile.dailyActivityLevel) ? profile.dailyActivityLevel : "light",
    flags: {
      hasEatingDisorderHistory: Boolean(profile.hasEatingDisorderHistory),
      isPregnantOrBreastfeeding: Boolean(profile.isPregnantOrBreastfeeding),
      hasDiabetes: Boolean(profile.hasDiabetes),
      hasThyroidCondition: Boolean(profile.hasThyroidCondition),
    },
    age: profile.age ? String(profile.age) : "",
    height: profile.height ? String(profile.height) : "",
    weight: profile.weight ?? "",
    targetWeight: profile.targetWeight ?? "",
    healthNotes: profile.healthNotes ?? "",
    fitnessLevel: profile.fitnessLevel ?? "",
    fitnessGoal: profile.fitnessGoal ?? "",
    sportHistory: profile.sportHistory ?? "",
    currentMedications: profile.currentMedications ?? "",
    serviceType: profile.serviceType ?? "full",
    allergenMode,
    selectedAllergens,
    otherAllergens,
  };

  return <ProfileForm initial={initial} />;
}

function ProfileForm({ initial }: { initial: InitialValues }) {
  const t = useTranslations("settings.healthProfile");
  const pe = useTranslations("settings.profileEditor");
  const queryClient = useQueryClient();
  const updateHealth = useUpdateHealthProfile();
  const { data: levelSuggestion } = useFitnessLevelSuggestion();
  const [saving, setSaving] = useState(false);

  const [gender, setGender] = useState<Gender>(initial.gender);
  const [activity, setActivity] = useState<Activity>(initial.activity);
  const [flags, setFlags] = useState<Record<FlagKey, boolean>>(initial.flags);
  const [age, setAge] = useState(initial.age);
  const [height, setHeight] = useState(initial.height);
  const [weight, setWeight] = useState(initial.weight);
  const [targetWeight, setTargetWeight] = useState(initial.targetWeight);
  const [healthNotes, setHealthNotes] = useState(initial.healthNotes);
  const [fitnessLevel, setFitnessLevel] = useState(initial.fitnessLevel);
  const [fitnessGoal, setFitnessGoal] = useState(initial.fitnessGoal);
  const [sportHistory, setSportHistory] = useState(initial.sportHistory);
  const [currentMedications, setCurrentMedications] = useState(initial.currentMedications);
  const [serviceType, setServiceType] = useState(initial.serviceType);
  const [allergenMode, setAllergenMode] = useState<"none" | "has">(initial.allergenMode);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>(initial.selectedAllergens);
  const [otherAllergens, setOtherAllergens] = useState(initial.otherAllergens);

  const inputClass =
    "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  const handleSave = async () => {
    setSaving(true);

    let foodAllergens: string;
    if (allergenMode === "none") {
      foodAllergens = JSON.stringify(["Yok"]);
    } else {
      const all = [...selectedAllergens];
      if (otherAllergens.trim()) {
        all.push(
          ...otherAllergens
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        );
      }
      foodAllergens = all.length > 0 ? JSON.stringify(all) : JSON.stringify(["Yok"]);
    }

    try {
      await updateUserProfile({
        height: height ? parseInt(height, 10) : undefined,
        weight: weight || undefined,
        targetWeight: targetWeight || undefined,
        age: age ? parseInt(age, 10) : null,
        healthNotes: healthNotes.trim(),
        fitnessLevel: fitnessLevel || undefined,
        fitnessGoal: fitnessGoal || undefined,
        sportHistory: sportHistory.trim() || undefined,
        currentMedications: currentMedications.trim() || undefined,
        serviceType,
        foodAllergens,
      });
      await updateHealth.mutateAsync({
        gender,
        dailyActivityLevel: activity,
        ...flags,
      });
      await queryClient.invalidateQueries({
        queryKey: ["user.fitness-level-suggestion"],
      });
      toast.success(t("saved"));
    } catch {
      toast.error(t("saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-5">
        <p className="text-xs text-muted-foreground leading-relaxed">{t("intro")}</p>

        <FieldGroup title={t("basicTitle")}>
          <div className="grid grid-cols-2 gap-3">
            <LabeledInput
              label={pe("age")}
              required
              inputClass={inputClass}
              value={age}
              onChange={setAge}
              type="number"
              min={10}
              max={100}
              placeholder={pe("agePlaceholder")}
            />
            <LabeledInput
              label={pe("height")}
              inputClass={inputClass}
              value={height}
              onChange={setHeight}
              type="number"
              min={100}
              max={250}
              placeholder={pe("heightPlaceholder")}
            />
            <LabeledInput
              label={pe("startWeight")}
              inputClass={inputClass}
              value={weight}
              onChange={setWeight}
              type="number"
              step="0.1"
              min={30}
              max={300}
              placeholder={pe("startWeightPlaceholder")}
            />
            <LabeledInput
              label={pe("targetWeight")}
              inputClass={inputClass}
              value={targetWeight}
              onChange={setTargetWeight}
              type="number"
              step="0.1"
              min={30}
              max={300}
              placeholder={pe("targetWeightPlaceholder")}
            />
          </div>
        </FieldGroup>

        <FieldGroup title={t("genderTitle")}>
          {GENDER_VALUES.map((value) => (
            <RadioCard
              key={value}
              checked={gender === value}
              onClick={() => setGender(value)}
              label={t(`genders.${value}`)}
            />
          ))}
        </FieldGroup>

        <FieldGroup title={t("activityTitle")}>
          {ACTIVITY_VALUES.map((value) => (
            <RadioCard
              key={value}
              checked={activity === value}
              onClick={() => setActivity(value)}
              label={t(`activities.${value}.label`)}
              hint={t(`activities.${value}.hint`)}
            />
          ))}
        </FieldGroup>

        <FieldGroup title={pe("serviceType")}>
          <RadioCard
            checked={serviceType === "full"}
            onClick={() => setServiceType("full")}
            label={pe("serviceFull")}
          />
          <RadioCard
            checked={serviceType === "nutrition"}
            onClick={() => setServiceType("nutrition")}
            label={pe("serviceNutrition")}
          />
        </FieldGroup>

        {serviceType === "full" && (
          <FieldGroup title={pe("fitnessLevel")} required>
            {levelSuggestion && (
              <FitnessLevelNudge
                suggestion={levelSuggestion}
                applied={fitnessLevel === levelSuggestion.suggested}
                onApply={(level) => setFitnessLevel(level)}
              />
            )}
            {FITNESS_LEVEL_VALUES.map((value) => (
              <RadioCard
                key={value}
                checked={fitnessLevel === value}
                onClick={() => setFitnessLevel(value)}
                label={pe(`fitnessLevels.${value}`)}
              />
            ))}
          </FieldGroup>
        )}

        <FieldGroup title={pe("goal")} required>
          {FITNESS_GOAL_VALUES.map((value) => (
            <RadioCard
              key={value}
              checked={fitnessGoal === value}
              onClick={() => setFitnessGoal(value)}
              label={pe(`fitnessGoals.${value}.label`)}
              hint={pe(`fitnessGoals.${value}.description`)}
            />
          ))}
        </FieldGroup>

        {serviceType === "full" && (
          <FieldGroup title={pe("sportHistory")} required>
            <textarea
              value={sportHistory}
              onChange={(e) => setSportHistory(e.target.value)}
              rows={2}
              placeholder={pe("sportHistoryPlaceholder")}
              className={`${inputClass} h-auto resize-none`}
            />
          </FieldGroup>
        )}

        <FieldGroup title={pe("medications")} required>
          <textarea
            value={currentMedications}
            onChange={(e) => setCurrentMedications(e.target.value)}
            rows={2}
            placeholder={pe("medicationsPlaceholder")}
            className={`${inputClass} h-auto resize-none`}
          />
        </FieldGroup>

        <FieldGroup title={pe("healthNotes")} required>
          <textarea
            value={healthNotes}
            onChange={(e) => setHealthNotes(e.target.value)}
            rows={3}
            placeholder={pe("healthNotesPlaceholder")}
            className={`${inputClass} h-auto resize-none`}
          />
        </FieldGroup>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5" />
            {pe("allergens")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setAllergenMode("none");
                setSelectedAllergens([]);
                setOtherAllergens("");
              }}
              className={`p-2 rounded-md border text-xs font-medium transition-colors ${
                allergenMode === "none"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input hover:bg-accent"
              }`}
            >
              {pe("noAllergens")}
            </button>
            <button
              type="button"
              onClick={() => setAllergenMode("has")}
              className={`p-2 rounded-md border text-xs font-medium transition-colors ${
                allergenMode === "has"
                  ? "border-destructive bg-destructive/10 text-destructive"
                  : "border-input hover:bg-accent"
              }`}
            >
              {pe("hasAllergens")}
            </button>
          </div>
          {allergenMode === "has" && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {ALLERGEN_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setSelectedAllergens((prev) =>
                        prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag],
                      )
                    }
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      selectedAllergens.includes(tag)
                        ? "border-destructive bg-destructive/10 text-destructive"
                        : "border-input hover:bg-accent"
                    }`}
                  >
                    {pe(`allergenTags.${ALLERGEN_KEYS[tag]}`)}
                  </button>
                ))}
              </div>
              <textarea
                value={otherAllergens}
                onChange={(e) => setOtherAllergens(e.target.value)}
                rows={2}
                placeholder={pe("otherAllergensPlaceholder")}
                className={`${inputClass} h-auto resize-none`}
              />
            </div>
          )}
        </div>

        <FieldGroup title={t("flagsTitle")}>
          {FLAG_KEYS.map((key) => (
            <label
              key={key}
              className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-accent/40 transition-colors"
            >
              <Checkbox
                checked={flags[key]}
                onCheckedChange={() =>
                  setFlags((prev) => ({ ...prev, [key]: !prev[key] }))
                }
                className="mt-0.5"
              />
              <span className="text-xs leading-relaxed flex-1">{t(`flags.${key}`)}</span>
            </label>
          ))}
        </FieldGroup>

        <Button
          type="button"
          size="sm"
          className="w-full gap-1.5"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {t("save")}
        </Button>
      </CardContent>
    </Card>
  );
}

function LabeledInput({
  label,
  required,
  inputClass,
  value,
  onChange,
  type,
  min,
  max,
  step,
  placeholder,
}: {
  label: string;
  required?: boolean;
  inputClass: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  min?: number;
  max?: number;
  step?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}

function FieldGroup({
  title,
  required,
  children,
}: {
  title: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {title} {required && <span className="text-red-400">*</span>}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function RadioCard({
  checked,
  onClick,
  label,
  hint,
}: {
  checked: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
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
        <span
          className={`h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center ${
            checked ? "border-primary" : "border-muted-foreground/40"
          }`}
        >
          {checked && <span className="h-2 w-2 rounded-full bg-primary" />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{label}</p>
          {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
        </div>
      </div>
    </button>
  );
}
