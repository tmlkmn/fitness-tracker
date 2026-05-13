export interface SupplementMacroLike {
  caloriesPerServing?: number | null;
  proteinPerServing?: string | null;
  carbsPerServing?: string | null;
  fatPerServing?: string | null;
  servingsPerDose?: string | null;
  isCompleted?: boolean | null;
}

export interface SupplementMacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  contributingCount: number;
}

function toNumber(value: string | null | undefined, fallback: number): number {
  if (value === null || value === undefined) return fallback;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

export function computeSupplementMacros(
  supplements: readonly SupplementMacroLike[],
): SupplementMacroTotals {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let contributingCount = 0;

  for (const s of supplements) {
    if (!s.isCompleted) continue;
    const servings = toNumber(s.servingsPerDose, 1);
    const sKcal = (s.caloriesPerServing ?? 0) * servings;
    const sProtein = toNumber(s.proteinPerServing, 0) * servings;
    const sCarbs = toNumber(s.carbsPerServing, 0) * servings;
    const sFat = toNumber(s.fatPerServing, 0) * servings;

    if (sKcal > 0 || sProtein > 0 || sCarbs > 0 || sFat > 0) {
      contributingCount += 1;
    }
    calories += sKcal;
    protein += sProtein;
    carbs += sCarbs;
    fat += sFat;
  }

  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
    contributingCount,
  };
}

export function computeSupplementMacrosForSingle(
  supplement: SupplementMacroLike,
): { calories: number; protein: number; carbs: number; fat: number } {
  const servings = toNumber(supplement.servingsPerDose, 1);
  return {
    calories: Math.round((supplement.caloriesPerServing ?? 0) * servings),
    protein: Math.round(toNumber(supplement.proteinPerServing, 0) * servings),
    carbs: Math.round(toNumber(supplement.carbsPerServing, 0) * servings),
    fat: Math.round(toNumber(supplement.fatPerServing, 0) * servings),
  };
}
