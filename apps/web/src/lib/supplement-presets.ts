export type SupplementPresetTiming =
  | "sabah"
  | "kahvalti"
  | "ogle"
  | "antrenman-once"
  | "antrenman-sonra"
  | "aksam"
  | "yatmadan-once";

export interface SupplementPreset {
  key: string;
  defaultDosage: string;
  defaultServingsPerDose: number;
  caloriesPerServing: number;
  proteinPerServing: number;
  carbsPerServing: number;
  fatPerServing: number;
  defaultTiming: SupplementPresetTiming;
}

export const CUSTOM_PRESET_KEY = "custom" as const;

export const SUPPLEMENT_PRESETS: readonly SupplementPreset[] = [
  { key: "whey", defaultDosage: "1 scoop (30g)", defaultServingsPerDose: 1, caloriesPerServing: 120, proteinPerServing: 24, carbsPerServing: 3, fatPerServing: 1.5, defaultTiming: "antrenman-sonra" },
  { key: "casein", defaultDosage: "1 scoop (30g)", defaultServingsPerDose: 1, caloriesPerServing: 110, proteinPerServing: 24, carbsPerServing: 4, fatPerServing: 1, defaultTiming: "yatmadan-once" },
  { key: "eaa", defaultDosage: "1 scoop (10g)", defaultServingsPerDose: 1, caloriesPerServing: 40, proteinPerServing: 8, carbsPerServing: 0, fatPerServing: 0, defaultTiming: "antrenman-once" },
  { key: "bcaa", defaultDosage: "1 scoop (7g)", defaultServingsPerDose: 1, caloriesPerServing: 28, proteinPerServing: 7, carbsPerServing: 0, fatPerServing: 0, defaultTiming: "antrenman-once" },
  { key: "mass-gainer", defaultDosage: "1 scoop (75g)", defaultServingsPerDose: 1, caloriesPerServing: 380, proteinPerServing: 25, carbsPerServing: 60, fatPerServing: 4, defaultTiming: "antrenman-sonra" },
  { key: "creatine", defaultDosage: "5g", defaultServingsPerDose: 1, caloriesPerServing: 0, proteinPerServing: 0, carbsPerServing: 0, fatPerServing: 0, defaultTiming: "sabah" },
  { key: "multivitamin", defaultDosage: "1 tablet", defaultServingsPerDose: 1, caloriesPerServing: 0, proteinPerServing: 0, carbsPerServing: 0, fatPerServing: 0, defaultTiming: "kahvalti" },
  { key: "omega-3", defaultDosage: "1 kapsül (1g)", defaultServingsPerDose: 1, caloriesPerServing: 9, proteinPerServing: 0, carbsPerServing: 0, fatPerServing: 1, defaultTiming: "kahvalti" },
  { key: "vitamin-d", defaultDosage: "1 tablet", defaultServingsPerDose: 1, caloriesPerServing: 0, proteinPerServing: 0, carbsPerServing: 0, fatPerServing: 0, defaultTiming: "kahvalti" },
  { key: "magnesium", defaultDosage: "1 tablet", defaultServingsPerDose: 1, caloriesPerServing: 0, proteinPerServing: 0, carbsPerServing: 0, fatPerServing: 0, defaultTiming: "yatmadan-once" },
  { key: "zinc", defaultDosage: "1 tablet", defaultServingsPerDose: 1, caloriesPerServing: 0, proteinPerServing: 0, carbsPerServing: 0, fatPerServing: 0, defaultTiming: "yatmadan-once" },
  { key: "preworkout", defaultDosage: "1 scoop (10g)", defaultServingsPerDose: 1, caloriesPerServing: 15, proteinPerServing: 0, carbsPerServing: 3, fatPerServing: 0, defaultTiming: "antrenman-once" },
  { key: "caffeine", defaultDosage: "200mg", defaultServingsPerDose: 1, caloriesPerServing: 0, proteinPerServing: 0, carbsPerServing: 0, fatPerServing: 0, defaultTiming: "antrenman-once" },
  { key: "glutamine", defaultDosage: "5g", defaultServingsPerDose: 1, caloriesPerServing: 20, proteinPerServing: 5, carbsPerServing: 0, fatPerServing: 0, defaultTiming: "antrenman-sonra" },
  { key: "collagen", defaultDosage: "10g", defaultServingsPerDose: 1, caloriesPerServing: 36, proteinPerServing: 9, carbsPerServing: 0, fatPerServing: 0, defaultTiming: "sabah" },
  { key: "fish-oil", defaultDosage: "1 kapsül", defaultServingsPerDose: 1, caloriesPerServing: 9, proteinPerServing: 0, carbsPerServing: 0, fatPerServing: 1, defaultTiming: "kahvalti" },
];

export function getPreset(key: string | null | undefined): SupplementPreset | null {
  if (!key || key === CUSTOM_PRESET_KEY) return null;
  return SUPPLEMENT_PRESETS.find((p) => p.key === key) ?? null;
}
