"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { updateUserProfile } from "@/actions/user";
import { useUserProfile } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert } from "lucide-react";

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

export const FITNESS_LEVEL_VALUES = ["beginner", "returning", "intermediate", "advanced"] as const;
export const FITNESS_GOAL_VALUES = ["loss", "recomp", "maintain", "muscle_gain", "weight_gain"] as const;

interface Props {
  profile: ReturnType<typeof useUserProfile>["data"];
  userEmail?: string;
  onClose?: () => void;
}

export function ProfileEditor({ profile, userEmail, onClose }: Props) {
  const queryClient = useQueryClient();
  const t = useTranslations("settings.profileEditor");
  const [saving, setSaving] = useState(false);

  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [age, setAge] = useState("");
  const [healthNotes, setHealthNotes] = useState("");
  const [fitnessLevel, setFitnessLevel] = useState("");
  const [fitnessGoal, setFitnessGoal] = useState("");
  const [sportHistory, setSportHistory] = useState("");
  const [currentMedications, setCurrentMedications] = useState("");
  const [serviceType, setServiceType] = useState("full");
  const [allergenMode, setAllergenMode] = useState<"none" | "has">("none");
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [otherAllergens, setOtherAllergens] = useState("");

  useEffect(() => {
    if (profile) {
      setHeight(profile.height ? String(profile.height) : "");
      setWeight(profile.weight ?? "");
      setTargetWeight(profile.targetWeight ?? "");
      setAge(profile.age ? String(profile.age) : "");
      setHealthNotes(profile.healthNotes ?? "");
      setFitnessLevel(profile.fitnessLevel ?? "");
      setFitnessGoal(profile.fitnessGoal ?? "");
      setSportHistory(profile.sportHistory ?? "");
      setCurrentMedications(profile.currentMedications ?? "");
      setServiceType(profile.serviceType ?? "full");
      if (profile.foodAllergens) {
        try {
          const parsed = JSON.parse(profile.foodAllergens);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (parsed.length === 1 && parsed[0] === "Yok") {
              setAllergenMode("none");
              setSelectedAllergens([]);
              setOtherAllergens("");
            } else {
              setAllergenMode("has");
              const known = parsed.filter((a: string) => ALLERGEN_TAGS.includes(a));
              const other = parsed.filter((a: string) => !ALLERGEN_TAGS.includes(a));
              setSelectedAllergens(known);
              setOtherAllergens(other.join(", "));
            }
          }
        } catch {
          setAllergenMode("has");
          setOtherAllergens(profile.foodAllergens);
        }
      }
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    let foodAllergens: string | undefined;
    if (allergenMode === "none") {
      foodAllergens = JSON.stringify(["Yok"]);
    } else {
      const all = [...selectedAllergens];
      if (otherAllergens.trim()) {
        const extras = otherAllergens
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        all.push(...extras);
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
      await queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <div className="space-y-3">
      {userEmail && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t("email")}</span>
          <span className="text-sm font-medium">{userEmail}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">
          {t("age")} <span className="text-red-400">*</span>
        </label>
        <input
          type="number"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          min={10}
          max={100}
          placeholder={t("agePlaceholder")}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">{t("height")}</label>
        <input
          type="number"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          min={100}
          max={250}
          placeholder={t("heightPlaceholder")}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">{t("startWeight")}</label>
        <input
          type="number"
          step="0.1"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          min={30}
          max={300}
          placeholder={t("startWeightPlaceholder")}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">{t("targetWeight")}</label>
        <input
          type="number"
          step="0.1"
          value={targetWeight}
          onChange={(e) => setTargetWeight(e.target.value)}
          min={30}
          max={300}
          placeholder={t("targetWeightPlaceholder")}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">{t("serviceType")}</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setServiceType("full")}
            className={`p-2 rounded-md border text-xs font-medium transition-colors ${
              serviceType === "full"
                ? "border-primary bg-primary/10 text-primary"
                : "border-input hover:bg-accent"
            }`}
          >
            {t("serviceFull")}
          </button>
          <button
            type="button"
            onClick={() => setServiceType("nutrition")}
            className={`p-2 rounded-md border text-xs font-medium transition-colors ${
              serviceType === "nutrition"
                ? "border-primary bg-primary/10 text-primary"
                : "border-input hover:bg-accent"
            }`}
          >
            {t("serviceNutrition")}
          </button>
        </div>
      </div>

      {serviceType === "full" && (
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">
            {t("fitnessLevel")} <span className="text-red-400">*</span>
          </label>
          <select
            value={fitnessLevel}
            onChange={(e) => setFitnessLevel(e.target.value)}
            className={inputClass}
          >
            <option value="">{t("select")}</option>
            {FITNESS_LEVEL_VALUES.map((value) => (
              <option key={value} value={value}>
                {t(`fitnessLevels.${value}`)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">
          {t("goal")} <span className="text-red-400">*</span>
        </label>
        <select
          value={fitnessGoal}
          onChange={(e) => setFitnessGoal(e.target.value)}
          className={inputClass}
        >
          <option value="">{t("select")}</option>
          {FITNESS_GOAL_VALUES.map((value) => (
            <option key={value} value={value}>
              {t(`fitnessGoals.${value}.label`)}
            </option>
          ))}
        </select>
        {fitnessGoal && FITNESS_GOAL_VALUES.includes(fitnessGoal as "loss") && (
          <p className="text-[11px] text-muted-foreground">
            {t(`fitnessGoals.${fitnessGoal}.description`)}
          </p>
        )}
      </div>

      {serviceType === "full" && (
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">
            {t("sportHistory")} <span className="text-red-400">*</span>
          </label>
          <textarea
            value={sportHistory}
            onChange={(e) => setSportHistory(e.target.value)}
            rows={2}
            placeholder={t("sportHistoryPlaceholder")}
            className={`${inputClass} h-auto resize-none`}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">
          {t("medications")} <span className="text-red-400">*</span>
        </label>
        <textarea
          value={currentMedications}
          onChange={(e) => setCurrentMedications(e.target.value)}
          rows={2}
          placeholder={t("medicationsPlaceholder")}
          className={`${inputClass} h-auto resize-none`}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">
          {t("healthNotes")} <span className="text-red-400">*</span>
        </label>
        <textarea
          value={healthNotes}
          onChange={(e) => setHealthNotes(e.target.value)}
          rows={3}
          placeholder={t("healthNotesPlaceholder")}
          className={`${inputClass} h-auto resize-none`}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5" />
          {t("allergens")}
        </label>
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
            {t("noAllergens")}
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
            {t("hasAllergens")}
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
                  {t(`allergenTags.${ALLERGEN_KEYS[tag]}`)}
                </button>
              ))}
            </div>
            <textarea
              value={otherAllergens}
              onChange={(e) => setOtherAllergens(e.target.value)}
              rows={2}
              placeholder={t("otherAllergensPlaceholder")}
              className={`${inputClass} h-auto resize-none`}
            />
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : t("save")}
        </Button>
        {onClose && (
          <Button size="sm" variant="outline" onClick={onClose} className="flex-1">
            {t("cancel")}
          </Button>
        )}
      </div>
    </div>
  );
}
