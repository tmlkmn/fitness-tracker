import "server-only";
import { db } from "@/db";
import { supplements, weeklyPlans } from "@/db/schema";
import { and, desc, eq, lte } from "drizzle-orm";
import { computeSupplementMacrosForSingle } from "@/lib/supplement-macros";
import type { MacroTargets } from "@/lib/macro-targets";
import type { WeeklyMacroTargets } from "@/lib/carb-cycling";
import type { Locale } from "@/lib/locale";
import { getTurkeyTodayStr } from "@/lib/utils";

export interface SupplementLine {
  name: string;
  dosage: string;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface SupplementBudget {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  supplementsCount: number;
  list: SupplementLine[];
}

export const EMPTY_SUPPLEMENT_BUDGET: SupplementBudget = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  supplementsCount: 0,
  list: [],
};

async function findActiveWeeklyPlanId(userId: string): Promise<number | null> {
  const today = getTurkeyTodayStr();
  const rows = await db
    .select({ id: weeklyPlans.id })
    .from(weeklyPlans)
    .where(and(eq(weeklyPlans.userId, userId), lte(weeklyPlans.startDate, today)))
    .orderBy(desc(weeklyPlans.startDate))
    .limit(1);
  return rows[0]?.id ?? null;
}

export async function getDailySupplementBudget(
  userId: string,
  weeklyPlanId?: number | null,
): Promise<SupplementBudget> {
  let wpId = weeklyPlanId ?? null;
  if (!wpId) {
    wpId = await findActiveWeeklyPlanId(userId);
  }
  if (!wpId) return EMPTY_SUPPLEMENT_BUDGET;

  const rows = await db
    .select({
      name: supplements.name,
      dosage: supplements.dosage,
      servingsPerDose: supplements.servingsPerDose,
      caloriesPerServing: supplements.caloriesPerServing,
      proteinPerServing: supplements.proteinPerServing,
      carbsPerServing: supplements.carbsPerServing,
      fatPerServing: supplements.fatPerServing,
    })
    .from(supplements)
    .where(eq(supplements.weeklyPlanId, wpId));

  if (rows.length === 0) return EMPTY_SUPPLEMENT_BUDGET;

  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let supplementsCount = 0;
  const list: SupplementLine[] = [];

  for (const r of rows) {
    const single = computeSupplementMacrosForSingle({
      caloriesPerServing: r.caloriesPerServing,
      proteinPerServing: r.proteinPerServing,
      carbsPerServing: r.carbsPerServing,
      fatPerServing: r.fatPerServing,
      servingsPerDose: r.servingsPerDose,
    });
    const servings = r.servingsPerDose ? parseFloat(r.servingsPerDose) || 1 : 1;
    const hasMacros =
      single.calories > 0 || single.protein > 0 || single.carbs > 0 || single.fat > 0;
    if (hasMacros) supplementsCount += 1;
    calories += single.calories;
    protein += single.protein;
    carbs += single.carbs;
    fat += single.fat;
    list.push({
      name: r.name,
      dosage: r.dosage,
      servings,
      calories: single.calories,
      protein: single.protein,
      carbs: single.carbs,
      fat: single.fat,
    });
  }

  return {
    calories,
    protein,
    carbs,
    fat,
    supplementsCount,
    list,
  };
}

export function subtractSupplementBudget(
  target: MacroTargets,
  budget: SupplementBudget,
): MacroTargets {
  return {
    calories: Math.max(0, target.calories - budget.calories),
    protein: Math.max(0, target.protein - budget.protein),
    carbs: Math.max(0, target.carbs - budget.carbs),
    fat: Math.max(0, target.fat - budget.fat),
  };
}

export function applySupplementAdjustment(
  targets: WeeklyMacroTargets,
  budget: SupplementBudget,
): WeeklyMacroTargets {
  if (budget.supplementsCount === 0) return targets;
  return {
    baseline: subtractSupplementBudget(targets.baseline, budget),
    perDayType: {
      workout: subtractSupplementBudget(targets.perDayType.workout, budget),
      swimming: subtractSupplementBudget(targets.perDayType.swimming, budget),
      rest: subtractSupplementBudget(targets.perDayType.rest, budget),
      nutrition: subtractSupplementBudget(targets.perDayType.nutrition, budget),
    },
    cyclingProfile: targets.cyclingProfile,
  };
}

export function buildSupplementInfoBlock(
  budget: SupplementBudget,
  locale: Locale,
): string {
  if (budget.supplementsCount === 0) return "";

  if (locale === "en") {
    const lines: string[] = [];
    lines.push("═══ USER'S SUPPLEMENT STACK ═══");
    lines.push(
      `User takes an average of ${budget.calories} kcal · ${budget.protein}g P · ${budget.carbs}g C · ${budget.fat}g F daily from supplements.`,
    );
    for (const s of budget.list) {
      const hasMacros =
        s.calories > 0 || s.protein > 0 || s.carbs > 0 || s.fat > 0;
      if (hasMacros) {
        lines.push(
          `- ${s.name} × ${s.servings} (${s.dosage}): ${s.calories} kcal · ${s.protein}g P · ${s.carbs}g C · ${s.fat}g F`,
        );
      } else {
        lines.push(`- ${s.name} × ${s.servings} (${s.dosage}): no macro impact`);
      }
    }
    lines.push(
      "IMPORTANT: The MACRO TARGETS below are AFTER supplements have been SUBTRACTED — they apply ONLY to MEALS. Do NOT add the supplements above into meals again.",
    );
    lines.push("══════════════════════════════════════");
    return lines.join("\n");
  }

  const lines: string[] = [];
  lines.push("═══ KULLANICININ SUPPLEMENT STACK'İ ═══");
  lines.push(
    `Kullanıcı günlük ortalama ${budget.calories} kcal · ${budget.protein}g P · ${budget.carbs}g K · ${budget.fat}g Y supplementten alıyor.`,
  );
  for (const s of budget.list) {
    const hasMacros =
      s.calories > 0 || s.protein > 0 || s.carbs > 0 || s.fat > 0;
    if (hasMacros) {
      lines.push(
        `- ${s.name} × ${s.servings} (${s.dosage}): ${s.calories} kcal · ${s.protein}g P · ${s.carbs}g K · ${s.fat}g Y`,
      );
    } else {
      lines.push(`- ${s.name} × ${s.servings} (${s.dosage}): makro etkisi yok`);
    }
  }
  lines.push(
    "ÖNEMLİ: Aşağıdaki MAKRO HEDEFLERİ supplement'ler ÇIKARILDIKTAN sonraki değerlerdir — sadece ÖĞÜN MAKROLARI için hedef. Yukarıdaki supplement'leri öğünlere TEKRAR ekleme.",
  );
  lines.push("══════════════════════════════════════");
  return lines.join("\n");
}
