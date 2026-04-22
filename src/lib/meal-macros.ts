export interface MealMacroLike {
  calories?: number | null;
  proteinG?: string | null;
  carbsG?: string | null;
  fatG?: string | null;
  isCompleted?: boolean | null;
}

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  completedCount: number;
  total: number;
  percent: number;
}

export function computeMealMacros(meals: readonly MealMacroLike[]): MacroTotals {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let completedCount = 0;

  for (const m of meals) {
    calories += m.calories ?? 0;
    protein += parseFloat(m.proteinG ?? "0") || 0;
    carbs += parseFloat(m.carbsG ?? "0") || 0;
    fat += parseFloat(m.fatG ?? "0") || 0;
    if (m.isCompleted) completedCount += 1;
  }

  const total = meals.length;
  const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return {
    calories,
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
    completedCount,
    total,
    percent,
  };
}
