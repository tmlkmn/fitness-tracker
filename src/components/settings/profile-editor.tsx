"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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

export const FITNESS_LEVEL_OPTIONS = [
  { value: "beginner", label: "Yeni başlayan" },
  { value: "returning", label: "Ara vermiş, tekrar başlayan" },
  { value: "intermediate", label: "Orta düzey" },
  { value: "advanced", label: "İleri düzey" },
];

export const FITNESS_GOAL_OPTIONS = [
  { value: "loss",        label: "Kilo Verme",                description: "Yağ yakma + kalori açığı" },
  { value: "recomp",      label: "Yağ Yakma + Kas Koruma",    description: "Vücut rekompozisyonu, idame kalori" },
  { value: "maintain",    label: "Form Koruma",               description: "Mevcut formu koruma" },
  { value: "muscle_gain", label: "Kas Kazanımı",              description: "Hipertrofi, hafif kalori fazlası" },
  { value: "weight_gain", label: "Kilo Alma",                 description: "Genel kilo artışı, hızlı surplus" },
];

interface Props {
  profile: ReturnType<typeof useUserProfile>["data"];
  userEmail?: string;
  onClose?: () => void;
}

export function ProfileEditor({ profile, userEmail, onClose }: Props) {
  const queryClient = useQueryClient();
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
          <span className="text-sm text-muted-foreground">E-posta</span>
          <span className="text-sm font-medium">{userEmail}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">
          Yaş <span className="text-red-400">*</span>
        </label>
        <input
          type="number"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          min={10}
          max={100}
          placeholder="28"
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Boy (cm)</label>
        <input
          type="number"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          min={100}
          max={250}
          placeholder="175"
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Başlangıç kilosu (kg)</label>
        <input
          type="number"
          step="0.1"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          min={30}
          max={300}
          placeholder="80"
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Hedef kilo (kg)</label>
        <input
          type="number"
          step="0.1"
          value={targetWeight}
          onChange={(e) => setTargetWeight(e.target.value)}
          min={30}
          max={300}
          placeholder="75"
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Hizmet Tipi</label>
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
            Tam Program
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
            Sadece Beslenme
          </button>
        </div>
      </div>

      {serviceType === "full" && (
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">
            Fitness Seviyesi <span className="text-red-400">*</span>
          </label>
          <select
            value={fitnessLevel}
            onChange={(e) => setFitnessLevel(e.target.value)}
            className={inputClass}
          >
            <option value="">Seçiniz</option>
            {FITNESS_LEVEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">
          Hedef <span className="text-red-400">*</span>
        </label>
        <select
          value={fitnessGoal}
          onChange={(e) => setFitnessGoal(e.target.value)}
          className={inputClass}
        >
          <option value="">Seçiniz</option>
          {FITNESS_GOAL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {fitnessGoal && (
          <p className="text-[11px] text-muted-foreground">
            {FITNESS_GOAL_OPTIONS.find((o) => o.value === fitnessGoal)?.description}
          </p>
        )}
      </div>

      {serviceType === "full" && (
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">
            Spor Geçmişi <span className="text-red-400">*</span>
          </label>
          <textarea
            value={sportHistory}
            onChange={(e) => setSportHistory(e.target.value)}
            rows={2}
            placeholder="Daha önce yaptığınız sporlar..."
            className={`${inputClass} h-auto resize-none`}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">
          İlaçlar / Supplementler <span className="text-red-400">*</span>
        </label>
        <textarea
          value={currentMedications}
          onChange={(e) => setCurrentMedications(e.target.value)}
          rows={2}
          placeholder="Kullandığınız ilaçlar veya takviyeler..."
          className={`${inputClass} h-auto resize-none`}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">
          Sağlık Notları <span className="text-red-400">*</span>
        </label>
        <textarea
          value={healthNotes}
          onChange={(e) => setHealthNotes(e.target.value)}
          rows={3}
          placeholder="Yaralanmalar, alerjiler, diyet kısıtlamaları..."
          className={`${inputClass} h-auto resize-none`}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5" />
          Gıda Alerjileri
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
            Alerjim yok
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
            Var, belirtmek istiyorum
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
                      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
                    )
                  }
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    selectedAllergens.includes(tag)
                      ? "border-destructive bg-destructive/10 text-destructive"
                      : "border-input hover:bg-accent"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <textarea
              value={otherAllergens}
              onChange={(e) => setOtherAllergens(e.target.value)}
              rows={2}
              placeholder="Diğer alerjiler (virgülle ayırın)..."
              className={`${inputClass} h-auto resize-none`}
            />
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Kaydet"}
        </Button>
        {onClose && (
          <Button size="sm" variant="outline" onClick={onClose} className="flex-1">
            İptal
          </Button>
        )}
      </div>
    </div>
  );
}
