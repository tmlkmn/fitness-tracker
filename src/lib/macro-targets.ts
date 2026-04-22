export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface UserBasics {
  weight?: string | number | null;
  height?: number | null;
  age?: number | null;
  fitnessLevel?: string | null;
}

const ACTIVITY_BY_LEVEL: Record<string, number> = {
  beginner: 1.375,
  intermediate: 1.55,
  advanced: 1.725,
};

export function computeDefaultTargets(user: UserBasics): MacroTargets | null {
  const w = typeof user.weight === "string" ? parseFloat(user.weight) : user.weight ?? null;
  const h = user.height ?? null;
  const age = user.age ?? null;
  if (!w || !h || !age) return null;

  const bmr = 10 * w + 6.25 * h - 5 * age + 5;
  const activity = ACTIVITY_BY_LEVEL[user.fitnessLevel ?? "intermediate"] ?? 1.55;
  const calories = Math.round(bmr * activity);

  const protein = Math.round(w * 1.8);
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));

  return { calories, protein, carbs, fat };
}

export interface UserWithTargets extends UserBasics {
  targetCalories?: number | null;
  targetProteinG?: string | null;
  targetCarbsG?: string | null;
  targetFatG?: string | null;
}

export function resolveTargets(user: UserWithTargets): MacroTargets | null {
  const hasOverride =
    user.targetCalories ||
    user.targetProteinG ||
    user.targetCarbsG ||
    user.targetFatG;

  const defaults = computeDefaultTargets(user);

  if (!hasOverride) return defaults;

  return {
    calories: user.targetCalories ?? defaults?.calories ?? 0,
    protein: user.targetProteinG
      ? Math.round(parseFloat(user.targetProteinG))
      : defaults?.protein ?? 0,
    carbs: user.targetCarbsG
      ? Math.round(parseFloat(user.targetCarbsG))
      : defaults?.carbs ?? 0,
    fat: user.targetFatG
      ? Math.round(parseFloat(user.targetFatG))
      : defaults?.fat ?? 0,
  };
}

export function macroProgressColor(actual: number, target: number): string {
  if (target <= 0) return "bg-muted-foreground/40";
  const pct = (actual / target) * 100;
  if (pct < 90) return "bg-amber-500";
  if (pct <= 110) return "bg-primary";
  return "bg-destructive";
}
