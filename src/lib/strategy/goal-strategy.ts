import {
  FITNESS_GOAL_LABELS,
  type FitnessGoal,
  type MealFrequencyPolicy,
} from "@/lib/meal-timing";

export interface GoalStrategy {
  calorieDelta: number;
  proteinPerKgLBM: number;
  fatPctOfCalories: number;
  minCarbsG: { female: number; male: number; prefer_not_to_say: number };
  mealPolicy: { default: MealFrequencyPolicy; nutritionOnly: MealFrequencyPolicy };
  progressionFocus: "preserve" | "progress" | "aggressive";
  promptBlock: string;
}

export const GOAL_STRATEGIES: Record<FitnessGoal, GoalStrategy> = {
  loss: {
    calorieDelta: -400,
    proteinPerKgLBM: 1.9,
    fatPctOfCalories: 0.25,
    minCarbsG: { female: 100, male: 130, prefer_not_to_say: 120 },
    mealPolicy: { default: "moderate", nutritionOnly: "intermittent" },
    progressionFocus: "preserve",
    promptBlock: [
      "Strateji: Kontrollü kalori açığı (~300-500 kcal/gün TDEE altında).",
      "Protein yüksek tut (yağsız kütle başına ~1.9 g), kas kaybını önle.",
      "Yağ toplam kalorinin %25'i; kalan kaloriyi karbdan karşıla.",
      "Karbonhidrat minimumlarını ihlal etme (kadın ≥100g, erkek ≥130g) — beyin ve antrenman performansı için.",
      "Antrenmanda hedef: mevcut kuvveti KORU, yeni PR peşinde koşma.",
      "Tatlı/işlenmiş gıdaları sınırla; doyurucu, lif yüksek besinlere odaklan.",
    ].join("\n"),
  },
  recomp: {
    calorieDelta: -150,
    proteinPerKgLBM: 2.1,
    fatPctOfCalories: 0.25,
    minCarbsG: { female: 130, male: 160, prefer_not_to_say: 140 },
    mealPolicy: { default: "moderate", nutritionOnly: "moderate" },
    progressionFocus: "preserve",
    promptBlock: [
      "Strateji: Hafif kalori açığı (~100-200 kcal/gün) + agresif protein.",
      "Protein çok yüksek (yağsız kütle başına ~2.1 g) — yağ azalırken kas korunmalı/artırılmalı.",
      "Yağ %25, karbonhidrat antrenman çevresinde yoğunlaştırılmalı (pre/post-workout öncelikli).",
      "İlerleme yavaş ama çift yönlü: terazide stagnasyon NORMAL — bel ölçüsü ve ayna referans.",
      "Antrenmanda hedef: mevcut yükleri KORU veya küçük adımlarla ilerlet (1-2 rep / küçük yük artışı).",
    ].join("\n"),
  },
  maintain: {
    calorieDelta: 0,
    proteinPerKgLBM: 1.6,
    fatPctOfCalories: 0.3,
    minCarbsG: { female: 130, male: 160, prefer_not_to_say: 140 },
    mealPolicy: { default: "frequent", nutritionOnly: "intermittent" },
    progressionFocus: "preserve",
    promptBlock: [
      "Strateji: İdame kalorisi (TDEE seviyesinde, ±100 kcal varyasyon normal).",
      "Protein yağsız kütle başına ~1.6 g — sağlık ve toparlanma odaklı.",
      "Yağ %30'a kadar çıkabilir (hormonal sağlık), karb makul seviyede dengeli.",
      "Esnek beslenme yaklaşımı: %80 temiz, %20 keyif — sürdürülebilirlik öncelikli.",
      "Antrenmanda hedef: form ve kuvveti KORU, periyodik deload uygula.",
    ].join("\n"),
  },
  muscle_gain: {
    calorieDelta: 250,
    proteinPerKgLBM: 2.0,
    fatPctOfCalories: 0.25,
    minCarbsG: { female: 180, male: 220, prefer_not_to_say: 200 },
    mealPolicy: { default: "frequent", nutritionOnly: "frequent" },
    progressionFocus: "progress",
    promptBlock: [
      "Strateji: Ölçülü kalori fazlası (~+200-300 kcal/gün, lean bulk).",
      "Protein yağsız kütle başına ~2.0 g — kas sentezi için optimal.",
      "Karbonhidrat YÜKSEK ve antrenman çevresinde yoğun (pre/post-workout): glikojen + performans.",
      "Yağ %25 — hormonal sağlık için yeterli, fazlası sürpriz yağlanma riski.",
      "Haftalık kilo artışı ~%0.25-0.5 vücut ağırlığı (hızlı artış = yağ ağırlıklı).",
      "Antrenmanda hedef: PROGRESYON — her hafta yük/rep/set artışı planla.",
    ].join("\n"),
  },
  weight_gain: {
    calorieDelta: 450,
    proteinPerKgLBM: 1.8,
    fatPctOfCalories: 0.3,
    minCarbsG: { female: 200, male: 250, prefer_not_to_say: 220 },
    mealPolicy: { default: "frequent", nutritionOnly: "frequent" },
    progressionFocus: "aggressive",
    promptBlock: [
      "Strateji: Belirgin kalori fazlası (~+400-500 kcal/gün).",
      "Protein yağsız kütle başına ~1.8 g — yeterli ama abartısız.",
      "Karbonhidrat çok yüksek; kalori yoğun ama temiz besinleri önceliklendir (pirinç, makarna, yulaf, kuruyemiş, zeytinyağı).",
      "Yağ %30 — kalori yoğunluğu için sağlıklı yağlardan yararlan (avokado, ceviz, fıstık ezmesi).",
      "Sık öğün (5-7) ve büyük porsiyonlar — iştah düşükse sıvı kalori (smoothie, süt) ekle.",
      "Antrenmanda hedef: AGRESİF progresyon, compound hareket öncelikli.",
    ].join("\n"),
  },
};

export function renderGoalStrategyBlock(
  goal: FitnessGoal,
  goalSource: "explicit" | "derived",
): string {
  const strategy = GOAL_STRATEGIES[goal];
  const label = FITNESS_GOAL_LABELS[goal];
  const deltaSign = strategy.calorieDelta > 0 ? "+" : "";

  const lines: string[] = [`═══ HEDEF-ODAKLI STRATEJİ: ${label} ═══`];
  if (goalSource === "derived") {
    lines.push(
      "(NOT: Kullanıcı profilden hedef seçmemiş — kilo/hedef-kilo farkından çıkarsandı.)",
    );
  }
  lines.push(
    `Kalori deltası: ${deltaSign}${strategy.calorieDelta} kcal (TDEE'ye göre)`,
    `Protein hedefi: ${strategy.proteinPerKgLBM} g / kg yağsız kütle (LBM)`,
    `Yağ payı: toplam kalorinin %${Math.round(strategy.fatPctOfCalories * 100)}'i`,
    `Karbonhidrat tabanı: kadın ≥${strategy.minCarbsG.female}g · erkek ≥${strategy.minCarbsG.male}g · belirtilmemiş ≥${strategy.minCarbsG.prefer_not_to_say}g`,
    `Antrenman odağı: ${strategy.progressionFocus} (${progressionFocusLabel(strategy.progressionFocus)})`,
    "",
    strategy.promptBlock,
    "═══════════════════════════════",
  );
  return lines.join("\n");
}

function progressionFocusLabel(
  focus: GoalStrategy["progressionFocus"],
): string {
  switch (focus) {
    case "preserve":
      return "mevcut performansı koru";
    case "progress":
      return "hafif progresyon";
    case "aggressive":
      return "agresif progresyon";
  }
}
